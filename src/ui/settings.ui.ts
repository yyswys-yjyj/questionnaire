// @ts-nocheck
function readEnv(key, valid, def) {
    if (typeof getEnv !== "function") return def;
    try { var v = getEnv(key); if (valid.indexOf(v) >= 0) return v; } catch (e) {}
    return def;
}
var _initialTheme = readEnv("QUESTIONNAIRE_THEME", ["classic","compact"], "classic");
var _initialLayout = readEnv("QUESTIONNAIRE_BUTTON_LAYOUT", ["row","scroll"], "scroll");
var _initialQuestionLayout = readEnv("QUESTIONNAIRE_LAYOUT", ["continuous","compact"], "continuous");
var _initialTimeMode = readEnv("QUESTIONNAIRE_TIME_INPUT_MODE", ["picker","input"], "picker");
var _initialDisplayMode = readEnv("QUESTIONNAIRE_DISPLAY_MODE", ["normal","hidden","blocked"], "normal");
var _initialStrictMode = readEnv("QUESTIONNAIRE_STRICT_MODE", ["true","false"], "true");
var _initialHistoryEnabled = readEnv("QUESTIONNAIRE_HISTORY_ENABLED", ["true","false"], "true");
var _themeLabel = function(t) { return t === "classic" ? "圆润" : "方正"; };
var _layoutLabel = function(l) { return l === "row" ? "一行一个" : "LazyRow滑动"; };
var _questionLayoutLabel = function(l) { return l === "continuous" ? "连续，所有题目连续显示" : "紧凑，一页5题加分页"; };
var _timeModeLabel = function(m) { return m === "picker" ? "按钮选择器" : "手动输入"; };
var _displayModeLabel = function(d) { return d === "normal" ? "正常显示" : (d === "hidden" ? "显示源码" : "拦截显示"); };

export default async function Screen(ctx) {
    var primary = ctx.MaterialTheme.colorScheme.primary;
    var onSurface = ctx.MaterialTheme.colorScheme.onSurface;
    var onSurfaceVariant = ctx.MaterialTheme.colorScheme.onSurfaceVariant;
    var surfaceVariant = ctx.MaterialTheme.colorScheme.surfaceVariant;

    var currentThemeState = ctx.useState("_theme", _initialTheme);
    var savedState = ctx.useState("_saved", false);
    var previewTypeState = ctx.useState("_previewType", "single");
    var layoutState = ctx.useState("_layout", _initialLayout);
    var questionLayoutState = ctx.useState("_questionLayout", _initialQuestionLayout);
    var timeModeState = ctx.useState("_timeMode", _initialTimeMode);
    var displayModeState = ctx.useState("_displayMode", _initialDisplayMode);
    var strictModeState = ctx.useState("_strictMode", _initialStrictMode);
    var historyEnabledState = ctx.useState("_historyEnabled", _initialHistoryEnabled);

    var currentTheme = currentThemeState[0];
    var saved = savedState[0];
    var previewType = previewTypeState[0];
    var currentLayout = layoutState[0];
    var currentQuestionLayout = questionLayoutState[0];
    var currentTimeMode = timeModeState[0];
    var currentDisplayMode = displayModeState[0];
    var currentStrictMode = strictModeState[0];
    var versionCheckState = ctx.useState("_versionCheck", "idle");
    var versionInfoState = ctx.useState("_versionInfo", "");
    var versionSourceState = ctx.useState("_versionSource", 2);
    var changelogSourceState = ctx.useState("_changelogSource", 1);
    var changelogState = ctx.useState("_changelog", "idle");
    var changelogContentState = ctx.useState("_changelogContent", "");
    var newFeatureState = ctx.useState("_newFeature", "idle");
    var newFeatureContentState = ctx.useState("_newFeatureContent", "");
    var tickState = ctx.useState("_tick", 0);
    var changelogStatus = changelogState[0];
    var changelogContent = changelogContentState[0];
    var newFeatureStatus = newFeatureState[0];
    var newFeatureContent = newFeatureContentState[0];
    var versionChecking = versionCheckState[0];
    var versionInfo = versionInfoState[0];
    var changelogStatus = changelogState[0];
    var changelogContent = changelogContentState[0];
    var isCompact = currentTheme === "compact";
    var isRowLayout = currentLayout === "row";
    var isInputMode = currentTimeMode === "input";

    // 页面活跃轮询：定期更新 tickState 保持页面活跃响应
    var _pollTimer = ctx.useState("_pollTimer", null);
    if (!_pollTimer[0]) {
        var timerId = setInterval(function() {
            tickState[1](tickState[0] + 1);
        }, 3000);
        _pollTimer[1](timerId);
    }

    function selectTheme(theme) {
        currentThemeState[1](theme);
        savedState[1](false);
    }
    function selectLayout(layout) {
        layoutState[1](layout);
        savedState[1](false);
    }
    function selectTimeMode(mode) {
        timeModeState[1](mode);
        savedState[1](false);
    }
    function selectDisplayMode(mode) {
        displayModeState[1](mode);
        savedState[1](false);
    }
    function selectStrictMode(mode) {
        strictModeState[1](mode);
        savedState[1](false);
    }
    function saveTheme() {
        try {
            Tools.SoftwareSettings.writeEnvironmentVariable("QUESTIONNAIRE_THEME", currentTheme);
            Tools.SoftwareSettings.writeEnvironmentVariable("QUESTIONNAIRE_BUTTON_LAYOUT", currentLayout);
            Tools.SoftwareSettings.writeEnvironmentVariable("QUESTIONNAIRE_TIME_INPUT_MODE", currentTimeMode);
            Tools.SoftwareSettings.writeEnvironmentVariable("QUESTIONNAIRE_DISPLAY_MODE", currentDisplayMode);
            Tools.SoftwareSettings.writeEnvironmentVariable("QUESTIONNAIRE_STRICT_MODE", currentStrictMode);
            Tools.SoftwareSettings.writeEnvironmentVariable("QUESTIONNAIRE_HISTORY_ENABLED", historyEnabledState[0]);
            Tools.SoftwareSettings.writeEnvironmentVariable("QUESTIONNAIRE_LAYOUT", currentQuestionLayout);
            savedState[1](true);
            ctx.showToast("已保存");
        } catch (e) {
            ctx.showToast("保存失败：" + String(e));
        }
    }

    // ===== 设置区（主题 + 按钮布局） =====
    var settingsSection = ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
        ctx.UI.Column({ padding: 16, spacing: 8 }, [
            ctx.UI.Text({ text: "主题设置", style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: "当前主题：" + _themeLabel(currentTheme), style: "bodyMedium", color: onSurfaceVariant }),
            ctx.UI.OutlinedButton({
                containerColor: !isCompact ? primary : null,
                contentColor: !isCompact ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { selectTheme("classic"); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: "圆润（OutlinedButton 按钮）", style: "labelMedium", color: !isCompact ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.OutlinedButton({
                containerColor: isCompact ? primary : null,
                contentColor: isCompact ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { selectTheme("compact"); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: "方正（FilterChip 标签）", style: "labelMedium", color: isCompact ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.Divider({ thickness: 0.5, color: onSurfaceVariant.copy({ alpha: 0.3 }) }),
            ctx.UI.Spacer({ height: 4 }),
            ctx.UI.Text({ text: "按钮布局", style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: "当前布局：" + _layoutLabel(currentLayout), style: "bodyMedium", color: onSurfaceVariant }),
            ctx.UI.OutlinedButton({
                containerColor: isRowLayout ? primary : null,
                contentColor: isRowLayout ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { selectLayout("row"); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: "一行一个（醒目）", style: "labelMedium", color: isRowLayout ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.OutlinedButton({
                containerColor: !isRowLayout ? primary : null,
                contentColor: !isRowLayout ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { selectLayout("scroll"); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: "LazyRow 滑动（经典）", style: "labelMedium", color: !isRowLayout ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.Divider({ thickness: 0.5, color: onSurfaceVariant.copy({ alpha: 0.3 }) }),
            ctx.UI.Text({ text: "问卷布局", style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: "当前布局：" + _questionLayoutLabel(currentQuestionLayout), style: "bodyMedium", color: onSurfaceVariant }),
            ctx.UI.OutlinedButton({
                containerColor: currentQuestionLayout === "continuous" ? primary : null,
                contentColor: currentQuestionLayout === "continuous" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { questionLayoutState[1]("continuous"); savedState[1](false); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: "拉通（经典）", style: "labelMedium", color: currentQuestionLayout === "continuous" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.OutlinedButton({
                containerColor: currentQuestionLayout === "compact" ? primary : null,
                contentColor: currentQuestionLayout === "compact" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { questionLayoutState[1]("compact"); savedState[1](false); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: "紧凑（新布局，分页设计）", style: "labelMedium", color: currentQuestionLayout === "compact" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.Divider({ thickness: 0.5, color: onSurfaceVariant.copy({ alpha: 0.3 }) }),
            ctx.UI.Spacer({ height: 4 }),
            ctx.UI.Spacer({ height: 4 }),
            ctx.UI.Text({ text: "时间输入模式", style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: "当前模式：" + _timeModeLabel(currentTimeMode), style: "bodyMedium", color: onSurfaceVariant }),
            ctx.UI.OutlinedButton({
                containerColor: !isInputMode ? primary : null,
                contentColor: !isInputMode ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { selectTimeMode("picker"); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: "按钮选择器（时/分/秒按钮）", style: "labelMedium", color: !isInputMode ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.OutlinedButton({
                containerColor: isInputMode ? primary : null,
                contentColor: isInputMode ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { selectTimeMode("input"); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: "手动输入（hh:mm:ss 格式）", style: "labelMedium", color: isInputMode ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.Divider({ thickness: 0.5, color: onSurfaceVariant.copy({ alpha: 0.3 }) }),
            ctx.UI.Spacer({ height: 4 }),
            ctx.UI.Text({ text: "问卷显示模式", style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: "当前模式：" + _displayModeLabel(currentDisplayMode), style: "bodyMedium", color: onSurfaceVariant }),
            ctx.UI.OutlinedButton({
                containerColor: currentDisplayMode === "normal" ? primary : null,
                contentColor: currentDisplayMode === "normal" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { selectDisplayMode("normal"); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: "正常显示", style: "labelMedium", color: currentDisplayMode === "normal" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.OutlinedButton({
                containerColor: currentDisplayMode === "hidden" ? primary : null,
                contentColor: currentDisplayMode === "hidden" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { selectDisplayMode("hidden"); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: "显示源码（不渲染问卷）", style: "labelMedium", color: currentDisplayMode === "hidden" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.OutlinedButton({
                containerColor: currentDisplayMode === "blocked" ? primary : null,
                contentColor: currentDisplayMode === "blocked" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { selectDisplayMode("blocked"); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: "拦截显示（警告页）", style: "labelMedium", color: currentDisplayMode === "blocked" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.Divider({ thickness: 0.5, color: onSurfaceVariant.copy({ alpha: 0.3 }) }),
            ctx.UI.Spacer({ height: 4 }),
            ctx.UI.Text({ text: "语法检查模式", style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: "当前：" + (currentStrictMode === "true" ? "严谨" : "宽松") + "模式", style: "bodyMedium", color: onSurfaceVariant }),
            ctx.UI.OutlinedButton({
                containerColor: currentStrictMode === "true" ? primary : null,
                contentColor: currentStrictMode === "true" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { selectStrictMode("true"); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: "严谨模式（检查全部语法）", style: "labelMedium", color: currentStrictMode === "true" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.OutlinedButton({
                containerColor: currentStrictMode === "false" ? primary : null,
                contentColor: currentStrictMode === "false" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { selectStrictMode("false"); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: "宽松模式（放行非致命错误）", style: "labelMedium", color: currentStrictMode === "false" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.Divider({ thickness: 0.5, color: onSurfaceVariant.copy({ alpha: 0.3 }) }),
            ctx.UI.Spacer({ height: 4 }),
            ctx.UI.Text({ text: "问卷历史记录", style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: "开启后，填写过的问卷可一键补全。关闭后不再记录。", style: "bodySmall", color: onSurfaceVariant }),
            ctx.UI.OutlinedButton({
                containerColor: historyEnabledState[0] === "true" ? primary : null,
                contentColor: historyEnabledState[0] === "true" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { historyEnabledState[1]("true"); savedState[1](false); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: "开启", style: "labelMedium", color: historyEnabledState[0] === "true" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.OutlinedButton({
                containerColor: historyEnabledState[0] === "false" ? primary : null,
                contentColor: historyEnabledState[0] === "false" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { historyEnabledState[1]("false"); savedState[1](false); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: "关闭", style: "labelMedium", color: historyEnabledState[0] === "false" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.OutlinedButton({
                onClick: function() {
                    try {
                        var path = "/sdcard/Download/Operit/questionnaire/history";
                        if (Tools.Files.exists(path)) {
                            Tools.Files.deleteFile(path, true);
                            ctx.showToast("已清理历史记录文件夹");
                        } else {
                            ctx.showToast("暂无历史记录");
                        }
                    } catch(e) {
                        ctx.showToast("清理失败：" + String(e));
                    }
                },
                fillMaxWidth: true,
                containerColor: ctx.MaterialTheme.colorScheme.error,
                content: ctx.UI.Text({ text: "一键清理历史记录", style: "labelMedium", color: ctx.MaterialTheme.colorScheme.onPrimary }),
            }),
            ctx.UI.Divider({ thickness: 0.5, color: onSurfaceVariant.copy({ alpha: 0.3 }) }),
            ctx.UI.Button({
                onClick: saveTheme, fillMaxWidth: true, containerColor: primary,
                content: ctx.UI.Text({ text: saved ? "✓ 已保存" : "保存设置", style: "labelMedium", color: ctx.MaterialTheme.colorScheme.onPrimary }),
            }),
        ]),
    ]);

    // ===== 题型选择下拉 =====
    var typeOptions = [
        { id: "single", label: "单选题" },
        { id: "multiple", label: "多选题" },
        { id: "text", label: "单行文本" },
        { id: "textarea", label: "多行文本" },
        { id: "rating", label: "评分题" },
        { id: "likert", label: "李克特量表" },
        { id: "nps", label: "NPS 净推荐值" },
        { id: "time", label: "时间选择" },
    ];
    var typePicker = ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
        ctx.UI.Column({ padding: 16, spacing: 8 }, [
            ctx.UI.Text({ text: "题型预览", style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: "选择一个题型查看在当前主题下的渲染效果：", style: "bodySmall", color: onSurfaceVariant }),
            ctx.UI.LazyRow({ spacing: 6 }, typeOptions.map(function (t) {
                return ctx.UI.FilterChip({
                    selected: previewType === t.id,
                    onClick: function () { previewTypeState[1](t.id); },
                    label: ctx.UI.Text({ text: t.label, style: "labelSmall", color: previewType === t.id ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                    leadingIcon: previewType === t.id ? ctx.UI.Icon({ name: "check", size: 14, tint: ctx.MaterialTheme.colorScheme.onPrimary }) : null,
                });
            })),
        ]),
    ]);

    // ===== 题型预览区 =====
    function renderTypePreview(type) {
        var btn = function (label, isSel) {
            if (isCompact) {
                return ctx.UI.FilterChip({
                    selected: isSel, onClick: function () {},
                    label: ctx.UI.Text({ text: label, style: "labelSmall", color: isSel ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                    leadingIcon: isSel ? ctx.UI.Icon({ name: "check", size: 14, tint: ctx.MaterialTheme.colorScheme.onPrimary }) : null,
                });
            }
            return ctx.UI.OutlinedButton({
                containerColor: isSel ? primary : null, contentColor: isSel ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () {}, border: { width: 1.5, color: onSurfaceVariant },
                content: ctx.UI.Text({ text: label, style: "labelSmall", color: isSel ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            });
        };

        if (type === "single") {
            return ctx.UI.Column({ spacing: 6, padding: { vertical: 4 } }, [
                ctx.UI.Text({ text: "单选题示例", style: "labelSmall", color: onSurfaceVariant }),
                ctx.UI.Row({ spacing: 6 }, [btn("选项 A", true), btn("选项 B", false), btn("选项 C", false)]),
            ]);
        }
        if (type === "multiple") {
            return ctx.UI.Column({ spacing: 6, padding: { vertical: 4 } }, [
                ctx.UI.Text({ text: "多选题示例", style: "labelSmall", color: onSurfaceVariant }),
                ctx.UI.Row({ spacing: 6 }, [btn("红色", true), btn("蓝色", true), btn("绿色", false)]),
            ]);
        }
        if (type === "text") {
            return ctx.UI.Column({ spacing: 6, padding: { vertical: 4 } }, [
                ctx.UI.Text({ text: "单行文本示例", style: "labelSmall", color: onSurfaceVariant }),
                ctx.UI.TextField({ value: "输入文字...", placeholder: "输入...", singleLine: true, enabled: true, style: "compact" }),
            ]);
        }
        if (type === "textarea") {
            return ctx.UI.Column({ spacing: 6, padding: { vertical: 4 } }, [
                ctx.UI.Text({ text: "多行文本示例", style: "labelSmall", color: onSurfaceVariant }),
                ctx.UI.TextField({ value: "", placeholder: "输入多行文本...", singleLine: false, minLines: 3, maxLines: 5, enabled: true, style: "compact" }),
            ]);
        }
        if (type === "rating") {
            var ratingRow1 = [], ratingRow2 = [];
            for (var si = 1; si <= 5; si++) {
                (function (starIdx) {
                    var b = btn(String(starIdx), starIdx <= 3);
                    if (starIdx <= 3) ratingRow1.push(b); else ratingRow2.push(b);
                })(si);
            }
            return ctx.UI.Column({ spacing: 6, padding: { vertical: 4 } }, [
                ctx.UI.Text({ text: "评分题示例", style: "labelSmall", color: onSurfaceVariant }),
                ctx.UI.Row({ spacing: 6, horizontalArrangement: "spaceEvenly", fillMaxWidth: true }, ratingRow1),
                ctx.UI.Row({ spacing: 6, horizontalArrangement: "spaceEvenly", fillMaxWidth: true }, ratingRow2),
                ctx.UI.Text({ text: "3 星 - 一般", style: "bodySmall", color: onSurfaceVariant }),
            ]);
        }
        if (type === "likert") {
            var likertRow1 = [], likertRow2 = [];
            var halfLen = 3;
            for (var li = 1; li <= 5; li++) {
                (function (likertIdx) {
                    var b = btn(String(likertIdx), likertIdx === 3);
                    if (likertIdx <= halfLen) likertRow1.push(b); else likertRow2.push(b);
                })(li);
            }
            return ctx.UI.Column({ spacing: 6, padding: { vertical: 4 } }, [
                ctx.UI.Text({ text: "李克特量表示例", style: "labelSmall", color: onSurfaceVariant }),
                ctx.UI.Row({ spacing: 4, horizontalArrangement: "spaceEvenly", fillMaxWidth: true }, likertRow1),
                ctx.UI.Row({ spacing: 4, horizontalArrangement: "spaceEvenly", fillMaxWidth: true }, likertRow2),
                ctx.UI.Row({ spacing: 4, horizontalArrangement: "spaceEvenly", fillMaxWidth: true, padding: { top: 2 } },
                    ["非常不同意", "不同意", "一般", "同意", "非常同意"].map(function (lbl) {
                        return ctx.UI.Text({ text: lbl, style: "labelSmall", color: onSurfaceVariant, maxLines: 2 });
                    })
                ),
            ]);
        }
        if (type === "nps") {
            var npsGroups = [[0,1,2,3], [4,5,6,7], [8,9,10]];
            var npsCards = npsGroups.map(function (g) {
                return ctx.UI.Row({ spacing: 6, horizontalArrangement: "spaceEvenly", fillMaxWidth: true },
                    g.map(function (n) { return btn(String(n), n === 7); })
                );
            });
            return ctx.UI.Column({ spacing: 6, padding: { vertical: 4 } }, [
                ctx.UI.Text({ text: "NPS 净推荐值示例", style: "labelSmall", color: onSurfaceVariant }),
                ctx.UI.Column({ spacing: 4 }, npsCards),
                ctx.UI.Text({ text: "评分: 7 (被动者)", style: "bodySmall", color: onSurfaceVariant }),
            ]);
        }
        if (type === "time") {
            return ctx.UI.Column({ spacing: 6, padding: { vertical: 4 } }, [
                ctx.UI.Text({ text: "时间选择示例（" + _timeModeLabel(currentTimeMode) + "模式）", style: "labelSmall", color: onSurfaceVariant }),
                currentTimeMode === "input" ? ctx.UI.TextField({
                    value: "10:30:00",
                    placeholder: "hh:mm:ss",
                    fillMaxWidth: true,
                    style: "compact",
                }) : ctx.UI.Column({ spacing: 4 }, [
                    ctx.UI.Text({ text: "时", style: "labelSmall", color: onSurfaceVariant }),
                    ctx.UI.LazyRow({ spacing: 4 }, (function() { var hs = []; for (var hi = 8; hi <= 12; hi++) { hs.push(btn(hi < 10 ? "0" + hi : "" + hi, hi === 10)); } return hs; })()),
                    ctx.UI.Text({ text: "分", style: "labelSmall", color: onSurfaceVariant }),
                    ctx.UI.LazyRow({ spacing: 4 }, (function() { var ms = []; for (var mi = 0; mi <= 55; mi += 15) { ms.push(btn(mi < 10 ? "0" + mi : "" + mi, mi === 30)); } return ms; })()),
                    ctx.UI.Text({ text: "已选: 10:30", style: "bodySmall", color: primary }),
                ]),
            ]);
        }
        return null;
    }

    var previewCard = ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
        ctx.UI.Column({ padding: 16, spacing: 8 }, [
            ctx.UI.Text({ text: "预览：" + typeOptions.find(function(t){return t.id===previewType}).label, style: "titleSmall", color: onSurface }),
            renderTypePreview(previewType),
        ]),
    ]);

    // ===== 关于区 =====
    var aboutCard = ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
        ctx.UI.Column({ padding: 16, spacing: 8 }, [
            ctx.UI.Text({ text: "关于主题", style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: "圆润模式：使用 OutlinedButton 渲染选择题选项，边框圆润可见，按钮较大。适合需要清晰区分选项的场景。", style: "bodySmall", color: onSurfaceVariant }),
            ctx.UI.Text({ text: "方正模式：使用 FilterChip 渲染选择题选项，风格方正紧凑，适合多选题较多或空间有限的场景。", style: "bodySmall", color: onSurfaceVariant }),
            ctx.UI.Spacer({ height: 8 }),
            ctx.UI.Text({ text: "关于问卷插件", style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: "问卷提问插件 v1.7.3", style: "bodySmall", color: onSurfaceVariant }),
            ctx.UI.Text({ text: "支持题型：single单选、multiple多选、text文本、textarea多行文本、rating评分、likert李克特量表、nps净推荐值、time时间选择。", style: "bodySmall", color: onSurfaceVariant }),
            ctx.UI.Text({ text: "支持功能：分区标题、必答标识、结果表达式、主题切换（圆润/方正）、按钮布局（一行一个/LazyRow滑动）。", style: "bodySmall", color: onSurfaceVariant }),
            ctx.UI.Spacer({ height: 8 }),
            ctx.UI.Text({ text: "原作：liu-baia", style: "bodySmall", color: onSurfaceVariant }),
            ctx.UI.Text({ text: "二次开发：yyswys-yjyj", style: "bodySmall", color: onSurfaceVariant }),
            ctx.UI.Text({ text: "基于 Operit ToolPkg 开发。TypeScript 源码编译。", style: "bodySmall", color: onSurfaceVariant }),
        ]),
    ]);

    // ===== 版本检查区 =====
    var _versionUrls = [
        "https://open.serveryyswys.top/s/questionnaire",
        "https://raw.githubusercontent.com/yyswys-yjyj/questionnaire/refs/heads/main/api/version",
        "https://cdn.jsdelivr.net/gh/yyswys-yjyj/questionnaire@main/api/version"
    ];
    var _versionSourceLabels = ["作者服务器", "GitHub Raw", "jsDelivr CDN"];
    async function checkVersion() {
        if (versionCheckState[0] === "checking") return;
        versionCheckState[1]("checking");
        versionInfoState[1]("正在检查更新...");
        var currentVer = "173";
        var fmtCur = currentVer.charAt(0) + "." + currentVer.substring(1, 2) + "." + currentVer.substring(2);
        var si = versionSourceState[0];
        if (si < 0 || si >= _versionUrls.length) { si = 2; }
        try {
            var res = await ctx.callTool("http_request", { url: _versionUrls[si], method: "GET" });
            var content = res && res.content ? String(res.content).trim() : "";
            if (content === currentVer) {
                versionCheckState[1]("done");
                versionInfoState[1]("✓ 已是最新版 v" + fmtCur + "（" + _versionSourceLabels[si] + "）");
                return;
            } else if (content) {
                versionCheckState[1]("done");
                versionInfoState[1]("⚠ 发现新版本 v" + content.charAt(0) + "." + content.substring(1, 2) + "." + content.substring(2) + "（当前 v" + fmtCur + "，源：" + _versionSourceLabels[si] + "）");
                return;
            }
        } catch(e) {}
        versionCheckState[1]("done");
        versionInfoState[1]("检查失败：" + _versionSourceLabels[si] + "不可用");
    }

    var versionCheckCard = ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
        ctx.UI.Column({ padding: 16, spacing: 8 }, [
            ctx.UI.Text({ text: "版本检查", style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: "当前版本：v1.7.3", style: "bodyMedium", color: onSurfaceVariant }),
            ctx.UI.Text({ text: "选择版本源", style: "labelSmall", color: onSurfaceVariant }),
            ctx.UI.LazyRow({ spacing: 6 }, _versionUrls.map(function(url, idx) {
                return ctx.UI.FilterChip({
                    selected: versionSourceState[0] === idx,
                    onClick: function() { versionSourceState[1](idx); },
                    label: ctx.UI.Text({ text: _versionSourceLabels[idx], style: "labelSmall", color: versionSourceState[0] === idx ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                    leadingIcon: versionSourceState[0] === idx ? ctx.UI.Icon({ name: "check", size: 14, tint: ctx.MaterialTheme.colorScheme.onPrimary }) : null,
                });
            })),
            ctx.UI.Button({
                onClick: checkVersion,
                fillMaxWidth: true,
                containerColor: versionCheckState[0] === "checking" ? onSurfaceVariant : primary,
                content: versionCheckState[0] === "checking" ? ctx.UI.CircularProgressIndicator({ strokeWidth: 2, color: ctx.MaterialTheme.colorScheme.onPrimary }) : ctx.UI.Text({
                    text: "检查更新",
                    style: "labelMedium",
                    color: ctx.MaterialTheme.colorScheme.onPrimary
                }),
            }),
            versionInfo ? ctx.UI.Text({ text: versionInfo, style: "bodySmall", color: onSurfaceVariant }) : null,
        ]),
    ]);

    var _changelogUrls = [
        "https://raw.githubusercontent.com/yyswys-yjyj/questionnaire/refs/heads/main/api/changelog.json",
        "https://cdn.jsdelivr.net/gh/yyswys-yjyj/questionnaire@main/api/changelog.json"
    ];
    var _changelogLabels = ["GitHub Raw", "jsDelivr CDN"];
    async function fetchChangelog() {
        if (changelogState[0] === "loading") return;
        changelogState[1]("loading");
        changelogContentState[1]("正在获取更新历程...");
        var si = changelogSourceState[0];
        if (si < 0 || si >= _changelogUrls.length) { si = 1; }
        try {
            var res = await ctx.callTool("http_request", { url: _changelogUrls[si], method: "GET" });
            var content = res && res.content ? String(res.content) : "";
            if (content) {
                var parsed = JSON.parse(content);
                if (parsed && parsed.list && Array.isArray(parsed.list)) {
                    var lines = [];
                    var newLines = [];
                    var currentVerNum = 173;
                    for (var ei = 0; ei < parsed.list.length; ei++) {
                        var entry = parsed.list[ei];
                        if (ei > 0) lines.push("---");
                        lines.push("# " + (entry.version || "未知版本") + " (" + (entry.currentVer || "?") + ")");
                        if (entry.details) lines.push(entry.details);
                        if (entry.currentVer && entry.currentVer > currentVerNum) {
                            if (newLines.length > 0) newLines.push("---");
                            newLines.push("# " + (entry.version || "未知版本") + " (" + entry.currentVer + ")");
                            if (entry.details) newLines.push(entry.details);
                        }
                    }
                    changelogState[1]("done");
                    changelogContentState[1](lines.join("\n\n"));
                    if (newLines.length > 0) {
                        newFeatureState[1]("done");
                        newFeatureContentState[1](newLines.join("\n\n"));
                    } else {
                        newFeatureState[1]("done");
                        newFeatureContentState[1]("当前已是最新版，无新版本特性。");
                    }
                    return;
                }
            }
        } catch(e) {}
        changelogState[1]("done");
        changelogContentState[1]("获取失败：" + _changelogLabels[si] + "不可用");
    }
    function renderChangelogText(md) {
        if (!md) return null;
        var paragraphs = md.split("\n");
        var nodes = [];
        for (var pi = 0; pi < paragraphs.length; pi++) {
            var line = paragraphs[pi];
            var trimmed = line.trim();
            if (trimmed.length === 0) {
                nodes.push(ctx.UI.Spacer({ height: 8 }));
            } else if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
                nodes.push(ctx.UI.Divider({ thickness: 0.5, color: onSurfaceVariant.copy({ alpha: 0.3 }), padding: { vertical: 4 } }));
            } else if (trimmed.indexOf("# ") === 0) {
                nodes.push(ctx.UI.Text({ text: trimmed.substring(2), style: "titleSmall", color: primary, padding: { top: 8 } }));
            } else if (trimmed.indexOf("## ") === 0) {
                nodes.push(ctx.UI.Text({ text: trimmed.substring(3), style: "titleSmall", color: primary, padding: { top: 4 } }));
            } else if (trimmed.indexOf("#### ") === 0) {
                nodes.push(ctx.UI.Text({ text: trimmed.substring(5), style: "bodyMedium", color: onSurface, padding: { top: 2 } }));
            } else if (trimmed.indexOf("### ") === 0) {
                nodes.push(ctx.UI.Text({ text: trimmed.substring(4), style: "labelMedium", color: onSurface, padding: { top: 4 } }));
            } else if (trimmed.indexOf("- ") === 0 || trimmed.indexOf("-  ") === 0) {
                nodes.push(ctx.UI.Text({ text: "  • " + trimmed.substring(2), style: "bodySmall", color: onSurfaceVariant }));
            } else {
                nodes.push(ctx.UI.Text({ text: trimmed, style: "bodySmall", color: onSurfaceVariant }));
            }
        }
        return ctx.UI.Column({ spacing: 2 }, nodes);
    }
    var changelogCard = ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
        ctx.UI.Column({ padding: 16, spacing: 8 }, [
            ctx.UI.Text({ text: "更新历程", style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: "选择来源", style: "labelSmall", color: onSurfaceVariant }),
            ctx.UI.LazyRow({ spacing: 6 }, _changelogUrls.map(function(url, idx) {
                return ctx.UI.FilterChip({
                    selected: changelogSourceState[0] === idx,
                    onClick: function() { changelogSourceState[1](idx); },
                    label: ctx.UI.Text({ text: _changelogLabels[idx], style: "labelSmall", color: changelogSourceState[0] === idx ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                    leadingIcon: changelogSourceState[0] === idx ? ctx.UI.Icon({ name: "check", size: 14, tint: ctx.MaterialTheme.colorScheme.onPrimary }) : null,
                });
            })),
            ctx.UI.Button({
                onClick: fetchChangelog,
                fillMaxWidth: true,
                containerColor: changelogState[0] === "loading" ? onSurfaceVariant : primary,
                content: ctx.UI.Text({
                    text: changelogState[0] === "loading" ? "获取中..." : "获取更新历程",
                    style: "labelMedium",
                    color: ctx.MaterialTheme.colorScheme.onPrimary
                }),
            }),
            changelogContentState[0] && changelogState[0] === "done" ? renderChangelogText(changelogContentState[0]) :
                (changelogState[0] === "loading" ? ctx.UI.CircularProgressIndicator({ strokeWidth: 2, color: primary }) : null),
        ]),
    ]);
    var newFeatureCard = ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
        ctx.UI.Column({ padding: 16, spacing: 8 }, [
            ctx.UI.Text({ text: "新版特性", style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: "点击「获取更新历程」后自动检测新版本", style: "bodySmall", color: onSurfaceVariant }),
            newFeatureContentState[0] && newFeatureState[0] === "done" ? (
                newFeatureContentState[0].indexOf("当前已是最新版") >= 0
                    ? ctx.UI.Text({ text: newFeatureContentState[0], style: "bodySmall", color: onSurfaceVariant })
                    : renderChangelogText(newFeatureContentState[0])
            ) : (newFeatureState[0] === "loading" ? ctx.UI.CircularProgressIndicator({ strokeWidth: 2, color: primary }) : null),
        ]),
    ]);

    // ===== 整体布局 =====
    return ctx.UI.LazyColumn({ fillMaxSize: true, spacing: 12, padding: { horizontal: 16, top: 16, bottom: 24 } }, [
        ctx.UI.Text({ text: "问卷主题设置", style: "titleLarge", color: primary }),
        settingsSection,
        typePicker,
        previewCard,
        aboutCard,
        versionCheckCard,
        newFeatureCard,
        changelogCard,
    ]);
}
