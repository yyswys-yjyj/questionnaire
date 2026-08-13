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
export function setAnswer(ask, qid, value) {
    if (ask.status === "draft") {
        return { ok: false, message: "问卷尚未就绪（status=draft），请等待用户开始答题后再作答" };
    }
    var q = null;
    for (var i = 0; i < ask.questions.length; i++) {
        if (ask.questions[i].id === qid) { q = ask.questions[i]; break; }
    }
    if (!q) return { ok: false, message: "题目不存在: " + qid };
    q.answer = value;
    ask.updatedAt = Date.now();
    return { ok: true, message: "已填写", questionId: qid, status: questionStatus(q) };
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
        return {
            id: q.id,
            type: q.type,
            question: q.question,
            subtitle: q.subtitle,
            options: q.options,
            required: q.required,
            answer: q.answer,
            status: questionStatus(q),
        };
    });
}

// 校验问卷 id 合法性
export function invalidAskId(id) {
    return !id || id.length > 64 || !/^[a-zA-Z0-9_\-]+$/.test(id);
}