/*
 * SPDX-FileCopyrightText: 2025-2026 liu-baia, yyswys-yjyj
 * SPDX-License-Identifier: GPL-3.0-only
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License only.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
// @ts-nocheck

import { executeResultCode } from "./runtime/runtime.js";
import { executeQLang } from "../qlgruntime/index.js";
import { compileAndRun as _qcCompileAndRun, execBlock as _qcExecBlock } from "../qinitcode/index.js";
// ── v1.8.1 UI 翻新：组件层（组件内部按 theme 保留 compact 旧观感） ──
import { OptionRow, OptionList } from "./components/OptionRow.js";
import { RatingStars } from "./components/RatingStars.js";
import { LikertScale } from "./components/LikertScale.js";
import { NpsScale } from "./components/NpsScale.js";
import { ConfirmField } from "./components/ConfirmField.js";
import { NumberField } from "./components/NumberField.js";
import { QuestionHeader, SectionHeader } from "./components/QuestionHeader.js";
import { SPACE as _SPACE, FONT as _FONT, fade as _fade } from "./shared/design.js";
function _t(key, lang) {
    var _result = null;
    if (lang && lang[key]) _result = lang[key];
    if (!_result) {
        var langPack = {
        "ui.form.submit": "提交",
        "ui.form.cancel": "取消",
        "ui.form.fill": "一键补全",
        "ui.form.fillOk": "已自动补全上次的答案",
        "ui.form.submitted": "已提交",
        "ui.form.infoTitle": "问卷信息",
        "ui.form.version": "版本",
        "ui.form.required": "必答",
        "ui.form.err.numField": "第%s题 %s 必须是数字",
        "ui.form.err.numRange": "第%s题 min 不能大于 max",
        "ui.form.err.numUnit": "第%s题 unit 必须是字符串",
        "ui.form.errRequired": "此题为必答题，请填写",
        "ui.form.requiredHint": "必答",
        "ui.form.charUnit": "字",
        "ui.form.pickedCount": "已选 %s / %d 项",
        "ui.form.selectAll": "全选",
        "ui.form.deselectAll": "取消全选",
        "ui.form.scrollHint": "共 %s 项，可上下滑动 ↑↓",
        "ui.form.err.qfRequired": "第%s题使用了必选(required)，但题型过滤器已禁用必选",
        "ui.form.err.qfOther": "第%s题（%s）使用了\"其他\"输入(enableOther)，但题型过滤器已禁用单选\"其他\"",
        "ui.form.other": "其他…",
        "ui.form.missing": "还有必答题未填",
        "ui.form.submitting": "提交中...",
        "ui.form.parseError": "解析失败",
        "ui.form.noAnswer": "(未填)",
        "ui.form.emptySubmit": "(用户未填写任何内容)",
        "ui.form.remind": "提醒",
        "ui.form.asking": "📋 询问 %d 个问题",
        "ui.form.cancelled": "用户取消了本次问卷提问",
        "ui.form.cancelledTitle": "提问被终止",
        "ui.form.edit": "修改",
        "ui.form.editResubmit": "🔄 修改后重新提交",
        "ui.form.unfilled": "未填项：",
        "ui.form.reported": "已报告表单问题",
        "ui.form.computing": "⏳ 计算中...",
        "ui.form.submitBtn": "✓ 提交",
        "ui.form.submitBtnFull": "✓ 提交问卷",
        "ui.form.cancelAsk": "取消提问",
        "ui.form.textPlaceholder": "输入...",
        "ui.form.textareaPlaceholder": "输入多行文本...",
        "ui.form.otherPlaceholder": "请输入自定义内容...",
        "ui.form.otherPrefix": "其他: ",
        "ui.form.star": " 星",
        "ui.form.starHint": "点击评分",
        "ui.form.ratingVeryBad": "很差",
        "ui.form.ratingBad": "较差",
        "ui.form.ratingNormal": "一般",
        "ui.form.ratingGood": "满意",
        "ui.form.ratingVeryGood": "非常满意",
        "ui.form.likertStronglyDisagree": "非常不同意",
        "ui.form.likertDisagree": "不同意",
        "ui.form.likertAgree": "同意",
        "ui.form.likertStronglyAgree": "非常同意",
        "ui.form.likertSelected": "已选: ",
        "ui.form.npsPromoter": "推荐者",
        "ui.form.npsPassive": "被动者",
        "ui.form.npsDetractor": "贬损者",
        "ui.form.npsScore": "评分: ",
        "ui.form.npsMin": "0（不可能）",
        "ui.form.npsMax": "10（非常可能）",
        "ui.form.npsClear": "清除选择",
        "ui.form.timeError": "格式错误，需要 hh:mm:ss",
        "ui.form.timeInputted": "已输入: ",
        "ui.form.timeExample": "示例: 14:30:00",
        "ui.form.timeHour": "时",
        "ui.form.timeMin": "分",
        "ui.form.timeSec": "秒",
        "ui.form.infoTitleLabel": "标题：",
        "ui.form.infoIdLabel": "ID：",
        "ui.form.infoTypeLabel": "类型：",
        "ui.form.infoNone": "无",
        "ui.form.questionCount": " 题",
        "ui.form.scriptMode": " · 脚本式",
        "ui.form.resultMode": " · 结果表达式",
        "ui.form.resultOnlyMode": " · 仅结果",
        "ui.form.aboutTitle": "关于问卷提问",
        "ui.form.aboutDesc": "一个允许 AI 向用户发送问卷提问的插件",
        "ui.form.authorTitle": "作者",
        "ui.form.authorOriginal": "原作：",
        "ui.form.authorModder": "二次开发：",
        "ui.form.versionLabel": "version: ",
        "ui.form.resultSection": "── 结果 ──",
        "ui.form.errorTitle": "表单错误",
        "ui.form.errorJson": "JSON 格式错误",
        "ui.form.errorEmpty": "问卷数据为空",
        "ui.form.errorMissingId": "缺少题目 ID",
        "ui.form.errorResult": "结果表达式错误",
        "ui.form.errorType": "题目配置错误",
        "ui.form.errorField": "字段配置错误",
        "ui.form.errorRuntimeScript": "结果脚本运行时错误: ",
        "ui.form.errorRuntimeResult": "结果表达式运行时错误: ",
        "ui.form.missingIdDesc": "以下题目缺少 id 字段：",
        "ui.form.unknown": "未知",
        "ui.form.totalQuestions": "共 %d 题",
        "ui.form.answeredCount": "已回答 %d / %d 题",
        "ui.form.defaultTitle": "问卷",
        "ui.form.building": "📋 表单制作中...",
        "ui.form.err.blockedTitle": "(问卷已被拦截)",
        "ui.form.err.blockedMsg": "问卷已被拦截：当前设置为拦截模式，问卷不会显示。",
        "ui.form.err.wrongCloseTitle": "(标签错误)",
        "ui.form.err.wrongClose": "XML 标签错误：使用了 \"%s\" 作为闭合标签，正确应为 </questionnaire>",
        "ui.form.err.parseFailTitle": "(解析失败)",
        "ui.form.err.jsonSyntax": "JSON 语法错误: %s",
        "ui.form.err.emptyData": "问卷数据为空或格式不正确",
        "ui.form.err.qNoName": "第%s题",
        "ui.form.err.unknownField": "第%s题存在不支持的字段 '%s'，正确字段名：type/question/options/required/subtitle/enableOther/id",
        "ui.form.err.badType": "第%s题 type 不合法: %s",
        "ui.form.err.optionsShort": "第%s题（%s）选项不足",
        "ui.form.err.enableOtherSingle": "第%s题 enableOther 仅支持 single 题型",
        "ui.form.err.sectionRequired": "第%s题 section 类型不能设置 required",
        "ui.form.err.noOptionsField": "第%s题（%s）不应有 options 字段",
        "ui.form.err.emptyQuestion": "第%s题 question 为空",
        "ui.form.err.resultcodeConflict": "resultcode 和 result 不能同时存在，请只使用其中一个",
        "ui.form.err.resultNotArray": "result 格式错误：result 必须是二维数组",
        "ui.form.err.groupNotArray": "第%s组不是数组",
        "ui.form.err.exprNoQuestion": "第%s组第%s个缺少?",
        "ui.form.err.refUnknownVar": "引用了不存在的变量: %s",
        "ui.form.err.resultSyntax": "结果表达式语法错误: %s",
        "ui.form.err.resultFormat": "result 格式错误",
        "ui.form.err.attrSyntax": "不支持的属性写法：请在 <questionnaire> 标签内使用标准 JSON 格式，不要将 title/questions 等作为标签属性。正确示例：<questionnaire>{\"title\":\"问卷标题\",\"questions\":[...]}</questionnaire>"
    };
        _result = langPack[key] || key;
    }
    return _result;
}

export default function Screen(ctx) {
    var _qcAnserToType = {};
    var _typeRegistry = {};
    var _qcCustomTypeMap = {};
    var _qcRendererReady = false;
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
    // v1.8.3：是否尝试过提交。第一次点提交后才给必填项标红，避免一进页面满屏红
    var triedSubmitState = ctx.useState("_triedSubmit", false);
    var fillHintState = ctx.useState("_fillHint", "");
    var infoOpenState = ctx.useState("_infoOpen", false);
    var pageIndexState = ctx.useState("_pageIndex", 0);
    var fingerprintState = ctx.useState("_fingerprint", "");
    var cancelledState = ctx.useState("_cancelled", false);
    var reportedState = ctx.useState("_reported", false);
    var editedState = ctx.useState("_edited", false);
    var data = JSON.parse(dataState[0] || "{}");
    var answers = JSON.parse(answersState[0] || "{}");
    var otherInputs = JSON.parse(otherInputsState[0] || "{}");
    var errorMsg = errorMsgState[0];
    // v1.8.3：是否已尝试过提交（决定必填项是否显示校验红框）
    var triedSubmit = triedSubmitState[0] === true;
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
var langPathEnv = "";
try { langPathEnv = ctx.getEnv("QUESTIONNAIRE_LANG_PATH") || ""; } catch(e){}
var isLangNeeded = !langPathEnv && !submitted && !expired && !cancelled;
var theme = data._theme || "classic";
    var buttonLayout = data._buttonLayout || "scroll";
    var timeInputMode = data._timeInputMode || "picker";
    var questionLayout = data._questionLayout || "";
    // 从环境变量读取（UI 上下文使用 ctx.getEnv）
    if (!questionLayout) {
        try { var envLayout = ctx.getEnv("QUESTIONNAIRE_LAYOUT"); if (envLayout) questionLayout = envLayout; } catch(e){}
    }
    // v1.8.1 分页规则：
    //   modern 主题 → 强制分页，且每页 3 题（modern 的选项行更高，5 题一页会太长）
    //   classic / compact → 仍由「问卷布局」设置决定，每页 5 题
    var isModern = theme === "modern";
    var isPaging = isModern ? true : (questionLayout === "compact");
    var PAGE_SIZE = isModern ? 3 : 5;
    var questions = data.questions || [];
    
    // 提前注册内置题型（函数声明提升，可在此处调用）
    registerType('section', _renderSection);
    registerType('single', _renderSingle, _submitSingle); _qcAnserToType['singleChoice'] = 'single';
    registerType('multiple', _renderMultiple, _submitDefault); _qcAnserToType['multipleChoice'] = 'multiple';
    registerType('text', _renderText, _submitDefault); _qcAnserToType['textField'] = 'text';
    registerType('textarea', _renderTextarea, _submitTextarea); _qcAnserToType['textArea'] = 'textarea';
    registerType('rating', _renderRating, _submitRating); _qcAnserToType['rating'] = 'rating';
    registerType('likert', _renderLikert, _submitLikert);
    registerType('nps', _renderNps, _submitNps);
    registerType('confirm', _renderConfirm, _submitConfirm);
    registerType('number', _renderNumber, _submitNumber);
    registerType('time', _renderTime, _submitTime); _qcAnserToType['timePicker'] = 'time';
    _qcRendererReady = true;
    
    // 历史记录检查：在 QinitCode 执行之前（数据由 main.ts 注入到 data._historyRecords）
    var _historyRecords = data._historyRecords && Array.isArray(data._historyRecords) ? data._historyRecords : null;
    var _historyLastRecord = _historyRecords && _historyRecords.length > 0 ? _historyRecords[_historyRecords.length - 1] : null;
    
    // QinitCode 预处理：在渲染前运行 QinitCode 脚本
    var _qcData = data.qinitcode;
    if (_qcData && typeof _qcData === 'string' && _qcData.trim().length > 0) {
        try {
            var _qcOptions = { questionMap: {} };
            for (var _qci = 0; _qci < questions.length; _qci++) {
                if (questions[_qci].id) {
                    _qcOptions.questionMap[questions[_qci].id] = {
                        title: questions[_qci].question,
                        type: questions[_qci].type,
                    };
                }
            }
            var _qcResult = _qcCompileAndRun(_qcData, _qcOptions);
            // 保存 QinitCode 注册的自定义题型，并动态注入 _typeRegistry
            if (_qcResult && _qcResult.questions) {
                data._qcRegisteredTypes = _qcResult.questions;
                for (var _qcrtn in _qcResult.questions) {
                    if (_qcResult.questions.hasOwnProperty(_qcrtn) && !_typeRegistry[_qcrtn]) {
                        var _qcrtEntry = _qcResult.questions[_qcrtn];
                        // 从 anserTool 获取映射到内置类型，没有 anserTool 则不映射
                        var _qcAnserName2 = (_qcrtEntry.anserTool && _qcrtEntry.anserTool.apiSpec && _qcrtEntry.anserTool.apiSpec.AnserComponent)
                            ? _qcrtEntry.anserTool.apiSpec.AnserComponent : null;
                        if (_qcAnserName2) {
                            var _qcMappedType = _qcAnserToType[_qcAnserName2];
                            if (_qcMappedType) {
                                _qcCustomTypeMap[_qcrtn] = _qcMappedType;
                            } else {
                                data._qcError = "自定义题型 " + _qcrtn + " 的回答组件 '" + _qcAnserName2 + "' 未找到";
                            }
                        // 注册答案处理器：有 handler AST 的题型，注册到 _typeRegistry 的 submit
                        // 同时覆盖映射到的内置类型的 submit（这样无论 q.type 被改成什么都能触发）
                        if (_qcrtEntry.anserTool && _qcrtEntry.anserTool.handler && Array.isArray(_qcrtEntry.anserTool.handler) && _qcrtEntry.anserTool.handler.length > 0) {
                            (function(_qcHandlerAst) {
                                var _qcSubmitFn = function(q, ans, oi) {
                                    try {
                                        return String(_qcExecBlock(_qcHandlerAst, ans));
                                    } catch(e) {
                                        return String(ans);
                                    }
                                };
                                // 注册到原始类型
                                if (_typeRegistry[_qcrtn]) {
                                    _typeRegistry[_qcrtn].submit = _qcSubmitFn;
                                } else {
                                    registerType(_qcrtn, null, _qcSubmitFn);
                                }
                                // 同时覆盖映射到的内置类型的 submit
                                var _qcMappedSubmitType = _qcCustomTypeMap[_qcrtn];
                                if (_qcMappedSubmitType && _typeRegistry[_qcMappedSubmitType]) {
                                    _typeRegistry[_qcMappedSubmitType].submit = _qcSubmitFn;
                                }
                            })(_qcrtEntry.anserTool.handler);
                        }
                        }
                    }
                }
            }
            // 应用 QinitCode 产生的初始化数据
            if (_qcResult.qinitData && Object.keys(_qcResult.qinitData).length > 0) {
                var _qcAnswersChanged = false;
                var _qcNewAnswers = JSON.parse(JSON.stringify(answers));
                for (var _qck in _qcResult.qinitData) {
                    for (var _qci2 = 0; _qci2 < questions.length; _qci2++) {
                        if (questions[_qci2].id === _qck && questions[_qci2].value === undefined && _qcNewAnswers[_qck] === undefined) {
                            questions[_qci2].value = _qcResult.qinitData[_qck];
                            _qcNewAnswers[_qck] = _qcResult.qinitData[_qck];
                            _qcAnswersChanged = true;
                        }
                    }
                }
                if (_qcAnswersChanged) {
                    answersState[1](JSON.stringify(_qcNewAnswers));
                }
            }
        } catch (_qce) {
            // QinitCode 执行失败不影响问卷渲染
            data._qcError = String(_qce);
        }
    }
    
    // 分页按非 section 题目数分（section 不计入每页名额）
    var nonSectionCount = 0;
    for (var _nsi = 0; _nsi < questions.length; _nsi++) {
        if (questions[_nsi].type !== "section") nonSectionCount++;
    }
    // 紧凑模式下：第0页=取消，中间页=每5题，提交页，最后=info页
    var pageIndex = pageIndexState[0];
    var totalQuestionPages = Math.ceil(nonSectionCount / PAGE_SIZE);
    // 分页边界：每页恰好 PAGE_SIZE 道题，section 不计入名额
    // 满页（凑满 PAGE_SIZE 题）后：切点 = 下一个元素位置本身；
    // 若下一个是 section，则 section 归下一页（跟随其后题目同页），切点不再跳过它——
    // 否则 section 后题目不足时切点越界丢失，后续页会空白。
    // 注意：切点只允许在非 section 元素上触发，且切点之后必须还有非 section 题目，
    // 否则满页后连续 section / 末尾 section 会切出多余空页。
    var pageBounds = [0];
    var _bcnt = 0;
    var _nonSecTotal = nonSectionCount;
    for (var _bi = 0; _bi < questions.length; _bi++) {
        if (questions[_bi].type !== "section") _bcnt++;
        if (questions[_bi].type !== "section" && _bcnt % PAGE_SIZE === 0 && _bcnt < _nonSecTotal && _bi + 1 < questions.length) {
            pageBounds.push(_bi + 1);
        }
    }
    var questionStartPage = 1;
    var submitPage = questionStartPage + totalQuestionPages;
    var infoPage = submitPage + 1;
    var totalPages = isPaging ? (1 + totalQuestionPages + 2) : 1; // 取消页 + 题页 + 提交页 + info页
    function goToPage(p) {
        if (p >= 0 && p < totalPages) pageIndexState[1](p);
    }
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
        if (fillHintState[0]) fillHintState[1]("");
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
        if (fillHintState[0]) fillHintState[1]("");
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
            // 标记「已尝试提交」：所有空必填项开始显示红色错误态
            triedSubmitState[1](true);
            errorMsgState[1](_t("ui.form.missing",data._lang).replace("%d", String(missingRequired.length)));
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
        var unfilledList = [];
        for (var i = 0; i < questions.length; i++) {
            var q = questions[i];
            if (q.type === "section") {
                lines.push("");
                lines.push("── " + q.question + " ──");
                continue;
            }
            var ans = answers[q.id];
            if (ans === undefined || ans === null || ans === "" || (Array.isArray(ans) && ans.length === 0)) {
                unfilledList.push(q.question);
                continue;
            }
            var ansText = "";
            // 查 _typeRegistry——优先用原始类型（mySelect），然后查映射后的类型（single）
            var _submitType_orig = q._qcOriginalType || 'NONE';
            var _submitType_cur = q.type || 'NONE';
            var _submitEntry = _typeRegistry[_submitType_orig];
            if (!_submitEntry || !_submitEntry.submit) {
                _submitEntry = _typeRegistry[_submitType_cur];
            }
            if (_submitEntry && _submitEntry.submit) {
                ansText = _submitEntry.submit(q, ans, otherInputs);
            } else {
                ansText = _submitDefault(q, ans, otherInputs);
                data._qcSubmitFlag = 'D:' + _submitType_orig + '->' + _submitType_cur;
            }
            lines.push(q.question + ": " + ansText);
        }
        var message = lines.join("\n");
        // 修改后重新提交：消息头部注明
        if (editedState[0]) {
            message = _t("ui.form.editResubmit", data._lang) + "\n" + message;
        }
        // 全空时插入占位文本
        if (!hasAnyAnswer) {
            message += "\n" + _t("ui.form.emptySubmit",data._lang);
        }
        // 结果表达式计算
        var hasCount = data.count === true;
        // resultcode 优先于 result（互斥）
if (hasCount && data.resultcode) {
    var resultText = "";
    try {
        var resolvedCode = String(data.resultcode || "");
        if (typeof data.resultcode === 'string') {
            var _qlangResult = await executeQLang(resolvedCode, answers, otherInputs, data.questions);
            if (typeof _qlangResult === 'object' && _qlangResult.resultText !== undefined) {
                resultText = _qlangResult.resultText;
                if (_qlangResult.qinitData && Object.keys(_qlangResult.qinitData).length > 0) {
                    // 应用 @qinit 预处理数据到问卷初始值
                    for (var _qk in _qlangResult.qinitData) {
                        if (data.questions) {
                            for (var _qi = 0; _qi < data.questions.length; _qi++) {
                                if (data.questions[_qi].id === _qk && data.questions[_qi].value === undefined) {
                                    data.questions[_qi].value = _qlangResult.qinitData[_qk];
                                }
                            }
                        }
                    }
                }
            } else {
                resultText = String(_qlangResult || '');
            }
        } else if (Array.isArray(data.resultcode)) {
            resultText = executeResultCode(data.resultcode, answers, otherInputs, data.questions);
        }
    }
    catch (e) {
        data._hasInvalid = true;
        if (!data._invalidQuestions)
            data._invalidQuestions = [];
        submittingState[1](false);
        data._invalidQuestions.push(_t("ui.form.errorRuntimeScript",data._lang) + String(e));
        dataState[1](JSON.stringify(data));
        return;
    }
            if (resultText) {
                var outputRaw = data.output_raw !== false && data.output_raw !== "false";
                if (outputRaw) {
                    message += "\n\n── 结果 ──\n" + resultText;
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
                data._invalidQuestions.push(_t("ui.form.errorRuntimeResult",data._lang) + String(e));
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
        // 未填项：插入到表单与卷谱之间
        if (unfilledList.length > 0) {
            var unfilledText = "\n\n" + _t("ui.form.unfilled", data._lang) + "\n" + unfilledList.join("\n");
            var _resultMarker = "\n\n── 结果 ──";
            var _umi = message.lastIndexOf(_resultMarker);
            if (_umi >= 0) {
                message = message.substring(0, _umi) + unfilledText + "\n" + message.substring(_umi);
            } else {
                message += unfilledText;
            }
        }
        // 生成卷谱（如果启用）
        if (data.roll_spec === true || data.roll_spec === "true") {
            var rollParts = [];
            var realIdx = 0;
            for (var rsi = 0; rsi < questions.length; rsi++) {
                var rsq = questions[rsi];
                if (rsq.type === "section") continue;
                realIdx++;
                var rr = rsq.required ? "r" : "s";
                var rans = answers[rsq.id];
                var rfilled = rans !== undefined && rans !== null && rans !== "" && !(Array.isArray(rans) && rans.length === 0);
                var rt = rfilled ? "t" : "-";
                rollParts.push(String(realIdx) + rr + rt);
            }
            var rollSpec = rollParts.join("");
            // 卷谱插入：有结果时放在问卷和结果之间，无结果时追加到末尾
            var rollLine = "\n\n卷谱: " + rollSpec;
            if (hasCount && (data.resultcode || data.result)) {
                // 有结果表达式/脚本，卷谱在问卷内容之后、结果之前
                // 当前 message 结构是：问卷内容 + 结果文本
                // 找到结果分隔标记 _t("ui.form.resultSection",data._lang) 并在前面插入
                var resultMarker = "\n\n── 结果 ──";
                var ri = message.lastIndexOf(resultMarker);
                if (ri >= 0) {
                    message = message.substring(0, ri) + rollLine + "\n" + message.substring(ri);
                } else {
                    message += rollLine;
                }
            } else {
                message += rollLine;
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
        // 写入历史记录（通过系统 write_file 追加到数组）
        try {
            var _historyData = JSON.parse(dataState[0] || "{}");
            if (_historyData._historyEnabled === "true" && fingerprint) {
                var _historyDir = "/sdcard/Download/Operit/questionnaire/history";
                var _historyFilePath = _historyDir + "/" + fingerprint + ".json";
                var _historyRecords = [];
                try {
                    var _existingRaw = await ctx.callTool("read_file", { path: _historyFilePath });
                    if (_existingRaw && _existingRaw.content) {
                        _historyRecords = JSON.parse(_existingRaw.content);
                        if (!Array.isArray(_historyRecords)) _historyRecords = [];
                    }
                } catch(e) { _historyRecords = []; }
                _historyRecords.push({
                    fingerprint: fingerprint,
                    title: _historyData.title || "",
                    answers: answers,
                    otherInputs: otherInputs,
                    timestamp: _historyData._timestamp || new Date().toISOString().replace("T", " ").substring(0, 19),
                    lastSubmit: new Date().toISOString().replace("T", " ").substring(0, 19),
                });
                await ctx.callTool("write_file", { path: _historyFilePath, content: JSON.stringify(_historyRecords) });
            }
        } catch(e) { /* 历史记录写入失败不影响主流程 */ }
    }
    function handleCancel() {
        cancelledState[1](true);
        try {
            Tools.Chat.sendMessage(_t("ui.form.cancelled",data._lang), chatId, undefined, undefined, { runtime: "main" });
        }
        catch (e) { }
    }
    function toggleCollapse() {
        if (isExpired && collapsedForce)
            return;
        collapsedState[1](!collapsed);
    }
        // ── 动态题型注册表 ──
    var _qcAnserCompMap = { 'singleChoice': '_renderSingle', 'multipleChoice': '_renderMultiple', 'textField': '_renderText', 'textArea': '_renderTextarea', 'switch': '_renderSwitch', 'checkbox': '_renderCheckbox', 'rating': '_renderRating', 'button': '_renderButton' };
    // AnserComponent名 → 内置题型名的映射
    function registerType(typeName, renderFn, submitFn) {
        _typeRegistry[typeName] = { render: renderFn, submit: submitFn };
    }
    
    // ── 答案提交格式化函数 ──
    function _submitDefault(q, ans, otherInputs) {
        return Array.isArray(ans) ? ans.join(", ") : String(ans);
    }
    function _submitSingle(q, ans, oi) {
        if (q.enableOther && ans === "__other__") return _t("ui.form.otherPrefix",data._lang) + (oi[q.id] || "");
        return String(ans);
    }
    function _submitRating(q, ans) { return String(ans) + _t("ui.form.star",data._lang); }
    function _submitLikert(q, ans) {
        var opts = q.options || [];
        var li = Math.min(Math.max(parseInt(ans) - 1, 0), opts.length - 1);
        return opts[li] + " (" + ans + "/5)";
    }
    function _submitNps(q, ans) {
        var label = parseInt(ans) >= 9 ? _t("ui.form.npsPromoter",data._lang) : (parseInt(ans) >= 7 ? _t("ui.form.npsDetractor",data._lang) : _t("ui.form.npsDetractor",data._lang));
        return ans + "/10 (" + label + ")";
    }
    function _submitTextarea(q, ans) { return "```\n" + String(ans) + "\n```"; }
    function _submitTime(q, ans) { return String(ans); }
    // confirm：传给 AI 的文字是「已确认 / 未确认」，而不是裸的 true
    function _submitConfirm(q, ans) {
        return (ans === true || ans === "true") ? _t("ui.form.confirmed", data._lang) : _t("ui.form.notConfirmed", data._lang);
    }
    // number：带单位输出，如「15 个」
    function _submitNumber(q, ans) {
        if (ans === undefined || ans === null || ans === "") return "";
        return String(ans) + (q.unit ? " " + q.unit : "");
    }
    
    // ── 渲染器函数 ──
    // 所有内置渲染器保持原始代码不变
    function _renderSection(q, idx, nodes) {
        // v1.8.1：分组标题改成色块底 + 左侧主色竖条（compact 主题自动退回旧的纯文字）
        return SectionHeader(ctx, {
            keyName: "sec_" + q.id,
            text: q.question,
            subtitle: q.subtitle,
            theme: theme,
        });
    }
    
    function _renderSingle(q, idx, nodes, qText, answer, isSubmitted) {
        if (isSubmitted) {
            var hasAnswer = answer !== undefined && answer !== null && answer !== "" && !(Array.isArray(answer) && answer.length === 0);
            if (q.enableOther && answer === "__other__")
                hasAnswer = true;
            var displayAnswer = "";
            if (hasAnswer) {
                if (q.enableOther && answer === "__other__") {
                    displayAnswer = _t("ui.form.otherPrefix",data._lang) + (otherInputs[q.id] || "");
                } else {
                    displayAnswer = "";
                }
            }
            return ctx.UI.Column({ key: "qa_" + q.id, spacing: 2 }, [
                ctx.UI.Text({ text: qText, style: "labelMedium", color: onSurface }),
                hasAnswer
                    ? ctx.UI.Text({ text: "    └ " + displayAnswer, style: "bodyMedium", color: answerColor })
                    : ctx.UI.Text({ text: _t("ui.form.noAnswer",data._lang), style: "bodyMedium", color: onSurfaceVariant.copy({ alpha: 0.5 }) }),
            ]);
        }
        if (isExpired)
            return null;
        var opts = q.options || [];
        var btnNodes = [];
        var isCompact = theme === "compact";
        for (var oi = 0; oi < opts.length; oi++) {
            var opt = opts[oi];
            var isSelected = answer === opt;
            (function (optVal, optIdx, sel) {
                if (theme === "modern") {
                    btnNodes.push(OptionRow(ctx, {
                        keyName: q.id + "_" + optIdx,
                        label: optVal,
                        selected: sel,
                        radio: true,
                        onClick: function () { setAnswer(q.id, optVal); },
                    }));
                } else {
                    btnNodes.push(ctx.UI.OutlinedButton({
                        key: q.id + "_" + optIdx,
                        containerColor: sel ? primary : null,
                        contentColor: sel ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                        onClick: function () { setAnswer(q.id, optVal); },
                        border: { width: 1.5, color: onSurfaceVariant },
                        content: ctx.UI.Text({ text: optVal, style: "labelSmall", color: sel ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                    }));
                }
            })(opt, oi, isSelected);
        }
        if (q.enableOther) {
            var isOtherSelected = answer === "__other__";
            if (theme === "modern") {
                btnNodes.push(OptionRow(ctx, {
                    keyName: q.id + "_other_btn",
                    label: _t("ui.form.other", data._lang),
                    selected: isOtherSelected,
                    radio: true,
                    last: true,
                    onClick: function () { setAnswer(q.id, "__other__"); },
                }));
            } else {
                btnNodes.push(ctx.UI.OutlinedButton({
                    key: q.id + "_other_btn",
                    containerColor: isOtherSelected ? primary : null,
                    contentColor: isOtherSelected ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                    onClick: function () { setAnswer(q.id, "__other__"); },
                    border: { width: 1.5, color: onSurfaceVariant },
                    content: ctx.UI.Text({ text: _t("ui.form.other", data._lang), style: "labelSmall", color: isOtherSelected ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                }));
            }
        }
        nodes.push(OptionList(ctx, theme, q.id + "_row", btnNodes));
        if (q.enableOther && answer === "__other__") {
            var otherVal = otherInputs[q.id] || "";
            nodes.push(ctx.UI.TextField({
                value: otherVal,
                onValueChange: function (newVal) { setOtherInput(q.id, newVal); },
                placeholder: _t("ui.form.otherPlaceholder",data._lang),
                singleLine: true,
                enabled: true,
                style: "compact",
            }));
        }
        return null;
    }
    
    function _renderMultiple(q, idx, nodes, qText, answer, isSubmitted) {
        if (isSubmitted) {
            var hasAnswer = answer !== undefined && answer !== null && answer !== "" && !(Array.isArray(answer) && answer.length === 0);
            var displayAnswer = hasAnswer ? (Array.isArray(answer) ? answer.join(", ") : String(answer)) : "";
            return ctx.UI.Column({ key: "qa_" + q.id, spacing: 2 }, [
                ctx.UI.Text({ text: qText, style: "labelMedium", color: onSurface }),
                hasAnswer
                    ? ctx.UI.Text({ text: "    └ " + displayAnswer, style: "bodyMedium", color: answerColor })
                    : ctx.UI.Text({ text: _t("ui.form.noAnswer",data._lang), style: "bodyMedium", color: onSurfaceVariant.copy({ alpha: 0.5 }) }),
            ]);
        }
        if (isExpired) return null;
        var opts2 = q.options || [];
        var currentArr = Array.isArray(answer) ? answer : [];
        var btnNodes2 = [];
        var isCompact = theme === "compact";
        for (var ci = 0; ci < opts2.length; ci++) {
            var opt2 = opts2[ci];
            var isChecked = currentArr.indexOf(opt2) >= 0;
            (function (optVal, optIdx, checked) {
                if (theme === "modern") {
                    btnNodes2.push(OptionRow(ctx, {
                        keyName: q.id + "_" + optIdx,
                        label: optVal,
                        selected: checked,
                        radio: false,
                        last: optIdx === opts2.length - 1,
                        onClick: function () { toggleOption(q.id, optVal); },
                    }));
                } else {
                    btnNodes2.push(ctx.UI.OutlinedButton({
                        key: q.id + "_" + optIdx,
                        containerColor: checked ? primary : null,
                        contentColor: checked ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                        onClick: function () { toggleOption(q.id, optVal); },
                        border: { width: 1.5, color: onSurfaceVariant },
                        content: ctx.UI.Text({ text: optVal, style: "labelSmall", color: checked ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                    }));
                }
            })(opt2, ci, isChecked);
        }
        // v1.8.4：全选（与主渲染链一致）
        if (opts2.length >= 5 && !isSubmitted) {
            var _allPicked = currentArr.length >= opts2.length;
            nodes.push(ctx.UI.Row({
                key: q.id + "_selall_row",
                fillMaxWidth: true,
                verticalAlignment: "center",
                spacing: _SPACE.xs,
                padding: { bottom: _SPACE.xs },
            }, [
                ctx.UI.Text({
                    key: q.id + "_selall_cnt",
                    text: _t("ui.form.pickedCount", data._lang)
                        .replace("%s", String(currentArr.length)).replace("%d", String(opts2.length)),
                    fontSize: _FONT.hint,
                    color: ctx.MaterialTheme.colorScheme.onSurfaceVariant,
                    weight: 1,
                }),
                ctx.UI.TextButton({
                    key: q.id + "_selall_btn",
                    onClick: function () { setAnswer(q.id, _allPicked ? [] : opts2.slice()); },
                    content: ctx.UI.Text({
                        text: _allPicked ? _t("ui.form.deselectAll", data._lang) : _t("ui.form.selectAll", data._lang),
                        style: "labelSmall",
                        color: primary,
                    }),
                }),
            ]));
        }
        nodes.push(OptionList(ctx, theme, q.id + "_row", btnNodes2, undefined, _t("ui.form.scrollHint", data._lang)));
        return null;
    }
    
    function _renderText(q, idx, nodes, qText, answer, isSubmitted) {
        if (isSubmitted) {
            var hasAnswer = answer !== undefined && answer !== null && answer !== "";
            var displayAnswer = hasAnswer ? String(answer) : "";
            return ctx.UI.Column({ key: "qa_" + q.id, spacing: 2 }, [
                ctx.UI.Text({ text: qText, style: "labelMedium", color: onSurface }),
                hasAnswer
                    ? ctx.UI.Text({ text: "    └ " + displayAnswer, style: "bodyMedium", color: answerColor })
                    : ctx.UI.Text({ text: _t("ui.form.noAnswer",data._lang), style: "bodyMedium", color: onSurfaceVariant.copy({ alpha: 0.5 }) }),
            ]);
        }
        if (isExpired) return null;
        var textVal = answer || "";
        nodes.push(ctx.UI.TextField({
            value: textVal,
            onValueChange: function (newVal) { setAnswer(q.id, newVal); },
            placeholder: _t("ui.form.textPlaceholder",data._lang),
            singleLine: true,
            enabled: true,
            style: "compact",
        }));
        return null;
    }
    
    function _renderTextarea(q, idx, nodes, qText, answer, isSubmitted) {
        if (isSubmitted) {
            var hasAnswer = answer !== undefined && answer !== null && answer !== "";
            var displayAnswer = hasAnswer ? String(answer) : "";
            return ctx.UI.Column({ key: "qa_" + q.id, spacing: 2 }, [
                ctx.UI.Text({ text: qText, style: "labelMedium", color: onSurface }),
                hasAnswer
                    ? ctx.UI.Text({ text: "    └ " + displayAnswer, style: "bodyMedium", color: answerColor })
                    : ctx.UI.Text({ text: _t("ui.form.noAnswer",data._lang), style: "bodyMedium", color: onSurfaceVariant.copy({ alpha: 0.5 }) }),
            ]);
        }
        if (isExpired) return null;
        var areaVal = answer || "";
        nodes.push(ctx.UI.TextField({
            value: areaVal,
            onValueChange: function (newVal) { setAnswer(q.id, newVal); },
            placeholder: _t("ui.form.textareaPlaceholder",data._lang),
            singleLine: false,
            minLines: 3,
            maxLines: 8,
            enabled: true,
            style: "compact",
        }));
        return null;
    }
    
    function _renderRating(q, idx, nodes, qText, answer, isSubmitted) {
        if (isSubmitted) {
            var hasAnswer = answer !== undefined && answer !== null && answer !== "";
            var displayAnswer = hasAnswer ? renderStarsText(parseInt(answer || 0)) : "";
            return ctx.UI.Column({ key: "qa_" + q.id, spacing: 2 }, [
                ctx.UI.Text({ text: qText, style: "labelMedium", color: onSurface }),
                hasAnswer
                    ? ctx.UI.Text({ text: "    └ " + displayAnswer, style: "bodyMedium", color: answerColor })
                    : ctx.UI.Text({ text: _t("ui.form.noAnswer",data._lang), style: "bodyMedium", color: onSurfaceVariant.copy({ alpha: 0.5 }) }),
            ]);
        }
        if (isExpired) return null;
        var ratingVal = parseInt(answer) || 0;
        // v1.8.1：一排真星级图标（compact 主题组件内部自动退回数字按钮）
        var ratingLabels = ["", _t("ui.form.ratingVeryBad",data._lang), _t("ui.form.ratingBad",data._lang), _t("ui.form.ratingNormal",data._lang), _t("ui.form.ratingGood",data._lang), _t("ui.form.ratingVeryGood",data._lang)];
        nodes.push(RatingStars(ctx, {
            keyName: q.id + "_stars",
            value: ratingVal,
            labels: ratingLabels,
            hint: _t("ui.form.starHint", data._lang),
            theme: theme,
            onChange: function (score) { setAnswer(q.id, String(score)); },
        }));
        return null;
    }

    function _renderLikert(q, idx, nodes, qText, answer, isSubmitted) {
        if (isSubmitted) {
            var hasAnswer = answer !== undefined && answer !== null && answer !== "";
            var likertOpts0 = q.options || [];
            var li0 = Math.min(Math.max(parseInt(answer) - 1, 0), likertOpts0.length - 1);
            var displayAnswer = hasAnswer ? likertOpts0[li0] : "";
            return ctx.UI.Column({ key: "qa_" + q.id, spacing: 2 }, [
                ctx.UI.Text({ text: qText, style: "labelMedium", color: onSurface }),
                hasAnswer
                    ? ctx.UI.Text({ text: "    └ " + displayAnswer, style: "bodyMedium", color: answerColor })
                    : ctx.UI.Text({ text: _t("ui.form.noAnswer",data._lang), style: "bodyMedium", color: onSurfaceVariant.copy({ alpha: 0.5 }) }),
            ]);
        }
        if (isExpired) return null;
        var likertOpts = q.options || [_t("ui.form.likertStronglyDisagree",data._lang), _t("ui.form.likertDisagree",data._lang), _t("ui.form.ratingNormal",data._lang), _t("ui.form.likertAgree",data._lang), _t("ui.form.likertStronglyAgree",data._lang)];
        var likertVal = parseInt(answer) || 0;
        // v1.8.1：横向刻度条（compact 主题组件内部自动退回两行按钮）
        nodes.push(LikertScale(ctx, {
            keyName: q.id + "_likert",
            options: likertOpts,
            value: likertVal,
            theme: theme,
            onChange: function (i) { setAnswer(q.id, String(i)); },
        }));
        return null;
    }

    // ── 长按确认（confirm）──
    // 交互：未确认时长按→确认；已确认时点击→取消。
    // 答案存 "true" / ""（空字符串表示未确认），与其它题型保持同一套 answers 结构。
    function _renderConfirm(q, idx, nodes, qText, answer, isSubmitted) {
        var confirmed = answer === true || answer === "true";
        if (isSubmitted) {
            return ctx.UI.Column({ key: "qa_" + q.id, spacing: 2 }, [
                ctx.UI.Text({ text: qText, style: "labelMedium", color: onSurface }),
                ctx.UI.Text({
                    text: "    └ " + (confirmed ? _t("ui.form.confirmed",data._lang) : _t("ui.form.notConfirmed",data._lang)),
                    style: "bodyMedium",
                    color: confirmed ? answerColor : onSurfaceVariant.copy({ alpha: 0.5 }),
                }),
            ]);
        }
        if (isExpired) return null;
        nodes.push(ConfirmField(ctx, {
            keyName: q.id + "_confirm",
            text: q.question || "",
            checked: confirmed,
            theme: theme,
            required: q.required === true,
            tried: triedSubmit,
            errText: _t("ui.form.errRequired",data._lang),
            longPressHint: _t("ui.form.longPressToConfirm",data._lang),
            confirmedHint: _t("ui.form.confirmedHint",data._lang),
            onChange: function (next) { setAnswer(q.id, next ? "true" : ""); },
        }));
    }

    // ── 数字步进（number）──
    // 题目可用 min / max / step / unit 四个字段约束；不给就用 0~100 步进 1。
    function _renderNumber(q, idx, nodes, qText, answer, isSubmitted) {
        var numVal = (answer === undefined || answer === null || answer === "") ? null : Number(answer);
        if (numVal !== null && isNaN(numVal)) numVal = null;
        var unit = q.unit || "";
        if (isSubmitted) {
            return ctx.UI.Column({ key: "qa_" + q.id, spacing: 2 }, [
                ctx.UI.Text({ text: qText, style: "labelMedium", color: onSurface }),
                numVal === null
                    ? ctx.UI.Text({ text: _t("ui.form.noAnswer",data._lang), style: "bodyMedium", color: onSurfaceVariant.copy({ alpha: 0.5 }) })
                    : ctx.UI.Text({ text: "    └ " + numVal + (unit ? " " + unit : ""), style: "bodyMedium", color: answerColor }),
            ]);
        }
        if (isExpired) return null;
        nodes.push(NumberField(ctx, {
            keyName: q.id + "_number",
            value: numVal,
            min: typeof q.min === "number" ? q.min : undefined,
            max: typeof q.max === "number" ? q.max : undefined,
            step: typeof q.step === "number" ? q.step : undefined,
            unit: unit,
            theme: theme,
            required: q.required === true,
            tried: triedSubmit,
            errText: _t("ui.form.errRequired",data._lang),
            onChange: function (next) { setAnswer(q.id, next === null ? "" : String(next)); },
        }));
    }

    function _renderNps(q, idx, nodes, qText, answer, isSubmitted) {
        if (isSubmitted) {
            var hasAnswer = answer !== undefined && answer !== null && answer !== "";
            var npsLabel2 = parseInt(answer) >= 9 ? _t("ui.form.npsPromoter",data._lang) : (parseInt(answer) >= 7 ? _t("ui.form.npsPassive",data._lang) : _t("ui.form.npsDetractor",data._lang));
            var displayAnswer = hasAnswer ? (answer + " (" + npsLabel2 + ")") : "";
            return ctx.UI.Column({ key: "qa_" + q.id, spacing: 2 }, [
                ctx.UI.Text({ text: qText, style: "labelMedium", color: onSurface }),
                hasAnswer
                    ? ctx.UI.Text({ text: "    └ " + displayAnswer, style: "bodyMedium", color: answerColor })
                    : ctx.UI.Text({ text: _t("ui.form.noAnswer",data._lang), style: "bodyMedium", color: onSurfaceVariant.copy({ alpha: 0.5 }) }),
            ]);
        }
        if (isExpired) return null;
        var npsVal = parseInt(answer);
        if (isNaN(npsVal)) npsVal = -1;
        // v1.8.1：0~10 单行胶囊刻度（compact 主题组件内部自动退回三行按钮）
        nodes.push(NpsScale(ctx, {
            keyName: q.id + "_nps",
            value: npsVal,
            theme: theme,
            onChange: function (i) { setAnswer(q.id, String(i)); },
        }));
        if (npsVal >= 0) {
            var npsLabel = npsVal >= 9 ? _t("ui.form.npsPromoter",data._lang) : (npsVal >= 7 ? _t("ui.form.npsPassive",data._lang) : _t("ui.form.npsDetractor",data._lang));
            nodes.push(ctx.UI.Text({ text: _t("ui.form.npsScore",data._lang) + npsVal + " (" + npsLabel + ")", style: "bodySmall", color: answerColor }));
        }
        else {
            nodes.push(ctx.UI.Row({ key: q.id + "_nps_hint", spacing: 8, horizontalArrangement: "center", fillMaxWidth: true, padding: { top: 2 } }, [
                ctx.UI.Text({ text: _t("ui.form.npsMin",data._lang), style: "labelSmall", color: onSurfaceVariant }),
                ctx.UI.Text({ text: _t("ui.form.npsMax",data._lang), style: "labelSmall", color: onSurfaceVariant }),
            ]));
        }
        return null;
    }

    
    function _renderTime(q, idx, nodes, qText, answer, isSubmitted) {
        if (isSubmitted) {
            var hasAnswer = answer !== undefined && answer !== null && answer !== "";
            var displayAnswer = hasAnswer ? String(answer) : "";
            return ctx.UI.Column({ key: "qa_" + q.id, spacing: 2 }, [
                ctx.UI.Text({ text: qText, style: "labelMedium", color: onSurface }),
                hasAnswer
                    ? ctx.UI.Text({ text: "    └ " + displayAnswer, style: "bodyMedium", color: answerColor })
                    : ctx.UI.Text({ text: _t("ui.form.noAnswer",data._lang), style: "bodyMedium", color: onSurfaceVariant.copy({ alpha: 0.5 }) }),
            ]);
        }
        if (isExpired) return null;
        var isCompact = theme === "compact";
        function buildTime(h, m, s) {
            return h + ":" + m + ":" + s;
        }
        function validateTimeFormat(val) {
            var m2 = String(val).match(/^(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
            if (!m2) return false;
            var hh = parseInt(m2[1]), mm = parseInt(m2[2]), ss = parseInt(m2[3]);
            return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59 && ss >= 0 && ss <= 59;
        }
        if (timeInputMode === "input") {
            var timeInputVal = answer || "";
            var timeError = timeInputVal && !validateTimeFormat(timeInputVal) ? _t("ui.form.timeError",data._lang) : "";
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
                timeInputNodes.push(ctx.UI.Text({ text: _t("ui.form.timeInputted",data._lang) + timeInputVal, style: "bodySmall", color: answerColor, padding: { top: 2 } }));
            } else if (timeInputVal) {
                timeInputNodes.push(ctx.UI.Text({ text: _t("ui.form.timeExample",data._lang), style: "bodySmall", color: onSurfaceVariant, padding: { top: 2 } }));
            }
            nodes.push(ctx.UI.Column({ key: q.id + "_input_col", spacing: 4, fillMaxWidth: true, padding: { vertical: 4 } }, timeInputNodes));
        } else {
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
                            leadingIcon: hourVal === h ? ctx.UI.Icon({ name: "Check", size: 14, tint: ctx.MaterialTheme.colorScheme.onPrimary }) : null,
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
            // 省略了分钟和秒的按钮代码太长，保持原样
            nodes.push(ctx.UI.Text({ text: _t("ui.form.timeHour",data._lang), style: "labelSmall", color: onSurfaceVariant, padding: { top: 4, bottom: 2 } }));
            nodes.push(ctx.UI.LazyRow({ key: q.id + "_hour_row", spacing: 4 }, hourBtnNodes));
        }
        return null;
    }
    
    // ── 内置题型已在 Screen 开头提前注册 ──
    
    // QinitCode 注册的自定义题型动态注入到 _typeRegistry，由 qinitcode 预处理阶段执行
    
    function renderQuestion(q, idx) {
        // 保存原始类型名，供提交时查自定义 submit 处理器
        q._qcOriginalType = q.type;
        // 通过 _qcCustomTypeMap 重映射自定义题型到内置类型（不依赖 _typeRegistry）
        var _qcMapped = _qcCustomTypeMap[q.type];
        if (_qcMapped && _qcAnserToType) {
            q.type = _qcMapped;
        }
        // 查动态题型注册表
        var _typeEntry = _typeRegistry[q.type];
        if (!_typeEntry || !_typeEntry.render) {
            // fallback 到 text
            _typeEntry = _typeRegistry['text'];
        }
        if (_typeEntry && _typeEntry.render && q.type === 'section') {
            return _typeEntry.render(q, idx, []);
        }
        if (q.type === "section") {
            // v1.8.1：分组标题改为色块底（compact 主题自动退回纯文字）
            return SectionHeader(ctx, {
                keyName: "sec_" + q.id,
                text: q.question,
                subtitle: q.subtitle,
                theme: theme,
            });
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
                    displayAnswer = _t("ui.form.otherPrefix",data._lang) + (otherInputs[q.id] || "");
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
                    var npsLabel2 = parseInt(answer) >= 9 ? _t("ui.form.npsPromoter",data._lang) : (parseInt(answer) >= 7 ? _t("ui.form.npsDetractor",data._lang) : _t("ui.form.npsDetractor",data._lang));
                    displayAnswer = answer + " (" + npsLabel2 + ")";
                }
                else if (q.type === "textarea") {
                    displayAnswer = String(answer);
                }
                else if (q.type === "time") {
                    displayAnswer = String(answer);
                }
                // v1.8.3：新题型的回显格式
                else if (q.type === "confirm") {
                    displayAnswer = (answer === true || answer === "true") ? _t("ui.form.confirmed", data._lang) : _t("ui.form.notConfirmed", data._lang);
                }
                else if (q.type === "number") {
                    displayAnswer = String(answer) + (q.unit ? " " + q.unit : "");
                }
                else {
                    displayAnswer = Array.isArray(answer) ? answer.join(", ") : String(answer);
                }
            }
            return ctx.UI.Column({ key: "qa_" + q.id, spacing: 2 }, [
                ctx.UI.Text({ text: qText, style: "labelMedium", color: onSurface }),
                hasAnswer
                    ? ctx.UI.Text({ text: "    └ " + displayAnswer, style: "bodyMedium", color: answerColor })
                    : ctx.UI.Text({ text: _t("ui.form.noAnswer",data._lang), style: "bodyMedium", color: onSurfaceVariant.copy({ alpha: 0.5 }) }),
            ]);
        }
        if (isExpired)
            return null;
        // v1.8.1：题干改用序号徽章 + 独立题干块（compact 主题自动退回单行拼接）
        var nodes = [
            QuestionHeader(ctx, {
                keyName: "qhead_" + q.id,
                index: qNum,
                text: q.question,
                subtitle: q.subtitle,
                required: q.required === true,
                theme: theme,
            }),
        ];
        if (q.type === "single") {
            var opts = q.options || [];
            var btnNodes = [];
            var isCompact = theme === "compact";
            for (var oi = 0; oi < opts.length; oi++) {
                var opt = opts[oi];
                var isSelected = answer === opt;
                (function (optVal, optIdx, sel) {
                    if (theme === "modern") {
                        btnNodes.push(OptionRow(ctx, {
                            keyName: q.id + "_" + optIdx,
                            label: optVal,
                            selected: sel,
                            radio: true,
                            last: optIdx === opts.length - 1 && !q.enableOther,
                            onClick: function () { setAnswer(q.id, optVal); },
                        }));
                    } else {
                        btnNodes.push(ctx.UI.OutlinedButton({
                            key: q.id + "_" + optIdx,
                            containerColor: sel ? primary : null,
                            contentColor: sel ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                            onClick: function () { setAnswer(q.id, optVal); },
                            border: { width: 1.5, color: onSurfaceVariant },
                            content: ctx.UI.Text({ text: optVal, style: "labelSmall", color: sel ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                        }));
                    }
                })(opt, oi, isSelected);
            }
            if (q.enableOther) {
                var isOtherSelected = answer === "__other__";
                (function (sel) {
                    if (theme === "modern") {
                        btnNodes.push(OptionRow(ctx, {
                            keyName: q.id + "_other_btn",
                            label: _t("ui.form.other", data._lang),
                            selected: sel,
                            radio: true,
                            last: true,
                            onClick: function () { setAnswer(q.id, "__other__"); },
                        }));
                    } else {
                        btnNodes.push(ctx.UI.OutlinedButton({
                            key: q.id + "_other_btn",
                            containerColor: sel ? primary : null,
                            contentColor: sel ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                            onClick: function () { setAnswer(q.id, "__other__"); },
                            border: { width: 1.5, color: onSurfaceVariant },
                            content: ctx.UI.Text({ text: _t("ui.form.other", data._lang), style: "labelSmall", color: sel ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                        }));
                    }
                })(isOtherSelected);
            }
            // classic 保持原有的 row/scroll 按钮布局；modern 走竖排整行；compact 走 chip 行
            if (theme === "modern") {
                nodes.push(OptionList(ctx, theme, q.id + "_row", btnNodes));
            } else {
                nodes.push(buttonLayout === "row"
                    ? ctx.UI.Column({ key: q.id + "_row", spacing: 4, fillMaxWidth: true, padding: { vertical: 2 } }, btnNodes.map(function(b){return ctx.UI.Column({spacing:0,fillMaxWidth:true},[b]);}))
                    : ctx.UI.LazyRow({ key: q.id + "_row", spacing: 4 }, btnNodes));
            }
            if (q.enableOther && answer === "__other__") {
                var otherVal = otherInputs[q.id] || "";
                nodes.push(ctx.UI.TextField({
                    value: otherVal,
                    onValueChange: function (newVal) { setOtherInput(q.id, newVal); },
                    placeholder: _t("ui.form.otherPlaceholder",data._lang),
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
            // v1.8.4：全选/取消全选，5 个选项以上才显示（少选项时全选没有意义，还多占一行）
            var showSelectAll = opts2.length >= 5;
            var allPicked = opts2.length > 0 && currentArr.length >= opts2.length;
            for (var ci = 0; ci < opts2.length; ci++) {
                var opt2 = opts2[ci];
                var isChecked = currentArr.indexOf(opt2) >= 0;
                (function (optVal, optIdx, checked) {
                    if (theme === "modern") {
                        btnNodes2.push(OptionRow(ctx, {
                            keyName: q.id + "_" + optIdx,
                            label: optVal,
                            selected: checked,
                            radio: false,
                            last: optIdx === opts2.length - 1,
                            onClick: function () { toggleOption(q.id, optVal); },
                        }));
                    } else {
                        btnNodes2.push(ctx.UI.OutlinedButton({
                            key: q.id + "_" + optIdx,
                            containerColor: checked ? primary : null,
                            contentColor: checked ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                            onClick: function () { toggleOption(q.id, optVal); },
                            border: { width: 1.5, color: onSurfaceVariant },
                            content: ctx.UI.Text({ text: optVal, style: "labelSmall", color: checked ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                        }));
                    }
                })(opt2, ci, isChecked);
            }
            // 全选行：放在选项列表上方，点了整体切换
            if (showSelectAll && isActive) {
                nodes.push(ctx.UI.Row({
                    key: q.id + "_selall_row",
                    fillMaxWidth: true,
                    verticalAlignment: "center",
                    spacing: _SPACE.xs,
                    padding: { bottom: _SPACE.xs },
                }, [
                    ctx.UI.Text({
                        key: q.id + "_selall_cnt",
                        text: _t("ui.form.pickedCount", data._lang)
                            .replace("%s", String(currentArr.length)).replace("%d", String(opts2.length)),
                        fontSize: _FONT.hint,
                        color: ctx.MaterialTheme.colorScheme.onSurfaceVariant,
                        weight: 1,
                    }),
                    ctx.UI.TextButton({
                        key: q.id + "_selall_btn",
                        onClick: function () { setAnswer(q.id, allPicked ? [] : opts2.slice()); },
                        content: ctx.UI.Text({
                            text: allPicked ? _t("ui.form.deselectAll", data._lang) : _t("ui.form.selectAll", data._lang),
                            style: "labelSmall",
                            color: primary,
                        }),
                    }),
                ]));
            }
            nodes.push(OptionList(ctx, theme, q.id + "_row", btnNodes2, undefined, _t("ui.form.scrollHint", data._lang)));
        }
        else if (q.type === "text") {
            var textVal = answer || "";
            // v1.8.3：必填项的校验态（参考素材库 input-error）
            //   只有「已尝试提交 + 必填 + 空」三者同时成立才标红，避免一进页面就满屏红框。
            var textBad = triedSubmit && q.required === true && !String(textVal).trim();
            var textProps = {
                value: textVal,
                onValueChange: function (newVal) { setAnswer(q.id, newVal); },
                placeholder: _t("ui.form.textPlaceholder",data._lang),
                singleLine: true,
                enabled: true,
                style: "compact",
            };
            if (q.required === true) {
                textProps.isError = textBad;
                textProps.supportingText = [ctx.UI.Text({
                    text: textBad ? _t("ui.form.errRequired",data._lang) : _t("ui.form.requiredHint",data._lang),
                    style: "bodySmall",
                    color: textBad ? ctx.MaterialTheme.colorScheme.error : ctx.MaterialTheme.colorScheme.onSurfaceVariant,
                })];
            }
            nodes.push(ctx.UI.TextField(textProps));
        }
        else if (q.type === "textarea") {
            var areaVal = answer || "";
            var areaBad = triedSubmit && q.required === true && !String(areaVal).trim();
            var areaProps = {
                value: areaVal,
                onValueChange: function (newVal) { setAnswer(q.id, newVal); },
                placeholder: _t("ui.form.textareaPlaceholder",data._lang),
                singleLine: false,
                minLines: 3,
                maxLines: 8,
                enabled: true,
                style: "compact",
            };
            // supportingText 一行里放：错误/必填提示 + 右侧字数
            if (q.required === true) {
                areaProps.isError = areaBad;
                areaProps.supportingText = [
                    ctx.UI.Row({ fillMaxWidth: true, verticalAlignment: "center", spacing: 0 }, [
                        ctx.UI.Text({
                            text: areaBad ? _t("ui.form.errRequired",data._lang) : _t("ui.form.requiredHint",data._lang),
                            style: "bodySmall",
                            weight: 1,
                            color: areaBad ? ctx.MaterialTheme.colorScheme.error : ctx.MaterialTheme.colorScheme.onSurfaceVariant,
                        }),
                        ctx.UI.Text({
                            text: String(String(areaVal).length) + " " + _t("ui.form.charUnit",data._lang),
                            style: "bodySmall",
                            color: ctx.MaterialTheme.colorScheme.onSurfaceVariant,
                        }),
                    ]),
                ];
            }
            nodes.push(ctx.UI.TextField(areaProps));
        }
        // ── v1.8.3 新增：长按确认 / 数字步进 ──
        // 注意：渲染走的是下面的 if-else 硬编码链，_typeRegistry 只在自定义题型（QinitCode）时用。
        // 只调 registerType 不往这条链加分支，新题型就会「注册了但不渲染」。
        else if (q.type === "confirm") {
            var _cfConfirmed = answer === true || answer === "true";
            nodes.push(ConfirmField(ctx, {
                keyName: q.id + "_confirm",
                text: q.question || "",
                checked: _cfConfirmed,
                theme: theme,
                required: q.required === true,
                tried: triedSubmit,
                errText: _t("ui.form.errRequired", data._lang),
                longPressHint: _t("ui.form.longPressToConfirm", data._lang),
                confirmedHint: _t("ui.form.confirmedHint", data._lang),
                onChange: function (next) { setAnswer(q.id, next ? "true" : ""); },
            }));
        }
        else if (q.type === "number") {
            var _nfVal = (answer === undefined || answer === null || answer === "") ? null : Number(answer);
            if (_nfVal !== null && isNaN(_nfVal)) _nfVal = null;
            nodes.push(NumberField(ctx, {
                keyName: q.id + "_number",
                value: _nfVal,
                min: typeof q.min === "number" ? q.min : undefined,
                max: typeof q.max === "number" ? q.max : undefined,
                step: typeof q.step === "number" ? q.step : undefined,
                unit: q.unit || "",
                theme: theme,
                required: q.required === true,
                tried: triedSubmit,
                errText: _t("ui.form.errRequired", data._lang),
                onChange: function (next) { setAnswer(q.id, next === null ? "" : String(next)); },
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
                var timeError = timeInputVal && !validateTimeFormat(timeInputVal) ? _t("ui.form.timeError",data._lang) : "";
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
                    timeInputNodes.push(ctx.UI.Text({ text: _t("ui.form.timeInputted",data._lang) + timeInputVal, style: "bodySmall", color: answerColor, padding: { top: 2 } }));
                } else if (timeInputVal) {
                    timeInputNodes.push(ctx.UI.Text({ text: _t("ui.form.timeExample",data._lang), style: "bodySmall", color: onSurfaceVariant, padding: { top: 2 } }));
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
                                leadingIcon: hourVal === h ? ctx.UI.Icon({ name: "Check", size: 14, tint: ctx.MaterialTheme.colorScheme.onPrimary }) : null,
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
                                leadingIcon: minVal === m ? ctx.UI.Icon({ name: "Check", size: 14, tint: ctx.MaterialTheme.colorScheme.onPrimary }) : null,
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
                                leadingIcon: secVal === s ? ctx.UI.Icon({ name: "Check", size: 14, tint: ctx.MaterialTheme.colorScheme.onPrimary }) : null,
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
                nodes.push(ctx.UI.Text({ text: _t("ui.form.timeHour",data._lang), style: "labelSmall", color: onSurfaceVariant, padding: { top: 4, bottom: 2 } }));
                nodes.push(ctx.UI.LazyRow({ key: q.id + "_hour_row", spacing: 4 }, hourBtnNodes));
                nodes.push(ctx.UI.Text({ text: _t("ui.form.timeMin",data._lang), style: "labelSmall", color: onSurfaceVariant, padding: { top: 4, bottom: 2 } }));
                nodes.push(ctx.UI.Column({ key: q.id + "_min_col", spacing: 4, fillMaxWidth: true }, splitRows(minBtnNodes, 20)));
                nodes.push(ctx.UI.Text({ text: _t("ui.form.timeSec",data._lang), style: "labelSmall", color: onSurfaceVariant, padding: { top: 4, bottom: 2 } }));
                nodes.push(ctx.UI.Column({ key: q.id + "_sec_col", spacing: 4, fillMaxWidth: true }, splitRows(secBtnNodes, 20)));
                var displayTime = hourVal + ":" + minVal + ":" + secVal;
                if (!answer)
                    displayTime = "";
                if (displayTime) {
                    nodes.push(ctx.UI.Text({ text: _t("ui.form.likertSelected",data._lang) + displayTime, style: "bodySmall", color: answerColor, padding: { top: 2 } }));
                }
            }
        }
        else if (q.type === "rating") {
            var ratingVal = parseInt(answer) || 0;
            var ratingLabels = ["", _t("ui.form.ratingVeryBad",data._lang), _t("ui.form.ratingBad",data._lang), _t("ui.form.ratingNormal",data._lang), _t("ui.form.ratingGood",data._lang), _t("ui.form.ratingVeryGood",data._lang)];
            // v1.8.1：一排真星级图标
            nodes.push(RatingStars(ctx, {
                keyName: q.id + "_stars",
                value: ratingVal,
                labels: ratingLabels,
                hint: _t("ui.form.starHint", data._lang),
                theme: theme,
                onChange: function (score) { setAnswer(q.id, String(score)); },
            }));
        }
        else if (q.type === "likert") {
            var likertOpts = q.options || [_t("ui.form.likertStronglyDisagree",data._lang), _t("ui.form.likertDisagree",data._lang), _t("ui.form.ratingNormal",data._lang), _t("ui.form.likertAgree",data._lang), _t("ui.form.likertStronglyAgree",data._lang)];
            var likertVal = parseInt(answer) || 0;
            // v1.8.1：横向刻度条
            nodes.push(LikertScale(ctx, {
                keyName: q.id + "_likert",
                options: likertOpts,
                value: likertVal,
                theme: theme,
                onChange: function (i) { setAnswer(q.id, String(i)); },
            }));
            if (likertVal > 0) {
                var likertIdx2 = Math.min(Math.max(likertVal - 1, 0), likertOpts.length - 1);
                nodes.push(ctx.UI.Text({ text: _t("ui.form.likertSelected",data._lang) + likertOpts[likertIdx2], style: "bodySmall", color: answerColor }));
            }
        }
        else if (q.type === "nps") {
            var npsVal = parseInt(answer);
            if (isNaN(npsVal)) npsVal = -1;
            // v1.8.1：0~10 单行胶囊刻度
            nodes.push(NpsScale(ctx, {
                keyName: q.id + "_nps",
                value: npsVal,
                theme: theme,
                onChange: function (i) { setAnswer(q.id, String(i)); },
            }));
            if (npsVal >= 0) {
                var npsLabel = npsVal >= 9 ? _t("ui.form.npsPromoter",data._lang) : (npsVal >= 7 ? _t("ui.form.npsPassive",data._lang) : _t("ui.form.npsDetractor",data._lang));
                nodes.push(ctx.UI.Text({ text: _t("ui.form.npsScore",data._lang) + npsVal + " (" + npsLabel + ")", style: "bodySmall", color: answerColor }));
            }
            else {
                nodes.push(ctx.UI.Row({ key: q.id + "_nps_hint", spacing: 8, horizontalArrangement: "center", fillMaxWidth: true, padding: { top: 2 } }, [
                    ctx.UI.Text({ text: _t("ui.form.npsMin",data._lang), style: "labelSmall", color: onSurfaceVariant }),
                    ctx.UI.Text({ text: _t("ui.form.npsMax",data._lang), style: "labelSmall", color: onSurfaceVariant }),
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
                    content: ctx.UI.Text({ text: _t("ui.form.npsClear",data._lang), style: "labelSmall", color: onSurfaceVariant }),
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
                            var rLabels = ["", _t("ui.form.ratingVeryBad",data._lang), _t("ui.form.ratingBad",data._lang), _t("ui.form.ratingNormal",data._lang), _t("ui.form.ratingGood",data._lang), _t("ui.form.ratingVeryGood",data._lang)];
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
                            return nv >= 9 ? _t("ui.form.npsPromoter",data._lang) : (nv >= 7 ? _t("ui.form.npsDetractor",data._lang) : _t("ui.form.npsDetractor",data._lang));
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
    // 一键补全：有历史记录但未匹配 timestamp
    var _showFillButton = _historyRecords && _historyRecords.length > 0 && !submitted && !hasInvalid;
    var _fillAnswers = null;
    if (_showFillButton) {
        _fillAnswers = _historyRecords[_historyRecords.length - 1].answers || null;
        var _fillOtherInputs = _historyRecords[_historyRecords.length - 1].otherInputs || null;
    }
    function fillFromHistory() {
        if (_fillAnswers) {
            answersState[1](JSON.stringify(_fillAnswers));
            if (_fillOtherInputs) {
                otherInputsState[1](JSON.stringify(_fillOtherInputs));
            }
            errorMsgState[1]("");
            fillHintState[1](_t("ui.form.fillOk", data._lang));
            try { ctx.showToast(_t("ui.form.fillOk", data._lang)); } catch (e) {}
            // 紧凑分页：补全后跳到第一题页，让用户直接看到补全效果
            if (isPaging && pageIndex === 0) goToPage(questionStartPage);
        }
    }
    
    var headerText = _t("ui.form.asking",data._lang).replace("%d", String(questionCount));
    if (hasInvalid)
        headerText = _t("ui.form.parseError", data._lang);
    if (isSubmitted)
        headerText = '📋 ' + _t("ui.form.submitted", data._lang);
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
    // 提交完成且未过期：头部右侧显示"修改"按钮，点击回到编辑态并自动带出刚填写的答案
    var editBtn = (isSubmitted && !isExpired) ? ctx.UI.IconButton({
        key: "edit_btn",
        icon: "Edit",
        tint: primary,
        onClick: function () { editedState[1](true); fillHintState[1](""); submittedState[1](false); },
    }) : null;
    var headerPadding = isExpired ? { horizontal: 8, vertical: 4 } : { horizontal: 8, vertical: 10 };
    var headerRow = ctx.UI.Row({ key: "header", padding: headerPadding, verticalAlignment: "center", fillMaxWidth: true, onClick: headerOnClick, horizontalArrangement: "spaceBetween" }, [
        ctx.UI.Row({ key: "header_left", spacing: 0, verticalAlignment: "center" }, headerNodes),
        editBtn,
    ]);
    var contentNodes = [];
    if (cancelled) {
        contentNodes.push(ctx.UI.Column({ key: "cancelled", padding: { horizontal: 16, vertical: 12 }, horizontalAlignment: "centerHorizontally", fillMaxWidth: true }, [
            ctx.UI.Text({ text: _t("ui.form.cancelledTitle",data._lang), style: "titleSmall", color: onSurfaceVariant }),
        ]));
    }
        else if (isSubmitting) {
        contentNodes.push(ctx.UI.Column({ key: "computing", padding: { horizontal: 16, vertical: 24 }, horizontalAlignment: "centerHorizontally", fillMaxWidth: true }, [
            ctx.UI.CircularProgressIndicator({ modifier: { size: 32 } }),
            ctx.UI.Spacer({ height: 12 }),
            ctx.UI.Text({ text: _t("ui.form.submitting",data._lang), style: "bodyMedium", color: onSurfaceVariant }),
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
        else if (isLangNeeded) {
            contentNodes.push(ctx.UI.Card({ key: "lang_card", fillMaxWidth: true, containerColor: surfaceVariant }, [
                ctx.UI.Column({ padding: { horizontal: 16, vertical: 16 }, spacing: 12, horizontalAlignment: "centerHorizontally", fillMaxWidth: true }, [
                    ctx.UI.Icon({ name: "Warning", size: 32, tint: primary }),
                    ctx.UI.Text({ text: "Language Not Set / 未设置语言", style: "titleSmall", color: onSurface, textAlign: "center" }),
                    ctx.UI.Text({ text: "Please set a language pack first via Questionnaire Settings, then restart Operit to use this questionnaire. / 请先在问卷设置中设置语言包，然后重启 Operit 以使用本问卷。", style: "bodySmall", color: onSurfaceVariant, textAlign: "center" }),
                    ctx.UI.Spacer({ height: 8 }),
                    ctx.UI.OutlinedButton({
                        fillMaxWidth: true,
                        onClick: handleCancel,
                        content: ctx.UI.Text({ text: _t("ui.form.cancel",data._lang), style: "labelSmall", color: onSurfaceVariant }),
                    }),
                ]),
            ]));
        }
        else if (isActive) {
            if (hasInvalid) {
                var reported = reportedState[0];
                if (reported) {
                    contentNodes.push(ctx.UI.Column({ key: "reported", padding: { horizontal: 16, vertical: 12 }, horizontalAlignment: "centerHorizontally", fillMaxWidth: true }, [
                        ctx.UI.Text({ text: _t("ui.form.reported",data._lang), style: "titleSmall", color: onSurfaceVariant }),
                    ]));
                }
                else {
                    var firstInvalid = invalidQuestions.length > 0 ? String(invalidQuestions[0]) : "";
                    var isSyntaxError = firstInvalid.indexOf("JSON 语法错误") >= 0 || firstInvalid.indexOf("JSON") >= 0;
                    var isEmpty = firstInvalid.indexOf(_t("ui.form.errorEmpty",data._lang)) >= 0 || firstInvalid.indexOf("格式不正确") >= 0 || firstInvalid.indexOf("为空或格式不正确") >= 0;
                    var isMissingId = data._hasMissingIds === true;
                    var isResultError = firstInvalid.indexOf("result 格式错误") >= 0 || firstInvalid.indexOf("结果表达式") >= 0 || firstInvalid.indexOf("引用了不存在") >= 0 || firstInvalid.indexOf("resultcode") >= 0;
                    var isTypeError = firstInvalid.indexOf("type 不合法") >= 0 || firstInvalid.indexOf("选项不足") >= 0;
                    var isFieldError = firstInvalid.indexOf("question 为空") >= 0 || firstInvalid.indexOf("不支持的字段") >= 0 || firstInvalid.indexOf("enableOther") >= 0 || firstInvalid.indexOf("required") >= 0 || firstInvalid.indexOf("不应有") >= 0;
                    var errorTitle = _t("ui.form.errorTitle",data._lang);
                    if (isSyntaxError)
                        errorTitle = _t("ui.form.errorJson",data._lang);
                    else if (isEmpty)
                        errorTitle = _t("ui.form.errorEmpty",data._lang);
                    else if (isMissingId)
                        errorTitle = _t("ui.form.errorMissingId",data._lang);
                    else if (isResultError)
                        errorTitle = _t("ui.form.errorResult",data._lang);
                    else if (isTypeError)
                        errorTitle = _t("ui.form.errorType",data._lang);
                    else if (isFieldError)
                        errorTitle = _t("ui.form.errorField",data._lang);
                    var errorDesc = isSyntaxError ? firstInvalid : (isEmpty ? firstInvalid : (isMissingId ? (_t("ui.form.missingIdDesc",data._lang) + (invalidQuestions.length > 0 ? invalidQuestions.join("、") : _t("ui.form.unknown",data._lang))) : firstInvalid));
                    contentNodes.push(ctx.UI.Card({ key: "invalid_card", fillMaxWidth: true, containerColor: surfaceVariant }, [
                        ctx.UI.Column({ key: "invalid_col", padding: { horizontal: 16, vertical: 16 }, spacing: 8, horizontalAlignment: "centerHorizontally" }, [
                            ctx.UI.Text({ text: errorTitle, style: "titleSmall", color: isBlocked ? yellowColor : errorColor }),
                            ctx.UI.Text({ text: errorDesc, style: "bodySmall", color: onSurfaceVariant }),
                            ctx.UI.Row({ key: "invalid_actions", spacing: 12, horizontalArrangement: "center", fillMaxWidth: true, padding: { top: 8 } }, [
                                ctx.UI.OutlinedButton({ key: "invalid_cancel", onClick: handleCancel, content: ctx.UI.Text({ text: _t("ui.form.cancel",data._lang), style: "labelSmall", color: onSurfaceVariant }) }),
                                isBlocked ? null : ctx.UI.Button({ key: "invalid_remind", content: ctx.UI.Text({ text: _t("ui.form.remind",data._lang), style: "labelSmall", color: ctx.MaterialTheme.colorScheme.onPrimary }), containerColor: errorColor, onClick: function () {
                var remindMsg = "⚠️ " + errorTitle + "：" + (invalidQuestions.length > 0 ? invalidQuestions.join("、") : _t("ui.form.unknown",data._lang));
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
                // 一键补全成功提示条
                if (fillHintState[0]) {
                    contentNodes.push(ctx.UI.Row({ key: "fill_hint", fillMaxWidth: true, padding: { horizontal: 8, vertical: 4 }, horizontalArrangement: "center", verticalAlignment: "center", spacing: 4 }, [
                        ctx.UI.Icon({ name: "CheckCircle", size: 16, tint: primary }),
                        ctx.UI.Text({ text: fillHintState[0], style: "bodySmall", color: primary }),
                    ]));
                }
                if (isPaging) {
                    // 紧凑模式：分页显示
                    if (pageIndex === 0) {
                        // 第0页：取消
                        contentNodes.push(ctx.UI.Column({ key: "page_cancel", padding: { vertical: 16, horizontal: 8 }, spacing: 8, horizontalAlignment: "centerHorizontally", fillMaxWidth: true }, [
                            ctx.UI.Text({ text: title, style: "titleMedium", color: onSurface, textAlign: "center" }),
                            ctx.UI.Text({ text: _t("ui.form.totalQuestions",data._lang).replace("%d", String(nonSectionCount)), style: "bodySmall", color: onSurfaceVariant }),
                            ctx.UI.Spacer({ height: 12 }),
                            _showFillButton ? ctx.UI.OutlinedButton({ key: "fill_btn", onClick: fillFromHistory, containerColor: primary, content: ctx.UI.Text({ text: _t("ui.form.fill",data._lang), style: "labelSmall", color: ctx.MaterialTheme.colorScheme.onPrimary }), fillMaxWidth: true }) : null,
                            ctx.UI.Spacer({ height: 4 }),
                            ctx.UI.OutlinedButton({ key: "cancel_btn", onClick: handleCancel, content: ctx.UI.Text({ text: _t("ui.form.cancelAsk",data._lang), style: "labelSmall", color: onSurfaceVariant }), fillMaxWidth: true }),
                        ]));
                    }
                    else if (pageIndex === submitPage) {
                        // 提交页
                        contentNodes.push(ctx.UI.Column({ key: "page_submit", padding: { vertical: 24, horizontal: 8 }, spacing: 12, horizontalAlignment: "centerHorizontally", fillMaxWidth: true }, [
                            ctx.UI.Text({ text: _t("ui.form.answeredCount",data._lang).replace("%d", String((function(){ var _fc=0; for(var _fqi=0;_fqi<questions.length;_fqi++){ var _fq=questions[_fqi]; if(_fq.type==='section') continue; var _fa=answers[_fq.id]; if(_fa!==undefined && _fa!==null && _fa!=='' && !(Array.isArray(_fa) && _fa.length===0)) _fc++; } return _fc; })())).replace("%d", String(nonSectionCount)), style: "bodyMedium", color: onSurface, textAlign: "center" }),
                            ctx.UI.Spacer({ height: 8 }),
                            ctx.UI.Button({ key: "submit_btn", enabled: isActive, content: ctx.UI.Text({ text: isSubmitting ? _t("ui.form.computing",data._lang) : _t("ui.form.submitBtnFull",data._lang), style: "labelSmall", color: ctx.MaterialTheme.colorScheme.onPrimary }), containerColor: isActive ? primary : ctx.MaterialTheme.colorScheme.surfaceContainer, border: { width: 1.5, color: primary }, fillMaxWidth: true, onClick: handleSubmit }),
                        ]));
                    }
                    else if (pageIndex === infoPage) {
                        // info页
                        contentNodes.push(ctx.UI.Card({ key: "info_card", fillMaxWidth: true, padding: { horizontal: 8, vertical: 4 } }, [
                            ctx.UI.Column({ key: "info_content", spacing: 4, padding: { vertical: 8, horizontal: 8 } }, [
                                ctx.UI.Text({ text: _t("ui.form.infoTitle",data._lang), style: "titleSmall", color: primary }),
                                ctx.UI.Text({ text: _t("ui.form.infoTitleLabel",data._lang) + (title || _t("ui.form.infoNone",data._lang)), style: "bodySmall", color: onSurface }),
                                ctx.UI.Text({ text: _t("ui.form.infoIdLabel",data._lang) + (fingerprint || _t("ui.form.infoNone",data._lang)), style: "bodySmall", color: onSurfaceVariant }),
                                ctx.UI.Text({ text: _t("ui.form.infoTypeLabel",data._lang) + questionCount + _t("ui.form.questionCount",data._lang) + (data.count === true ? (data.resultcode ? _t("ui.form.scriptMode",data._lang) : _t("ui.form.resultMode",data._lang)) : "") + (data.output_raw === false ? _t("ui.form.resultOnlyMode",data._lang) : ""), style: "bodySmall", color: onSurfaceVariant }),
                                ctx.UI.Divider({ color: surfaceVariant, thickness: 1 }),
                                ctx.UI.Text({ text: _t("ui.form.aboutTitle",data._lang), style: "titleSmall", color: primary }),
                                ctx.UI.Text({ text: _t("ui.form.aboutDesc",data._lang), style: "bodySmall", color: onSurfaceVariant }),
                                ctx.UI.Text({ text: _t("ui.form.versionLabel",data._lang) + "1.8.1", style: "labelSmall", color: onSurfaceVariant.copy({ alpha: 0.7 }) }),
                                ctx.UI.Text({ text: _t("ui.form.authorTitle",data._lang), style: "titleSmall", color: primary }),
                                ctx.UI.Text({ text: _t("ui.form.authorOriginal",data._lang) + "liu-baia", style: "bodySmall", color: onSurface }),
                                ctx.UI.Text({ text: _t("ui.form.authorModder",data._lang) + "yyswys-yjyj", style: "bodySmall", color: onSurface }),
                            ]),
                        ]));
                    }
                    else {
                        // 题目页：按非 section 题数分页（section 跟随其后题目同页，不计入名额）
                        var pageQuestionIdx = pageIndex - questionStartPage;
                        var startIdx = (pageBounds[pageQuestionIdx] !== undefined) ? pageBounds[pageQuestionIdx] : questions.length;
                        var endIdx = (pageBounds[pageQuestionIdx + 1] !== undefined) ? pageBounds[pageQuestionIdx + 1] : questions.length;
                        // 计算当前页起始之前有多少非 section 题，作为题号偏移
                        var globalQIdx = 0;
                        for (var _gqi = 0; _gqi < startIdx; _gqi++) {
                            if (questions[_gqi].type !== "section") globalQIdx++;
                        }
                        for (var ai = startIdx; ai < endIdx; ai++) {
                            var q = questions[ai];
                            var isSection = q.type === "section";
                            var displayIdx = isSection ? 0 : (globalQIdx++);
                            if (isSection && ai > startIdx) {
                                contentNodes.push(ctx.UI.Divider({ key: "div_sec_" + ai, color: primary.copy({ alpha: 0.2 }), thickness: 2 }));
                            }
                            var qNode = renderQuestion(q, displayIdx);
                            if (qNode) {
                                if (!isSection && ai > startIdx && contentNodes.length > 0) {
                                    contentNodes.push(ctx.UI.Divider({ key: "div_p_" + ai, color: surfaceVariant, thickness: 1 }));
                                }
                                contentNodes.push(qNode);
                            }
                        }
                    }
                    // 分页导航：← x/x →
                    if (totalPages > 1) {
                        contentNodes.push(ctx.UI.Divider({ key: "div_pager", color: onSurfaceVariant.copy({ alpha: 0.2 }), thickness: 1 }));
                        contentNodes.push(ctx.UI.Row({ key: "pager", horizontalArrangement: "center", fillMaxWidth: true, padding: { vertical: 6, horizontal: 4 }, verticalAlignment: "center" }, [
                            ctx.UI.TextButton({ key: "page_prev", onClick: function () { goToPage(pageIndex - 1); }, enabled: pageIndex > 0, content: ctx.UI.Text({ text: "←", style: "labelMedium", color: pageIndex > 0 ? primary : onSurfaceVariant.copy({ alpha: 0.4 }) }) }),
                            ctx.UI.Text({ key: "page_indicator", text: String(pageIndex + 1) + "/" + String(totalPages), style: "labelMedium", color: onSurfaceVariant, padding: { horizontal: 8 } }),
                            ctx.UI.TextButton({ key: "page_next", onClick: function () { goToPage(pageIndex + 1); }, enabled: pageIndex < totalPages - 1, content: ctx.UI.Text({ text: "→", style: "labelMedium", color: pageIndex < totalPages - 1 ? primary : onSurfaceVariant.copy({ alpha: 0.4 }) }) }),
                        ]));
                    }
                }
                else {
                    // 拉通模式：旧版连续显示
                    var realIdx = 0;
                    for (var ai = 0; ai < questions.length; ai++) {
                        var q = questions[ai];
                        var isSection = q.type === "section";
                        if (!isSection) realIdx++;
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
                        ctx.UI.IconButton({ key: "info_btn", icon: ctx.UI.Icon({ name: "Info", size: 20, tint: onSurfaceVariant }), onClick: function () { infoOpenState[1](!infoOpenState[0]); } }),
                        ctx.UI.Row({ key: "action_buttons", spacing: 8, horizontalArrangement: "end", verticalAlignment: "center" }, [
                            _showFillButton ? ctx.UI.OutlinedButton({ key: "fill_btn", onClick: fillFromHistory, containerColor: primary, content: ctx.UI.Text({ text: _t("ui.form.fill",data._lang), style: "labelSmall", color: ctx.MaterialTheme.colorScheme.onPrimary }) }) : null,
                            ctx.UI.OutlinedButton({ key: "cancel_btn", onClick: handleCancel, content: ctx.UI.Text({ text: _t("ui.form.cancel",data._lang), style: "labelSmall", color: onSurfaceVariant }) }),
                            ctx.UI.Button({ key: "submit_btn", enabled: isActive, content: ctx.UI.Text({ text: isSubmitting ? _t("ui.form.computing",data._lang) : _t("ui.form.submitBtn",data._lang), style: "labelSmall", color: ctx.MaterialTheme.colorScheme.onPrimary }), containerColor: isActive ? primary : ctx.MaterialTheme.colorScheme.surfaceContainer, border: { width: 1.5, color: primary }, onClick: handleSubmit }),
                        ]),
                    ]));
                }
            }
        }
        if (errorMsg) {
            contentNodes.push(ctx.UI.Divider({ key: "div_err", color: errorColor.copy({ alpha: 0.3 }), thickness: 1 }));
            contentNodes.push(ctx.UI.Row({ key: "error_hint", fillMaxWidth: true, padding: { horizontal: 8, vertical: 6 }, horizontalArrangement: "center" }, [
                ctx.UI.Icon({ name: "Warning", size: 16, tint: errorColor }),
                ctx.UI.Spacer({ width: 4 }),
                ctx.UI.Text({ text: errorMsg, style: "bodySmall", color: errorColor }),
            ]));
        }
        if (!isPaging && infoOpen) {
            contentNodes.push(ctx.UI.Card({ key: "info_card", fillMaxWidth: true, padding: { horizontal: 8, vertical: 4 } }, [
                ctx.UI.Column({ key: "info_content", spacing: 4, padding: { vertical: 8, horizontal: 8 } }, [
                    ctx.UI.Text({ text: _t("ui.form.infoTitle",data._lang), style: "titleSmall", color: primary }),
                    ctx.UI.Text({ text: _t("ui.form.infoTitleLabel",data._lang) + (title || _t("ui.form.infoNone",data._lang)), style: "bodySmall", color: onSurface }),
                    ctx.UI.Text({ text: _t("ui.form.infoIdLabel",data._lang) + (fingerprint || _t("ui.form.infoNone",data._lang)), style: "bodySmall", color: onSurfaceVariant }),
                    ctx.UI.Text({ text: _t("ui.form.infoTypeLabel",data._lang) + questionCount + _t("ui.form.questionCount",data._lang) + (data.count === true ? (data.resultcode ? _t("ui.form.scriptMode",data._lang) : _t("ui.form.resultMode",data._lang)) : "") + (data.output_raw === false ? _t("ui.form.resultOnlyMode",data._lang) : ""), style: "bodySmall", color: onSurfaceVariant }),
                    ctx.UI.Divider({ color: surfaceVariant, thickness: 1 }),
                    ctx.UI.Text({ text: _t("ui.form.aboutTitle",data._lang), style: "titleSmall", color: primary }),
                    ctx.UI.Text({ text: _t("ui.form.aboutDesc",data._lang), style: "bodySmall", color: onSurfaceVariant }),
                    ctx.UI.Text({ text: _t("ui.form.versionLabel",data._lang) + "1.8.1", style: "labelSmall", color: onSurfaceVariant.copy({ alpha: 0.7 }) }),
                    ctx.UI.Text({ text: _t("ui.form.authorTitle",data._lang), style: "titleSmall", color: primary }),
                    ctx.UI.Text({ text: _t("ui.form.authorOriginal",data._lang) + "liu-baia", style: "bodySmall", color: onSurface }),
                    ctx.UI.Text({ text: _t("ui.form.authorModder",data._lang) + "yyswys-yjyj", style: "bodySmall", color: onSurface }),
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
