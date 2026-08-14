// @ts-nocheck
import questionnaire_ui from "./ui/questionnaire.ui.js";
import settings_ui from "./ui/settings.ui.js";
import market_ui from "./ui/market.ui.js";
import draft_editor_ui from "./ui/draft_editor.ui.js";
import { onAskXmlRender } from "./ask/askrender.js";

var _userMsgCount = {};
var _sessionId = Date.now();
var _mainLang = null; // 模块级：onXmlRender 每次调用重新读取赋值；_m 供模块内所有函数使用
// 本地翻译：优先语言包，fallback 中文；%s 顺序替换
function _m(key, fallback) {
    var t = (_mainLang && _mainLang[key]) ? _mainLang[key] : fallback;
    if (arguments.length > 2) {
        var args = Array.prototype.slice.call(arguments, 2);
        for (var i = 0; i < args.length; i++) t = t.replace("%s", String(args[i]));
    }
    return t;
}

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
    ToolPkg.registerXmlRenderPlugin({ id: "questionnaire_ask_xml", tag: "ask_questionnaire", function: onAskXmlRender });
    ToolPkg.registerMessageProcessingPlugin({ id: "questionnaire_message", function: onMessageProcessing });

    // 子页面路由：草稿编辑器（settings 草稿管理「编辑」navigate 进入，ctx.params.id = 要编辑的草稿实例 id）
    // 单一实例语义：加载该草稿 → 编辑 → 保存回写同一 id 同一文件
    ToolPkg.registerUiRoute({
        id: "draft_editor",
        runtime: "compose_dsl",
        screen: draft_editor_ui,
        params: {},
        title: { zh: "编辑草稿", en: "Edit Draft" },
    });

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

    ToolPkg.registerToolboxUiModule({
        id: "questionnaire_market",
        runtime: "compose_dsl",
        screen: market_ui,
        params: {},
        title: { zh: "语言包市场", en: "Language Pack Market" },
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

    // 读取语言包（提前：校验错误信息也要走翻译）
    _mainLang = null;
    try {
        var _langPath0 = getEnv("QUESTIONNAIRE_LANG_PATH") || "";
        if (_langPath0) {
            var _langRaw0 = NativeInterface.callTool("", "read_file", JSON.stringify({ path: _langPath0 }));
            if (_langRaw0) {
                var _langObj0 = JSON.parse(_langRaw0);
                var _lc0 = null;
                if (_langObj0 && _langObj0.data && _langObj0.data.content) _lc0 = _langObj0.data.content;
                else if (_langObj0 && _langObj0.content) _lc0 = _langObj0.content;
                if (typeof _lc0 === 'string') _lc0 = _lc0.replace(/^\s*\d+\|/gm, "");
                var _lp0 = typeof _lc0 === 'object' ? _lc0 : JSON.parse(_lc0);
                if (_lp0 && _lp0.lang) _mainLang = _lp0.lang;
            }
        }
    } catch (e) { _mainLang = null; }

    // 读取显示模式
    var displayMode = "normal";
    try { var dm = getEnv("QUESTIONNAIRE_DISPLAY_MODE"); if (dm === "hidden" || dm === "blocked" || dm === "normal") displayMode = dm; } catch (e) {}
    var strictMode = true;
    try { var sm = getEnv("QUESTIONNAIRE_STRICT_MODE"); if (sm === "true" || sm === true) strictMode = true; else if (sm === "false" || sm === false) strictMode = false; } catch (e) {}
    if (displayMode === "hidden") {
        return { handled: true, text: "" };
    }
    if (displayMode === "blocked") {
        var blockedData = { title: _m("ui.form.err.blockedTitle", "(问卷已被拦截)"), questions: [], _hasInvalid: true, _invalidQuestions: [_m("ui.form.err.blockedMsg", "问卷已被拦截：当前设置为拦截模式，问卷不会显示。")], _blockedMode: true, _blockedXml: xmlContent };
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
                title: _m("ui.form.err.wrongCloseTitle", "(标签错误)"),
                questions: [],
                _hasInvalid: true,
                _invalidQuestions: [_m("ui.form.err.wrongClose", "XML 标签错误：使用了 \"%s\" 作为闭合标签，正确应为 </questionnaire>", wrongTag)],
            };
            var invalidFp = simpleHash(xmlContent + "_wrong_close");
            return { handled: true, composeDsl: { screen: questionnaire_ui, state: { _data: JSON.stringify(invalidData), _chatId: (typeof getChatId === "function") ? getChatId() : "", _msgAtCreation: 0, _sessionId: String(_sessionId), _answers: "{}", _submitted: false, _expired: false, _collapsed: false, _collapsedForce: false, _otherInputs: "{}", _errorMsg: "", _infoOpen: false, _fingerprint: invalidFp }, memo: { fingerprint: invalidFp }, moduleSpec: { id: "questionnaire_" + invalidFp, runtime: "compose_dsl" } } };
        }
        return { handled: true, text: _m("ui.form.building", "📋 表单制作中...") };
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
        parseError = _m("ui.form.err.attrSyntax", "不支持的属性写法：请在 <questionnaire> 标签内使用标准 JSON 格式，不要将 title/questions 等作为标签属性。正确示例：<questionnaire>{\"title\":\"问卷标题\",\"questions\":[...]}</questionnaire>");
        data = null;
    }

    if (parseError || !data || !data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        var invalidData = { title: data && data.title ? data.title : _m("ui.form.err.parseFailTitle", "(解析失败)"), questions: [], _hasInvalid: true, _invalidQuestions: parseError ? [_m("ui.form.err.jsonSyntax", "JSON 语法错误: %s", parseError)] : [_m("ui.form.err.emptyData", "问卷数据为空或格式不正确")] };
        var invalidFp = simpleHash(inner + "_invalid");
        return { handled: true, composeDsl: { screen: questionnaire_ui, state: { _data: JSON.stringify(invalidData), _chatId: (typeof getChatId === "function") ? getChatId() : "", _msgAtCreation: 0, _sessionId: String(_sessionId), _answers: "{}", _submitted: false, _expired: false, _collapsed: false, _collapsedForce: false, _otherInputs: "{}", _errorMsg: "", _infoOpen: false, _fingerprint: invalidFp }, memo: { fingerprint: invalidFp }, moduleSpec: { id: "questionnaire_" + invalidFp, runtime: "compose_dsl" } } };
    }

    var missingIdArray = [];
    for (var qi = 0; qi < data.questions.length; qi++) {
        var q = data.questions[qi];
        if (q.type === "section") continue;
        if (!q.id || String(q.id).trim() === "") missingIdArray.push(q.question || _m("ui.form.err.qNoName", "第%s题", String(qi + 1)));
    }

    var validTypes = { section: true, single: true, multiple: true, text: true, textarea: true, rating: true, likert: true, nps: true, time: true };
    // QinitCode 自定义题型：不在 main 上下文中加载（require 路径不同），由 UI 层处理映射
    // 这里仅将有 qinitcode 的问卷中不认识的 type 标记为跳过检查
    var _hasQcData = !!(data.qinitcode && typeof data.qinitcode === 'string' && data.qinitcode.trim().length > 0);
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
                    validationErrors.push(_m("ui.form.err.unknownField", "第%s题存在不支持的字段 '%s'，正确字段名：type/question/options/required/subtitle/enableOther/id", String(vqIdx), vfk));
                    break;
                }
            }
            if (vq.type && !validTypes[vq.type] && !_hasQcData) validationErrors.push(_m("ui.form.err.badType", "第%s题 type 不合法: %s", String(vqIdx), vq.type));
            if (needsOptions[vq.type] && (!vq.options || !Array.isArray(vq.options) || vq.options.length < 2)) validationErrors.push(_m("ui.form.err.optionsShort", "第%s题（%s）选项不足", String(vqIdx), vq.type));
            if (vq.enableOther === true && vq.type !== "single") validationErrors.push(_m("ui.form.err.enableOtherSingle", "第%s题 enableOther 仅支持 single 题型", String(vqIdx)));
            if (vq.required === true && vq.type === "section") validationErrors.push(_m("ui.form.err.sectionRequired", "第%s题 section 类型不能设置 required", String(vqIdx)));
            if (vq.type === "text" && vq.options) validationErrors.push(_m("ui.form.err.noOptionsField", "第%s题（%s）不应有 options 字段", String(vqIdx), vq.type));
            else if (vq.type === "rating" && vq.options) validationErrors.push(_m("ui.form.err.noOptionsField", "第%s题（%s）不应有 options 字段", String(vqIdx), vq.type));
            else if (vq.type === "nps" && vq.options) validationErrors.push(_m("ui.form.err.noOptionsField", "第%s题（%s）不应有 options 字段", String(vqIdx), vq.type));
        }
        // 两个模式都检查：question 为空、缺少 id
        if (vq.type && vq.type !== "section" && (!vq.question || String(vq.question).trim() === "")) validationErrors.push(_m("ui.form.err.emptyQuestion", "第%s题 question 为空", String(vqIdx)));
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
    var historyEnabled = "true";
    try { var he = getEnv("QUESTIONNAIRE_HISTORY_ENABLED"); if (he === "true" || he === "false") historyEnabled = he; } catch (e) {}
    data._historyEnabled = historyEnabled;
    var debugMode = "false";
    try { var dm = getEnv("QUESTIONNAIRE_DEBUG_MODE"); if (dm === "true" || dm === "false") debugMode = dm; } catch (e) {}
    data._debugMode = debugMode;
    if (data._historyEnabled === "true") {
        data._timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
    }
    // resultcode 和 result 互斥
    if (data.count === true && data.resultcode !== undefined && data.result !== undefined) {
        data._hasInvalid = true;
        data._invalidQuestions = data._invalidQuestions.concat([_m("ui.form.err.resultcodeConflict", "resultcode 和 result 不能同时存在，请只使用其中一个")]);
    }
    if (data.count === true && data.result !== undefined && data.result !== null) {
        if (typeof data.result === "string") {
            data._hasInvalid = true;
            data._invalidQuestions = data._invalidQuestions.concat([_m("ui.form.err.resultNotArray", "result 格式错误：result 必须是二维数组")]);
        } else if (Array.isArray(data.result)) {
            var resultErrors = [];
            for (var ri = 0; ri < data.result.length; ri++) {
                var group = data.result[ri];
                if (!Array.isArray(group)) { resultErrors.push(_m("ui.form.err.groupNotArray", "第%s组不是数组", String(ri + 1))); continue; }
                for (var ci = 0; ci < group.length; ci++) {
                    var exprStr = String(group[ci]);
                    if (exprStr.indexOf('?') < 0) resultErrors.push(_m("ui.form.err.exprNoQuestion", "第%s组第%s个缺少?", String(ri + 1), String(ci + 1)));
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
                    resultErrors.push(_m("ui.form.err.refUnknownVar", "引用了不存在的变量: %s", missingVars.join(', ')));
                }
            }
            if (resultErrors.length > 0) { data._hasInvalid = true; data._invalidQuestions = data._invalidQuestions.concat([_m("ui.form.err.resultSyntax", "结果表达式语法错误: %s", resultErrors.join("; "))]); }
        } else { data._hasInvalid = true; data._invalidQuestions = data._invalidQuestions.concat([_m("ui.form.err.resultFormat", "result 格式错误")]); }
    }

    // 语言包已在函数开头预加载（_mainLang），直接透传 UI
    data._lang = _mainLang;
    data._langDebug = "langPath=" + (getEnv("QUESTIONNAIRE_LANG_PATH") || "") + " | " + (_mainLang ? ("OK keys=" + Object.keys(_mainLang).sort().join(",")) : "EMPTY");

    var _fpInput = JSON.stringify({ title: data.title, questions: data.questions });
    var fingerprint = simpleHash(_fpInput);
    // 在 main 上下文读取历史记录（使用 NativeInterface.callTool 类似 importqlg 的方式）
    if (data._historyEnabled === "true") {
        try {
            var _historyMainPath = "/sdcard/Download/Operit/questionnaire/history/" + fingerprint + ".json";
            var _historyMainRaw = NativeInterface.callTool("", "read_file", JSON.stringify({ path: _historyMainPath }));
            data._historyDebug = 'raw: ' + String(_historyMainRaw).substring(0, 300);
            if (_historyMainRaw) {
                var _historyMainObj = JSON.parse(_historyMainRaw);
                var _historyMainContent = null;
                if (_historyMainObj && _historyMainObj.data && _historyMainObj.data.content) {
                    _historyMainContent = _historyMainObj.data.content;
                    _historyMainContent = _historyMainContent.replace(/^\d+\|/gm, "");
                } else if (_historyMainObj && _historyMainObj.content) {
                    _historyMainContent = _historyMainObj.content;
                }
                if (_historyMainContent) {
                    var _parsed = JSON.parse(_historyMainContent);
                    if (Array.isArray(_parsed)) {
                        data._historyRecords = _parsed;
                        data._historyDebug += ' | parsed OK: ' + _parsed.length + ' records';
                    } else {
                        data._historyDebug += ' | not array';
                    }
                } else {
                    data._historyDebug += ' | no content';
                }
            } else {
                data._historyDebug += ' | empty';
            }
        } catch(e) { /* 历史记录读取失败不影响问卷渲染 */ }
    }
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
    var data = { title: attrs.title || _m("ui.form.defaultTitle", "问卷"), questions: [] };
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