/* METADATA
{
    "name": "ask",
    "display_name": {
        "zh": "回答问卷",
        "en": "Answer Questionnaire"
    },
    "description": {
        "zh": "回答问卷 - questionnaire 系的第二个工具：用户向 AI 出题，AI 通过工具作答。流程：1) AI 输出 <ask_questionnaire>（无 id 时为构建模式），用户构建问卷并点击「开始答题」，系统会把问卷 ID 通过聊天消息发送给 AI；2) AI 使用本子包工具作答：query（按标题搜索问卷，也可不搜，直接用消息中的问卷ID）、read（读取问卷与题目详情）、answer（提交答案，可重复修改）、finish（完成问卷，必答题未填会拒绝）；3) AI 完成后再输出 <ask_questionnaire>{\"id\":\"<问卷ID>\"}</ask_questionnaire> 呈现作答结果给用户。\n\n━━━━━━ AI 使用手册：问卷询问 ━━━━━━\n1. 用户想要向你出题时，输出 <ask_questionnaire>{\"title\":\"<标题>\"}</ask_questionnaire> 或直接 <ask_questionnaire></ask_questionnaire>，渲染后用户会看到题目构建器。\n2. 用户构建完问卷点击「开始答题」后，你会在聊天中收到一条消息，包含问卷ID。\n3. 用 read 传入问卷ID 读取问卷全部题目（含题型/选项/必答标记），逐题用 answer 提交答案。\n4. 所有题目作答完毕后调用 finish 完成问卷（有必答题未填会报错，补答后再 finish）。\n5. 完成后输出 <ask_questionnaire>{\"id\":\"<问卷ID>\"}</ask_questionnaire> 呈现你的作答结果。\n\n━━━━━━ 状态机 ━━━━━━\n- 问卷状态：draft（未完成，用户构建中，AI 不可作答）→ ready（已就绪，AI 可作答）→ done（已完成）\n- 题目状态：unfilled（未填）→ filled（已填）；filled 的题可随时用 answer 重新填写。\n\n━━━━━━ 数据存储 ━━━━━━\n- 问卷 JSON 保存在 /storage/emulated/0/Download/Operit/questionnaire/userask/<问卷ID>.json（目录不存在会自动创建）\n\n注意：answer 的 value 格式按题型：single=选项文本(string)；multiple=选项文本数组(array)；text/textarea=字符串；rating/likert/nps=数字；time=HH:MM:SS 字符串。",
        "en": "Answer Questionnaire : the USER sets questions, the AI answers them via tools. Flow: 1) AI outputs <ask_questionnaire> (no id = build mode), user builds questions and taps Start; the system sends the questionnaire ID to AI via chat. 2) AI answers with tools: query (search by title; optional, the ID is in the chat message), read (fetch questions), answer (submit, re-submittable), finish (complete; required questions must be answered). 3) AI outputs <ask_questionnaire>{\"id\":\"<ID>\"}</ask_questionnaire> to present results.\n\n━━━━━ AI MANUAL: ASK QUESTIONNAIRE ━━━━━\n1. When the user wants to quiz you, output <ask_questionnaire>{\"title\":\"<title>\"}</ask_questionnaire> or just <ask_questionnaire></ask_questionnaire>; the user sees a question builder.\n2. After the user taps Start, you receive a chat message containing the questionnaire ID.\n3. Use read with the ID to fetch all questions; answer each with the answer tool.\n4. Call finish when done (fails if required questions are missing).\n5. Output <ask_questionnaire>{\"id\":\"<ID>\"}</ask_questionnaire> to present your answers.\n\n━━━━━ STATE MACHINE ━━━━━\n- Questionnaire: draft (building, AI cannot answer) → ready (AI can answer) → done (finished)\n- Question: unfilled → filled; filled questions can be re-answered with answer.\n\n━━━━━ STORAGE ━━━━━\n- JSON at /storage/emulated/0/Download/Operit/questionnaire/userask/<ID>.json (auto-created).\n\nanswer value format by type: single=option text(string); multiple=array of option texts; text/textarea=string; rating/likert/nps=number; time=HH:MM:SS string."
    },
    "category": "Utility",
    "enabledByDefault": true,
    "tools": [
        {
            "name": "built",
            "description": {
                "zh": "创建一个新的问卷草稿（status=draft）并返回问卷 ID。可传 questions 预注册题目（用户打开构建器后可见并继续编辑）。AI 拿到 ID 后发送 <ask_questionnaire>{\"id\":\"<问卷ID>\",\"state\":\"built\"}</ask_questionnaire> 让用户构建；用户出题后 AI 用 read/answer/finish 作答；完成后发送 <ask_questionnaire>{\"id\":\"<问卷ID>\",\"state\":\"complete\"}</ask_questionnaire>（或只带 id）呈现结果。空 XML/空 JSON 渲染时同样进入 built 构建模式。",
                "en": "Create a new questionnaire draft (status=draft) and return its ID. Optional questions param pre-registers questions (visible/editable in the builder). Then send <ask_questionnaire>{\"id\":\"<ID>\",\"state\":\"built\"}</ask_questionnaire>; answer with read/answer/finish; finally send <ask_questionnaire>{\"id\":\"<ID>\",\"state\":\"complete\"}</ask_questionnaire> (or just id). Empty XML/JSON also enters built mode."
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
                "zh": "读取问卷详情：标题、状态、全部题目（题型/选项/必答标记/当前答案/作答状态）。用于 AI 了解题目后逐题作答。",
                "en": "Read questionnaire details: title, status, all questions (type/options/required/current answer/status). Use to understand questions before answering."
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
                "zh": "提交一道题的答案。value 格式按题型：single=选项文本(string)；multiple=选项文本数组(array)；text/textarea=字符串；rating=数字(1-5)；time=HH:MM:SS 字符串。已填的题可以重复调用以重新作答。问卷处于 draft（未就绪）状态时不可作答。",
                "en": "Submit an answer for one question. value format by type: single=option text(string); multiple=array of option texts; text/textarea=string; rating=number(1-5); time=HH:MM:SS string. Filled questions can be re-answered. Cannot answer while the questionnaire is draft."
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
                        "zh": "答案。按题型：single=选项文本(string)；multiple=选项文本数组(array)；text/textarea=字符串；rating=数字(1-5)；time=HH:MM:SS 字符串",
                        "en": "Answer value. By type: single=option text(string); multiple=array; text/textarea=string; rating=number(1-5); time=HH:MM:SS string"
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
        var r = core.setAnswer(ask, qid, params.value);
        if (!r.ok) return { success: false, error: r.message };
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
