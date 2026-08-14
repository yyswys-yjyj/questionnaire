// @ts-nocheck
// askcore — 问卷询问（userask）状态机核心逻辑
// 问卷状态：draft（未完成，用户构建中）→ ready（已就绪，AI 可作答）→ done（AI 已完成）
// 题目状态：unfilled（未填）→ filled（已填）；filled 可被 answer 工具重新填写

// 生成问卷 ID
export function genAskId() {
    return "ask_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

// 新建问卷（draft）
export function newAsk(title) {
    var now = Date.now();
    return {
        id: genAskId(),
        title: title || "",
        status: "draft",
        questions: [],
        createdAt: now,
        updatedAt: now,
        finishedAt: null,
    };
}

// 生成题目 id（q1, q2, ...）
export function genQuestionId(ask) {
    return "q" + (ask.questions.length + 1);
}

// 添加题目（返回新题目）
export function addQuestion(ask, q) {
    var now = Date.now();
    var nq = {
        id: q.id || genQuestionId(ask),
        type: q.type || "text",
        question: q.question || "",
        subtitle: q.subtitle || "",
        options: Array.isArray(q.options) ? q.options.slice() : [],
        required: q.required === true,
        allowOther: q.allowOther === true,   // 单选/多选启用"其他"
        answer: null,
    };
    ask.questions.push(nq);
    ask.updatedAt = now;
    return nq;
}

// 删除题目
export function removeQuestion(ask, qid) {
    ask.questions = ask.questions.filter(function (q) { return q.id !== qid; });
    ask.updatedAt = Date.now();
}

// 答案是否已填
export function isFilled(ans) {
    if (ans === undefined || ans === null) return false;
    if (typeof ans === "string") return ans.trim() !== "";
    if (Array.isArray(ans)) return ans.length > 0;
    return true;
}

// 题目状态：unfilled / filled
export function questionStatus(q) {
    return isFilled(q.answer) ? "filled" : "unfilled";
}

// 统计已填/未填数
export function countStatus(ask) {
    var filled = 0, unfilled = 0;
    for (var i = 0; i < ask.questions.length; i++) {
        if (questionStatus(ask.questions[i]) === "filled") filled++;
        else unfilled++;
    }
    return { filled: filled, unfilled: unfilled, total: ask.questions.length };
}

// 设置答案（可反复重填）。返回 { ok, message, question? }
// 按题型校验 value 合法性：
//  - single：字符串，必须命中 options；若 allowOther 开启，允许 "其他xxx" 自定义项
//  - multiple：字符串数组，每项必须命中 options
//  - text（单行）：字符串，不得含换行
//  - textarea（多行）：任意字符串
//  - rating：1~5 的数字
export function setAnswer(ask, qid, value) {
    if (ask.status === "draft") {
        return { ok: false, message: "问卷尚未就绪（status=draft），请等待用户开始答题后再作答" };
    }
    var q = null;
    for (var i = 0; i < ask.questions.length; i++) {
        if (ask.questions[i].id === qid) { q = ask.questions[i]; break; }
    }
    if (!q) return { ok: false, message: "题目不存在: " + qid };

    var err = validateAnswer(q, value);
    if (err) return { ok: false, message: err, questionId: qid, status: questionStatus(q), q: describeQuestion(q) };

    q.answer = value;
    ask.updatedAt = Date.now();
    return { ok: true, message: "已填写", questionId: qid, status: questionStatus(q) };
}

// 校验某题型的 value。返回错误信息字符串，null 表示通过。
export function validateAnswer(q, value) {
    var type = q.type;
    if (type === "single") {
        if (typeof value !== "string") return "单选题答案必须是字符串";
        var opts = Array.isArray(q.options) ? q.options : [];
        if (opts.indexOf(value) >= 0) return null;
        // allowOther 开启：允许 "其他" 前缀的自定义项
        if (q.allowOther && /^其他[:：]?/.test(value) && value.replace(/^其他[:：]?/, "").trim() !== "") return null;
        return "单选题答案必须是选项之一: " + (opts.join(" / ") || "（无选项）") + (q.allowOther ? "，或“其他自定义内容”" : "");
    }
    if (type === "multiple") {
        if (!Array.isArray(value)) return "多选题答案必须是字符串数组";
        var mopts = Array.isArray(q.options) ? q.options : [];
        for (var i = 0; i < value.length; i++) {
            var it = value[i];
            if (typeof it !== "string") return "多选题答案每项必须是字符串";
            if (mopts.indexOf(it) < 0 && !(q.allowOther && /^其他[:：]?/.test(it) && it.replace(/^其他[:：]?/, "").trim() !== "")) {
                return "多选题存在非选项项: " + it;
            }
        }
        return null;
    }
    if (type === "text") {
        if (typeof value !== "string") return "单行文本答案必须是字符串";
        if (/\r?\n/.test(value)) return "单行文本答案不能包含换行";
        return null;
    }
    if (type === "textarea") {
        if (typeof value !== "string") return "多行文本答案必须是字符串";
        return null;
    }
    if (type === "rating") {
        var n = Number(value);
        if (typeof value !== "number" || isNaN(n) || n < 1 || n > 5 || n !== Math.floor(n)) {
            return "评分题答案必须是 1~5 的整数";
        }
        return null;
    }
    // 未知题型：放行
    return null;
}

// 完成问卷（status → done）。必答题未填时拒绝完成。
export function finishAsk(ask) {
    if (ask.status === "draft") {
        return { ok: false, message: "问卷尚未就绪，无法完成" };
    }
    var missing = [];
    for (var i = 0; i < ask.questions.length; i++) {
        var q = ask.questions[i];
        if (q.required && !isFilled(q.answer)) missing.push(q.id + " " + (q.question || ""));
    }
    if (missing.length > 0) {
        return { ok: false, message: "还有必答题未作答: " + missing.join("；"), missing: missing };
    }
    ask.status = "done";
    ask.finishedAt = Date.now();
    ask.updatedAt = Date.now();
    return { ok: true, message: "问卷已完成" };
}

// 序列化输出给工具（read）：返回题目列表（含答案）
export function describeQuestions(ask) {
    return ask.questions.map(function (q) {
        return describeQuestion(q);
    });
}

// 序列化单题（供 read 与校验失败回传给 AI 修正）
function describeQuestion(q) {
    return {
        id: q.id,
        type: q.type,
        question: q.question,
        subtitle: q.subtitle,
        options: q.options,
        required: q.required,
        allowOther: !!q.allowOther,
        answer: q.answer,
        status: questionStatus(q),
        };
}

// 校验问卷 id 合法性
export function invalidAskId(id) {
    return !id || id.length > 64 || !/^[a-zA-Z0-9_\-]+$/.test(id);
}