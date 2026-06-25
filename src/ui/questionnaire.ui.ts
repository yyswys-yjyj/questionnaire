// @ts-nocheck

import { executeResultCode } from "./runtime/runtime.js";
import { executeQLang } from "./runtime/QLangInterpreter.js";
export default function Screen(ctx) {
    var dataState = ctx.useState("_data", "{}");
    var answersState = ctx.useState("_answers", "{}");
    var submittedState = ctx.useState("_submitted", false);
    var expiredState = ctx.useState("_expired", false);
    var collapsedState = ctx.useState("_collapsed", false);
    var collapsedForceState = ctx.useState("_collapsedForce", false);
    var submittingState = ctx.useState("_submitting", false);
    var chatIdState = ctx.useState("_chatId", "");
    var msgAtCreationState = ctx.useState("_msgAtCreation", 0);
    var sessionIdState = ctx.useState("_sessionId", "");
    var otherInputsState = ctx.useState("_otherInputs", "{}");
    var errorMsgState = ctx.useState("_errorMsg", "");
    var infoOpenState = ctx.useState("_infoOpen", false);
    var fingerprintState = ctx.useState("_fingerprint", "");
    var cancelledState = ctx.useState("_cancelled", false);
    var reportedState = ctx.useState("_reported", false);
    var data = JSON.parse(dataState[0] || "{}");
    var answers = JSON.parse(answersState[0] || "{}");
    var otherInputs = JSON.parse(otherInputsState[0] || "{}");
    var errorMsg = errorMsgState[0];
    var infoOpen = infoOpenState[0];
    var fingerprint = fingerprintState[0] || "";
    var cancelled = cancelledState[0];
    var submitted = submittedState[0];
    var expired = expiredState[0];
    var collapsed = collapsedState[0];
    var collapsedForce = collapsedForceState[0];
    var chatId = chatIdState[0];
    var msgAtCreation = msgAtCreationState[0];
    var storedSessionId = sessionIdState[0];
    var hasInvalid = data._hasInvalid === true;
var isBlocked = data._blockedMode === true;
var invalidQuestions = data._invalidQuestions || [];
var theme = data._theme || "classic";
    var buttonLayout = data._buttonLayout || "scroll";
    var timeInputMode = data._timeInputMode || "picker";
    var questions = data.questions || [];
    var title = data.title || "";
    var questionCount = 0;
    for (var qci = 0; qci < questions.length; qci++) {
        if (questions[qci].type !== "section")
            questionCount++;
    }
    var primary = ctx.MaterialTheme.colorScheme.primary;
    var onSurface = ctx.MaterialTheme.colorScheme.onSurface;
    var onSurfaceVariant = ctx.MaterialTheme.colorScheme.onSurfaceVariant;
    var surfaceVariant = ctx.MaterialTheme.colorScheme.surfaceVariant;
    var errorColor = ctx.MaterialTheme.colorScheme.error;
var yellowColor = ctx.MaterialTheme.colorScheme.tertiary;
var answerColor = primary;
    var starActiveColor = primary;
    var isExpired = expired || collapsedForce;
    var isSubmitted = submitted;
    var isSubmitting = submittingState[0];
    var isActive = !isExpired && !isSubmitted && !isSubmitting;
    var isContentVisible = !collapsed;
    function setAnswer(qId, value) {
        var newAnswers = JSON.parse(JSON.stringify(answers));
        newAnswers[qId] = value;
        answersState[1](JSON.stringify(newAnswers));
    }
    function toggleOption(qId, option) {
        var current = answers[qId];
        if (!Array.isArray(current))
            current = [];
        var idx = current.indexOf(option);
        if (idx >= 0) {
            current.splice(idx, 1);
        }
        else {
            current.push(option);
        }
        setAnswer(qId, current);
    }
    function setOtherInput(qId, value) {
        var newOthers = JSON.parse(JSON.stringify(otherInputs));
        newOthers[qId] = value;
        otherInputsState[1](JSON.stringify(newOthers));
    }
    async function handleSubmit() {
        if (isExpired || isSubmitted || submittingState[0])
            return;
        // 先检测必填，不满足直接返回，避免显示"结果计算中"
        var missingRequired = [];
        for (var vi = 0; vi < questions.length; vi++) {
            var vq = questions[vi];
            if (vq.type === "section")
                continue;
            if (vq.required) {
                var vans = answers[vq.id];
                var vempty = vans === undefined || vans === null || vans === "" || (Array.isArray(vans) && vans.length === 0);
                if (vq.type === "single" && vq.enableOther && vans === "__other__" && (!otherInputs[vq.id] || otherInputs[vq.id].trim() === "")) {
                    vempty = true;
                }
                if (vempty) {
                    missingRequired.push(vq.question);
                }
            }
        }
        if (missingRequired.length > 0) {
            errorMsgState[1]("还有 " + missingRequired.length + " 道必答题未填");
            return;
        }
        submittingState[1](true);
        // 更新 dataState 触发重绘，然后异步执行计算
        dataState[1](JSON.stringify(data));
        await new Promise(function(r) { setTimeout(r, 50); });
        // 检测是否所有题目都没填
        var allEmpty = true;
        for (var _aei = 0; _aei < questions.length; _aei++) {
            var _aeq = questions[_aei];
            if (_aeq.type === "section") continue;
            var _aea = answers[_aeq.id];
            if (_aea !== undefined && _aea !== null && _aea !== "" && !(Array.isArray(_aea) && _aea.length === 0)) {
                allEmpty = false;
                break;
            }
        }
        var hasAnyAnswer = !allEmpty;
        errorMsgState[1]("");
        var lines = ["📋 " + title];
        for (var i = 0; i < questions.length; i++) {
            var q = questions[i];
            if (q.type === "section") {
                lines.push("");
                lines.push("── " + q.question + " ──");
                continue;
            }
            var ans = answers[q.id];
            if (ans === undefined || ans === null || ans === "" || (Array.isArray(ans) && ans.length === 0))
                continue;
            var ansText = "";
            if (q.type === "single" && q.enableOther && ans === "__other__") {
                ansText = "其他: " + (otherInputs[q.id] || "");
            }
            else if (q.type === "rating") {
                ansText = String(ans) + " 星";
            }
            else if (q.type === "likert") {
                var likertOpts = q.options || [];
                var li = Math.min(Math.max(parseInt(ans) - 1, 0), likertOpts.length - 1);
                ansText = likertOpts[li] + " (" + ans + "/5)";
            }
            else if (q.type === "nps") {
                var npsLabel = parseInt(ans) >= 9 ? "推荐者" : (parseInt(ans) >= 7 ? "被动者" : "贬损者");
                ansText = ans + "/10 (" + npsLabel + ")";
            }
            else if (q.type === "textarea") {
                ansText = "```\n" + String(ans) + "\n```";
            }
            else if (q.type === "time") {
                ansText = String(ans);
            }
            else {
                ansText = Array.isArray(ans) ? ans.join(", ") : String(ans);
            }
            lines.push(q.question + ": " + ansText);
        }
        var message = lines.join("\n");
        // 全空时插入占位文本
        if (!hasAnyAnswer) {
            message += "\n（用户未填写任何内容）";
        }
        // 结果表达式计算
        var hasCount = data.count === true;
        // resultcode 优先于 result（互斥）
if (hasCount && data.resultcode) {
    var resultText = "";
    try {
        if (typeof data.resultcode === 'string') {
            // QLang v2 子标签形式
            resultText = executeQLang(data.resultcode, answers, otherInputs, data.questions);
        } else if (Array.isArray(data.resultcode)) {
            // 旧版 JSON 数组形式（EOL）
            resultText = executeResultCode(data.resultcode, answers, otherInputs, data.questions);
        }
    }
    catch (e) {
        data._hasInvalid = true;
        if (!data._invalidQuestions)
            data._invalidQuestions = [];
        submittingState[1](false);
        data._invalidQuestions.push("结果脚本运行时错误: " + String(e));
        dataState[1](JSON.stringify(data));
        return;
    }
            if (resultText) {
                var outputRaw = data.output_raw !== false && data.output_raw !== "false";
                if (outputRaw) {
                    message += resultText;
                }
                else {
                    message = resultText.trim();
                }
            }
        }
        else if (hasCount && data.result && Array.isArray(data.result)) {
            var resultText = "";
            try {
                resultText = computeResult(answers, otherInputs, data.result, data.questions);
            }
            catch (e) {
                data._hasInvalid = true;
                if (!data._invalidQuestions)
                    data._invalidQuestions = [];
                submittingState[1](false);
                data._invalidQuestions.push("结果表达式运行时错误: " + String(e));
                dataState[1](JSON.stringify(data));
                return;
            }
            if (resultText) {
                var outputRaw = data.output_raw !== false && data.output_raw !== "false";
                if (outputRaw) {
                    message += resultText;
                }
                else {
                    message = resultText.trim();
                }
            }
        }
        submittingState[1](false);
        submittedState[1](true);
        infoOpenState[1](false);
        collapsedState[1](false);
        collapsedForceState[1](false);
        try {
            await Tools.Chat.sendMessage(message, chatId, undefined, undefined, { runtime: "main" });
        }
        catch (e) { }
    }
    function handleCancel() {
        cancelledState[1](true);
        try {
            Tools.Chat.sendMessage("用户取消了本次问卷提问", chatId, undefined, undefined, { runtime: "main" });
        }
        catch (e) { }
    }
    function toggleCollapse() {
        if (isExpired && collapsedForce)
            return;
        collapsedState[1](!collapsed);
    }
    function renderQuestion(q, idx) {
        if (q.type === "section") {
            return ctx.UI.Column({ key: "sec_" + q.id, spacing: 2, padding: { vertical: 6, horizontal: 4 } }, [
                ctx.UI.Text({ text: q.question, style: "titleSmall", color: primary }),
                q.subtitle ? ctx.UI.Text({ text: q.subtitle, style: "bodySmall", color: onSurfaceVariant }) : null,
            ]);
        }
        var qNum = idx + 1;
        var requiredMark = q.required ? " *" : "";
        var qText = qNum + ". " + q.question + requiredMark;
        var answer = answers[q.id];
        if (isSubmitted) {
            var hasAnswer = answer !== undefined && answer !== null && answer !== "" && !(Array.isArray(answer) && answer.length === 0);
            if (q.type === "single" && q.enableOther && answer === "__other__")
                hasAnswer = true;
            var displayAnswer = "";
            if (hasAnswer) {
                if (q.type === "single" && q.enableOther && answer === "__other__") {
                    displayAnswer = "其他: " + (otherInputs[q.id] || "");
                }
                else if (q.type === "rating") {
                    displayAnswer = renderStarsText(parseInt(answer || 0));
                }
                else if (q.type === "likert") {
                    var likertOpts = q.options || [];
                    var li = Math.min(Math.max(parseInt(answer) - 1, 0), likertOpts.length - 1);
                    displayAnswer = likertOpts[li];
                }
                else if (q.type === "nps") {
                    var npsLabel2 = parseInt(answer) >= 9 ? "推荐者" : (parseInt(answer) >= 7 ? "被动者" : "贬损者");
                    displayAnswer = answer + " (" + npsLabel2 + ")";
                }
                else if (q.type === "textarea") {
                    displayAnswer = String(answer);
                }
                else if (q.type === "time") {
                    displayAnswer = String(answer);
                }
                else {
                    displayAnswer = Array.isArray(answer) ? answer.join(", ") : String(answer);
                }
            }
            return ctx.UI.Column({ key: "qa_" + q.id, spacing: 2 }, [
                ctx.UI.Text({ text: qText, style: "labelMedium", color: onSurface }),
                hasAnswer
                    ? ctx.UI.Text({ text: "    └ " + displayAnswer, style: "bodyMedium", color: answerColor })
                    : ctx.UI.Text({ text: "    └ (未填)", style: "bodyMedium", color: onSurfaceVariant.copy({ alpha: 0.5 }) }),
            ]);
        }
        if (isExpired)
            return null;
        var nodes = [
            ctx.UI.Text({
                text: qText,
                style: "labelMedium",
                color: q.required ? errorColor : onSurface,
            }),
        ];
        if (q.subtitle) {
            nodes.push(ctx.UI.Text({
                text: q.subtitle,
                style: "bodySmall",
                color: onSurfaceVariant,
                padding: { top: 2, bottom: 2 },
            }));
        }
        if (q.type === "single") {
            var opts = q.options || [];
            var btnNodes = [];
            var isCompact = theme === "compact";
            for (var oi = 0; oi < opts.length; oi++) {
                var opt = opts[oi];
                var isSelected = answer === opt;
                (function (optVal) {
                    if (isCompact) {
                        btnNodes.push(ctx.UI.FilterChip({
                            key: q.id + "_" + oi,
                            selected: isSelected,
                            onClick: function () { setAnswer(q.id, optVal); },
                            label: ctx.UI.Text({ text: optVal, style: "labelSmall", color: isSelected ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                            leadingIcon: isSelected ? ctx.UI.Icon({ name: "check", size: 16, tint: ctx.MaterialTheme.colorScheme.onPrimary }) : null,
                        }));
                    }
                    else {
                        btnNodes.push(ctx.UI.OutlinedButton({
                            key: q.id + "_" + oi,
                            containerColor: isSelected ? primary : null,
                            contentColor: isSelected ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                            onClick: function () { setAnswer(q.id, optVal); },
                            border: { width: 1.5, color: onSurfaceVariant },
                            content: ctx.UI.Text({ text: optVal, style: "labelSmall", color: isSelected ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                        }));
                    }
                })(opt);
            }
            if (q.enableOther) {
                var isOtherSelected = answer === "__other__";
                (function () {
                    if (isCompact) {
                        btnNodes.push(ctx.UI.FilterChip({
                            key: q.id + "_other_btn",
                            selected: isOtherSelected,
                            onClick: function () { setAnswer(q.id, "__other__"); },
                            label: ctx.UI.Text({ text: "其他…", style: "labelSmall", color: isOtherSelected ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                            leadingIcon: isOtherSelected ? ctx.UI.Icon({ name: "check", size: 16, tint: ctx.MaterialTheme.colorScheme.onPrimary }) : null,
                        }));
                    }
                    else {
                        btnNodes.push(ctx.UI.OutlinedButton({
                            key: q.id + "_other_btn",
                            containerColor: isOtherSelected ? primary : null,
                            contentColor: isOtherSelected ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                            onClick: function () { setAnswer(q.id, "__other__"); },
                            border: { width: 1.5, color: onSurfaceVariant },
                            content: ctx.UI.Text({ text: "其他…", style: "labelSmall", color: isOtherSelected ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                        }));
                    }
                })();
            }
            nodes.push(buttonLayout === "row" ? ctx.UI.Column({ key: q.id + "_row", spacing: 4, fillMaxWidth: true, padding: { vertical: 2 } }, btnNodes.map(function(b){return ctx.UI.Column({spacing:0,fillMaxWidth:true},[b]);})) : ctx.UI.LazyRow({ key: q.id + "_row", spacing: 4 }, btnNodes));
            if (q.enableOther && answer === "__other__") {
                var otherVal = otherInputs[q.id] || "";
                nodes.push(ctx.UI.TextField({
                    value: otherVal,
                    onValueChange: function (newVal) { setOtherInput(q.id, newVal); },
                    placeholder: "请输入自定义内容...",
                    singleLine: true,
                    enabled: true,
                    style: "compact",
                }));
            }
        }
        else if (q.type === "multiple") {
            var opts2 = q.options || [];
            var currentArr = Array.isArray(answer) ? answer : [];
            var btnNodes2 = [];
            var isCompact = theme === "compact";
            for (var ci = 0; ci < opts2.length; ci++) {
                var opt2 = opts2[ci];
                var isChecked = currentArr.indexOf(opt2) >= 0;
                (function (optVal) {
                    if (isCompact) {
                        btnNodes2.push(ctx.UI.FilterChip({
                            key: q.id + "_" + ci,
                            selected: isChecked,
                            onClick: function () { toggleOption(q.id, optVal); },
                            label: ctx.UI.Text({ text: optVal, style: "labelSmall", color: isChecked ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                            leadingIcon: isChecked ? ctx.UI.Icon({ name: "check", size: 16, tint: ctx.MaterialTheme.colorScheme.onPrimary }) : null,
                        }));
                    }
                    else {
                        btnNodes2.push(ctx.UI.OutlinedButton({
                            key: q.id + "_" + ci,
                            containerColor: isChecked ? primary : null,
                            contentColor: isChecked ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                            onClick: function () { toggleOption(q.id, optVal); },
                            border: { width: 1.5, color: onSurfaceVariant },
                            content: ctx.UI.Text({ text: optVal, style: "labelSmall", color: isChecked ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                        }));
                    }
                })(opt2);
            }
            nodes.push(buttonLayout === "row" ? ctx.UI.Column({ key: q.id + "_row", spacing: 4, fillMaxWidth: true, padding: { vertical: 2 } }, btnNodes2.map(function(b){return ctx.UI.Column({spacing:0,fillMaxWidth:true},[b]);})) : ctx.UI.LazyRow({ key: q.id + "_row", spacing: 4 }, btnNodes2));
        }
        else if (q.type === "text") {
            var textVal = answer || "";
            nodes.push(ctx.UI.TextField({
                value: textVal,
                onValueChange: function (newVal) { setAnswer(q.id, newVal); },
                placeholder: "输入...",
                singleLine: true,
                enabled: true,
                style: "compact",
            }));
        }
        else if (q.type === "textarea") {
            var areaVal = answer || "";
            nodes.push(ctx.UI.TextField({
                value: areaVal,
                onValueChange: function (newVal) { setAnswer(q.id, newVal); },
                placeholder: "输入多行文本...",
                singleLine: false,
                minLines: 3,
                maxLines: 8,
                enabled: true,
                style: "compact",
            }));
        }
        else if (q.type === "time") {
            var isCompact = theme === "compact";
            function buildTime(h, m, s) {
                return h + ":" + m + ":" + s;
            }
            function validateTimeFormat(val) {
                // 检查 hh:mm:ss 格式
                var m2 = String(val).match(/^(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
                if (!m2) return false;
                var hh = parseInt(m2[1]), mm = parseInt(m2[2]), ss = parseInt(m2[3]);
                return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59 && ss >= 0 && ss <= 59;
            }
            // --- input 模式：直接输入 hh:mm:ss ---
            if (timeInputMode === "input") {
                var timeInputVal = answer || "";
                var timeError = timeInputVal && !validateTimeFormat(timeInputVal) ? "格式错误，需要 hh:mm:ss" : "";
                var timeInputNodes = [
                    ctx.UI.TextField({
                        value: timeInputVal,
                        onValueChange: function (newVal) { setAnswer(q.id, newVal); },
                        placeholder: "hh:mm:ss",
                        singleLine: true,
                        enabled: true,
                        style: "compact",
                    }),
                ];
                if (timeError) {
                    timeInputNodes.push(ctx.UI.Text({ text: timeError, style: "bodySmall", color: errorColor, padding: { top: 2 } }));
                }
                if (validateTimeFormat(timeInputVal)) {
                    timeInputNodes.push(ctx.UI.Text({ text: "已输入: " + timeInputVal, style: "bodySmall", color: answerColor, padding: { top: 2 } }));
                } else if (timeInputVal) {
                    timeInputNodes.push(ctx.UI.Text({ text: "示例: 14:30:00", style: "bodySmall", color: onSurfaceVariant, padding: { top: 2 } }));
                }
                nodes.push(ctx.UI.Column({ key: q.id + "_input_col", spacing: 4, fillMaxWidth: true, padding: { vertical: 4 } }, timeInputNodes));
            } else {
                // --- picker 模式：按钮选择器 ---
                var timeVal = answer || "";
                var timeParts = timeVal ? timeVal.split(":") : ["", "", ""];
                var hourVal = timeParts[0] || "00";
                var minVal = timeParts[1] || "00";
                var secVal = timeParts[2] || "00";
                var hourBtnNodes = [];
                for (var hi = 0; hi <= 23; hi++) {
                    var hStr = hi < 10 ? "0" + hi : "" + hi;
                    (function (h) {
                        if (isCompact) {
                            hourBtnNodes.push(ctx.UI.FilterChip({
                                key: q.id + "_h_" + hi,
                                selected: hourVal === h,
                                onClick: function () { setAnswer(q.id, buildTime(h, minVal, secVal)); },
                                label: ctx.UI.Text({ text: h, style: "labelSmall", color: hourVal === h ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                                leadingIcon: hourVal === h ? ctx.UI.Icon({ name: "check", size: 14, tint: ctx.MaterialTheme.colorScheme.onPrimary }) : null,
                            }));
                        } else {
                            hourBtnNodes.push(ctx.UI.OutlinedButton({
                                key: q.id + "_h_" + hi,
                                containerColor: hourVal === h ? primary : null,
                                contentColor: hourVal === h ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                                onClick: function () { setAnswer(q.id, buildTime(h, minVal, secVal)); },
                                content: ctx.UI.Text({ text: h, style: "labelSmall", color: hourVal === h ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                            }));
                        }
                    })(hStr);
                }
                var minBtnNodes = [];
                for (var mi = 0; mi <= 59; mi++) {
                    var mStr = mi < 10 ? "0" + mi : "" + mi;
                    (function (m) {
                        if (isCompact) {
                            minBtnNodes.push(ctx.UI.FilterChip({
                                key: q.id + "_m_" + mi,
                                selected: minVal === m,
                                onClick: function () { setAnswer(q.id, buildTime(hourVal, m, secVal)); },
                                label: ctx.UI.Text({ text: m, style: "labelSmall", color: minVal === m ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                                leadingIcon: minVal === m ? ctx.UI.Icon({ name: "check", size: 14, tint: ctx.MaterialTheme.colorScheme.onPrimary }) : null,
                            }));
                        } else {
                            minBtnNodes.push(ctx.UI.OutlinedButton({
                                key: q.id + "_m_" + mi,
                                containerColor: minVal === m ? primary : null,
                                contentColor: minVal === m ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                                onClick: function () { setAnswer(q.id, buildTime(hourVal, m, secVal)); },
                                content: ctx.UI.Text({ text: m, style: "labelSmall", color: minVal === m ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                            }));
                        }
                    })(mStr);
                }
                var secBtnNodes = [];
                for (var si = 0; si <= 59; si++) {
                    var sStr = si < 10 ? "0" + si : "" + si;
                    (function (s) {
                        if (isCompact) {
                            secBtnNodes.push(ctx.UI.FilterChip({
                                key: q.id + "_s_" + si,
                                selected: secVal === s,
                                onClick: function () { setAnswer(q.id, buildTime(hourVal, minVal, s)); },
                                label: ctx.UI.Text({ text: s, style: "labelSmall", color: secVal === s ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                                leadingIcon: secVal === s ? ctx.UI.Icon({ name: "check", size: 14, tint: ctx.MaterialTheme.colorScheme.onPrimary }) : null,
                            }));
                        } else {
                            secBtnNodes.push(ctx.UI.OutlinedButton({
                                key: q.id + "_s_" + si,
                                containerColor: secVal === s ? primary : null,
                                contentColor: secVal === s ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                                onClick: function () { setAnswer(q.id, buildTime(hourVal, minVal, s)); },
                                content: ctx.UI.Text({ text: s, style: "labelSmall", color: secVal === s ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                            }));
                        }
                    })(sStr);
                }
                function splitRows(nodes, perRow) {
                    var rows = [];
                    for (var ri = 0; ri < nodes.length; ri += perRow) {
                        rows.push(ctx.UI.LazyRow({ key: q.id + "_row_" + ri, spacing: 4 }, nodes.slice(ri, ri + perRow)));
                    }
                    return rows;
                }
                nodes.push(ctx.UI.Text({ text: "时", style: "labelSmall", color: onSurfaceVariant, padding: { top: 4, bottom: 2 } }));
                nodes.push(ctx.UI.LazyRow({ key: q.id + "_hour_row", spacing: 4 }, hourBtnNodes));
                nodes.push(ctx.UI.Text({ text: "分", style: "labelSmall", color: onSurfaceVariant, padding: { top: 4, bottom: 2 } }));
                nodes.push(ctx.UI.Column({ key: q.id + "_min_col", spacing: 4, fillMaxWidth: true }, splitRows(minBtnNodes, 20)));
                nodes.push(ctx.UI.Text({ text: "秒", style: "labelSmall", color: onSurfaceVariant, padding: { top: 4, bottom: 2 } }));
                nodes.push(ctx.UI.Column({ key: q.id + "_sec_col", spacing: 4, fillMaxWidth: true }, splitRows(secBtnNodes, 20)));
                var displayTime = hourVal + ":" + minVal + ":" + secVal;
                if (!answer)
                    displayTime = "";
                if (displayTime) {
                    nodes.push(ctx.UI.Text({ text: "已选: " + displayTime, style: "bodySmall", color: answerColor, padding: { top: 2 } }));
                }
            }
        }
        else if (q.type === "rating") {
            var ratingVal = parseInt(answer) || 0;
            var ratingLabels = ["", "很差", "较差", "一般", "满意", "非常满意"];
            var ratingRow1 = [], ratingRow2 = [];
            for (var si = 1; si <= 5; si++) {
                (function (starIdx) {
                    var filled = starIdx <= ratingVal;
                    var btn = ctx.UI.OutlinedButton({
                        key: q.id + "_star_" + starIdx,
                        containerColor: filled ? starActiveColor : null,
                        contentColor: filled ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                        onClick: function () { setAnswer(q.id, String(starIdx)); },
                        content: ctx.UI.Text({
                            text: String(starIdx),
                            style: "labelSmall",
                            color: filled ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                        }),
                    });
                    if (starIdx <= 3)
                        ratingRow1.push(btn);
                    else
                        ratingRow2.push(btn);
                })(si);
            }
            nodes.push(ctx.UI.Column({ key: q.id + "_stars_col", spacing: 4, padding: { vertical: 4 } }, [
                ctx.UI.Row({ key: q.id + "_stars_1", spacing: 6, horizontalArrangement: "spaceEvenly", fillMaxWidth: true }, ratingRow1),
                ctx.UI.Row({ key: q.id + "_stars_2", spacing: 6, horizontalArrangement: "spaceEvenly", fillMaxWidth: true }, ratingRow2),
            ]));
            var label = ratingVal > 0 ? (ratingVal + " 星 - " + ratingLabels[ratingVal]) : "点击评分";
            nodes.push(ctx.UI.Text({ text: label, style: "bodySmall", color: onSurfaceVariant }));
        }
        else if (q.type === "likert") {
            var likertOpts = q.options || ["非常不同意", "不同意", "一般", "同意", "非常同意"];
            var likertVal = parseInt(answer) || 0;
            var halfLen = Math.ceil(likertOpts.length / 2);
            var likertRow1Btns = [], likertRow2Btns = [];
            for (var li = 1; li <= likertOpts.length; li++) {
                (function (likertIdx) {
                    var isSelected2 = likertIdx === likertVal;
                    var btn = ctx.UI.OutlinedButton({
                        key: q.id + "_likert_" + likertIdx,
                        containerColor: isSelected2 ? primary : null,
                        contentColor: isSelected2 ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                        onClick: function () { setAnswer(q.id, String(likertIdx)); },
                        content: ctx.UI.Text({
                            text: String(likertIdx),
                            style: "labelSmall",
                            color: isSelected2 ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                        }),
                    });
                    if (likertIdx <= halfLen)
                        likertRow1Btns.push(btn);
                    else
                        likertRow2Btns.push(btn);
                })(li);
            }
            nodes.push(ctx.UI.Column({ key: q.id + "_likert_col", spacing: 2, padding: { vertical: 4 } }, [
                ctx.UI.Row({ key: q.id + "_likert_btns_1", spacing: 4, horizontalArrangement: "spaceEvenly", fillMaxWidth: true }, likertRow1Btns),
                ctx.UI.Row({ key: q.id + "_likert_btns_2", spacing: 4, horizontalArrangement: "spaceEvenly", fillMaxWidth: true }, likertRow2Btns),
                ctx.UI.Row({ key: q.id + "_likert_labels", spacing: 4, horizontalArrangement: "spaceEvenly", fillMaxWidth: true, padding: { top: 2 } }, likertOpts.map(function (lbl, li2) {
                    return ctx.UI.Text({ key: q.id + "_lbl_" + li2, text: lbl, style: "labelSmall", color: onSurfaceVariant, maxLines: 2 });
                })),
            ]));
            if (likertVal > 0) {
                var likertIdx2 = Math.min(Math.max(likertVal - 1, 0), likertOpts.length - 1);
                nodes.push(ctx.UI.Text({ text: "已选: " + likertOpts[likertIdx2], style: "bodySmall", color: answerColor }));
            }
        }
        else if (q.type === "nps") {
            var npsVal = parseInt(answer);
            if (isNaN(npsVal))
                npsVal = -1;
            var npsGroups = [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10]];
            var npsRows = [];
            for (var gi = 0; gi < npsGroups.length; gi++) {
                var group = npsGroups[gi];
                var rowBtns = [];
                for (var gj = 0; gj < group.length; gj++) {
                    (function (npsIdx) {
                        var isSelected3 = npsIdx === npsVal;
                        rowBtns.push(ctx.UI.OutlinedButton({
                            key: q.id + "_nps_" + npsIdx,
                            containerColor: isSelected3 ? primary : null,
                            contentColor: isSelected3 ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                            onClick: function () { setAnswer(q.id, String(npsIdx)); },
                            content: ctx.UI.Text({
                                text: String(npsIdx),
                                style: "labelSmall",
                                color: isSelected3 ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                            }),
                        }));
                    })(group[gj]);
                }
                npsRows.push(ctx.UI.Row({ key: q.id + "_nps_row" + gi, spacing: 6, horizontalArrangement: "spaceEvenly", fillMaxWidth: true }, rowBtns));
            }
            nodes.push(ctx.UI.Column({ key: q.id + "_nps_col", spacing: 4, padding: { vertical: 4 } }, npsRows));
            if (npsVal >= 0) {
                var npsLabel = npsVal >= 9 ? "推荐者" : (npsVal >= 7 ? "被动者" : "贬损者");
                nodes.push(ctx.UI.Text({ text: "评分: " + npsVal + " (" + npsLabel + ")", style: "bodySmall", color: answerColor }));
            }
            else {
                nodes.push(ctx.UI.Row({ key: q.id + "_nps_hint", spacing: 8, horizontalArrangement: "center", fillMaxWidth: true, padding: { top: 2 } }, [
                    ctx.UI.Text({ text: "0（不可能）", style: "labelSmall", color: onSurfaceVariant }),
                    ctx.UI.Text({ text: "10（非常可能）", style: "labelSmall", color: onSurfaceVariant }),
                ]));
            }
        }
        // 未提交且有已选值时显示清除按钮（multiple 除外，多项选择逐项取消更合理）
        if (q.type !== "multiple" && q.type !== "text" && q.type !== "textarea" && isActive && typeof answer !== "undefined" && answer !== null && answer !== "" && !(Array.isArray(answer) && answer.length === 0)) {
            nodes.push(ctx.UI.Row({ spacing: 4, padding: { top: 2 } }, [
                ctx.UI.TextButton({
                    onClick: function () {
                        if (Array.isArray(answer)) { setAnswer(q.id, []); }
                        else { setAnswer(q.id, ""); }
                        if (q.enableOther) setOtherInput(q.id, "");
                    },
                    content: ctx.UI.Text({ text: "清除选择", style: "labelSmall", color: onSurfaceVariant }),
                }),
            ]));
        }
        return ctx.UI.Column({ key: "q_" + q.id, spacing: 2, padding: { vertical: 2 } }, nodes);
    }
    function renderStarsText(count) {
        var stars = "";
        for (var si = 0; si < 5; si++)
            stars += si < count ? "★" : "☆";
        return stars;
    }
    // ── 结果表达式引擎 ──
    function computeResult(answers, otherInputs, resultData, qs) {
        if (!resultData || !Array.isArray(resultData))
            return '';
        var outputParts = [];
        for (var ri = 0; ri < resultData.length; ri++) {
            var group = resultData[ri];
            if (!Array.isArray(group))
                continue;
            var groupParts = [];
            for (var ci = 0; ci < group.length; ci++) {
                var res = evalResultExpr(String(group[ci]), answers, otherInputs, qs);
                if (res)
                    groupParts.push(res);
            }
            if (groupParts.length > 0)
                outputParts.push(groupParts.join(', '));
        }
        return outputParts.length > 0 ? '\n\n── 结果 ──\n' + outputParts.join('\n') : '';
    }
    function evalResultExpr(exprStr, answers, otherInputs, qs) {
        var qIdx = exprStr.indexOf('?');
        if (qIdx < 0)
            return '';
        var cond = exprStr.substring(0, qIdx), rest = exprStr.substring(qIdx + 1);
        var cIdx = -1, depth = 0;
        for (var i = 0; i < rest.length; i++) {
            if (rest[i] === '(')
                depth++;
            else if (rest[i] === ')')
                depth--;
            else if (rest[i] === ':' && depth === 0) {
                cIdx = i;
                break;
            }
        }
        var tVal = cIdx >= 0 ? rest.substring(0, cIdx) : rest;
        var fVal = cIdx >= 0 ? rest.substring(cIdx + 1) : '';
        return evalCond(cond, answers, otherInputs, qs) ? tVal : fVal;
    }
    function evalCond(c, a, o, qs) { var p = splitTop(c, '||'); for (var i = 0; i < p.length; i++) {
        if (evalAndTerm(p[i], a, o, qs))
            return true;
    } return false; }
    function evalAndTerm(e, a, o, qs) { var p = splitTop(e, '&&'); for (var i = 0; i < p.length; i++) {
        if (!evalPrim(p[i].trim(), a, o, qs))
            return false;
    } return true; }
    function evalPrim(e, a, o, qs) {
        e = e.trim();
        if (e.indexOf('!') === 0)
            return !evalPrim(e.substring(1).trim(), a, o, qs);
        if (e[0] === '(' && e[e.length - 1] === ')')
            return evalCond(e.substring(1, e.length - 1), a, o, qs);
        var rm = e.match(/^(.*?)===\s*\/(.*)\/([a-z]*)$/);
        if (rm) {
            try {
                return new RegExp(rm[2], rm[3]).test(resVal(rm[1].trim(), a, o, qs));
            }
            catch (ex) {
                return false;
            }
        }
        var om = e.match(/^(.*?)(===|==|!=|>=|<=|>|<)(.*)$/);
        if (om) {
            var l = resVal(om[1].trim(), a, o, qs), r = resVal(om[3].trim(), a, o, qs), op = om[2];
            if (op === '===') {
                try {
                    return new RegExp(r).test(l);
                }
                catch (ex) {
                    return String(l) === String(r);
                }
            }
            if (op === '==')
                return String(l) === String(r);
            if (op === '!=')
                return String(l) !== String(r);
            var ln = parseFloat(l), rn = parseFloat(r);
            if (op === '>')
                return ln > rn;
            if (op === '<')
                return ln < rn;
            if (op === '>=')
                return ln >= rn;
            if (op === '<=')
                return ln <= rn;
            return false;
        }
        var ar = evalArith(e, a, o, qs);
        if (ar !== null)
            return ar !== 0;
        return resVal(e, a, o, qs) !== '';
        function evalArith(e, a, o, qs) {
            var ap = splitTop(e, '+');
            if (ap.length > 1) {
                var t = 0;
                for (var i = 0; i < ap.length; i++) {
                    var sp = splitTop(ap[i], '-');
                    for (var j = 0; j < sp.length; j++) {
                        // 乘除运算
                        var mulParts = splitTop(sp[j], '*');
                        if (mulParts.length > 1) {
                            var mulVal = 1;
                            for (var mi = 0; mi < mulParts.length; mi++) {
                                var divParts = splitTop(mulParts[mi], '/');
                                var segVal;
                                if (divParts.length > 1) {
                                    segVal = parseFloat(resVal(divParts[0].trim(), a, o, qs));
                                    if (isNaN(segVal)) return null;
                                    for (var di = 1; di < divParts.length; di++) {
                                        var dv = parseFloat(resVal(divParts[di].trim(), a, o, qs));
                                        if (isNaN(dv) || dv === 0) return null;
                                        segVal /= dv;
                                    }
                                } else {
                                    segVal = parseFloat(resVal(mulParts[mi].trim(), a, o, qs));
                                    if (isNaN(segVal)) return null;
                                }
                                mulVal *= segVal;
                            }
                            t += (j === 0 ? mulVal : -mulVal);
                        } else {
                            var v = parseFloat(resVal(sp[j].trim(), a, o, qs));
                            if (isNaN(v))
                                return null;
                            t += (j === 0 ? v : -v);
                        }
                    }
                }
                return t;
            }
            // 单一表达式也支持乘除
            var mulParts = splitTop(e, '*');
            if (mulParts.length > 1) {
                var mulVal = 1;
                for (var mi = 0; mi < mulParts.length; mi++) {
                    var divParts = splitTop(mulParts[mi], '/');
                    var segVal;
                    if (divParts.length > 1) {
                        segVal = parseFloat(resVal(divParts[0].trim(), a, o, qs));
                        if (isNaN(segVal)) return null;
                        for (var di = 1; di < divParts.length; di++) {
                            var dv = parseFloat(resVal(divParts[di].trim(), a, o, qs));
                            if (isNaN(dv) || dv === 0) return null;
                            segVal /= dv;
                        }
                    } else {
                        segVal = parseFloat(resVal(mulParts[mi].trim(), a, o, qs));
                        if (isNaN(segVal)) return null;
                    }
                    mulVal *= segVal;
                }
                return mulVal;
            }
            var v = parseFloat(resVal(e.trim(), a, o, qs));
            return isNaN(v) ? null : v;
        }
    }
    function splitTop(str) {
        var result = [], depth = 0, start = 0, ops = Array.prototype.slice.call(arguments, 1);
        for (var i = 0; i < str.length; i++) {
            if (str[i] === '(')
                depth++;
            else if (str[i] === ')')
                depth--;
            else if (depth === 0) {
                for (var oi = 0; oi < ops.length; oi++) {
                    var op = ops[oi];
                    if (str.substring(i, i + op.length) === op) {
                        result.push(str.substring(start, i));
                        start = i + op.length;
                        i += op.length - 1;
                        break;
                    }
                }
            }
        }
        result.push(str.substring(start));
        return result;
    }
    function resVal(e, a, o, qs) {
        e = e.trim();
        if (e[0] === '(' && e[e.length - 1] === ')')
            return String(evalArith(e.substring(1, e.length - 1), a, o, qs));
        if ((e[0] === "'" && e[e.length - 1] === "'") || (e[0] === '"' && e[e.length - 1] === '"'))
            return e.substring(1, e.length - 1);
        var qm = e.match(/^(q\d+)(?:\.(num|text))?$/);
        if (qm) {
            var qId2 = qm[1], v2 = a[qId2];
            if (v2 === undefined || v2 === null || v2 === '')
                return '';
            if (v2 === '__other__')
                return o[qId2] || '';
            var mod = qm[2] || 'text';
            if (mod === 'num')
                return String(parseFloat(v2) || 0);
            // text 模式：按题型返回标签
            if (qs && Array.isArray(qs)) {
                for (var qi = 0; qi < qs.length; qi++) {
                    if (qs[qi] && qs[qi].id === qId2) {
                        var qd = qs[qi];
                        if (qd.type === 'rating') {
                            var rLabels = ["", "很差", "较差", "一般", "满意", "非常满意"];
                            var idx2 = parseInt(v2);
                            if (idx2 >= 1 && idx2 <= 5)
                                return rLabels[idx2];
                        }
                        if (qd.type === 'likert' && qd.options) {
                            var li2 = parseInt(v2) - 1;
                            if (li2 >= 0 && li2 < qd.options.length)
                                return qd.options[li2];
                        }
                        if (qd.type === 'nps') {
                            var nv = parseInt(v2);
                            return nv >= 9 ? "推荐者" : (nv >= 7 ? "被动者" : "贬损者");
                        }
                        break;
                    }
                }
            }
            return String(v2);
        }
        if (/^[0-9.]+$/.test(e))
            return e;
        // 乘除运算（内联实现，不用 evalArith）
        if (e.indexOf('*') >= 0 || e.indexOf('/') >= 0) {
            var mulParts = splitTop(e, '*');
            if (mulParts.length > 1) {
                var mulVal = 1;
                for (var mi = 0; mi < mulParts.length; mi++) {
                    var divParts = splitTop(mulParts[mi], '/');
                    var segVal;
                    if (divParts.length > 1) {
                        segVal = parseFloat(resVal(divParts[0].trim(), a, o, qs));
                        if (!isNaN(segVal)) {
                            for (var di = 1; di < divParts.length; di++) {
                                var dv = parseFloat(resVal(divParts[di].trim(), a, o, qs));
                                if (!isNaN(dv) && dv !== 0) segVal /= dv;
                            }
                        }
                    } else {
                        segVal = parseFloat(resVal(mulParts[mi].trim(), a, o, qs));
                    }
                    if (!isNaN(segVal)) mulVal *= segVal;
                }
                return String(mulVal);
            }
        }
        return e;
    }
    var headerText = "📋 询问 " + questionCount + " 个问题";
    if (hasInvalid)
        headerText = "表单错误";
    if (isSubmitted)
        headerText = "📋 已提交问卷";
    var headerColor = onSurface;
    var headerOnClick = null;
    if (isExpired) {
        headerColor = onSurfaceVariant.copy({ alpha: 0.5 });
        headerOnClick = null;
    }
    else if (isSubmitted) {
        headerColor = onSurface;
        headerOnClick = toggleCollapse;
    }
    else {
        headerColor = onSurface;
        headerOnClick = toggleCollapse;
    }
    var headerIcon = "";
    if (isExpired) {
        headerIcon = "";
    }
    else if (collapsed) {
        headerIcon = "keyboard_arrow_right";
    }
    else {
        headerIcon = "keyboard_arrow_down";
    }
    var headerNodes = [
        headerIcon ? ctx.UI.Icon({ name: headerIcon, size: 18, tint: isExpired ? onSurfaceVariant.copy({ alpha: 0.5 }) : primary }) : ctx.UI.Text({ text: "", fontSize: 0 }),
        ctx.UI.Spacer({ width: 8 }),
        ctx.UI.Text({ text: headerText, style: "titleSmall", color: headerColor }),
    ];
    var headerPadding = isExpired ? { horizontal: 8, vertical: 4 } : { horizontal: 8, vertical: 10 };
    var headerRow = ctx.UI.Row({ key: "header", padding: headerPadding, verticalAlignment: "center", fillMaxWidth: true, onClick: headerOnClick }, headerNodes);
    var contentNodes = [];
    if (cancelled) {
        contentNodes.push(ctx.UI.Column({ key: "cancelled", padding: { horizontal: 16, vertical: 12 }, horizontalAlignment: "centerHorizontally", fillMaxWidth: true }, [
            ctx.UI.Text({ text: "提问被终止", style: "titleSmall", color: onSurfaceVariant }),
        ]));
    }
        else if (isSubmitting) {
        contentNodes.push(ctx.UI.Column({ key: "computing", padding: { horizontal: 16, vertical: 24 }, horizontalAlignment: "centerHorizontally", fillMaxWidth: true }, [
            ctx.UI.CircularProgressIndicator({ modifier: { size: 32 } }),
            ctx.UI.Spacer({ height: 12 }),
            ctx.UI.Text({ text: "结果计算中...", style: "bodyMedium", color: onSurfaceVariant }),
        ]));
    }
    else if (isContentVisible) {
        if (isSubmitted) {
            var submitIdx = 0;
            for (var si = 0; si < questions.length; si++) {
                var qa = questions[si];
                var displayIdx = qa.type === "section" ? 0 : (submitIdx++);
                var qaNode = renderQuestion(qa, displayIdx);
                if (qaNode)
                    contentNodes.push(qaNode);
            }
        }
        else if (isActive) {
            if (hasInvalid) {
                var reported = reportedState[0];
                if (reported) {
                    contentNodes.push(ctx.UI.Column({ key: "reported", padding: { horizontal: 16, vertical: 12 }, horizontalAlignment: "centerHorizontally", fillMaxWidth: true }, [
                        ctx.UI.Text({ text: "已报告表单问题", style: "titleSmall", color: onSurfaceVariant }),
                    ]));
                }
                else {
                    var firstInvalid = invalidQuestions.length > 0 ? String(invalidQuestions[0]) : "";
                    var isSyntaxError = firstInvalid.indexOf("JSON 语法错误") >= 0;
                    var isEmpty = firstInvalid.indexOf("问卷数据为空") >= 0 || firstInvalid.indexOf("格式不正确") >= 0;
                    var isMissingId = data._hasMissingIds === true;
                    var isResultError = firstInvalid.indexOf("result 格式错误") >= 0 || firstInvalid.indexOf("结果表达式") >= 0 || firstInvalid.indexOf("引用了不存在") >= 0;
                    var isTypeError = firstInvalid.indexOf("type 不合法") >= 0 || firstInvalid.indexOf("选项不足") >= 0;
                    var isFieldError = firstInvalid.indexOf("question 为空") >= 0 || firstInvalid.indexOf("不支持的字段") >= 0 || firstInvalid.indexOf("enableOther") >= 0 || firstInvalid.indexOf("required") >= 0 || firstInvalid.indexOf("不应有") >= 0;
                    var errorTitle = "表单错误";
                    if (isSyntaxError)
                        errorTitle = "JSON 格式错误";
                    else if (isEmpty)
                        errorTitle = "问卷数据为空";
                    else if (isMissingId)
                        errorTitle = "缺少题目 ID";
                    else if (isResultError)
                        errorTitle = "结果表达式错误";
                    else if (isTypeError)
                        errorTitle = "题目配置错误";
                    else if (isFieldError)
                        errorTitle = "字段配置错误";
                    var errorDesc = isSyntaxError ? firstInvalid : (isEmpty ? firstInvalid : (isMissingId ? ("以下题目缺少 id 字段：" + (invalidQuestions.length > 0 ? invalidQuestions.join("、") : "未知")) : firstInvalid));
                    contentNodes.push(ctx.UI.Card({ key: "invalid_card", fillMaxWidth: true, containerColor: surfaceVariant }, [
                        ctx.UI.Column({ key: "invalid_col", padding: { horizontal: 16, vertical: 16 }, spacing: 8, horizontalAlignment: "centerHorizontally" }, [
                            ctx.UI.Text({ text: errorTitle, style: "titleSmall", color: isBlocked ? yellowColor : errorColor }),
                            ctx.UI.Text({ text: errorDesc, style: "bodySmall", color: onSurfaceVariant }),
                            ctx.UI.Row({ key: "invalid_actions", spacing: 12, horizontalArrangement: "center", fillMaxWidth: true, padding: { top: 8 } }, [
                                ctx.UI.OutlinedButton({ key: "invalid_cancel", onClick: handleCancel, content: ctx.UI.Text({ text: "取消", style: "labelSmall", color: onSurfaceVariant }) }),
                                isBlocked ? null : ctx.UI.Button({ key: "invalid_remind", content: ctx.UI.Text({ text: "提醒", style: "labelSmall", color: ctx.MaterialTheme.colorScheme.onPrimary }), containerColor: errorColor, onClick: function () {
                var remindMsg = "⚠️ " + errorTitle + "：" + (invalidQuestions.length > 0 ? invalidQuestions.join("、") : "未知");
                infoOpenState[1](false);
                try {
                                            Tools.Chat.sendMessage(remindMsg, chatId, undefined, undefined, { runtime: "main" });
                                        }
                                        catch (e) { }
                                        reportedState[1](true);
                                    } }),
                            ]),
                        ]),
                    ]));
                }
            }
            else {
                var realIdx = 0;
                for (var ai = 0; ai < questions.length; ai++) {
                    var q = questions[ai];
                    var isSection = q.type === "section";
                    if (!isSection)
                        realIdx++;
                    var qNode = renderQuestion(q, isSection ? 0 : realIdx - 1);
                    if (qNode) {
                        if (ai > 0 && !isSection) {
                            contentNodes.push(ctx.UI.Divider({ key: "div_" + ai, color: surfaceVariant, thickness: 1 }));
                        }
                        else if (isSection && ai > 0) {
                            contentNodes.push(ctx.UI.Divider({ key: "div_sec_" + ai, color: primary.copy({ alpha: 0.2 }), thickness: 2 }));
                        }
                        contentNodes.push(qNode);
                    }
                }
                contentNodes.push(ctx.UI.Divider({ key: "div_actions", color: onSurfaceVariant.copy({ alpha: 0.4 }), thickness: 1 }));
                contentNodes.push(ctx.UI.Row({ key: "actions", horizontalArrangement: "spaceBetween", fillMaxWidth: true, padding: { horizontal: 4, vertical: 4 }, verticalAlignment: "center" }, [
                    ctx.UI.IconButton({ key: "info_btn", icon: ctx.UI.Icon({ name: "info", size: 20, tint: onSurfaceVariant }), onClick: function () { infoOpenState[1](!infoOpenState[0]); } }),
                    ctx.UI.Row({ key: "action_buttons", spacing: 8, horizontalArrangement: "end", verticalAlignment: "center" }, [
                        ctx.UI.OutlinedButton({ key: "cancel_btn", onClick: handleCancel, content: ctx.UI.Text({ text: "取消", style: "labelSmall", color: onSurfaceVariant }) }),
                        ctx.UI.Button({ key: "submit_btn", enabled: isActive, content: ctx.UI.Text({ text: isSubmitting ? "⏳ 计算中..." : "✓ 提交", style: "labelSmall", color: ctx.MaterialTheme.colorScheme.onPrimary }), containerColor: isActive ? primary : ctx.MaterialTheme.colorScheme.surfaceContainer, border: { width: 1.5, color: primary }, onClick: handleSubmit }),
                    ]),
                ]));
            }
        }
        if (errorMsg) {
            contentNodes.push(ctx.UI.Divider({ key: "div_err", color: errorColor.copy({ alpha: 0.3 }), thickness: 1 }));
            contentNodes.push(ctx.UI.Row({ key: "error_hint", fillMaxWidth: true, padding: { horizontal: 8, vertical: 6 }, horizontalArrangement: "center" }, [
                ctx.UI.Icon({ name: "warning", size: 16, tint: errorColor }),
                ctx.UI.Spacer({ width: 4 }),
                ctx.UI.Text({ text: errorMsg, style: "bodySmall", color: errorColor }),
            ]));
        }
        if (infoOpen) {
            contentNodes.push(ctx.UI.Card({ key: "info_card", fillMaxWidth: true, padding: { horizontal: 8, vertical: 4 } }, [
                ctx.UI.Column({ key: "info_content", spacing: 4, padding: { vertical: 8, horizontal: 8 } }, [
                    ctx.UI.Text({ text: "问卷信息", style: "titleSmall", color: primary }),
                    ctx.UI.Text({ text: "标题：" + (title || "无"), style: "bodySmall", color: onSurface }),
                    ctx.UI.Text({ text: "ID：" + (fingerprint || "无"), style: "bodySmall", color: onSurfaceVariant }),
                    ctx.UI.Text({ text: "类型：" + questionCount + " 题" + (data.count === true ? (data.resultcode ? " · 脚本式" : " · 结果表达式") : "") + (data.output_raw === false ? " · 仅结果" : ""), style: "bodySmall", color: onSurfaceVariant }),
                    ctx.UI.Divider({ color: surfaceVariant, thickness: 1 }),
                    ctx.UI.Text({ text: "关于问卷提问", style: "titleSmall", color: primary }),
                    ctx.UI.Text({ text: "一个允许 AI 向用户发送问卷提问的插件", style: "bodySmall", color: onSurfaceVariant }),
                    ctx.UI.Text({ text: "version: 1.5.3", style: "labelSmall", color: onSurfaceVariant.copy({ alpha: 0.7 }) }),
                    ctx.UI.Text({ text: "作者", style: "titleSmall", color: primary }),
                    ctx.UI.Text({ text: "原作：liu-baia", style: "bodySmall", color: onSurface }),
                    ctx.UI.Text({ text: "二次开发：yyswys-yjyj", style: "bodySmall", color: onSurface }),
                ]),
            ]));
        }
    }
    var contentColumn = ctx.UI.Column({ key: "content", padding: { horizontal: 8, vertical: 2 }, spacing: 2 }, contentNodes);
    var cardColor = isExpired ? surfaceVariant.copy({ alpha: 0.3 }) : undefined;
    return ctx.UI.Card({ key: "questionnaire_card", padding: { horizontal: 0, vertical: 0 }, fillMaxWidth: true, containerColor: cardColor }, [
        headerRow,
        isContentVisible && contentNodes.length > 0 ? contentColumn : null,
    ]);
}
