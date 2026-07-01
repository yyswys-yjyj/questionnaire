// @ts-nocheck
import questionnaire_ui from "./ui/questionnaire.ui.js";
import settings_ui from "./ui/settings.ui.js";

var _userMsgCount = {};
var _sessionId = Date.now();

function readThemeFromEnv() {
    if (typeof getEnv !== "function") return "classic";
    try {
        var envT = getEnv("QUESTIONNAIRE_THEME");
        if (envT === "classic" || envT === "compact") return envT;
    } catch (e) {}
    return "classic";
}

function registerToolPkg() {
    try {
        var envT = getEnv("QUESTIONNAIRE_THEME");
        if (envT === "classic" || envT === "compact") _theme = envT;
    } catch (e) {}

    ToolPkg.registerXmlRenderPlugin({ id: "questionnaire_xml", tag: "questionnaire", function: onXmlRender });
    ToolPkg.registerMessageProcessingPlugin({ id: "questionnaire_message", function: onMessageProcessing });

    ToolPkg.ipc.on("questionnaire.check_expired", function (payload) { return { expired: true }; });

    ToolPkg.ipc.on("qn.get_theme", function () { return { theme: _theme }; });
    ToolPkg.ipc.on("qn.set_theme", function (payload) {
        if (payload && payload.theme) {
            _theme = payload.theme;
            try { Tools.SoftwareSettings.writeEnvironmentVariable("QUESTIONNAIRE_THEME", _theme); } catch (e) {}
        }
        return { theme: _theme };
    });

    ToolPkg.registerToolboxUiModule({
        id: "questionnaire_settings",
        runtime: "compose_dsl",
        screen: settings_ui,
        params: {},
        title: { zh: "问卷主题设置", en: "Questionnaire Theme" },
    } as any);
    return true;
}

function onMessageProcessing(params) {
    var content = params.messageContent;
    var chatId = params.chatId;
    if (!content || params.probeOnly || !chatId) return { matched: false };
    if (content.indexOf("</questionnaire>") >= 0) return { matched: false };
    if (content.indexOf("📋") === 0) return { matched: false };
    _userMsgCount[chatId] = (_userMsgCount[chatId] || 0) + 1;
    return { matched: false };
}

function onXmlRender(event) {
    var payload = event.eventPayload || {};
    if (payload.tagName !== "questionnaire") return { handled: false };

    // 读取显示模式
    var displayMode = "normal";
    try { var dm = getEnv("QUESTIONNAIRE_DISPLAY_MODE"); if (dm === "hidden" || dm === "blocked" || dm === "normal") displayMode = dm; } catch (e) {}
    var strictMode = true;
    try { var sm = getEnv("QUESTIONNAIRE_STRICT_MODE"); if (sm === "true" || sm === true) strictMode = true; else if (sm === "false" || sm === false) strictMode = false; } catch (e) {}
    if (displayMode === "hidden") {
        return { handled: true, text: "" };
    }
    if (displayMode === "blocked") {
        var blockedData = { title: "(问卷已被拦截)", questions: [], _hasInvalid: true, _invalidQuestions: ["问卷已被拦截：当前设置为拦截模式，问卷不会显示。"], _blockedMode: true, _blockedXml: xmlContent };
        var blockedFp = "blocked_" + simpleHash(xmlContent);
        return { handled: true, composeDsl: { screen: questionnaire_ui, state: { _data: JSON.stringify(blockedData), _chatId: (typeof getChatId === "function") ? getChatId() : "", _msgAtCreation: 0, _sessionId: String(_sessionId), _answers: "{}", _submitted: false, _expired: false, _collapsed: false, _collapsedForce: false, _otherInputs: "{}", _errorMsg: "", _infoOpen: false, _fingerprint: blockedFp }, memo: { fingerprint: blockedFp }, moduleSpec: { id: "qn_" + blockedFp, runtime: "compose_dsl" } } };
    }

    var xmlContent = String(payload.xmlContent || "");
    if (xmlContent.indexOf("</questionnaire>") < 0) {
        // 检查是否有以 </q 开头但拼错的闭合标签
        var wrongCloseMatch = xmlContent.match(/<\/q[a-z]*>/i);
        if (wrongCloseMatch) {
            var wrongTag = wrongCloseMatch[0];
            var invalidData = {
                title: "(标签错误)",
                questions: [],
                _hasInvalid: true,
                _invalidQuestions: ["XML 标签错误：使用了 \"" + wrongTag + "\" 作为闭合标签，正确应为 </questionnaire>"],
            };
            var invalidFp = simpleHash(xmlContent + "_wrong_close");
            return { handled: true, composeDsl: { screen: questionnaire_ui, state: { _data: JSON.stringify(invalidData), _chatId: (typeof getChatId === "function") ? getChatId() : "", _msgAtCreation: 0, _sessionId: String(_sessionId), _answers: "{}", _submitted: false, _expired: false, _collapsed: false, _collapsedForce: false, _otherInputs: "{}", _errorMsg: "", _infoOpen: false, _fingerprint: invalidFp }, memo: { fingerprint: invalidFp }, moduleSpec: { id: "questionnaire_" + invalidFp, runtime: "compose_dsl" } } };
        }
        return { handled: true, text: "📋 表单制作中..." };
    }

    var inner = xmlContent;
    var tagMatch = xmlContent.match(/<questionnaire[^>]*>([\s\S]*?)<\/questionnaire>/i);
    if (tagMatch) inner = tagMatch[1].trim();

    // 提取 questionnaire 标签的属性（兼容属性写法）
    var outerAttrs = {};
    var outerTagMatch = xmlContent.match(/<questionnaire\s+([^>]*)>/i);
    if (outerTagMatch) {
        var attrStr = outerTagMatch[1];
        var attrRe = /([\w-]+)\s*=\s*\"([^\"]*)\"/g;
        var am;
        while ((am = attrRe.exec(attrStr)) !== null) { outerAttrs[am[1]] = am[2]; }
        var attrRe2 = /([\w-]+)\s*=\s*'([^']*)'/g;
        while ((am = attrRe2.exec(attrStr)) !== null) { outerAttrs[am[1]] = am[2]; }
    }

    // 提取 <resultcode> 子标签内容
    var resultCodeStr = '';
    var rcTagMatch = inner.match(/<resultcode>([\s\S]*?)<\/resultcode>/i);
    if (rcTagMatch) {
        resultCodeStr = rcTagMatch[1].trim();
        // 从 inner 中移除 <resultcode> 标签后，再解析 JSON
        inner = inner.replace(/<resultcode>[\s\S]*?<\/resultcode>/i, '').trim();
    }
    
    var data = null;
    var parseError = "";
    try { data = JSON.parse(inner); } catch (e) { parseError = String(e); }
    
    // 如果提取到了 resultcode 子标签，注入到 data 中
    if (resultCodeStr && data) {
        data.resultcode = resultCodeStr;
    }

    // JSON 解析失败时检测是否用了属性写法
    if ((parseError || !data || !data.questions || !Array.isArray(data.questions) || data.questions.length === 0) && outerAttrs.title) {
        parseError = "不支持的属性写法：请在 <questionnaire> 标签内使用标准 JSON 格式，不要将 title/questions 等作为标签属性。正确示例：<questionnaire>{\\\"title\\\":\\\"问卷标题\\\",\\\"questions\\\":[...]}</questionnaire>";
        data = null;
    }

    if (parseError || !data || !data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        var invalidData = { title: data && data.title ? data.title : "(解析失败)", questions: [], _hasInvalid: true, _invalidQuestions: parseError ? ["JSON 语法错误: " + parseError] : ["问卷数据为空或格式不正确"] };
        var invalidFp = simpleHash(inner + "_invalid");
        return { handled: true, composeDsl: { screen: questionnaire_ui, state: { _data: JSON.stringify(invalidData), _chatId: (typeof getChatId === "function") ? getChatId() : "", _msgAtCreation: 0, _sessionId: String(_sessionId), _answers: "{}", _submitted: false, _expired: false, _collapsed: false, _collapsedForce: false, _otherInputs: "{}", _errorMsg: "", _infoOpen: false, _fingerprint: invalidFp }, memo: { fingerprint: invalidFp }, moduleSpec: { id: "questionnaire_" + invalidFp, runtime: "compose_dsl" } } };
    }

    var missingIdArray = [];
    for (var qi = 0; qi < data.questions.length; qi++) {
        var q = data.questions[qi];
        if (q.type === "section") continue;
        if (!q.id || String(q.id).trim() === "") missingIdArray.push(q.question || ("第" + (qi + 1) + "题"));
    }

    var validTypes = { section: true, single: true, multiple: true, text: true, textarea: true, rating: true, likert: true, nps: true, time: true };
    var needsOptions = { single: true, multiple: true, likert: true };
    var allowedFieldNames = { type: true, question: true, options: true, required: true, subtitle: true, enableOther: true, id: true };
    var validationErrors = [];
    for (var vi = 0; vi < data.questions.length; vi++) {
        var vq = data.questions[vi], vqIdx = vi + 1;
        // 宽松模式下跳过部分非致命检查
        if (strictMode) {
            // 检测不认识的字段
            for (var vfk in vq) {
                if (!allowedFieldNames[vfk]) {
                    validationErrors.push("第" + vqIdx + "题存在不支持的字段 '" + vfk + "'，正确字段名：type/question/options/required/subtitle/enableOther/id");
                    break;
                }
            }
            if (vq.type && !validTypes[vq.type]) validationErrors.push("第" + vqIdx + "题 type 不合法: " + vq.type);
            if (needsOptions[vq.type] && (!vq.options || !Array.isArray(vq.options) || vq.options.length < 2)) validationErrors.push("第" + vqIdx + "题（" + vq.type + "）选项不足");
            if (vq.enableOther === true && vq.type !== "single") validationErrors.push("第" + vqIdx + "题 enableOther 仅支持 single 题型");
            if (vq.required === true && vq.type === "section") validationErrors.push("第" + vqIdx + "题 section 类型不能设置 required");
            if (vq.type === "text" && vq.options) validationErrors.push("第" + vqIdx + "题（text）不应有 options 字段");
            else if (vq.type === "rating" && vq.options) validationErrors.push("第" + vqIdx + "题（rating）不应有 options 字段");
            else if (vq.type === "nps" && vq.options) validationErrors.push("第" + vqIdx + "题（nps）不应有 options 字段");
        }
        // 两个模式都检查：question 为空、缺少 id
        if (vq.type && vq.type !== "section" && (!vq.question || String(vq.question).trim() === "")) validationErrors.push("第" + vqIdx + "题 question 为空");
    }

    data._hasInvalid = missingIdArray.length > 0 || validationErrors.length > 0;
    data._hasMissingIds = missingIdArray.length > 0;
    data._invalidQuestions = validationErrors.concat(missingIdArray);
    data._theme = _theme;
    var btnLayout = "scroll";
    try { var bl = getEnv("QUESTIONNAIRE_BUTTON_LAYOUT"); if (bl === "row" || bl === "scroll") btnLayout = bl; } catch (e) {}
    data._buttonLayout = btnLayout;
    var timeInputMode = "picker";
    try { var ti = getEnv("QUESTIONNAIRE_TIME_INPUT_MODE"); if (ti === "picker" || ti === "input") timeInputMode = ti; } catch (e) {}
    data._timeInputMode = timeInputMode;

    // resultcode 和 result 互斥
    if (data.count === true && data.resultcode !== undefined && data.result !== undefined) {
        data._hasInvalid = true;
        data._invalidQuestions = data._invalidQuestions.concat(["resultcode 和 result 不能同时存在，请只使用其中一个"]);
    }
    if (data.count === true && data.result !== undefined && data.result !== null) {
        if (typeof data.result === "string") {
            data._hasInvalid = true;
            data._invalidQuestions = data._invalidQuestions.concat(["result 格式错误：result 必须是二维数组"]);
        } else if (Array.isArray(data.result)) {
            var resultErrors = [];
            for (var ri = 0; ri < data.result.length; ri++) {
                var group = data.result[ri];
                if (!Array.isArray(group)) { resultErrors.push('第' + (ri + 1) + '组不是数组'); continue; }
                for (var ci = 0; ci < group.length; ci++) {
                    var exprStr = String(group[ci]);
                    if (exprStr.indexOf('?') < 0) resultErrors.push('第' + (ri + 1) + '组第' + (ci + 1) + '个缺少?');
                }
            }
            // 检测表达式引用了不存在的变量
            if (resultErrors.length === 0) {
                var allRefVars = {};
                for (var rvi = 0; rvi < data.result.length; rvi++) {
                    var rvGroup = data.result[rvi];
                    if (!Array.isArray(rvGroup)) continue;
                    for (var rci = 0; rci < rvGroup.length; rci++) {
                        var rvExpr = String(rvGroup[rci]);
                        var rvMatch = rvExpr.match(/[a-zA-Z_]\w*/g);
                        if (rvMatch) {
                            for (var rmi = 0; rmi < rvMatch.length; rmi++) {
                                var rvv = rvMatch[rmi];
                                if (rvv === 'num' || rvv === 'text') continue;
                                allRefVars[rvv] = true;
                            }
                        }
                    }
                }
                var qIdSet = {};
                for (var qsi = 0; qsi < data.questions.length; qsi++) {
                    var qs = data.questions[qsi];
                    if (qs.id) qIdSet[qs.id] = true;
                }
                var missingVars = [];
                for (var vr in allRefVars) {
                    if (!qIdSet[vr]) missingVars.push(vr);
                }
                if (missingVars.length > 0) {
                    resultErrors.push('引用了不存在的变量: ' + missingVars.join(', '));
                }
            }
            if (resultErrors.length > 0) { data._hasInvalid = true; data._invalidQuestions = data._invalidQuestions.concat(["结果表达式语法错误: " + resultErrors.join("; ")]); }
        } else { data._hasInvalid = true; data._invalidQuestions = data._invalidQuestions.concat(["result 格式错误"]); }
    }

    var fingerprint = simpleHash(inner);
    var chatId = (typeof getChatId === "function") ? getChatId() : "";
    var currentMsgCount = _userMsgCount[chatId] || 0;
    return { handled: true, composeDsl: { screen: questionnaire_ui, state: { _data: JSON.stringify(data), _chatId: chatId, _msgAtCreation: currentMsgCount, _sessionId: String(_sessionId), _answers: "{}", _submitted: false, _expired: false, _collapsed: false, _collapsedForce: false, _otherInputs: "{}", _errorMsg: "", _infoOpen: false, _fingerprint: fingerprint }, memo: { fingerprint: fingerprint }, moduleSpec: { id: "questionnaire_" + fingerprint, runtime: "compose_dsl" } } };
}function simpleHash(input) {
    if (!input) return "empty";
    var hash = 0;
    for (var i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) | 0;
    return "qn" + (hash >>> 0);
}

function tryParseAttributes(attrs, innerXml, fullXml) {
    var data = { title: attrs.title || "问卷", questions: [] };
    if (attrs.count === "true" || attrs.count === true) data.count = true;
    if (attrs.output_raw !== undefined) data.output_raw = attrs.output_raw === "true";
    if (attrs.result) {
        try { data.result = JSON.parse(attrs.result); } catch (e) { data.result = attrs.result; }
    }
    if (attrs.questions) {
        try {
            var parsed = JSON.parse(attrs.questions);
            if (Array.isArray(parsed)) data.questions = parsed;
        } catch (e) {}
    }
    var qTagRe = /<question\s+([^>]*?)(\/?>)/gi;
    var qm;
    while ((qm = qTagRe.exec(fullXml)) !== null) {
        var qAttrs = {};
        var attrRe = /([\w-]+)\s*=\s*\"([^\"]*)\"/g;
        var am;
        while ((am = attrRe.exec(qm[1])) !== null) { qAttrs[am[1]] = am[2]; }
        var attrRe2 = /([\w-]+)\s*=\s*'([^']*)'/g;
        while ((am = attrRe2.exec(qm[1])) !== null) { qAttrs[am[1]] = am[2]; }
        if (qAttrs.type) {
            var qObj = { type: qAttrs.type, question: qAttrs.question || qAttrs.label || "", id: qAttrs.id || ("q" + (data.questions.length + 1)) };
            if (qAttrs.subtitle) qObj.subtitle = qAttrs.subtitle;
            if (qAttrs.required === "true" || qAttrs.required === true) qObj.required = true;
            if (qAttrs.enableOther === "true" || qAttrs.enableOther === true) qObj.enableOther = true;
            if (qAttrs.options) {
                try { qObj.options = JSON.parse(qAttrs.options); }
                catch (e) { qObj.options = qAttrs.options.split(',').map(function(s) { return s.trim(); }); }
            }
            data.questions.push(qObj);
        }
    }
    return data;
}

var _theme = readThemeFromEnv();

export { registerToolPkg, onXmlRender, onMessageProcessing };