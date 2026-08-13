// @ts-nocheck
// ask.ui.ts — 问卷询问 UI（Compose DSL）
// 构建模式：用户出题（标题 + 添加题目 + 随时保存 + 开始答题）
// 呈现模式：AI 作答进度/结果（unfilled 未填 / filled 已填，可重复作答）
export default async function Screen(ctx) {
    var UI = ctx.UI;
    var primary = ctx.MaterialTheme.colorScheme.primary;
    var onSurface = ctx.MaterialTheme.colorScheme.onSurface;
    var onSurfaceVariant = ctx.MaterialTheme.colorScheme.onSurfaceVariant;
    var surfaceVariant = ctx.MaterialTheme.colorScheme.surfaceVariant;
    var errorColor = ctx.MaterialTheme.colorScheme.error;

    var ASK_DIR = "/sdcard/Download/Operit/questionnaire/userask";

    // ── 翻译（语言包优先 + 内置兜底）──
    var _askLang = null;
    try {
        var envLang = ctx.getEnv("QUESTIONNAIRE_LANG_PATH") || "";
        if (envLang) {
            var lr = await ctx.callTool("read_file", { path: envLang });
            if (lr && lr.content) {
                var lc = String(lr.content).replace(/^\s*\d+\|/gm, "");
                var lp = JSON.parse(lc);
                if (lp && lp.lang) _askLang = lp.lang;
            }
        }
    } catch (e) {}
    var _builtin = {
        "ui.ask.title": "问卷询问",
        "ui.ask.subtitle": "向 AI 出题，AI 将通过工具作答",
        "ui.ask.titlePlaceholder": "输入问卷标题...",
        "ui.ask.addQuestion": "＋ 添加题目",
        "ui.ask.editQuestion": "编辑题目",
        "ui.ask.edit": "编辑",
        "ui.ask.delete": "删除",
        "ui.ask.type": "题型",
        "ui.ask.question": "题干",
        "ui.ask.questionPlaceholder": "输入题目内容...",
        "ui.ask.options": "选项",
        "ui.ask.optionsPlaceholder": "选项用逗号分隔，例如：是,否",
        "ui.ask.required": "必答",
        "ui.ask.confirm": "确认添加",
        "ui.ask.cancel": "取消",
        "ui.ask.saved": "✓ 已保存",
        "ui.ask.started": "✓ 已出题，问卷ID已发送给 AI",
        "ui.ask.ready": "已就绪",
        "ui.ask.noTitle": "请先输入问卷标题",
        "ui.ask.noQuestions": "请至少添加一道题目",
        "ui.ask.done": "已完成",
        "ui.ask.unpublished": "未发布",
        "ui.ask.unfilled": "未填",
        "ui.ask.filled": "已填",
        "ui.ask.answered": "已答",
        "ui.ask.total": "共 %d 题",
        "ui.ask.answer": "答案",
        "ui.ask.type.single": "单选",
        "ui.ask.type.multiple": "多选",
        "ui.ask.type.text": "文本",
        "ui.ask.type.textarea": "多行文本",
        "ui.ask.type.rating": "评分",
        "ui.ask.aiReady": "请使用 ask 子包工具作答（query / read / answer / finish）",
        "ui.ask.finishedAt": "完成时间",
        "ui.ask.emptyQuestions": "暂无题目，点击下方按钮添加",
        "ui.ask.needOptions": "选择题型至少需要 2 个选项",
        "ui.ask.saveFail": "保存失败: ",
        "ui.ask.fetching": "加载草稿中...",
        "ui.ask.draftListEmpty": "未找到草稿：目录为空或 list_files 无返回",
        "ui.ask.draftScanDone": "扫描完成，无未完成草稿",
        "ui.ask.draftListFail": "列出草稿失败: ",
        "ui.ask.draftSwitched": "已切换到草稿：",
        "ui.ask.draftLoadFail": "加载草稿失败: ",
        "ui.ask.draftPickerTitle": "继续填写未完成问卷",
        "ui.ask.draftPickerEmpty": "暂无未完成问卷",
    };
    function _t(key) { return (_askLang && _askLang[key]) || _builtin[key] || key; }

    // ── state ──
    var data = JSON.parse(ctx.useState("_data", "{}")[0] || "{}");
    var chatId = ctx.useState("_chatId", "")[0];
    var titleState = ctx.useState("_title", data.title || "");
    var questionsState = ctx.useState("_questions", data.ask ? JSON.parse(data.ask).questions || [] : []);
    var askStatusState = ctx.useState("_askStatus", data.ask ? JSON.parse(data.ask).status : "");
    var bannerState = ctx.useState("_banner", "");
    var bannerErrState = ctx.useState("_bannerErr", false);
    var addingState = ctx.useState("_adding", false);
    var addTypeState = ctx.useState("_addType", "single");
    var addQuestionState = ctx.useState("_addQuestion", "");
    var addOptionsState = ctx.useState("_addOptions", "");
    var addRequiredState = ctx.useState("_addRequired", false);
    var savedState = ctx.useState("_saved", false);
    var editQidState = ctx.useState("_editQid", "");   // 正在编辑的题目 id，空=新增
    var menuOpenState = ctx.useState("_menuOpen", ""); // 折叠菜单打开的题目 id
    var openPickerState = ctx.useState("_openPicker", false);
    var pickerPageState = ctx.useState("_pickerPage", 0);
    var draftsState = ctx.useState("_drafts", null);
    var askIdState = ctx.useState("_askId", data.askId || "");
    var jsonErrorState = ctx.useState("_jsonError", data.jsonError || "");
    var modeState = ctx.useState("_mode", data.state || "built");

    var title = titleState[0];
    // render 传入的 _questions 是 JSON 字符串，需要解析（宿主 state 原样返回）
    var _qsRaw = questionsState[0];
    var questions = [];
    if (typeof _qsRaw === "string") {
        try { questions = JSON.parse(_qsRaw) || []; } catch (e) { questions = []; }
    } else if (Array.isArray(_qsRaw)) {
        questions = _qsRaw;
    }
    if (!Array.isArray(questions)) questions = [];
    var askStatus = askStatusState[0];
    var banner = bannerState[0];
    var bannerErr = bannerErrState[0];
    var adding = addingState[0];
    var saved = savedState[0];

    var askId = askIdState[0] || data.askId || "";
    // 模式由 XML state 显式控制：built=构建器 / complete=结果展示
    // 无 id（新建）强制构建；有 id 时按 state 决定
    var isBuildMode = askId ? (modeState[0] === "built") : true;
    var isDone = askStatus === "done";

    // 答案是否已填
    function filled(ans) {
        if (ans === undefined || ans === null) return false;
        if (typeof ans === "string") return ans.trim() !== "";
        if (Array.isArray(ans)) return ans.length > 0;
        return true;
    }

    function showBanner(m, isErr) { bannerState[1](m); bannerErrState[1](!!isErr); }

    // 列出所有草稿问卷（userask 目录，status=draft 或未完成）
    function loadDrafts() {
        draftsState[1](null);
        pickerPageState[1](0);
        return ctx.callTool("list_files", { path: ASK_DIR })
            .then(function (dir) {
                var entries = [];
                if (dir && dir.entries) entries = dir.entries;
                else if (dir && dir.data && dir.data.entries) entries = dir.data.entries;
                else if (Array.isArray(dir)) entries = dir;
                else if (dir && Array.isArray(dir.data)) entries = dir.data;
                else if (dir && Array.isArray(dir.files)) entries = dir.files;
                if (!entries || entries.length === 0) {
                    showBanner(_t("ui.ask.draftListEmpty"), true);
                    draftsState[1]([]);
                    return;
                }
                var chain = Promise.resolve();
                var drafts = [];
                for (var di = 0; di < entries.length; di++) {
                    (function (entry) {
                        var name = typeof entry === "string" ? entry : (entry.name || entry.path || "");
                        if (!name.endsWith(".json")) return;
                        var fid = name.replace(/\.json$/, "").split("/").pop();
                        chain = chain.then(function () {
                            return ctx.callTool("read_file", { path: ASK_DIR + "/" + fid + ".json" }).then(function (fr) {
                                try {
                                    var fc = String((fr && fr.content) || "").replace(/^\s*\d+\|/gm, "");
                                    var fo = JSON.parse(fc);
                                    if (fo && fo.id && fo.status === "draft") {
                                        drafts.push({ id: fo.id, title: fo.title || "", count: (fo.questions || []).length, updatedAt: fo.updatedAt || 0 });
                                    }
                                } catch (e) {}
                            }).catch(function () {});
                        });
                    })(entries[di]);
                }
                return chain.then(function () {
                    drafts.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
                    draftsState[1](drafts);
                    if (drafts.length === 0) showBanner(_t("ui.ask.draftScanDone"), false);
                });
            })
            .catch(function (e) {
                draftsState[1]([]);
                showBanner(_t("ui.ask.draftListFail") + String(e), true);
            });
    }

    // 选择一份草稿 => 切换问卷 ID 并加载（进入构建模式继续编辑）
    function pickDraft(id) {
        openPickerState[1](false);
        modeState[1]("built");
        // 加载该草稿内容，写入 state（ID 切换）
        return ctx.callTool("read_file", { path: ASK_DIR + "/" + id + ".json" })
            .then(function (fr) {
                var fc = String((fr && fr.content) || "").replace(/^\s*\d+\|/gm, "");
                var fo = JSON.parse(fc);
                var qs = fo && fo.questions ? fo.questions : [];
                // 切换：更新 askId、title、questions、status
                askIdState[1](id);
                titleState[1](fo.title || "");
                questionsState[1](JSON.stringify(qs));
                askStatusState[1](fo.status || "draft");
                savedState[1](false);
                showBanner(_t("ui.ask.draftSwitched") + id, false);
            })
            .catch(function (e) { showBanner(_t("ui.ask.draftLoadFail") + String(e), true); });
    }

    // 保存草稿（构建模式）— 用 render 自动分配的稳定 askId，ID 至始至终不变
    function saveDraft(status) {
        var s = status || "draft";
        if (!askId) { showBanner("问卷 ID 未分配", true); return Promise.resolve(null); }
        var askObj = {
            id: askId,
            title: title,
            status: s,
            questions: questions,
            finishedAt: null,
        };
        return ctx.callTool("make_directory", { path: ASK_DIR, create_parents: true })
            .then(function () {
                return ctx.callTool("write_file", { path: ASK_DIR + "/" + askObj.id + ".json", content: JSON.stringify(askObj) });
            })
            .then(function () {
                showBanner(s === "ready" ? _t("ui.ask.started") : _t("ui.ask.saved"), false);
                savedState[1](true);
                return askObj;
            })
            .catch(function (e) {
                showBanner(_t("ui.ask.saveFail") + String(e), true);
                return null;
            });
    }

    // 开始答题：保存 ready + 通知 AI
    function startAsk() {
        if (!title.trim()) { showBanner(_t("ui.ask.noTitle"), true); return Promise.resolve(); }
        if (questions.length === 0) { showBanner(_t("ui.ask.noQuestions"), true); return Promise.resolve(); }
        return saveDraft("ready").then(function (askObj) {
            if (!askObj) return;
            askStatusState[1]("ready");
            try {
                Tools.Chat.sendMessage(
                    "📝 " + _t("ui.ask.title") + "：「" + askObj.title + "」" + _t("ui.ask.ready") + "\n" +
                    "问卷ID: " + askObj.id + "\n" +
                    _t("ui.ask.aiReady"),
                    chatId, undefined, undefined, { runtime: "main" }
                );
            } catch (e) {}
        });
    }

    // 添加/编辑题目（覆盖式编辑器）
    function addQuestionConfirm() {
        var qText = addQuestionState[0] ? addQuestionState[0].trim() : "";
        if (!qText) { showBanner(_t("ui.ask.question") + " " + _t("ui.ask.unfilled"), true); return; }
        var type = addTypeState[0];
        var opts = [];
        if (type === "single" || type === "multiple") {
            opts = String(addOptionsState[0] || "").split(/[,，、]/).map(function (s) { return s.trim(); }).filter(function (s) { return s; });
            if (opts.length < 2) { showBanner(_t("ui.ask.needOptions"), true); return; }
        }
        var editQid = editQidState[0];
        var newQs = questions.slice();
        if (editQid) {
            // 编辑模式：覆盖原题（保留 id / answer / subtitle）
            for (var ei = 0; ei < newQs.length; ei++) {
                if (newQs[ei].id === editQid) {
                    newQs[ei] = {
                        id: newQs[ei].id, type: type, question: qText,
                        subtitle: newQs[ei].subtitle || "", options: opts,
                        required: addRequiredState[0], answer: newQs[ei].answer || null,
                    };
                    break;
                }
            }
        } else {
            // 新增模式
            newQs.push({
                id: "q" + (newQs.length + 1),
                type: type,
                question: qText,
                subtitle: "",
                options: opts,
                required: addRequiredState[0],
                answer: null,
            });
        }
        questionsState[1](newQs);
        addQuestionState[1]("");
        addOptionsState[1]("");
        addRequiredState[1](false);
        editQidState[1]("");
        addingState[1](false);
        savedState[1](false);
    }

    // 打开编辑：预填题目内容到覆盖式编辑器
    function openEditQuestion(q) {
        addTypeState[1](q.type || "text");
        addQuestionState[1](q.question || "");
        addOptionsState[1](Array.isArray(q.options) ? q.options.join(",") : "");
        addRequiredState[1](!!q.required);
        editQidState[1](q.id);
        addingState[1](true);
    }

    function removeQuestion(qid) {
        questionsState[1](questions.filter(function (q) { return q.id !== qid; }));
        savedState[1](false);
    }

    var typeLabels = {
        single: _t("ui.ask.type.single"), multiple: _t("ui.ask.type.multiple"),
        text: _t("ui.ask.type.text"), textarea: _t("ui.ask.type.textarea"), rating: _t("ui.ask.type.rating"),
    };
    var typeIds = ["single", "multiple", "text", "textarea", "rating"];

    // 答案展示文本
    function ansText(ans, type) {
        if (!filled(ans)) return _t("ui.ask.unfilled");
        if (Array.isArray(ans)) return ans.join(", ");
        if (type === "rating") return String(ans) + " ★";
        return String(ans);
    }

    var rows = [];

    // ── 构建模式 ──
    if (isBuildMode) {
        // 头部：标题输入 + 出题按钮（标签头右侧）
        rows.push(UI.Card({ fillMaxWidth: true, containerColor: "primaryContainer" }, [
            UI.Column({ padding: 14, spacing: 8 }, [
// 头部：标题 + 操作按钮（整行 LazyRow 横向滚动，title 过长时滚动查看，按钮不被挤走）
                UI.LazyRow({ fillMaxWidth: true, verticalAlignment: "center", spacing: 8 }, [
                    UI.Text({ text: _t("ui.ask.title"), style: "titleLarge", fontWeight: "bold", color: "onPrimaryContainer" }),
                    saved ? UI.Text({ text: "✓", style: "labelMedium", color: "onPrimaryContainer" }) : null,
                    UI.IconButton({ icon: "folder_open", tint: "onPrimaryContainer", onClick: function () { openPickerState[1](true); return loadDrafts(); } }),
                    UI.IconButton({ icon: "save", tint: "onPrimaryContainer", onClick: function () { return saveDraft("draft"); } }),
                    UI.IconButton({ icon: "send", tint: "onPrimaryContainer", onClick: function () { return startAsk(); } }),
                ]),
                UI.TextField({
                    value: title,
                    onValueChange: function (v) { titleState[1](v); savedState[1](false); },
                    placeholder: _t("ui.ask.titlePlaceholder"),
                    singleLine: true,
                }),
                UI.Text({ text: _t("ui.ask.subtitle") + " · " + questions.length + " " + _t("ui.ask.total").replace("%d", String(questions.length)), style: "labelMedium", color: "onPrimaryContainer" }),
                // 添加题目入口（顶层，title 下方）
                UI.OutlinedButton({
                    fillMaxWidth: true,
                    onClick: function () { editQidState[1](""); addingState[1](!addingState[0]); },
                    content: UI.Text({ text: adding ? _t("ui.ask.cancel") : _t("ui.ask.addQuestion"), style: "labelMedium", color: "onPrimaryContainer" }),
                }),
            ]),
        ]));

        // 草稿选择器（继续填写未完成问卷）
        if (openPickerState[0]) {
            var drafts = draftsState[0];
            var pickerNodes = [
                UI.LazyRow({ fillMaxWidth: true, verticalAlignment: "center", spacing: 8 }, [
                    UI.Text({ text: _t("ui.ask.draftPickerTitle"), style: "titleSmall", fontWeight: "bold", color: onSurface }),
                    UI.IconButton({ icon: "close", onClick: function () { openPickerState[1](false); } }),
                ]),
            ];
            if (drafts === null) {
                pickerNodes.push(UI.Row({ verticalAlignment: "center", horizontalArrangement: "center", fillMaxWidth: true, spacing: 8, padding: { vertical: 8 } }, [
                    UI.CircularProgressIndicator({ strokeWidth: 2, color: primary, modifier: { size: 16 } }),
                    UI.Text({ text: _t("ui.ask.fetching"), style: "bodySmall", color: onSurfaceVariant }),
                ]));
            } else if (!drafts || drafts.length === 0) {
                pickerNodes.push(UI.Text({ text: _t("ui.ask.draftPickerEmpty"), style: "bodyMedium", color: onSurfaceVariant, padding: { vertical: 8 } }));
            } else {
                var per = 5;
                var pickerTotalPages = Math.max(1, Math.ceil(drafts.length / per));
                var pickPage = pickerPageState[0];
                if (pickPage >= pickerTotalPages) pickPage = pickerTotalPages - 1;
                var startIdx = pickPage * per;
                var pageDrafts = drafts.slice(startIdx, startIdx + per);
                for (var pdi = 0; pdi < pageDrafts.length; pdi++) {
                    (function (d) {
                        pickerNodes.push(UI.LazyRow({ fillMaxWidth: true, verticalAlignment: "center", spacing: 8, onClick: function () { return pickDraft(d.id); } }, [
                            UI.Column({ spacing: 1 }, [
                                UI.Text({ text: d.title || "(无标题)", style: "bodyMedium", fontWeight: "bold", maxLines: 1, overflow: "ellipsis" }),
                                UI.Text({ text: d.id + " · " + d.count + " " + _t("ui.ask.total").replace("%d", String(d.count)), style: "labelSmall", color: onSurfaceVariant }),
                            ]),
                            UI.Icon({ name: "chevron_right", size: 18, tint: onSurfaceVariant }),
                        ]));
                    })(pageDrafts[pdi]);
                }
                if (pickerTotalPages > 1) {
                    pickerNodes.push(UI.Row({ fillMaxWidth: true, horizontalArrangement: "spaceEvenly", verticalAlignment: "center", padding: { top: 4 } }, [
                        UI.IconButton({ icon: "chevron_left", enabled: pickPage > 0, onClick: function () { pickerPageState[1](Math.max(0, pickerPageState[0] - 1)); } }),
                        UI.Text({ text: (pickPage + 1) + " / " + pickerTotalPages, style: "bodyMedium", color: onSurfaceVariant }),
                        UI.IconButton({ icon: "chevron_right", enabled: pickPage < pickerTotalPages - 1, onClick: function () { pickerPageState[1](Math.min(pickerTotalPages - 1, pickerPageState[0] + 1)); } }),
                    ]));
                }
            }
            rows.push(UI.Card({ fillMaxWidth: true }, [
                UI.Column({ padding: 12, spacing: 4 }, pickerNodes),
            ]));
        }

        // JSON 格式错误提醒（XML 内嵌 JSON 解析失败时）
        if (jsonErrorState[0]) {
            rows.push(UI.Card({ fillMaxWidth: true, containerColor: "errorContainer" }, [
                UI.LazyRow({ fillMaxWidth: true, verticalAlignment: "center", spacing: 8, padding: { horizontal: 14, vertical: 6 } }, [
                    UI.Text({ text: "⚠️ " + jsonErrorState[0], style: "bodySmall", color: "onErrorContainer" }),
                    UI.IconButton({ icon: "close", onClick: function () { jsonErrorState[1](""); } }),
                ]),
            ]));
        }

        // 横幅
        if (banner) {
            rows.push(UI.Card({ fillMaxWidth: true, containerColor: bannerErr ? "errorContainer" : "primaryContainer" }, [
                UI.LazyRow({ fillMaxWidth: true, verticalAlignment: "center", spacing: 8, padding: { horizontal: 14, vertical: 6 } }, [
                    UI.Text({ text: banner, style: "bodyMedium", color: bannerErr ? "onErrorContainer" : "onPrimaryContainer" }),
                    UI.IconButton({ icon: "close", onClick: function () { bannerState[1](""); } }),
                ]),
            ]));
        }

        // 添加/编辑题目编辑器（覆盖式：在题目列表上方、新建题目入口下方）
        if (adding) {
            var editQid = editQidState[0];
            var addNodes = [
                UI.Text({ text: editQid ? _t("ui.ask.editQuestion") : _t("ui.ask.addQuestion"), style: "titleSmall", fontWeight: "bold", color: onSurface }),
                UI.Text({ text: _t("ui.ask.type"), style: "labelMedium", fontWeight: "bold", color: onSurface }),
                UI.LazyRow({ spacing: 6 }, typeIds.map(function (tid) {
                    return UI.FilterChip({
                        selected: addTypeState[0] === tid,
                        onClick: function () { addTypeState[1](tid); },
                        label: UI.Text({ text: typeLabels[tid], style: "labelSmall" }),
                    });
                })),
                UI.Text({ text: _t("ui.ask.question"), style: "labelMedium", fontWeight: "bold", color: onSurface, padding: { top: 4 } }),
                UI.TextField({
                    value: addQuestionState[0],
                    onValueChange: function (v) { addQuestionState[1](v); },
                    placeholder: _t("ui.ask.questionPlaceholder"),
                    singleLine: false,
                    minLines: 1,
                    maxLines: 3,
                }),
            ];
            if (addTypeState[0] === "single" || addTypeState[0] === "multiple") {
                addNodes.push(UI.Text({ text: _t("ui.ask.options"), style: "labelMedium", fontWeight: "bold", color: onSurface, padding: { top: 4 } }));
                addNodes.push(UI.TextField({
                    value: addOptionsState[0],
                    onValueChange: function (v) { addOptionsState[1](v); },
                    placeholder: _t("ui.ask.optionsPlaceholder"),
                    singleLine: true,
                }));
            }
            addNodes.push(UI.LazyRow({ fillMaxWidth: true, verticalAlignment: "center", spacing: 8, padding: { top: 6 } }, [
                UI.FilterChip({
                    selected: addRequiredState[0],
                    onClick: function () { addRequiredState[1](!addRequiredState[0]); },
                    label: UI.Text({ text: _t("ui.ask.required"), style: "labelSmall" }),
                }),
                UI.Row({ spacing: 8 }, [
                    UI.TextButton({
                        onClick: function () { editQidState[1](""); addingState[1](false); },
                        content: UI.Text({ text: _t("ui.ask.cancel"), style: "labelMedium", color: onSurfaceVariant }),
                    }),
                    UI.Button({
                        onClick: addQuestionConfirm,
                        content: UI.Text({ text: _t("ui.ask.confirm"), style: "labelMedium", color: ctx.MaterialTheme.colorScheme.onPrimary }),
                    }),
                ]),
            ]));
            rows.push(UI.Card({ fillMaxWidth: true }, [
                UI.Column({ padding: 14, spacing: 6 }, addNodes),
            ]));
        }

        // 题目列表
        if (questions.length === 0) {
            rows.push(UI.Card({ fillMaxWidth: true }, [
                UI.Column({ padding: 14, spacing: 8 }, [
                    UI.Text({ text: _t("ui.ask.emptyQuestions"), style: "bodyMedium", color: onSurfaceVariant }),
                ]),
            ]));
        } else {
            for (var qi = 0; qi < questions.length; qi++) {
                (function (q, idx) {
                    var menuOpen = menuOpenState[0] === q.id;
                    rows.push(UI.Card({ fillMaxWidth: true }, [
                        UI.Row({ fillMaxWidth: true, verticalAlignment: "center", horizontalArrangement: "spaceBetween", spacing: 6, padding: { horizontal: 14, vertical: 10 } }, [
                            UI.Column({ spacing: 2, modifier: { weight: 1 } }, [
                                UI.Text({ text: (idx + 1) + ". " + q.question + (q.required ? " *" : ""), style: "bodyLarge", fontWeight: "bold", maxLines: 2, overflow: "ellipsis" }),
                                UI.Text({ text: (typeLabels[q.type] || q.type) + (q.options && q.options.length ? " · " + q.options.join(" / ") : ""), style: "labelSmall", color: onSurfaceVariant, maxLines: 2, overflow: "ellipsis" }),
                            ]),
                            // 折叠菜单：编辑 / 删除
                            UI.Box({}, [
                                UI.IconButton({ icon: "more_vert", onClick: function () { menuOpenState[1](menuOpen ? "" : q.id); } }),
                                UI.DropdownMenu({
                                    expanded: menuOpen,
                                    onDismissRequest: function () { menuOpenState[1](""); },
                                    content: [
                                        UI.Row({ onClick: function () { menuOpenState[1](""); openEditQuestion(q); } }, [
                                            UI.Icon({ name: "edit", size: 18, tint: onSurfaceVariant }),
                                            UI.Text({ text: _t("ui.ask.edit"), style: "bodyMedium", padding: { horizontal: 8 } }),
                                        ]),
                                        UI.Row({ onClick: function () { menuOpenState[1](""); removeQuestion(q.id); } }, [
                                            UI.Icon({ name: "delete", size: 18, tint: onSurfaceVariant }),
                                            UI.Text({ text: _t("ui.ask.delete"), style: "bodyMedium", padding: { horizontal: 8 } }),
                                        ]),
                                    ],
                                }),
                            ]),
                        ]),
                    ]));
                })(questions[qi], qi);
            }
        }

    }
    // ── 呈现模式（ready / done）──
    else {
        var filledCount = 0;
        for (var fi = 0; fi < questions.length; fi++) { if (filled(questions[fi].answer)) filledCount++; }

        // 头部：标题 + 状态
        rows.push(UI.Card({ fillMaxWidth: true, containerColor: "primaryContainer" }, [
            UI.LazyRow({ fillMaxWidth: true, verticalAlignment: "center", spacing: 8, padding: { horizontal: 14, vertical: 12 } }, [
                UI.Column({ spacing: 2 }, [
                    UI.Text({ text: title || _t("ui.ask.title"), style: "titleLarge", fontWeight: "bold", color: "onPrimaryContainer", maxLines: 2, overflow: "ellipsis" }),
                    UI.Text({ text: askId, style: "labelSmall", color: "onPrimaryContainer" }),
                ]),
                UI.Text({ text: isDone ? _t("ui.ask.done") : (askStatus === "ready" ? _t("ui.ask.ready") : _t("ui.ask.unpublished")), style: "labelLarge", fontWeight: "bold", color: "onPrimaryContainer" }),
            ]),
        ]));

        // 进度
        // 日期格式化为 yyyy/mm/dd
                function fmtDate(t) {
                    var d = new Date(t || Date.now());
                    var y = d.getFullYear();
                    var m = String(d.getMonth() + 1).padStart(2, "0");
                    var day = String(d.getDate()).padStart(2, "0");
                    return y + "/" + m + "/" + day;
                }
                var _doneTxt = (isDone && data.ask) ? (_t("ui.ask.finishedAt") + ": " + fmtDate(JSON.parse(data.ask).finishedAt)) : null;
                rows.push(UI.Card({ fillMaxWidth: true }, [
                    UI.Column({ padding: 12, spacing: 8 }, [
                        UI.Text({ text: _t("ui.ask.answered") + " " + filledCount + " / " + questions.length + " · " + _t("ui.ask.total").replace("%d", String(questions.length)), style: "bodyMedium", fontWeight: "bold" }),
                        UI.Text({ text: _t("ui.ask.aiReady"), style: "labelSmall", color: onSurfaceVariant }),
                        _doneTxt ? UI.Text({ text: _doneTxt, style: "labelSmall", color: onSurfaceVariant }) : null,
                    ]),
                ]));

        // 题目 + AI 答案
        for (var pi = 0; pi < questions.length; pi++) {
            (function (q, idx) {
                var isF = filled(q.answer);
                rows.push(UI.Card({ fillMaxWidth: true }, [
                    UI.Column({ padding: 12, spacing: 6 }, [
                        UI.LazyRow({ fillMaxWidth: true, verticalAlignment: "center", spacing: 6 }, [
                            UI.Text({ text: (idx + 1) + ". " + q.question + (q.required ? " *" : ""), style: "bodyLarge", fontWeight: "bold", maxLines: 2, overflow: "ellipsis" }),
                            UI.Text({ text: isF ? _t("ui.ask.filled") : _t("ui.ask.unfilled"), style: "labelSmall", fontWeight: "bold", color: isF ? "primary" : onSurfaceVariant }),
                        ]),
                        UI.Divider({ thickness: 0.5, color: onSurfaceVariant.copy({ alpha: 0.3 }) }),
                        isF
                            ? UI.Row({ fillMaxWidth: true, verticalAlignment: "center", spacing: 6 }, [
                                UI.Text({ text: _t("ui.ask.answer") + ": ", style: "labelMedium", color: onSurfaceVariant }),
                                UI.Text({ text: ansText(q.answer, q.type), style: "bodyMedium", fontWeight: "bold", color: "primary" }),
                            ])
                            : UI.Text({ text: _t("ui.ask.unfilled"), style: "bodyMedium", color: onSurfaceVariant }),
                    ]),
                ]));
            })(questions[pi], pi);
        }
    }

    // 消息内渲染禁止用 LazyColumn 做根容器（宿主消息区可滚动 → 无限高度约束崩溃），用 Column
    return UI.Column({ fillMaxWidth: true, padding: 12, spacing: 12 }, rows);
}