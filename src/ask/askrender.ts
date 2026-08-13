// @ts-nocheck
// askrender — <ask_questionnaire> XML 渲染处理（main 上下文）
// 无 id / mode=build → 构建模式（用户构建问卷，新草稿）
// 有 id → 呈现模式（加载 userask/<id>.json：draft 继续构建 / ready 答题进度 / done 结果）
// 数据在渲染前同步预读塞进 state，UI 开箱即渲染

import ask_ui from "../ui/ask.ui.js";

var ASK_DIR = "/sdcard/Download/Operit/questionnaire/userask";

function simpleHash(input) {
    if (!input) return "empty";
    var hash = 0;
    for (var i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) | 0;
    return "ask" + (hash >>> 0);
}

// main 上下文同步读文件（含行号过滤）
function syncReadAsk(id) {
    if (!id) return null;
    try {
        var path = ASK_DIR + "/" + id + ".json";
        var raw = NativeInterface.callTool("", "read_file", JSON.stringify({ path: path }));
        if (!raw) return null;
        var obj = typeof raw === "string" ? JSON.parse(raw) : raw;
        var content = (obj && obj.data && obj.data.content) || (obj && obj.content) || null;
        if (content && typeof content !== "string") content = JSON.stringify(content);
        if (!content) return null;
        content = String(content).replace(/^\s*\d+\|/gm, "");
        var parsed = JSON.parse(content);
        return parsed && parsed.id ? parsed : null;
    } catch (e) {
        return null;
    }
}

function parseAttrs(attrStr) {
    var attrs = {};
    var re = /([\w-]+)\s*=\s*"([^"]*)"/g;
    var m;
    while ((m = re.exec(attrStr)) !== null) { attrs[m[1]] = m[2]; }
    var re2 = /([\w-]+)\s*=\s*'([^']*)'/g;
    while ((m = re2.exec(attrStr)) !== null) { attrs[m[1]] = m[2]; }
    return attrs;
}

export function onAskXmlRender(event) {
    var payload = event.eventPayload || {};
    if (payload.tagName !== "ask_questionnaire") return { handled: false };

    var xmlContent = String(payload.xmlContent || "");
    var askId = "";
    var title = "";
    var mode = "";
    var state = "";

    // 属性写法 <ask_questionnaire id="xxx" title="..."/>
    var attrs = {};
    var outerMatch = xmlContent.match(/<ask_questionnaire\s+([^>]*)>/i);
    if (outerMatch) attrs = parseAttrs(outerMatch[1]);

    // 内部 JSON <ask_questionnaire>{"id":"...","title":"...","mode":"..."}</ask_questionnaire>
    var jsonError = "";
    var contentMatch = xmlContent.match(/<ask_questionnaire[^>]*>([\s\S]*?)<\/ask_questionnaire>/i);
    if (contentMatch) {
        var inner = contentMatch[1].trim();
        if (inner) {
            try {
                var parsed = JSON.parse(inner);
                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                    if (parsed.id) askId = String(parsed.id);
                    if (parsed.title) title = String(parsed.title);
                    if (parsed.mode) mode = String(parsed.mode);
                    if (parsed.state) state = String(parsed.state);
                } else {
                    jsonError = "JSON 内容格式不正确，已忽略";
                }
            } catch (e) {
                jsonError = "JSON 解析失败，已忽略: " + String(e && e.message || e);
            }
        }
    }
    if (!askId && attrs.id) askId = attrs.id;
    if (!title && attrs.title) title = attrs.title;
    if (!mode && attrs.mode) mode = attrs.mode;
    if (!state && attrs.state) state = attrs.state;

    // state 规范化：只认 built / complete，其余一律 complete
    // 仅含 id（无 state 或 state 非法）→ complete（呈现结果）
    if (state !== "built" && state !== "complete") {
        state = askId ? "complete" : "built";
    }
    // 无 id 时不可能展示结果，强制 built
    if (!askId) state = "built";

    // 预读问卷状态（呈现模式）
    var ask = askId ? syncReadAsk(askId) : null;
    var chatId = (typeof getChatId === "function") ? (String(getChatId() || "")) : "";
    var sessionId = String(Date.now());

    // 无 id（构建模式）：自动分配稳定草稿 ID —— 基于 chatId 派生，同一聊天中第一次出现后保持不变
    // 逻辑：优先用 XML 传入的 id；否则若指定 mode=build 或纯构建，生成 chatId 派生的草稿 ID
    if (!askId && mode !== "load") {
        var cHash = simpleHash("ask_draft_" + (chatId || "new"));
        askId = "ask_draft_" + (chatId.substring(0, 6) || "chat") + "_" + (cHash >>> 0).toString(36);
        // 已存在该草稿则自动加载
        ask = syncReadAsk(askId) || ask;
    }

    var data = {
        mode: mode,
        state: state,
        askId: askId,
        title: ask && ask.title ? ask.title : title,
        ask: ask ? JSON.stringify(ask) : null,
        loaded: !!ask,
        sessionId: sessionId,
        jsonError: jsonError,
    };

    var fp = simpleHash("ask_" + (askId || "new") + "_" + sessionId);

    return {
        handled: true,
        composeDsl: {
            screen: ask_ui,
            state: {
                _data: JSON.stringify(data),
                _chatId: chatId,
                _sessionId: sessionId,
                _askId: askId,
                _mode: state,
                _title: title,
                _questions: ask && ask.questions ? JSON.stringify(ask.questions) : "[]",
                _askStatus: ask ? ask.status : "",
                _banner: "",
                _bannerErr: false,
                _adding: false,
                _addType: "single",
                _addQuestion: "",
                _addOptions: "",
                _addRequired: false,
                _saved: false,
                _jsonError: jsonError,
            },
            memo: { fingerprint: fp },
            moduleSpec: { id: "ask_" + fp, runtime: "compose_dsl" },
        },
    };
}