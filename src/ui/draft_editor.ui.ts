// @ts-nocheck
// draft_editor.ui.ts — 草稿编辑器（子页面，单一实例编辑）
// 从 settings 草稿管理「编辑」navigate 进入：ctx.params.id = 要编辑的草稿实例 id。
// 语义：只编辑这一个实例 —— 加载该草稿 → 改标题/增删改题目 → 保存回写同一 id 的同一文件。
// 不复制、不新建、不切换。返回交给 Operit 导航栈，无需写返回按钮。

export default async function Screen(ctx: any) {
    var UI = ctx.UI;
    var primary = ctx.MaterialTheme.colorScheme.primary;
    var onSurface = ctx.MaterialTheme.colorScheme.onSurface;
    var onSurfaceVariant = ctx.MaterialTheme.colorScheme.onSurfaceVariant;

    var ASK_DIR = "/sdcard/Download/Operit/questionnaire/userask";


    // ---- 翻译（语言包优先 + 内置兜底）----
    var _deLang = null;
    try {
        var envLang = ctx.getEnv("QUESTIONNAIRE_LANG_PATH") || "";
        if (envLang) {
            var lr = await ctx.callTool("read_file", { path: envLang });
            if (lr && lr.content) {
                var lc = String(lr.content).replace(/^\s*\d+\|/gm, "");
                var lp = JSON.parse(lc);
                if (lp && lp.lang) _deLang = lp.lang;
            }
        }
    } catch (e) {}
    var _deBuiltin = {
        "ui.de.title": "编辑草稿",
        "ui.de.loading": "加载草稿中...",
        "ui.de.titlePlaceholder": "输入问卷标题...",
        "ui.de.noTitle": "请输入问卷标题",
        "ui.de.noId": "缺少草稿 ID",
        "ui.de.corrupt": "草稿不存在或已损坏",
        "ui.de.loadFail": "加载草稿失败: ",
        "ui.de.saveFail": "保存失败: ",
        "ui.de.saved": "✓ 已保存到该草稿",
        "ui.de.questionEmpty": "题干不能为空",
        "ui.de.needOptions": "选择题型至少需要 2 个选项",
        "ui.de.add": "＋ 添加题目",
        "ui.de.empty": "暂无题目，点击上方按钮添加",
        "ui.de.editQuestion": "编辑题目",
        "ui.de.addQuestion": "添加题目",
        "ui.de.type": "题型",
        "ui.de.question": "题干",
        "ui.de.questionPlaceholder": "输入题目内容...",
        "ui.de.options": "选项（逗号分隔）",
        "ui.de.optionsPlaceholder": "例如：是,否",
        "ui.de.required": "必答",
        "ui.de.cancel": "取消",
        "ui.de.confirm": "确定",
        "ui.de.count": "题",
        "ui.de.done": "已完成",
        "ui.de.ready": "已就绪",
        "ui.de.pending": "未发布",
        "ui.de.type.single": "单选",
        "ui.de.type.multiple": "多选",
        "ui.de.type.text": "单行文本",
        "ui.de.type.textarea": "多行文本",
        "ui.de.type.rating": "评分",
        "ui.de.type.likert": "李克特",
        "ui.de.type.nps": "NPS",
        "ui.de.type.time": "时间",
    };
    function _t(k) { return (_deLang && _deLang[k]) || _deBuiltin[k] || k; }

    // ---- 状态 ----
    var titleState = ctx.useState("_de_title", "");
    var questionsState = ctx.useState("_de_questions", "[]");
    var statusState = ctx.useState("_de_status", "draft");
    var loadedState = ctx.useState("_de_loaded", false);
    var editIdState = ctx.useState("_de_editId", "");
    var savedState = ctx.useState("_de_saved", false);
    var toastState = ctx.useState("_de_toast", "");
    var toastErrState = ctx.useState("_de_toastErr", false);
    var editingState = ctx.useState("_de_editing", false);   // false=关闭 / null=新增 / 字符串=编辑某题id
    var addTypeState = ctx.useState("_de_addType", "text");
    var addQuestionState = ctx.useState("_de_addQuestion", "");
    var addOptionsState = ctx.useState("_de_addOptions", "");
    var addRequiredState = ctx.useState("_de_addRequired", false);

    // ---- 加载该实例（onLoad 触发，不阻塞首次渲染）----
    function loadDraft() {
        if (loadedState[0]) return Promise.resolve();
        var id = "";
        try {
            if (typeof getEnv === "function") id = String(getEnv("QUESTIONNAIRE_EDIT_DRAFT") || "");
        } catch (e) {}
        if (!id && ctx.params && (ctx.params.id || ctx.params.askId)) id = String(ctx.params.id || ctx.params.askId);
        editIdState[1](id);
        return ctx.callTool("read_file", { path: ASK_DIR + "/" + id + ".json" })
            .then(function (fr) {
                var c = String((fr && fr.content) || "").replace(/^\s*\d+\|/gm, "");
                var ask = JSON.parse(c);
                if (ask && ask.id) {
                    titleState[1](ask.title || "");
                    questionsState[1](JSON.stringify(ask.questions || []));
                    statusState[1](ask.status || "draft");
                } else {
                    toastState[1](_t("ui.de.corrupt"));
                    toastErrState[1](true);
                }
            })
            .catch(function (e) {
                toastState[1](_t("ui.de.loadFail") + String(e));
                toastErrState[1](true);
            })
            .then(function () { loadedState[1](true); });
    }

    var title = titleState[0];
    var _qsRaw = questionsState[0];
    var questions = [];
    if (typeof _qsRaw === "string") {
        try { questions = JSON.parse(_qsRaw) || []; } catch (e) { questions = []; }
    } else if (Array.isArray(_qsRaw)) { questions = _qsRaw; }
    if (!Array.isArray(questions)) questions = [];
    var status = statusState[0];

    var typeLabels = {
        single: _t("ui.de.type.single"), multiple: _t("ui.de.type.multiple"), text: _t("ui.de.type.text"),
        textarea: _t("ui.de.type.textarea"), rating: _t("ui.de.type.rating"), likert: _t("ui.de.type.likert"), nps: _t("ui.de.type.nps"), time: _t("ui.de.type.time"),
    };
    var typeIds = ["single", "multiple", "text", "textarea", "rating"];

    function showToast(m, isErr) { toastState[1](m); toastErrState[1](!!isErr); }

    // ---- 保存：写回同一实例（同 editId 同文件，保留原 status）----
    function saveDraft() {
        var editId = editIdState[0];
        if (!editId) { showToast(_t("ui.de.noId"), true); return Promise.resolve(); }
        if (!String(title || "").trim()) { showToast(_t("ui.de.noTitle"), true); return Promise.resolve(); }
        var askObj = {
            id: editId,
            title: title,
            status: status || "draft",
            questions: questions,
            finishedAt: null,
        };
        return ctx.callTool("make_directory", { path: ASK_DIR, create_parents: true })
            .then(function () { return ctx.callTool("write_file", { path: ASK_DIR + "/" + editId + ".json", content: JSON.stringify(askObj) }); })
            .then(function () {
                showToast(_t("ui.de.saved"), false);
                savedState[1](true);
                return askObj;
            })
            .catch(function (e) { showToast(_t("ui.de.saveFail") + String(e), true); return null; });
    }

    // ---- 新增/编辑题的确认 ----
    function confirmQuestion(editQid) {
        var qText = String(addQuestionState[0] || "").trim();
        if (!qText) { showToast(_t("ui.de.questionEmpty"), true); return; }
        var type = addTypeState[0];
        var opts = [];
        if (type === "single" || type === "multiple") {
            opts = String(addOptionsState[0] || "").split(/[,，、]/).map(function (s) { return s.trim(); }).filter(function (s) { return s; });
            if (opts.length < 2) { showToast(_t("ui.de.needOptions"), true); return; }
        }
        var newQs = questions.slice();
        if (editQid) {
            for (var i = 0; i < newQs.length; i++) {
                if (newQs[i].id === editQid) {
                    newQs[i] = {
                        id: newQs[i].id, type: type, question: qText,
                        subtitle: newQs[i].subtitle || "", options: opts,
                        required: addRequiredState[0], answer: newQs[i].answer || null,
                    };
                    break;
                }
            }
        } else {
            newQs.push({
                id: "q" + (newQs.length + 1), type: type, question: qText,
                subtitle: "", options: opts, required: addRequiredState[0], answer: null,
            });
        }
        questionsState[1](JSON.stringify(newQs));
        savedState[1](false);
        editingState[1](false);
        addTypeState[1]("text");
        addQuestionState[1]("");
        addOptionsState[1]("");
        addRequiredState[1](false);
    }

    function openEdit(q) {
        addTypeState[1](q.type || "text");
        addQuestionState[1](q.question || "");
        addOptionsState[1](Array.isArray(q.options) ? q.options.join(",") : "");
        addRequiredState[1](!!q.required);
        editingState[1](q.id || "new");
    }

    function deleteQuestion(qid) {
        questionsState[1](JSON.stringify(questions.filter(function (q) { return q.id !== qid; })));
        savedState[1](false);
    }

    // ---- 渲染 ----
    var rows: any[] = [];

    // 加载中：onLoad 触发 loadDraft 异步读文件，未完成前显示 loading
    if (!loadedState[0]) {
        rows.push(UI.Card({ fillMaxWidth: true, containerColor: "primaryContainer" }, [
            UI.Row({ fillMaxWidth: true, verticalAlignment: "center", horizontalArrangement: "center", spacing: 8, padding: { vertical: 20 } }, [
                UI.CircularProgressIndicator({ strokeWidth: 2, color: primary, modifier: { size: 16 } }),
                UI.Text({ text: _t("ui.de.loading"), style: "bodyMedium", color: "onPrimaryContainer" }),
            ]),
        ]));
        return UI.LazyColumn({ fillMaxSize: true, spacing: 12, padding: { horizontal: 16, top: 12, bottom: 24 }, onLoad: function () { return loadDraft(); } }, rows);
    }

    // 头部：标题输入 + 保存（写回同一实例）
    rows.push(UI.Card({ fillMaxWidth: true, containerColor: "primaryContainer" }, [
        UI.Column({ padding: 14, spacing: 8 }, [
            UI.Row({ fillMaxWidth: true, verticalAlignment: "center", horizontalArrangement: "spaceBetween" }, [
                UI.Text({ text: _t("ui.de.title"), style: "titleLarge", fontWeight: "bold", color: "onPrimaryContainer" }),
                UI.Row({ verticalAlignment: "center", spacing: 4 }, [
                    savedState[0] ? UI.Text({ text: "✓", style: "labelMedium", color: "onPrimaryContainer" }) : null,
                    UI.IconButton({ icon: "save", tint: "onPrimaryContainer", onClick: function () { return saveDraft(); } }),
                ]),
            ]),
            UI.TextField({
                value: title,
                onValueChange: function (v) { titleState[1](v); savedState[1](false); },
                placeholder: _t("ui.de.titlePlaceholder"),
                singleLine: true,
            }),
            UI.Text({ text: "ID: " + editIdState[0] + " · " + (status === "done" ? _t("ui.de.done") : status === "ready" ? _t("ui.de.ready") : _t("ui.de.pending")) + " · " + questions.length + " " + _t("ui.de.count"), style: "labelMedium", color: "onPrimaryContainer" }),
        ]),
    ]));

    // toast 提示
    if (toastState[0]) {
        rows.push(UI.Card({ fillMaxWidth: true, containerColor: toastErrState[0] ? "errorContainer" : "primaryContainer" }, [
            UI.Row({ fillMaxWidth: true, verticalAlignment: "center", horizontalArrangement: "spaceBetween", padding: { horizontal: 14, vertical: 6 } }, [
                UI.Text({ text: toastState[0], style: "bodySmall", color: toastErrState[0] ? "onErrorContainer" : "onPrimaryContainer" }),
                UI.IconButton({ icon: "close", onClick: function () { toastState[1](""); } }),
            ]),
        ]));
    }

    // 添加题目按钮
    rows.push(UI.OutlinedButton({
        fillMaxWidth: true,
        onClick: function () {
            addTypeState[1]("text"); addQuestionState[1](""); addOptionsState[1]("");
            addRequiredState[1](false); editingState[1](null);
        },
        content: UI.Text({ text: _t("ui.de.add"), style: "labelLarge", color: "onPrimaryContainer" }),
    }));

    // 题目列表
    if (questions.length === 0) {
        rows.push(UI.Card({ fillMaxWidth: true }, [
            UI.Column({ padding: 14, spacing: 4 }, [
                UI.Text({ text: _t("ui.de.empty"), style: "bodyMedium", color: onSurfaceVariant }),
            ]),
        ]));
    } else {
        for (var qi = 0; qi < questions.length; qi++) {
            (function (q, idx) {
                rows.push(UI.Card({ fillMaxWidth: true }, [
                    UI.Row({ fillMaxWidth: true, verticalAlignment: "center", horizontalArrangement: "spaceBetween", spacing: 6, padding: { horizontal: 14, vertical: 10 } },
                        [
                            UI.Column({ spacing: 2, modifier: { weight: 1 } }, [
                                UI.Text({ text: (idx + 1) + ". " + q.question + (q.required ? " *" : ""), style: "bodyLarge", fontWeight: "bold", maxLines: 2, overflow: "ellipsis" }),
                                UI.Text({ text: (typeLabels[q.type] || q.type) + (q.options && q.options.length ? " · " + q.options.join(" / ") : ""), style: "labelSmall", color: onSurfaceVariant, maxLines: 2, overflow: "ellipsis" }),
                            ]),
                            UI.Row({ spacing: 0 }, [
                                UI.IconButton({ icon: "edit", onClick: function () { openEdit(q); } }),
                                UI.IconButton({ icon: "delete", onClick: function () { deleteQuestion(q.id); } }),
                            ]),
                        ]),
                ]));
            })(questions[qi], qi);
        }
    }

    // 新增/编辑题目编辑器
    if (editingState[0] !== false) {
        var editQid = editingState[0] === null ? "" : String(editingState[0]);
        var editNodes: any[] = [
            UI.Text({ text: editQid ? _t("ui.de.editQuestion") : _t("ui.de.addQuestion"), style: "titleSmall", fontWeight: "bold", color: onSurface }),
            UI.Text({ text: _t("ui.de.type"), style: "labelMedium", fontWeight: "bold", color: onSurface, padding: { top: 4 } }),
            UI.LazyRow({ spacing: 6 }, typeIds.map(function (tid) {
                return UI.FilterChip({
                    selected: addTypeState[0] === tid,
                    onClick: function () { addTypeState[1](tid); },
                    label: UI.Text({ text: typeLabels[tid], style: "labelSmall" }),
                });
            })),
            UI.Text({ text: _t("ui.de.question"), style: "labelMedium", fontWeight: "bold", color: onSurface, padding: { top: 4 } }),
            UI.TextField({
                value: addQuestionState[0],
                onValueChange: function (v) { addQuestionState[1](v); },
                placeholder: _t("ui.de.questionPlaceholder"),
                singleLine: false, minLines: 1, maxLines: 3,
            }),
        ];
        if (addTypeState[0] === "single" || addTypeState[0] === "multiple") {
            editNodes.push(
                UI.Text({ text: _t("ui.de.options"), style: "labelMedium", fontWeight: "bold", color: onSurface, padding: { top: 4 } }),
                UI.TextField({
                    value: addOptionsState[0],
                    onValueChange: function (v) { addOptionsState[1](v); },
                    placeholder: _t("ui.de.optionsPlaceholder"),
                    singleLine: true,
                }),
            );
        }
        editNodes.push(UI.Row({ fillMaxWidth: true, verticalAlignment: "center", horizontalArrangement: "spaceBetween", padding: { top: 6 } }, [
            UI.FilterChip({
                selected: addRequiredState[0],
                onClick: function () { addRequiredState[1](!addRequiredState[0]); },
                label: UI.Text({ text: _t("ui.de.required"), style: "labelSmall" }),
            }),
            UI.Row({ spacing: 8 }, [
                UI.TextButton({
                    onClick: function () { editingState[1](false); },
                    content: UI.Text({ text: _t("ui.de.cancel"), style: "labelMedium", color: onSurfaceVariant }),
                }),
                UI.Button({
                    onClick: function () { confirmQuestion(editQid); },
                    content: UI.Text({ text: _t("ui.de.confirm"), style: "labelMedium", color: ctx.MaterialTheme.colorScheme.onPrimary }),
                }),
            ]),
        ]));
        rows.push(UI.Card({ fillMaxWidth: true }, [UI.Column({ padding: 14, spacing: 6 }, editNodes)]));
    }

    // 全屏子页面：用 LazyColumn 根（可滑动）
    return UI.LazyColumn({ fillMaxSize: true, spacing: 12, padding: { horizontal: 16, top: 12, bottom: 24 }, onLoad: function () { return loadDraft(); } }, rows);
}