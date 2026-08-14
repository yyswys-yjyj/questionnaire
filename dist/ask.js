/* METADATA
{
    "name": "ask",
    "display_name": {
        "zh": "回答问卷",
        "en": "Answer Questionnaire"
    },
    "description": {
        "zh": "回答问卷【反向问卷：用户出题→AI（你）作答】。当用户让你【回答一份来自用户的问卷/做一份他出的题】时用你可以本包（常见情景：用户需要向AI询问问题、用户需要出一份问卷给AI）。\n\n【明确职责边界】本包与「questionnaire」主包方向相反，勿混淆：\n- 本包 ask：用户出题、你（AI）作答（用 built/read/answer/finish）\n- questionnaire 主包：你（AI）出题、用户作答（用户填表单）\n你要向用户提问（让用户填）时用 questionnaire 主包；用户让你作答其出的题时用本包。\n\n【发起问卷（新增时必做）】用户要求你出题/发起问卷时，第一步必须调用 built 工具创建草稿并获取问卷ID——绝不直接输出 XML 或先跳过 built。拿到 ID 后，输出 <ask_questionnaire>{\"id\":\"<问卷ID>\",\"state\":\"built\"}</ask_questionnaire> 让用户构建题目。\n\n【作答】用户开始答题后：1) 用 read 读取题目详情；2) 逐题用 answer 提交答案（已填可重填）；3) 全部答完调用 finish 完成。\n\n【呈现】完成后输出 <ask_questionnaire>{\"id\":\"<问卷ID>\",\"state\":\"complete\"}</ask_questionnaire>（或只带 id）呈现作答结果。\n\n━━━━━━ AI 使用手册：问卷询问 ━━━━━━\n1. 用户想要向你出题时：先调用 built 工具获取问卷ID（这是第一步，绝不能省），再输出 <ask_questionnaire>{\"id\":\"<ID>\",\"state\":\"built\"}</ask_questionnaire>。\n2. 用户构建完问卷点击「开始答题」后，你会在聊天中收到一条消息，包含问卷ID。\n3. 用 read 传入问卷ID 读取全部题目（含题型/选项/必答标记），逐题用 answer 提交答案。\n4. 所有题目作答完毕后调用 finish 完成问卷（有必答题未填会报错，补答后再 finish）。\n5. 完成后输出 <ask_questionnaire>{\"id\":\"<问卷ID>\"}</ask_questionnaire> 呈现你的作答结果。\n\n━━━━━━ 状态机 ━━━━━━\n- 问卷状态：draft（未完成，用户构建中，AI 不可作答）→ ready（已就绪，AI 可作答）→ done（已完成）\n- 题目状态：unfilled（未填）→ filled（已填）；filled 的题可随时用 answer 重新填写。\n\n━━━━━━ 数据存储 ━━━━━━\n- 问卷 JSON 保存在 /storage/emulated/0/Download/Operit/questionnaire/userask/<问卷ID>.json（目录不存在会自动创建）\n\n注意：answer 的 value 格式按题型：single=选项文本(string)；multiple=选项文本数组(array)；text/textarea=字符串；rating/likert/nps=数字；time=HH:MM:SS 字符串。",
        "en": "Answer Questionnaire【REVERSE survey: the USER sets questions → AI (you) answers】. Use this package when the user asks YOU to answer/fill a questionnaire they created.\n\n【RESPONSIBILITY BOUNDARY】This package is the reverse direction of the questionnaire package, do not confuse:\n- This package (ask): the user sets questions, you (AI) answer (via built/read/answer/finish)\n- questionnaire package: you (AI) set questions, the user answers (fills a form)\nWhen you want to survey the user (let them fill), use the questionnaire package; when the user asks you to answer their questions, use this package.\n\n【TO CREATE/INITIATE a questionnaire】When the user asks you to make/send a questionnaire, ALWAYS call the built tool FIRST to create a draft and get the questionnaire ID - never output XML directly or skip built. After getting the ID, output <ask_questionnaire>{\"id\":\"<ID>\",\"state\":\"built\"}</ask_questionnaire> to let the user build questions.\n\n【TO ANSWER】After the user starts: 1) use read to fetch questions; 2) answer each with the answer tool (re-submittable); 3) call finish when done.\n\n【TO PRESENT】After finishing, output <ask_questionnaire>{\"id\":\"<ID>\",\"state\":\"complete\"}</ask_questionnaire> (or just id).\n\n━━━━━ AI MANUAL: ASK QUESTIONNAIRE ━━━━━\n1. When the user wants to quiz you: FIRST call the built tool to get the questionnaire ID (mandatory, never skip), then output <ask_questionnaire>{\"id\":\"<ID>\",\"state\":\"built\"}</ask_questionnaire>.\n2. After the user taps Start, you receive a chat message containing the questionnaire ID.\n3. Use read with the ID to fetch all questions; answer each with the answer tool.\n4. Call finish when done (fails if required questions are missing).\n5. Output <ask_questionnaire>{\"id\":\"<ID>\"}</ask_questionnaire> to present your answers.\n\n━━━━━ STATE MACHINE ━━━━━\n- Questionnaire: draft (building, AI cannot answer) → ready (AI can answer) → done (finished)\n- Question: unfilled → filled; filled questions can be re-answered with answer.\n\n━━━━━ STORAGE ━━━━━\n- JSON at /storage/emulated/0/Download/Operit/questionnaire/userask/<ID>.json (auto-created).\n\nanswer value format by type: single=option text(string); multiple=array of option texts; text/textarea=string; rating/likert/nps=number; time=HH:MM:SS string."
    },
    "category": "Utility",
    "enabledByDefault": true,
    "tools": [
        {
            "name": "built",
            "description": {
                "zh": "【第一步·必调】用户要求你发起问卷/出题时，必须首先调用本工具创建一个问卷草稿并获取问卷ID（ID 是后续一切操作的前提）。可选传 questions 预注册题目。拿到 ID 后发送 <ask_questionnaire>{\"id\":\"<问卷ID>\",\"state\":\"built\"}</ask_questionnaire> 让用户构建；用户出题后你再用 read/answer/finish 作答；完成后发送 <ask_questionnaire>{\"id\":\"<问卷ID>\",\"state\":\"complete\"}</ask_questionnaire> 呈现结果。记住：必须先调 built 拿到 ID，否则问卷无法建立。",
                "en": "【MUST CALL FIRST】When the user asks you to create/send a questionnaire, always call this tool FIRST to create a draft and obtain the questionnaire ID (the ID is prerequisite for everything). Optional questions param pre-registers questions. Then send <ask_questionnaire>{\"id\":\"<ID>\",\"state\":\"built\"}</ask_questionnaire> to let the user build; answer with read/answer/finish; finally send <ask_questionnaire>{\"id\":\"<ID>\",\"state\":\"complete\"}</ask_questionnaire> to present results. You MUST call built to get an ID before anything else."
            },
            "parameters": [
                {
                    "name": "title",
                    "description": {
                        "zh": "可选：草稿初始标题",
                        "en": "Optional: initial draft title"
                    },
                    "type": "string",
                    "required": false
                },
                {
                    "name": "questions",
                    "description": {
                        "zh": "可选：预注册题目 JSON 数组字符串，用户打开构建器后可看到并继续编辑/增删。每道题字段：type（single单选/multiple多选/text文本/textarea多行文本/rating评分）、question（题干，必填）、options（single/multiple 选项数组）、required（是否必答）、subtitle（副标题）。示例：[{\"type\":\"single\",\"question\":\"你最喜欢哪个颜色？\",\"options\":[\"红\",\"蓝\",\"绿\"],\"required\":true},{\"type\":\"text\",\"question\":\"请描述你的想法\"}]",
                        "en": "Optional: pre-registered questions JSON array string; visible in the builder for further editing. Fields per question: type (single/multiple/text/textarea/rating), question (required), options (for single/multiple), required, subtitle. Example: [{\"type\":\"single\",\"question\":\"Favorite color?\",\"options\":[\"Red\",\"Blue\",\"Green\"],\"required\":true},{\"type\":\"text\",\"question\":\"Describe your thoughts\"}]"
                    },
                    "type": "string",
                    "required": false
                }
            ]
        },
        {
            "name": "query",
            "description": {
                "zh": "搜索问卷（按标题关键词匹配，不传 keyword 返回全部问卷）。返回每个问卷的 ID/标题/状态/题目数/已答数，供 AI 定位要作答的问卷。注意：通常你不需要搜索——用户开始答题后聊天消息里会直接给你问卷ID。",
                "en": "Search questionnaires by title keyword (empty = list all). Returns ID/title/status/question count/answered count for each. Note: you usually don't need this - the ID comes in the chat message when the user starts."
            },
            "parameters": [
                {
                    "name": "keyword",
                    "description": {
                        "zh": "可选：搜索关键词，匹配问卷标题（不区分大小写）；不传则列出全部问卷",
                        "en": "Optional: search keyword matching the title (case-insensitive); omit to list all"
                    },
                    "type": "string",
                    "required": false
                }
            ]
        },
        {
            "name": "read",
            "description": {
                "zh": "读取问卷详情：标题、状态、全部题目（题型/选项/必答标记/当前答案/作答状态）。用于 AI 了解题目后逐题作答。注意每题含 allowOther 标记：true 表示该单选/多选允许\"其他\"自定义答案。",
                "en": "Read questionnaire details: title, status, all questions (type/options/required/current answer/status). Use to understand questions before answering. Each question includes allowOther flag: true means the single/multiple allows a free-form \"Other\" answer."
            },
            "parameters": [
                {
                    "name": "id",
                    "description": {
                        "zh": "问卷 ID（用户开始答题后聊天消息中的问卷ID）",
                        "en": "Questionnaire ID (from the chat message when the user starts)"
                    },
                    "type": "string",
                    "required": true
                }
            ]
        },
        {
            "name": "answer",
            "description": {
                "zh": "提交一道题的答案。value 格式按题型：single=选项文本(string，必须是选项之一，若题目 allowOther=true 可传\"其他:任意内容\")；multiple=选项文本数组(array，每项必须是选项之一)；text=单行字符串(不可含换行)；textarea=多行字符串；rating=1~5整数；time=HH:MM:SS 字符串。已填的题可以重复调用以重新作答。问卷处于 draft（未就绪）状态时不可作答。不合规的值会被校验拒绝。",
                "en": "Submit an answer for one question. value format by type: single=option text(string, must be one of options; if allowOther=true, \"Other:any text\" allowed); multiple=array of option texts (each must be an option); text=single-line string (no newline); textarea=multi-line string; rating=integer 1-5; time=HH:MM:SS string. Filled questions can be re-answered. Cannot answer while draft. Non-conforming values are rejected by validation."
            },
            "parameters": [
                {
                    "name": "id",
                    "description": {
                        "zh": "问卷 ID",
                        "en": "Questionnaire ID"
                    },
                    "type": "string",
                    "required": true
                },
                {
                    "name": "questionId",
                    "description": {
                        "zh": "题目 ID（read 返回的题目 id，如 q1/q2）",
                        "en": "Question ID (from read, e.g. q1/q2)"
                    },
                    "type": "string",
                    "required": true
                },
                {
                    "name": "value",
                    "description": {
                        "zh": "答案。按题型：single=选项文本(string)，必须是选项之一（若题目 allowOther=true 允许传\"其他:任意内容\"）；multiple=字符串，传 JSON 数组串如 [\"1\",\"2\"] 或逗号分隔如 \"1,2\"（每项必须是选项之一）；text=单行字符串(不可含换行)；textarea=多行字符串；rating=字符串数字如 \"3\"(1~5)。读题意外的值会被拒绝。",
                        "en": "Answer value. By type: single=option text(string, must be one of options; if the question allowOther=true, \"Other:any text\" is allowed); multiple=STRING - either a JSON array string like [\"1\",\"2\"] or comma-separated like \"1,2\" (each must be an option); text=single-line string (no newline); textarea=multi-line string; rating=string number like \"3\" (1-5). Values not matching will be rejected."
                    },
                    "type": "string",
                    "required": true
                }
            ]
        },
        {
            "name": "finish",
            "description": {
                "zh": "完成问卷：将问卷状态置为 done。若有必答题未作答会拒绝完成并列出缺失题目，补答后重新 finish。完成后即可输出 <ask_questionnaire>{\"id\":\"<问卷ID>\"}</ask_questionnaire> 向用户呈现作答结果。",
                "en": "Finish the questionnaire: sets status to done. Rejected if required questions are unanswered (they are listed); re-answer then finish again. After done, output <ask_questionnaire>{\"id\":\"<ID>\"}</ask_questionnaire> to present results."
            },
            "parameters": [
                {
                    "name": "id",
                    "description": {
                        "zh": "问卷 ID",
                        "en": "Questionnaire ID"
                    },
                    "type": "string",
                    "required": true
                }
            ]
        }
    ]
}
*/

// ask 子包入口（dist/ask.js）— 问卷询问工具
// 依赖编译产物：./ask/askcore.js（状态机）、./ask/askstore.js（存储）
var core = require("./ask/askcore.js");
var store = require("./ask/askstore.js");

function fmtAsk(ask) {
    var st = core.countStatus(ask);
    return {
        id: ask.id,
        title: ask.title,
        status: ask.status,
        total: st.total,
        answered: st.filled,
        unanswered: st.unfilled,
    };
}

// built：创建新草稿（供 AI 摇号拿 id，可预注册题目）
async function built(params) {
    try {
        await store.ensureDir();
        var title = params && params.title ? String(params.title) : "";
        var ask = core.newAsk(title);
        // 预注册题目：AI 可先置入题目，用户打开构建器后可见并继续编辑
        var qs = params && params.questions;
        if (qs) {
            if (typeof qs === "string") {
                try { qs = JSON.parse(qs); } catch (e) { qs = null; }
            }
            if (Array.isArray(qs)) {
                for (var qi = 0; qi < qs.length; qi++) {
                    var q = qs[qi];
                    if (q && q.question) {
                        core.addQuestion(ask, {
                            type: q.type || "text",
                            question: String(q.question),
                            subtitle: q.subtitle || "",
                            options: Array.isArray(q.options) ? q.options : [],
                            required: q.required === true,
                        });
                    }
                }
            }
        }
        var ok = await store.saveAsk(ask);
        if (!ok) return { success: false, error: "草稿创建失败（写入文件失败）" };
        return { success: true, id: ask.id, title: ask.title, status: ask.status, questions: core.describeQuestions(ask), message: "草稿已创建，请发送 <ask_questionnaire>{\"id\":\"" + ask.id + "\",\"state\":\"built\"}</ask_questionnaire> 让用户构建" };
    } catch (e) {
        return { success: false, error: "创建失败: " + String(e && e.message || e) };
    }
}

// query：按标题搜索问卷
async function query(params) {
    try {
        var keyword = params && params.keyword ? String(params.keyword).toLowerCase() : "";
        var ids = await store.listAskIds();
        var list = [];
        for (var i = 0; i < ids.length; i++) {
            var ask = await store.loadAsk(ids[i]);
            if (!ask) continue;
            if (keyword && String(ask.title || "").toLowerCase().indexOf(keyword) < 0) continue;
            list.push(fmtAsk(ask));
        }
        list.sort(function (a, b) { return b.id < a.id ? 1 : -1; });
        return { success: true, total: list.length, list: list };
    } catch (e) {
        return { success: false, error: "搜索失败: " + String(e && e.message || e) };
    }
}

// read：读取问卷详情
async function read(params) {
    try {
        var id = params && params.id ? String(params.id).trim() : "";
        if (!id || core.invalidAskId(id)) return { success: false, error: "问卷 ID 无效" };
        var ask = await store.loadAsk(id);
        if (!ask) return { success: false, error: "问卷不存在: " + id };
        var st = core.countStatus(ask);
        return {
            success: true,
            id: ask.id,
            title: ask.title,
            status: ask.status,
            total: st.total,
            answered: st.filled,
            unanswered: st.unfilled,
            questions: core.describeQuestions(ask),
        };
    } catch (e) {
        return { success: false, error: "读取失败: " + String(e && e.message || e) };
    }
}

// answer：提交/重填答案
async function answer(params) {
    try {
        var id = params && params.id ? String(params.id).trim() : "";
        var qid = params && params.questionId ? String(params.questionId).trim() : "";
        if (!id || core.invalidAskId(id)) return { success: false, error: "问卷 ID 无效" };
        if (!qid) return { success: false, error: "缺少 questionId" };
        var ask = await store.loadAsk(id);
        if (!ask) return { success: false, error: "问卷不存在: " + id };
        // value 参数固定以 string 传入（框架 schema 仅支持 string）。
        // 这里按题型把字符串"还原"成正确结构再交给 core 校验：
        //   - multiple：接受 JSON 数组字符串 或 逗号分隔串 → 数组
        //   - rating：接受字符串数字 → number
        //   - 其余：直接字符串
        var value = params.value;
        var qTarget = null;
        for (var qi = 0; qi < (ask.questions || []).length; qi++) {
            if (ask.questions[qi].id === qid) { qTarget = ask.questions[qi]; break; }
        }
        if (qTarget && qTarget.type === "multiple") {
            if (Array.isArray(value)) {
                // 已是数组则原样保留
            } else if (value !== null && value !== undefined) {
                var vs = String(value);
                var parsedArr = null;
                try {
                    var j = JSON.parse(vs);
                    if (Array.isArray(j)) parsedArr = j;
                } catch (e) {}
                if (parsedArr) value = parsedArr;
                else value = vs.split(/[,，、]/).map(function (s) { return s.trim(); }).filter(function (s) { return s; });
            }
        } else if (qTarget && qTarget.type === "rating") {
            if (typeof value !== "number" && value !== null && value !== undefined && value !== "") {
                var n = Number(value);
                if (!isNaN(n)) value = n;   // 字符串数字 → number
            }
        }
        var r = core.setAnswer(ask, qid, value);
        if (!r.ok) {
            // 组装可修正的错误指引：原因 + 该题上下文，让 AI 能据此重试
            var reason = r.message || "答案不符合该题要求";
            var q = r.q;
            var fix = "";
            if (q) {
                var t = q.type;
                if (t === "single") fix = "单选：value 须为 options 之一（" + (q.options || []).join("/") + "）" + (q.allowOther ? "，或 \"其他:任意内容\"" : "");
                else if (t === "multiple") fix = "多选：value 须为字符串数组，每项均在 options（" + (q.options || []).join("/") + "）内" + (q.allowOther ? "，或每项为 \"其他:内容\"" : "");
                else if (t === "text") fix = "单行：value 为不含换行的字符串";
                else if (t === "textarea") fix = "多行：value 为任意字符串";
                else if (t === "rating") fix = "评分：value 为 1~5 的整数";
                else if (t === "time") fix = "时间：value 为 HH:MM:SS 字符串";
                if (q.question) fix += "。题目：" + q.question;
            }
            return { success: false, error: reason + "。" + (fix ? "请按以下修正重试：" + fix : ""), question: q || null, questionId: r.questionId };
        }
        var ok = await store.saveAsk(ask);
        if (!ok) return { success: false, error: "答案保存失败（写入文件失败）" };
        return { success: true, message: r.message, questionId: r.questionId, status: r.status, questionnaireStatus: ask.status };
    } catch (e) {
        return { success: false, error: "提交失败: " + String(e && e.message || e) };
    }
}

// finish：完成问卷
async function finish(params) {
    try {
        var id = params && params.id ? String(params.id).trim() : "";
        if (!id || core.invalidAskId(id)) return { success: false, error: "问卷 ID 无效" };
        var ask = await store.loadAsk(id);
        if (!ask) return { success: false, error: "问卷不存在: " + id };
        var r = core.finishAsk(ask);
        if (!r.ok) return { success: false, error: r.message };
        var ok = await store.saveAsk(ask);
        if (!ok) return { success: false, error: "状态保存失败（写入文件失败）" };
        return { success: true, message: r.message, id: ask.id, status: ask.status, finishedAt: ask.finishedAt };
    } catch (e) {
        return { success: false, error: "完成失败: " + String(e && e.message || e) };
    }
}

var toolImpl = {
    built: built,
    query: query,
    read: read,
    answer: answer,
    finish: finish,
};

function main() {
    complete({
        success: true,
        message: "问卷询问子包已加载：用户出题，AI 作答。工具：query（搜索问卷）/ read（读题）/ answer（作答，可重填）/ finish（完成）。渲染标签：<ask_questionnaire>。",
        tools: Object.keys(toolImpl),
    });
}

globalThis.__askTools = toolImpl;
module.exports = { built: built, query: query, read: read, answer: answer, finish: finish, main: main };
