// @ts-nocheck
function readEnv(key, valid, def) {
    if (typeof getEnv !== "function") return def;
    try { var v = getEnv(key); if (valid.indexOf(v) >= 0) return v; } catch (e) {}
    return def;
}
var _settingsLang = null;
/* _settingsLang 将在 Screen 函数内用 ctx.callTool 初始化 */
function _t(key) {
    if (_settingsLang && _settingsLang[key]) return _settingsLang[key];
    var builtin = {
        "ui.setting.title": "问卷主题设置",
        "ui.setting.theme": "主题设置",
        "ui.setting.layout": "按钮布局",
        "ui.setting.questionLayout": "问卷布局",
        "ui.setting.timeMode": "时间输入模式",
        "ui.setting.displayMode": "问卷显示模式",
        "ui.setting.strictMode": "语法检查模式",
        "ui.setting.history": "问卷历史记录",
        "ui.setting.history.desc": "开启后，填写过的问卷可一键补全。关闭后不再记录。",
        "ui.setting.lang": "语言包",
        "ui.setting.lang.current": "当前语言",
        "ui.setting.lang.scan": "扫描语言包",
        "ui.setting.lang.scanning": "扫描中...",
        "ui.setting.lang.switch": "切换",
        "ui.setting.lang.none": "内置语言包",
        "ui.setting.about": "关于主题",
        "ui.setting.about.round": "圆润模式：使用 OutlinedButton 显示选项，适合清晰区分",
        "ui.setting.about.square": "方正模式：使用 FilterChip 显示选项，紧凑设计，适合空间有限",
        "ui.setting.versionCheck": "版本检查",
        "ui.setting.changelog": "更新历程",
        "ui.setting.newFeature": "新版特性",
        "ui.setting.save": "保存设置",
        "ui.setting.saved": "✓ 已保存",
        "ui.setting.checking": "正在检查更新...",
        "ui.setting.fetching": "获取中...",
        "ui.setting.currentVer": "当前版本",
        "ui.setting.selectSource": "选择来源",
        "ui.setting.checkUpdate": "检查更新",
        "ui.setting.fetchChangelog": "获取更新历程",
        "ui.setting.pluginInfo": "问卷提问插件 ",
        "ui.setting.supportedTypes": "题型：单选、多选、单行文本、多行文本、星级评分、李克特量表、NPS、时间",
        "ui.setting.supportedFeatures": "功能：段落标题、必答题标记、结果表达式、主题切换、按钮布局",
        "ui.setting.author": "原作：",
        "ui.setting.modder": "二次开发：",
        "ui.setting.based": "基于 Operit ToolPkg 开发。TypeScript 编译。",
        "ui.setting.cleanHistory": "一键清理历史记录",
        "ui.setting.cleanHistory.done": "已清理历史记录文件夹",
        "ui.setting.cleanHistory.none": "暂无历史记录",
        "ui.setting.cleanHistory.fail": "清理失败",
        "ui.setting.saveFail": "保存失败：",
        "ui.setting.round": "圆润",
        "ui.setting.square": "方正",
        "ui.setting.layout.row": "一行一个",
        "ui.setting.layout.scroll": "LazyRow滑动",
        "ui.setting.layout.continuous": "连续，所有题目连续显示",
        "ui.setting.layout.compact": "紧凑，一页5题加分页",
        "ui.setting.timePicker": "按钮选择器",
        "ui.setting.timeInput": "手动输入",
        "ui.setting.displayNormal": "正常显示",
        "ui.setting.displayHidden": "显示源码",
        "ui.setting.displayBlocked": "拦截显示",
        "ui.setting.strictEnabled": "严谨",
        "ui.setting.strictDisabled": "宽松",
        "ui.setting.mode": "模式",
        "ui.setting.enabled": "开启",
        "ui.setting.disabled": "关闭",
        "ui.setting.preview": "题型预览",
        "ui.setting.previewLabel": "预览：",
        "ui.setting.aboutPlugin": "关于问卷插件",
        "ui.setting.authorServer": "作者服务器",
        "ui.setting.gitHubRaw": "GitHub Raw",
        "ui.setting.jsDelivr": "jsDelivr CDN",
        "ui.setting.unknownVer": "未知版本",
        "ui.setting.latestVer": "当前已是最新版",
        "ui.setting.current": "当前：",
        "ui.setting.strictDesc": "检查全部语法",
        "ui.setting.strictDescRelaxed": "放行非致命错误",
        "ui.setting.lang.loadFail": "语言包加载失败：",
        "ui.setting.scanFail": "扫描失败：",
        "ui.setting.switchFail": "切换失败：",
        "ui.setting.foundPacks": "找到 %d 个语言包，请关闭设置页后重新打开",
        "ui.setting.switched": "已切换语言包，请关闭设置页后重新打开生效",
        "ui.setting.currentPack": "当前语言包：",
        "ui.setting.builtinLang": "内置语言包",
        "ui.setting.latestVerText": "✓ 已是最新版 v",
        "ui.setting.newVerText": "⚠ 发现新版本 v",
        "ui.setting.currentVerText": "当前版本：",
        "ui.setting.sourceText": "，源：",
        "ui.setting.checkFail": "检查失败：",
        "ui.setting.unavailable": "不可用",
        "ui.setting.fetchFail": "获取失败：",
        "ui.setting.latestVerDesc": "当前已是最新版，无新版本特性。",
        "ui.setting.selectSource": "选择来源",
        "ui.setting.lparen": "（",
        "ui.setting.rparen": "）",
        "ui.setting.lang.author": "语言包作者：",

        "ui.market.langpack.title": "语言包市场",
        "ui.market.langpack.refresh": "刷新",
        "ui.market.langpack.download": "下载",
        "ui.market.langpack.installed": "已安装",
        "ui.market.langpack.loadFail": "加载市场列表失败",
        "ui.market.langpack.downloadFail": "下载失败",
        "ui.market.langpack.downloadSuccess": "下载成功",
        "ui.market.langpack.publishTitle": "发布你的语言包",
        "ui.market.langpack.publishDesc": "在 GitHub 提交 Issue 来发布你的语言包",
        "ui.market.langpack.publishBtn": "在 GitHub 发布",
        "ui.market.langpack.noItems": "暂无可用语言包",
        "ui.market.langpack.fetching": "获取中...",
        "ui.market.langpack.installing": "安装中...",
        "ui.market.langpack.checkFail": "检查失败：",
        "ui.market.langpack.version": "版本",
        "ui.market.langpack.authorLabel": "作者",
        "ui.market.langpack.reinstall": "重新安装",

        "ui.market.langpack.title": "语言包市场",
        "ui.market.langpack.refresh": "刷新",
        "ui.market.langpack.download": "下载",
        "ui.market.langpack.installed": "已安装",
        "ui.market.langpack.loadFail": "加载市场列表失败",
        "ui.market.langpack.downloadFail": "下载失败",
        "ui.market.langpack.downloadSuccess": "下载成功",
        "ui.market.langpack.publishTitle": "发布你的语言包",
        "ui.market.langpack.publishDesc": "在 GitHub 提交 Issue 来发布你的语言包",
        "ui.market.langpack.publishBtn": "在 GitHub 发布",
        "ui.market.langpack.noItems": "暂无可用语言包",
        "ui.market.langpack.fetching": "获取中...",
        "ui.market.langpack.installing": "安装中...",
        "ui.market.langpack.checkFail": "检查失败：",
        "ui.market.langpack.version": "版本",
        "ui.market.langpack.authorLabel": "作者",
        "ui.market.langpack.reinstall": "重新安装",

        "ui.setting.roundDesc": "圆润",
        "ui.setting.squareDesc": "方正",
        "ui.setting.layout.rowDesc": "一行一个（突出）",
        "ui.setting.layout.scrollDesc": "LazyRow滑动（经典）",
        "ui.setting.layout.continuousDesc": "连续显示（经典）",
        "ui.setting.layout.compactDesc": "紧凑翻页（新版，分页）",
        "ui.setting.timePickerDesc": "按钮选择器（时/分/秒按钮）",
        "ui.setting.timeInputDesc": "手动输入（hh:mm:ss格式）",
        "ui.setting.displayHiddenDesc": "显示源码（不渲染问卷）",
        "ui.setting.displayBlockedDesc": "拦截显示（警告页）",
        "ui.setting.selectType": "选择一个题型以预览在当前主题下的渲染效果",
        "ui.setting.newFeature.desc": "点击「获取更新日志」检测新版本",
        "ui.setting.preview.single": "单选题示例",
        "ui.setting.preview.multiple": "多选题示例",
        "ui.setting.preview.text": "单行文本示例",
        "ui.setting.preview.textarea": "多行文本示例",
        "ui.setting.preview.rating": "评分示例",
        "ui.setting.preview.likert": "李克特量表示例",
        "ui.setting.preview.nps": "NPS示例",
        "ui.setting.preview.timePrefix": "时间选择",
        "ui.setting.preview.optionA": "选项A",
        "ui.setting.preview.optionB": "选项B",
        "ui.setting.preview.optionC": "选项C",
        "ui.setting.preview.red": "红色",
        "ui.setting.preview.blue": "蓝色",
        "ui.setting.preview.green": "绿色",
        "ui.setting.preview.inputText": "请输入内容...",
        "ui.setting.preview.ratingExample": "3星 - 一般",
        "ui.setting.preview.npsExample": "评分：7（被动者）",
        "ui.setting.preview.timeExample": "已选择：10:30",
        "ui.setting.preview.likert1": "非常不同意",
        "ui.setting.preview.likert2": "不同意",
        "ui.setting.preview.likert3": "一般",
        "ui.setting.preview.likert4": "同意",
        "ui.setting.preview.likert5": "非常同意",
        "ui.setting.preview.hour": "时",
        "ui.setting.preview.minute": "分",
        "ui.setting.preview.second": "秒",
        "ui.setting.type.single": "单选题",
        "ui.setting.type.multiple": "多选题",
        "ui.setting.type.text": "单行文本",
        "ui.setting.type.textarea": "多行文本",
        "ui.setting.type.rating": "评分题",
        "ui.setting.type.likert": "李克特量表",
        "ui.setting.type.nps": "NPS 净推荐值",
        "ui.setting.type.time": "时间选择",
    };
    return builtin[key] || key;
}
var _initialTheme = readEnv("QUESTIONNAIRE_THEME", ["classic","compact"], "classic");
var _initialLayout = readEnv("QUESTIONNAIRE_BUTTON_LAYOUT", ["row","scroll"], "scroll");
var _initialQuestionLayout = readEnv("QUESTIONNAIRE_LAYOUT", ["continuous","compact"], "continuous");
var _initialTimeMode = readEnv("QUESTIONNAIRE_TIME_INPUT_MODE", ["picker","input"], "picker");
var _initialDisplayMode = readEnv("QUESTIONNAIRE_DISPLAY_MODE", ["normal","hidden","blocked"], "normal");
var _initialStrictMode = readEnv("QUESTIONNAIRE_STRICT_MODE", ["true","false"], "true");
var _initialHistoryEnabled = readEnv("QUESTIONNAIRE_HISTORY_ENABLED", ["true","false"], "true");
var _themeLabel = function(t) { return t === "classic" ? _t("ui.setting.round") : _t("ui.setting.square"); };
var _layoutLabel = function(l) { return l === "row" ? _t("ui.setting.layout.row") : _t("ui.setting.layout.scroll"); };
var _questionLayoutLabel = function(l) { return l === "continuous" ? _t("ui.setting.layout.continuous") : _t("ui.setting.layout.compact"); };
var _timeModeLabel = function(m) { return m === "picker" ? _t("ui.setting.timePicker") : _t("ui.setting.timeInput"); };
var _displayModeLabel = function(d) { return d === "normal" ? _t("ui.setting.displayNormal") : (d === "hidden" ? _t("ui.setting.displayHidden") : _t("ui.setting.displayBlocked")); };

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
    var versionSourceState = ctx.useState("_versionSource", 1);
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
    var langPacksState = ctx.useState("_langPacks", null);
    var langScanningState = ctx.useState("_langScanning", false);
    var currentLangPathState = ctx.useState("_currentLangPath", (typeof getEnv === "function" ? (function(){ try { return getEnv("QUESTIONNAIRE_LANG_PATH") || ""; } catch(e) { return ""; } })() : ""));
    var currentLangPath = currentLangPathState[0];
    var langPacks = langPacksState[0];
    var langScanning = langScanningState[0];
    var settingsLangState = ctx.useState("_settingsLang", _settingsLang);
    var settingsLang = settingsLangState[0];
    // 同步初始化 _settingsLang—在渲染前读取语言包
    try {
        var initPath = currentLangPathState[0];
        if (initPath && !_settingsLang) {
            var raw = await ctx.callTool("read_file", { path: initPath });
            var txt = raw && raw.content ? raw.content.replace(/^\s*\d+\|/gm, "") : "";
            if (txt) {
                var parsed = JSON.parse(txt);
                if (parsed && parsed.lang) {
                    _settingsLang = parsed.lang;
                    settingsLangState[1](parsed.lang);
                }
            }
        }
    } catch(e) {
        /* catch 块在 var _t 赋值之前，直接用外部 _t (function _t) 引用，避免被 hoisting 遮蔽 */
        ctx.showToast((typeof _t === "function" ? _t : function(k){ return k; })("语言包加载失败：") + String(e));
    }
    // 覆盖 _t 为使用 state 的版本
    var _t = function(key) {
        if (_settingsLang && _settingsLang[key]) return _settingsLang[key];
        var _sl = settingsLangState[0];
        if (_sl && _sl[key]) return _sl[key];
        var builtin = {
            "ui.setting.title": "问卷主题设置",
            "ui.setting.theme": "主题设置",
            "ui.setting.layout": "按钮布局",
            "ui.setting.questionLayout": "问卷布局",
            "ui.setting.timeMode": "时间输入模式",
            "ui.setting.displayMode": "问卷显示模式",
            "ui.setting.strictMode": "语法检查模式",
            "ui.setting.history": "问卷历史记录",
            "ui.setting.history.desc": "开启后，填写过的问卷可一键补全。关闭后不再记录。",
            "ui.setting.lang": "语言包",
            "ui.setting.lang.current": "当前语言",
            "ui.setting.lang.scan": "扫描语言包",
            "ui.setting.lang.scanning": "扫描中...",
            "ui.setting.lang.switch": "切换",
            "ui.setting.lang.none": "内置语言包",
            "ui.setting.about": "关于主题",
            "ui.setting.about.round": "圆润模式：使用 OutlinedButton 显示选项，适合清晰区分",
            "ui.setting.about.square": "方正模式：使用 FilterChip 显示选项，紧凑设计，适合空间有限",
            "ui.setting.versionCheck": "版本检查",
            "ui.setting.changelog": "更新历程",
            "ui.setting.newFeature": "新版特性",
            "ui.setting.newFeature.desc": "点击「获取更新日志」检测新版本",
            "ui.setting.save": "保存设置",
            "ui.setting.saved": "✓ 已保存",
            "ui.setting.checking": "正在检查更新...",
            "ui.setting.fetching": "获取中...",
            "ui.setting.currentVer": "当前版本",
            "ui.setting.selectSource": "选择来源",
            "ui.setting.selectType": "选择一个题型以预览在当前主题下的渲染效果",
            "ui.setting.checkUpdate": "检查更新",
            "ui.setting.fetchChangelog": "获取更新历程",
            "ui.setting.pluginInfo": "问卷提问插件 ",
            "ui.setting.supportedTypes": "题型：单选、多选、单行文本、多行文本、星级评分、李克特量表、NPS、时间",
            "ui.setting.supportedFeatures": "功能：段落标题、必答题标记、结果表达式、主题切换、按钮布局",
            "ui.setting.author": "原作：",
            "ui.setting.modder": "二次开发：",
            "ui.setting.based": "基于 Operit ToolPkg 开发。TypeScript 编译。",
            "ui.setting.cleanHistory": "一键清理历史记录",
            "ui.setting.cleanHistory.done": "已清理历史记录文件夹",
            "ui.setting.cleanHistory.none": "暂无历史记录",
            "ui.setting.cleanHistory.fail": "清理失败",
            "ui.setting.saveFail": "保存失败：",
            "ui.setting.round": "圆润",
            "ui.setting.square": "方正",
            "ui.setting.layout.row": "一行一个",
            "ui.setting.layout.scroll": "LazyRow滑动",
            "ui.setting.layout.continuous": "连续，所有题目连续显示",
            "ui.setting.layout.compact": "紧凑，一页5题加分页",
            "ui.setting.timePicker": "按钮选择器",
            "ui.setting.timeInput": "手动输入",
            "ui.setting.displayNormal": "正常显示",
            "ui.setting.displayHidden": "显示源码",
            "ui.setting.displayBlocked": "拦截显示",
            "ui.setting.strictEnabled": "严谨",
            "ui.setting.strictDisabled": "宽松",
            "ui.setting.mode": "模式",
            "ui.setting.enabled": "开启",
            "ui.setting.disabled": "关闭",
            "ui.setting.preview": "题型预览",
            "ui.setting.previewLabel": "预览：",
            "ui.setting.aboutPlugin": "关于问卷插件",
            "ui.setting.authorServer": "作者服务器",
            "ui.setting.gitHubRaw": "GitHub Raw",
            "ui.setting.jsDelivr": "jsDelivr CDN",
            "ui.setting.unknownVer": "未知版本",
            "ui.setting.latestVer": "当前已是最新版",
            "ui.setting.current": "当前：",
            "ui.setting.strictDesc": "检查全部语法",
            "ui.setting.strictDescRelaxed": "放行非致命错误",
            "ui.setting.lang.loadFail": "语言包加载失败：",
            "ui.setting.scanFail": "扫描失败：",
            "ui.setting.switchFail": "切换失败：",
            "ui.setting.foundPacks": "找到 %d 个语言包，请关闭设置页后重新打开",
            "ui.setting.switched": "已切换语言包，请关闭设置页后重新打开生效",
            "ui.setting.currentPack": "当前语言包：",
            "ui.setting.builtinLang": "内置语言包",
            "ui.setting.latestVerText": "✓ 已是最新版 v",
            "ui.setting.newVerText": "⚠ 发现新版本 v",
            "ui.setting.currentVerText": "当前版本：",
            "ui.setting.sourceText": "，源：",
            "ui.setting.checkFail": "检查失败：",
            "ui.setting.unavailable": "不可用",
            "ui.setting.fetchFail": "获取失败：",
            "ui.setting.latestVerDesc": "当前已是最新版，无新版本特性。",
            "ui.setting.roundDesc": "圆润",
            "ui.setting.squareDesc": "方正",
            "ui.setting.layout.rowDesc": "一行一个（突出）",
            "ui.setting.layout.scrollDesc": "LazyRow滑动（经典）",
            "ui.setting.layout.continuousDesc": "连续显示（经典）",
            "ui.setting.layout.compactDesc": "紧凑翻页（新版，分页）",
            "ui.setting.timePickerDesc": "按钮选择器（时/分/秒按钮）",
            "ui.setting.timeInputDesc": "手动输入（hh:mm:ss格式）",
            "ui.setting.displayHiddenDesc": "显示源码（不渲染问卷）",
            "ui.setting.displayBlockedDesc": "拦截显示（警告页）",
            "ui.setting.preview.single": "单选题示例",
            "ui.setting.preview.multiple": "多选题示例",
            "ui.setting.preview.text": "单行文本示例",
            "ui.setting.preview.textarea": "多行文本示例",
            "ui.setting.preview.rating": "评分示例",
            "ui.setting.preview.likert": "李克特量表示例",
            "ui.setting.preview.nps": "NPS示例",
            "ui.setting.preview.timePrefix": "时间选择",
            "ui.setting.preview.optionA": "选项A",
            "ui.setting.preview.optionB": "选项B",
            "ui.setting.preview.optionC": "选项C",
            "ui.setting.preview.red": "红色",
            "ui.setting.preview.blue": "蓝色",
            "ui.setting.preview.green": "绿色",
            "ui.setting.preview.inputText": "请输入内容...",
            "ui.setting.preview.ratingExample": "3星 - 一般",
            "ui.setting.preview.npsExample": "评分：7（被动者）",
            "ui.setting.preview.timeExample": "已选择：10:30",
            "ui.setting.preview.likert1": "非常不同意",
            "ui.setting.preview.likert2": "不同意",
            "ui.setting.preview.likert3": "一般",
            "ui.setting.preview.likert4": "同意",
            "ui.setting.preview.likert5": "非常同意",
            "ui.setting.preview.hour": "时",
            "ui.setting.preview.minute": "分",
            "ui.setting.preview.second": "秒",
            "ui.setting.type.single": "单选题",
            "ui.setting.type.multiple": "多选题",
            "ui.setting.type.text": "单行文本",
            "ui.setting.type.textarea": "多行文本",
            "ui.setting.type.rating": "评分题",
            "ui.setting.type.likert": "李克特量表",
            "ui.setting.type.nps": "NPS 净推荐值",
            "ui.setting.type.time": "时间选择",
            "ui.setting.lparen": "（",
            "ui.setting.rparen": "）",
        "ui.setting.lang.author": "语言包作者：",
        };
        return builtin[key] || key;
    };
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
            ctx.showToast(_t("ui.setting.saved"));
        } catch (e) {
            ctx.showToast(_t("ui.setting.saveFail") + String(e));
        }
    }

    // ===== 设置区（主题 + 按钮布局） =====
    var settingsSection = ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
        ctx.UI.Column({ padding: 16, spacing: 8 }, [
            ctx.UI.Text({ text: _t("ui.setting.theme"), style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: _t("ui.setting.current") + _t("ui.setting.theme") + _themeLabel(currentTheme), style: "bodyMedium", color: onSurfaceVariant }),
            ctx.UI.OutlinedButton({
                containerColor: !isCompact ? primary : null,
                contentColor: !isCompact ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { selectTheme("classic"); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: _t("ui.setting.roundDesc"), style: "labelMedium", color: !isCompact ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.OutlinedButton({
                containerColor: isCompact ? primary : null,
                contentColor: isCompact ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { selectTheme("compact"); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: _t("ui.setting.squareDesc"), style: "labelMedium", color: isCompact ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.Divider({ thickness: 0.5, color: onSurfaceVariant.copy({ alpha: 0.3 }) }),
            ctx.UI.Spacer({ height: 4 }),
            ctx.UI.Text({ text: _t("ui.setting.layout"), style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: _t("ui.setting.current") + _t("ui.setting.layout") + _layoutLabel(currentLayout), style: "bodyMedium", color: onSurfaceVariant }),
            ctx.UI.OutlinedButton({
                containerColor: isRowLayout ? primary : null,
                contentColor: isRowLayout ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { selectLayout("row"); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: _t("ui.setting.layout.rowDesc"), style: "labelMedium", color: isRowLayout ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.OutlinedButton({
                containerColor: !isRowLayout ? primary : null,
                contentColor: !isRowLayout ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { selectLayout("scroll"); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: _t("ui.setting.layout.scrollDesc"), style: "labelMedium", color: !isRowLayout ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.Divider({ thickness: 0.5, color: onSurfaceVariant.copy({ alpha: 0.3 }) }),
            ctx.UI.Text({ text: _t("ui.setting.questionLayout"), style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: _t("ui.setting.current") + _t("ui.setting.questionLayout") + _questionLayoutLabel(currentQuestionLayout), style: "bodyMedium", color: onSurfaceVariant }),
            ctx.UI.OutlinedButton({
                containerColor: currentQuestionLayout === "continuous" ? primary : null,
                contentColor: currentQuestionLayout === "continuous" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { questionLayoutState[1]("continuous"); savedState[1](false); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: _t("ui.setting.layout.continuousDesc"), style: "labelMedium", color: currentQuestionLayout === "continuous" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.OutlinedButton({
                containerColor: currentQuestionLayout === "compact" ? primary : null,
                contentColor: currentQuestionLayout === "compact" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { questionLayoutState[1]("compact"); savedState[1](false); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: _t("ui.setting.layout.compactDesc"), style: "labelMedium", color: currentQuestionLayout === "compact" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.Divider({ thickness: 0.5, color: onSurfaceVariant.copy({ alpha: 0.3 }) }),
            ctx.UI.Spacer({ height: 4 }),
            ctx.UI.Spacer({ height: 4 }),
            ctx.UI.Text({ text: _t("ui.setting.timeMode"), style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: _t("ui.setting.current") + _t("ui.setting.timeMode") + _timeModeLabel(currentTimeMode), style: "bodyMedium", color: onSurfaceVariant }),
            ctx.UI.OutlinedButton({
                containerColor: !isInputMode ? primary : null,
                contentColor: !isInputMode ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { selectTimeMode("picker"); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: _t("ui.setting.timePickerDesc"), style: "labelMedium", color: !isInputMode ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.OutlinedButton({
                containerColor: isInputMode ? primary : null,
                contentColor: isInputMode ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { selectTimeMode("input"); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: _t("ui.setting.timeInputDesc"), style: "labelMedium", color: isInputMode ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.Divider({ thickness: 0.5, color: onSurfaceVariant.copy({ alpha: 0.3 }) }),
            ctx.UI.Spacer({ height: 4 }),
            ctx.UI.Text({ text: _t("ui.setting.displayMode"), style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: _t("ui.setting.current") + _t("ui.setting.displayMode") + _displayModeLabel(currentDisplayMode), style: "bodyMedium", color: onSurfaceVariant }),
            ctx.UI.OutlinedButton({
                containerColor: currentDisplayMode === "normal" ? primary : null,
                contentColor: currentDisplayMode === "normal" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { selectDisplayMode("normal"); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: _t("ui.setting.displayNormal"), style: "labelMedium", color: currentDisplayMode === "normal" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.OutlinedButton({
                containerColor: currentDisplayMode === "hidden" ? primary : null,
                contentColor: currentDisplayMode === "hidden" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { selectDisplayMode("hidden"); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: _t("ui.setting.displayHiddenDesc"), style: "labelMedium", color: currentDisplayMode === "hidden" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.OutlinedButton({
                containerColor: currentDisplayMode === "blocked" ? primary : null,
                contentColor: currentDisplayMode === "blocked" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { selectDisplayMode("blocked"); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: _t("ui.setting.displayBlockedDesc"), style: "labelMedium", color: currentDisplayMode === "blocked" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.Divider({ thickness: 0.5, color: onSurfaceVariant.copy({ alpha: 0.3 }) }),
            ctx.UI.Spacer({ height: 4 }),
            ctx.UI.Text({ text: _t("ui.setting.strictMode"), style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: _t("ui.setting.current") + (currentStrictMode === "true" ? _t("ui.setting.strictEnabled") : _t("ui.setting.strictDisabled")) + _t("ui.setting.mode"), style: "bodyMedium", color: onSurfaceVariant }),
            ctx.UI.OutlinedButton({
                containerColor: currentStrictMode === "true" ? primary : null,
                contentColor: currentStrictMode === "true" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { selectStrictMode("true"); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: _t("ui.setting.strictEnabled") + _t("ui.setting.lparen") + _t("ui.setting.strictDesc") + _t("ui.setting.rparen"), style: "labelMedium", color: currentStrictMode === "true" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.OutlinedButton({
                containerColor: currentStrictMode === "false" ? primary : null,
                contentColor: currentStrictMode === "false" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { selectStrictMode("false"); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: _t("ui.setting.strictDisabled") + _t("ui.setting.lparen") + _t("ui.setting.strictDescRelaxed") + _t("ui.setting.rparen"), style: "labelMedium", color: currentStrictMode === "false" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.Divider({ thickness: 0.5, color: onSurfaceVariant.copy({ alpha: 0.3 }) }),
            ctx.UI.Spacer({ height: 4 }),
            ctx.UI.Text({ text: _t("ui.setting.history"), style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: _t("ui.setting.history.desc"), style: "bodySmall", color: onSurfaceVariant }),
            ctx.UI.OutlinedButton({
                containerColor: historyEnabledState[0] === "true" ? primary : null,
                contentColor: historyEnabledState[0] === "true" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { historyEnabledState[1]("true"); savedState[1](false); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: _t("ui.setting.enabled"), style: "labelMedium", color: historyEnabledState[0] === "true" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.OutlinedButton({
                containerColor: historyEnabledState[0] === "false" ? primary : null,
                contentColor: historyEnabledState[0] === "false" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { historyEnabledState[1]("false"); savedState[1](false); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: _t("ui.setting.disabled"), style: "labelMedium", color: historyEnabledState[0] === "false" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.OutlinedButton({
                onClick: function() {
                    try {
                        var path = "/sdcard/Download/Operit/questionnaire/history";
                        if (Tools.Files.exists(path)) {
                            Tools.Files.deleteFile(path, true);
                            ctx.showToast(_t("ui.setting.cleanHistory.done"));
                        } else {
                            ctx.showToast(_t("ui.setting.cleanHistory.none"));
                        }
                    } catch(e) {
                        ctx.showToast(_t("ui.setting.cleanHistory.fail") + String(e));
                    }
                },
                fillMaxWidth: true,
                containerColor: ctx.MaterialTheme.colorScheme.error,
                content: ctx.UI.Text({ text: _t("ui.setting.cleanHistory"), style: "labelMedium", color: ctx.MaterialTheme.colorScheme.onPrimary }),
            }),
            ctx.UI.Divider({ thickness: 0.5, color: onSurfaceVariant.copy({ alpha: 0.3 }) }),
            ctx.UI.Button({
                onClick: saveTheme, fillMaxWidth: true, containerColor: primary,
                content: ctx.UI.Text({ text: saved ? _t("ui.setting.saved") : _t("ui.setting.save"), style: "labelMedium", color: ctx.MaterialTheme.colorScheme.onPrimary }),
            }),
        ]),
    ]);

    // ===== 题型选择下拉 =====
    var typeOptions = [
        { id: "single", label: _t("ui.setting.type.single") },
        { id: "multiple", label: _t("ui.setting.type.multiple") },
        { id: "text", label: _t("ui.setting.type.text") },
        { id: "textarea", label: _t("ui.setting.type.textarea") },
        { id: "rating", label: _t("ui.setting.type.rating") },
        { id: "likert", label: _t("ui.setting.type.likert") },
        { id: "nps", label: _t("ui.setting.type.nps") },
        { id: "time", label: _t("ui.setting.type.time") },
    ];
    var typePicker = ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
        ctx.UI.Column({ padding: 16, spacing: 8 }, [
            ctx.UI.Text({ text: _t("ui.setting.preview"), style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: _t("ui.setting.selectType"), style: "bodySmall", color: onSurfaceVariant }),
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
                ctx.UI.Text({ text: _t("ui.setting.preview.single"), style: "labelSmall", color: onSurfaceVariant }),
                ctx.UI.Row({ spacing: 6 }, [btn(_t("ui.setting.preview.optionA"), true), btn(_t("ui.setting.preview.optionB"), false), btn(_t("ui.setting.preview.optionC"), false)]),
            ]);
        }
        if (type === "multiple") {
            return ctx.UI.Column({ spacing: 6, padding: { vertical: 4 } }, [
                ctx.UI.Text({ text: _t("ui.setting.preview.multiple"), style: "labelSmall", color: onSurfaceVariant }),
                ctx.UI.Row({ spacing: 6 }, [btn(_t("ui.setting.preview.red"), true), btn(_t("ui.setting.preview.blue"), true), btn(_t("ui.setting.preview.green"), false)]),
            ]);
        }
        if (type === "text") {
            return ctx.UI.Column({ spacing: 6, padding: { vertical: 4 } }, [
                ctx.UI.Text({ text: _t("ui.setting.preview.text"), style: "labelSmall", color: onSurfaceVariant }),
                ctx.UI.TextField({ value: _t("ui.setting.preview.inputText"), placeholder: _t("ui.setting.preview.inputText"), singleLine: true, enabled: true, style: "compact" }),
            ]);
        }
        if (type === "textarea") {
            return ctx.UI.Column({ spacing: 6, padding: { vertical: 4 } }, [
                ctx.UI.Text({ text: _t("ui.setting.preview.textarea"), style: "labelSmall", color: onSurfaceVariant }),
                ctx.UI.TextField({ value: "", placeholder: _t("ui.setting.preview.inputText"), singleLine: false, minLines: 3, maxLines: 5, enabled: true, style: "compact" }),
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
                ctx.UI.Text({ text: _t("ui.setting.preview.rating"), style: "labelSmall", color: onSurfaceVariant }),
                ctx.UI.Row({ spacing: 6, horizontalArrangement: "spaceEvenly", fillMaxWidth: true }, ratingRow1),
                ctx.UI.Row({ spacing: 6, horizontalArrangement: "spaceEvenly", fillMaxWidth: true }, ratingRow2),
                ctx.UI.Text({ text: _t("ui.setting.preview.ratingExample"), style: "bodySmall", color: onSurfaceVariant }),
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
                ctx.UI.Text({ text: _t("ui.setting.preview.likert"), style: "labelSmall", color: onSurfaceVariant }),
                ctx.UI.Row({ spacing: 4, horizontalArrangement: "spaceEvenly", fillMaxWidth: true }, likertRow1),
                ctx.UI.Row({ spacing: 4, horizontalArrangement: "spaceEvenly", fillMaxWidth: true }, likertRow2),
                ctx.UI.Row({ spacing: 4, horizontalArrangement: "spaceEvenly", fillMaxWidth: true, padding: { top: 2 } },
                    [_t("ui.setting.preview.likert1"), _t("ui.setting.preview.likert2"), _t("ui.setting.preview.likert3"), _t("ui.setting.preview.likert4"), _t("ui.setting.preview.likert5")].map(function (lbl) {
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
                ctx.UI.Text({ text: _t("ui.setting.preview.nps"), style: "labelSmall", color: onSurfaceVariant }),
                ctx.UI.Column({ spacing: 4 }, npsCards),
                ctx.UI.Text({ text: _t("ui.setting.preview.npsExample"), style: "bodySmall", color: onSurfaceVariant }),
            ]);
        }
        if (type === "time") {
            return ctx.UI.Column({ spacing: 6, padding: { vertical: 4 } }, [
                ctx.UI.Text({ text: _t("ui.setting.preview.timePrefix") + _t("ui.setting.lparen") + _timeModeLabel(currentTimeMode) + _t("ui.setting.rparen"), style: "labelSmall", color: onSurfaceVariant }),
                currentTimeMode === "input" ? ctx.UI.TextField({
                    value: "10:30:00",
                    placeholder: "hh:mm:ss",
                    fillMaxWidth: true,
                    style: "compact",
                }) : ctx.UI.Column({ spacing: 4 }, [
                    ctx.UI.Text({ text: _t("ui.setting.preview.hour"), style: "labelSmall", color: onSurfaceVariant }),
                    ctx.UI.LazyRow({ spacing: 4 }, (function() { var hs = []; for (var hi = 8; hi <= 12; hi++) { hs.push(btn(hi < 10 ? "0" + hi : "" + hi, hi === 10)); } return hs; })()),
                    ctx.UI.Text({ text: _t("ui.setting.preview.minute"), style: "labelSmall", color: onSurfaceVariant }),
                    ctx.UI.LazyRow({ spacing: 4 }, (function() { var ms = []; for (var mi = 0; mi <= 55; mi += 15) { ms.push(btn(mi < 10 ? "0" + mi : "" + mi, mi === 30)); } return ms; })()),
                    ctx.UI.Text({ text: _t("ui.setting.preview.timeExample"), style: "bodySmall", color: primary }),
                ]),
            ]);
        }
        return null;
    }

    var previewCard = ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
        ctx.UI.Column({ padding: 16, spacing: 8 }, [
            ctx.UI.Text({ text: _t("ui.setting.previewLabel") + typeOptions.find(function(t){return t.id===previewType}).label, style: "titleSmall", color: onSurface }),
            renderTypePreview(previewType),
        ]),
    ]);

    // ===== 语言包区 =====
    async function scanLangPacks() {
        if (langScanning) return;
        langScanningState[1](true);
        langPacksState[1](null);
        try {
            var langDir = "/sdcard/Download/Operit/questionnaire/lang";
            await ctx.callTool("make_directory", { path: langDir, create_parents: true });
            var fileListResult = await ctx.callTool("list_files", { path: langDir });
                    // debug 日志已移除
            var fileEntries = [];
            if (fileListResult && fileListResult.entries) {
                fileEntries = fileListResult.entries;
            } else if (fileListResult && fileListResult.data && fileListResult.data.entries) {
                fileEntries = fileListResult.data.entries;
            } else if (Array.isArray(fileListResult)) {
                fileEntries = fileListResult;
            }
            var packs = [];
            for (var lpi = 0; lpi < fileEntries.length; lpi++) {
                var entry = fileEntries[lpi];
                var entryName = typeof entry === "string" ? entry : (entry.name || entry.path || "");
                if (entryName.endsWith(".json")) {
                        try {
                            var fp = langDir + "/" + entryName;
                            var raw = await ctx.callTool("read_file", { path: fp });
                            var content = "";
                            if (raw && raw.content) content = raw.content.replace(/^\s*\d+\|/gm, "");
                            else if (raw && typeof raw === "string") content = raw;
                            else if (raw && raw.data && raw.data.content) content = raw.data.content.replace(/^\s*\d+\|/gm, "");
                            // debug2 日志已移除
                            var parsed = JSON.parse(content);
                            if (parsed && parsed.id && parsed.lang) {
                                var displayName = parsed.displayname;
                                if (!displayName) {
                                    var langNames = {
                        "zh_cn": "简体中文",
                        "zh_tw": "繁体中文",
                        "en_us": "English (US)",
                        "en_gb": "English (UK)",
                        "ja_jp": "日本語",
                        "ko_kr": "한국어",
                        "fr_fr": "Français",
                        "de_de": "Deutsch",
                        "es_es": "Español",
                        "ru_ru": "Русский",
                        "ar_sa": "العربية",
                        "pt_br": "Português (BR)",
                        "pt_pt": "Português (PT)",
                        "vi_vn": "Tiếng Việt",
                        "th_th": "ไทย",
                        "it_it": "Italiano",
                        "nl_nl": "Nederlands",
                        "pl_pl": "Polski",
                        "tr_tr": "Türkçe",
                        "sv_se": "Svenska",
                        "da_dk": "Dansk",
                        "fi_fi": "Suomi",
                        "nb_no": "Norsk Bokmål",
                        "cs_cz": "Čeština",
                        "hu_hu": "Magyar",
                        "ro_ro": "Română",
                        "uk_ua": "Українська",
                        "el_gr": "Ελληνικά",
                        "he_il": "עברית",
                        "hi_in": "हिन्दी",
                        "id_id": "Bahasa Indonesia",
                        "ms_my": "Bahasa Melayu",
                        "fil_ph": "Filipino"
                    };
                                    displayName = langNames[parsed.id] || parsed.id;
                                } else if (typeof displayName === "object") {
                                    var _langId = (currentLangPathState[0] || "").split("/").pop().replace(".json", "").toLowerCase();
                                    displayName = displayName[_langId] || displayName["default"] || displayName["zh_cn"] || displayName["en_us"] || parsed.id;
                                }
                                packs.push({ id: parsed.id, path: fp, displayName: displayName, author: parsed.author || "" });
                            }
                        } catch(e) {
                            ctx.showToast("解析语言包失败: " + (e && e.message ? e.message : String(e)));
                        }
                    }
            }
            if (packs.length === 0) {
                ctx.showToast("未找到可用语言包，将在 lang 目录生成默认语言包");
                await ctx.callTool("make_directory", { path: langDir, create_parents: true });
                var defaultPacks = [
                    { id: "zh_cn", lang: {
                        "ui.form.submit": "提交",
                        "ui.form.cancel": "取消",
                        "ui.form.fill": "一键补全",
                        "ui.form.submitted": "已提交",
                        "ui.form.expired": "已过期",
                        "ui.form.infoTitle": "问卷信息",
                        "ui.form.version": "版本",
                        "ui.form.type": "类型",
                        "ui.form.questions": "题目数",
                        "ui.form.fingerprint": "指纹",
                        "ui.form.required": "必答",
                        "ui.form.other": "其他…",
                        "ui.form.missing": "还有必答题未填",
                        "ui.form.submitting": "提交中...",
                        "ui.form.parseError": "解析失败",
                        "ui.form.invalidFormat": "格式错误",
                        "ui.form.historyFill": "一键补全",
                        "ui.form.noAnswer": "(未填)",
                        "ui.form.emptySubmit": "(用户未填写任何内容)",
                        "ui.form.remind": "提醒",
                        "ui.form.expiredHint": "该问卷已过期",
                        "ui.form.collapsedHint": "点击展开",
                        "ui.form.sectionResult": "结果",
                        "ui.form.rollSpec": "卷谱",
                        "ui.form.asking": "📋 询问 %d 个问题",
                        "ui.form.cancelled": "用户取消了本次问卷提问",
                        "ui.form.cancelledTitle": "提问被终止",
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
                        "ui.form.starLabel": " 星 - ",
                        "ui.form.ratingVeryBad": "很差",
                        "ui.form.ratingBad": "较差",
                        "ui.form.ratingNormal": "一般",
                        "ui.form.ratingGood": "满意",
                        "ui.form.ratingVeryGood": "非常满意",
                        "ui.form.ratingNormal": "一般",
                        "ui.form.likertStronglyDisagree": "非常不同意",
                        "ui.form.likertDisagree": "不同意",
                        "ui.form.likertNeutral": "一般",
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
                        "ui.form.timeSelected": "已选: ",
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
                        "ui.form.rollSpecLabel": "卷谱: ",
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
                        "ui.form.remindMsg": "⚠️ ",
                        "ui.setting.title": "问卷主题设置",
                        "ui.setting.theme": "主题设置",
                        "ui.setting.layout": "按钮布局",
                        "ui.setting.questionLayout": "问卷布局",
                        "ui.setting.timeMode": "时间输入模式",
                        "ui.setting.displayMode": "问卷显示模式",
                        "ui.setting.strictMode": "语法检查模式",
                        "ui.setting.history": "问卷历史记录",
                        "ui.setting.history.desc": "开启后，填写过的问卷可一键补全。关闭后不再记录。",
                        "ui.setting.lang": "语言包",
                        "ui.setting.lang.current": "当前语言",
                        "ui.setting.lang.scan": "扫描语言包",
                        "ui.setting.lang.scanning": "扫描中...",
                        "ui.setting.lang.switch": "切换",
                        "ui.setting.lang.none": "内置语言包",
                        "ui.setting.about": "关于主题",
                        "ui.setting.about.round": "圆润模式：使用 OutlinedButton 显示选项，适合清晰区分",
                        "ui.setting.about.square": "方正模式：使用 FilterChip 显示选项，紧凑设计，适合空间有限",
                        "ui.setting.versionCheck": "版本检查",
                        "ui.setting.changelog": "更新历程",
                        "ui.setting.newFeature": "新版特性",
                        "ui.setting.save": "保存设置",
                        "ui.setting.saved": "✓ 已保存",
                        "ui.setting.checking": "正在检查更新...",
                        "ui.setting.fetching": "获取中...",
                        "ui.setting.currentVer": "当前版本",
                        "ui.setting.selectSource": "选择来源",
                        "ui.setting.checkUpdate": "检查更新",
                        "ui.setting.fetchChangelog": "获取更新历程",
                        "ui.setting.pluginInfo": "问卷提问插件 ",
                        "ui.setting.supportedTypes": "题型：单选、多选、单行文本、多行文本、星级评分、李克特量表、NPS、时间",
                        "ui.setting.supportedFeatures": "功能：段落标题、必答题标记、结果表达式、主题切换、按钮布局",
                        "ui.setting.author": "原作：",
                        "ui.setting.modder": "二次开发：",
                        "ui.setting.based": "基于 Operit ToolPkg 开发。TypeScript 编译。",
                        "ui.setting.cleanHistory": "一键清理历史记录",
                        "ui.setting.cleanHistory.done": "已清理历史记录文件夹",
                        "ui.setting.cleanHistory.none": "暂无历史记录",
                        "ui.setting.cleanHistory.fail": "清理失败",
                        "ui.setting.saveFail": "保存失败：",
                        "ui.setting.round": "圆润",
                        "ui.setting.square": "方正",
                        "ui.setting.layout.row": "一行一个",
                        "ui.setting.layout.scroll": "LazyRow滑动",
                        "ui.setting.layout.continuous": "连续，所有题目连续显示",
                        "ui.setting.layout.compact": "紧凑，一页5题加分页",
                        "ui.setting.timePicker": "按钮选择器",
                        "ui.setting.timeInput": "手动输入",
                        "ui.setting.displayNormal": "正常显示",
                        "ui.setting.displayHidden": "显示源码",
                        "ui.setting.displayBlocked": "拦截显示",
                        "ui.setting.strictEnabled": "严谨",
                        "ui.setting.strictDisabled": "宽松",
                        "ui.setting.mode": "模式",
                        "ui.setting.enabled": "开启",
                        "ui.setting.disabled": "关闭",
                        "ui.setting.preview": "题型预览",
                        "ui.setting.previewLabel": "预览：",
                        "ui.setting.aboutPlugin": "关于问卷插件",
                        "ui.setting.authorServer": "作者服务器",
                        "ui.setting.gitHubRaw": "GitHub Raw",
                        "ui.setting.jsDelivr": "jsDelivr CDN",
                        "ui.setting.unknownVer": "未知版本",
                        "ui.setting.latestVer": "当前已是最新版",
                        "ui.setting.current": "当前：",
                        "ui.setting.strictDesc": "检查全部语法",
                        "ui.setting.strictDescRelaxed": "放行非致命错误",
                        "ui.setting.lang.loadFail": "语言包加载失败：",
                        "ui.setting.scanFail": "扫描失败：",
                        "ui.setting.switchFail": "切换失败：",
                        "ui.setting.foundPacks": "找到 %d 个语言包，请关闭设置页后重新打开",
                        "ui.setting.switched": "已切换语言包，请关闭设置页后重新打开生效",
                        "ui.setting.currentPack": "当前语言包：",
                        "ui.setting.builtinLang": "内置语言包",
                        "ui.setting.latestVerText": "✓ 已是最新版 v",
                        "ui.setting.newVerText": "⚠ 发现新版本 v",
                        "ui.setting.currentVerText": "当前版本：",
                        "ui.setting.sourceText": "，源：",
                        "ui.setting.checkFail": "检查失败：",
                        "ui.setting.unavailable": "不可用",
                        "ui.setting.fetchFail": "获取失败：",
                        "ui.setting.latestVerDesc": "当前已是最新版，无新版本特性。",
                        "ui.setting.roundDesc": "圆润",
                        "ui.setting.squareDesc": "方正",
                        "ui.setting.layout.rowDesc": "一行一个（突出）",
                        "ui.setting.layout.scrollDesc": "LazyRow滑动（经典）",
                        "ui.setting.layout.continuousDesc": "连续显示（经典）",
                        "ui.setting.layout.compactDesc": "紧凑翻页（新版，分页）",
                        "ui.setting.timePickerDesc": "按钮选择器（时/分/秒按钮）",
                        "ui.setting.timeInputDesc": "手动输入（hh:mm:ss格式）",
                        "ui.setting.displayHiddenDesc": "显示源码（不渲染问卷）",
                        "ui.setting.displayBlockedDesc": "拦截显示（警告页）",
                        "ui.setting.selectType": "选择一个题型以预览在当前主题下的渲染效果",
                        "ui.setting.newFeature.desc": "点击「获取更新日志」检测新版本",
                        "ui.setting.preview.single": "单选题示例",
                        "ui.setting.preview.multiple": "多选题示例",
                        "ui.setting.preview.text": "单行文本示例",
                        "ui.setting.preview.textarea": "多行文本示例",
                        "ui.setting.preview.rating": "评分示例",
                        "ui.setting.preview.likert": "李克特量表示例",
                        "ui.setting.preview.nps": "NPS示例",
                        "ui.setting.preview.timePrefix": "时间选择",
                        "ui.setting.preview.optionA": "选项A",
                        "ui.setting.preview.optionB": "选项B",
                        "ui.setting.preview.optionC": "选项C",
                        "ui.setting.preview.red": "红色",
                        "ui.setting.preview.blue": "蓝色",
                        "ui.setting.preview.green": "绿色",
                        "ui.setting.preview.inputText": "请输入内容...",
                        "ui.setting.preview.ratingExample": "3星 - 一般",
                        "ui.setting.preview.npsExample": "评分：7（被动者）",
                        "ui.setting.preview.timeExample": "已选择：10:30",
                        "ui.setting.preview.likert1": "非常不同意",
                        "ui.setting.preview.likert2": "不同意",
                        "ui.setting.preview.likert3": "一般",
                        "ui.setting.preview.likert4": "同意",
                        "ui.setting.preview.likert5": "非常同意",
                        "ui.setting.preview.hour": "时",
                        "ui.setting.preview.minute": "分",
                        "ui.setting.preview.second": "秒",
                        "ui.setting.type.single": "单选题",
                        "ui.setting.type.multiple": "多选题",
                        "ui.setting.type.text": "单行文本",
                        "ui.setting.type.textarea": "多行文本",
                        "ui.setting.type.rating": "评分题",
                        "ui.setting.type.likert": "李克特量表",
                        "ui.setting.type.nps": "NPS 净推荐值",
                        "ui.setting.type.time": "时间选择",
                        "ui.setting.lparen": "（",
                        "ui.setting.rparen": "）",
        "ui.setting.lang.author": "语言包作者：",
                        "ui.market.langpack.title": "语言包市场",
                        "ui.market.langpack.refresh": "刷新",
                        "ui.market.langpack.download": "下载",
                        "ui.market.langpack.installed": "已安装",
                        "ui.market.langpack.loadFail": "加载市场列表失败",
                        "ui.market.langpack.downloadFail": "下载失败",
                        "ui.market.langpack.downloadSuccess": "下载成功",
                        "ui.market.langpack.publishTitle": "发布你的语言包",
                        "ui.market.langpack.publishDesc": "在 GitHub 提交 Issue 来发布你的语言包",
                        "ui.market.langpack.publishBtn": "在 GitHub 发布",
                        "ui.market.langpack.noItems": "暂无可用语言包",
                        "ui.market.langpack.fetching": "获取中...",
                        "ui.market.langpack.installing": "安装中...",
                        "ui.market.langpack.checkFail": "检查失败：",
                        "ui.market.langpack.version": "版本",
                        "ui.market.langpack.authorLabel": "作者",
                        "ui.market.langpack.reinstall": "重新安装",
                        "ui.market.langpack.manageTitle": "语言包管理",
                        "ui.market.langpack.manageRefresh": "请刷新",
                        "ui.market.langpack.manageEmpty": "当前无语言包",
                        "ui.market.langpack.manageDelete": "删除",
                    }},
                    { id: "en_us", lang: {
                        "ui.form.submit": "Submit",
                        "ui.form.cancel": "Cancel",
                        "ui.form.fill": "Auto Fill",
                        "ui.form.submitted": "Submitted",
                        "ui.form.expired": "Expired",
                        "ui.form.infoTitle": "Questionnaire Info",
                        "ui.form.version": "Version",
                        "ui.form.type": "Type",
                        "ui.form.questions": "Questions",
                        "ui.form.fingerprint": "Fingerprint",
                        "ui.form.required": "Required",
                        "ui.form.other": "Other…",
                        "ui.form.missing": "Required questions remaining",
                        "ui.form.submitting": "Submitting...",
                        "ui.form.parseError": "Parse failed",
                        "ui.form.invalidFormat": "Invalid format",
                        "ui.form.historyFill": "Auto Fill",
                        "ui.form.noAnswer": "(Not answered)",
                        "ui.form.emptySubmit": "(User did not fill anything)",
                        "ui.form.remind": "Remind",
                        "ui.form.expiredHint": "This questionnaire has expired",
                        "ui.form.collapsedHint": "Tap to expand",
                        "ui.form.sectionResult": "Result",
                        "ui.form.rollSpec": "Roll Spec",
                        "ui.form.asking": "📋 Asking %d questions",
                        "ui.form.cancelled": "User cancelled the questionnaire",
                        "ui.form.cancelledTitle": "Questionnaire terminated",
                        "ui.form.reported": "Reported form issues",
                        "ui.form.computing": "⏳ Computing...",
                        "ui.form.submitBtn": "✓ Submit",
                        "ui.form.submitBtnFull": "✓ Submit questionnaire",
                        "ui.form.cancelAsk": "Cancel",
                        "ui.form.textPlaceholder": "Input...",
                        "ui.form.textareaPlaceholder": "Multi-line input...",
                        "ui.form.otherPlaceholder": "Enter custom content...",
                        "ui.form.otherPrefix": "Other: ",
                        "ui.form.star": " stars",
                        "ui.form.starHint": "Tap to rate",
                        "ui.form.starLabel": " stars - ",
                        "ui.form.ratingVeryBad": "Very bad",
                        "ui.form.ratingBad": "Poor",
                        "ui.form.ratingNormal": "Average",
                        "ui.form.ratingGood": "Good",
                        "ui.form.ratingVeryGood": "Excellent",
                        "ui.form.likertStronglyDisagree": "Strongly disagree",
                        "ui.form.likertDisagree": "Disagree",
                        "ui.form.likertNeutral": "Neutral",
                        "ui.form.likertAgree": "Agree",
                        "ui.form.likertStronglyAgree": "Strongly agree",
                        "ui.form.likertSelected": "Selected: ",
                        "ui.form.npsPromoter": "Promoter",
                        "ui.form.npsPassive": "Passive",
                        "ui.form.npsDetractor": "Detractor",
                        "ui.form.npsScore": "Score: ",
                        "ui.form.npsMin": "0 (Not likely)",
                        "ui.form.npsMax": "10 (Very likely)",
                        "ui.form.npsClear": "Clear selection",
                        "ui.form.timeError": "Invalid format, need hh:mm:ss",
                        "ui.form.timeInputted": "Inputted: ",
                        "ui.form.timeExample": "Example: 14:30:00",
                        "ui.form.timeHour": "h",
                        "ui.form.timeMin": "m",
                        "ui.form.timeSec": "s",
                        "ui.form.timeSelected": "Selected: ",
                        "ui.form.infoTitleLabel": "Title: ",
                        "ui.form.infoIdLabel": "ID: ",
                        "ui.form.infoTypeLabel": "Type: ",
                        "ui.form.infoNone": "None",
                        "ui.form.questionCount": " questions",
                        "ui.form.scriptMode": " · Script mode",
                        "ui.form.resultMode": " · Result expr",
                        "ui.form.resultOnlyMode": " · Result only",
                        "ui.form.aboutTitle": "About Questionnaire",
                        "ui.form.aboutDesc": "A plugin that allows AI to send questionnaires to users",
                        "ui.form.authorTitle": "Author",
                        "ui.form.authorOriginal": "Original: ",
                        "ui.form.authorModder": "Modded by: ",
                        "ui.form.versionLabel": "version: ",
                        "ui.form.resultSection": "── Result ──",
                        "ui.form.rollSpecLabel": "Roll spec: ",
                        "ui.form.errorTitle": "Form error",
                        "ui.form.errorJson": "JSON format error",
                        "ui.form.errorEmpty": "Empty questionnaire data",
                        "ui.form.errorMissingId": "Missing question ID",
                        "ui.form.errorResult": "Result expression error",
                        "ui.form.errorType": "Question config error",
                        "ui.form.errorField": "Field config error",
                        "ui.form.errorRuntimeScript": "Result script runtime error: ",
                        "ui.form.errorRuntimeResult": "Result expression runtime error: ",
                        "ui.form.missingIdDesc": "The following questions lack id field: ",
                        "ui.form.unknown": "Unknown",
                        "ui.form.totalQuestions": "%d questions total",
                        "ui.form.answeredCount": "Answered %d / %d",
                        "ui.form.remindMsg": "⚠️ ",
                        "ui.setting.title": "Theme Settings",
                        "ui.setting.theme": "Theme Settings",
                        "ui.setting.layout": "Button Layout",
                        "ui.setting.questionLayout": "Question Layout",
                        "ui.setting.timeMode": "Time Input Mode",
                        "ui.setting.displayMode": "Display Mode",
                        "ui.setting.strictMode": "Syntax Check Mode",
                        "ui.setting.history": "Questionnaire History",
                        "ui.setting.history.desc": "When enabled, filled questionnaires can be auto-filled. Disable to stop recording.",
                        "ui.setting.lang": "Language Pack",
                        "ui.setting.lang.current": "Current Language",
                        "ui.setting.lang.scan": "Scan Language Packs",
                        "ui.setting.lang.scanning": "Scanning...",
                        "ui.setting.lang.switch": "Switch",
                        "ui.setting.lang.none": "Built-in Language Pack",
                        "ui.setting.about": "About",
                        "ui.setting.about.round": "Rounded mode: uses OutlinedButton for choices, suitable for clear distinction.",
                        "ui.setting.about.square": "Square mode: uses FilterChip for choices, compact design, suitable for limited space.",
                        "ui.setting.versionCheck": "Version Check",
                        "ui.setting.changelog": "Changelog",
                        "ui.setting.newFeature": "New Features",
                        "ui.setting.save": "Save Settings",
                        "ui.setting.saved": "✓ Saved",
                        "ui.setting.checking": "Checking...",
                        "ui.setting.fetching": "Fetching...",
                        "ui.setting.currentVer": "Current Version",
                        "ui.setting.selectSource": "Select Version Source",
                        "ui.setting.checkUpdate": "Check Update",
                        "ui.setting.fetchChangelog": "Fetch Changelog",
                        "ui.setting.pluginInfo": "Questionnaire Plugin ",
                        "ui.setting.supportedTypes": "Types: Single, Multiple, Text, Textarea, Rating, Likert, NPS, Time",
                        "ui.setting.supportedFeatures": "Features: Section title, Required mark, Result expr, Theme switch, Button layout",
                        "ui.setting.author": "Author: ",
                        "ui.setting.modder": "Modded by: ",
                        "ui.setting.based": "Based on Operit ToolPkg. TypeScript.",
                        "ui.setting.cleanHistory": "Clear History",
                        "ui.setting.cleanHistory.done": "History folder cleared",
                        "ui.setting.cleanHistory.none": "No history records",
                        "ui.setting.cleanHistory.fail": "Clear failed",
                        "ui.setting.saveFail": "Save failed: ",
                        "ui.setting.round": "Rounded",
                        "ui.setting.square": "Square",
                        "ui.setting.layout.row": "One per row",
                        "ui.setting.layout.scroll": "LazyRow scroll",
                        "ui.setting.layout.continuous": "Continuous, all questions displayed continuously",
                        "ui.setting.layout.compact": "Compact, 5 questions per page with pagination",
                        "ui.setting.timePicker": "Button Picker",
                        "ui.setting.timeInput": "Manual Input",
                        "ui.setting.displayNormal": "Normal",
                        "ui.setting.displayHidden": "Show source",
                        "ui.setting.displayBlocked": "Blocked (warning page)",
                        "ui.setting.strictEnabled": "Strict",
                        "ui.setting.strictDisabled": "Relaxed",
                        "ui.setting.mode": "Mode",
                        "ui.setting.enabled": "Enabled",
                        "ui.setting.disabled": "Disabled",
                        "ui.setting.preview": "Preview",
                        "ui.setting.previewLabel": "Preview: ",
                        "ui.setting.aboutPlugin": "About Plugin",
                        "ui.setting.authorServer": "Author Server",
                        "ui.setting.gitHubRaw": "GitHub Raw",
                        "ui.setting.jsDelivr": "jsDelivr CDN",
                        "ui.setting.unknownVer": "Unknown version",
                        "ui.setting.latestVer": "Already the latest version",
                        "ui.setting.current": "Current: ",
                        "ui.setting.strictDesc": "Check all syntax",
                        "ui.setting.strictDescRelaxed": "Allow non-fatal errors",
                        "ui.setting.lang.loadFail": "Language pack load failed: ",
                        "ui.setting.scanFail": "Scan failed: ",
                        "ui.setting.switchFail": "Switch failed: ",
                        "ui.setting.foundPacks": "Found %d pack(s), please close and reopen settings",
                        "ui.setting.switched": "Language pack switched, please close and reopen settings",
                        "ui.setting.currentPack": "Current pack: ",
                        "ui.setting.builtinLang": "Built-in Language Pack",
                        "ui.setting.lang.author": "Language Pack Author: ",
                        "ui.market.langpack.title": "Language Pack Market",
                        "ui.market.langpack.refresh": "Refresh",
                        "ui.market.langpack.download": "Download",
                        "ui.market.langpack.installed": "Installed",
                        "ui.market.langpack.loadFail": "Failed to load market list",
                        "ui.market.langpack.downloadFail": "Download failed",
                        "ui.market.langpack.downloadSuccess": "Downloaded successfully",
                        "ui.market.langpack.publishTitle": "Publish Your Language Pack",
                        "ui.market.langpack.publishDesc": "Submit an Issue on GitHub to publish your language pack",
                        "ui.market.langpack.publishBtn": "Publish on GitHub",
                        "ui.market.langpack.noItems": "No language packs available",
                        "ui.market.langpack.fetching": "Fetching...",
                        "ui.market.langpack.installing": "Installing...",
                        "ui.market.langpack.checkFail": "Check failed: ",
                        "ui.market.langpack.version": "Version",
                        "ui.market.langpack.authorLabel": "Author",
                        "ui.market.langpack.reinstall": "Reinstall",
                        "ui.market.langpack.manageTitle": "Language Pack Management",
                        "ui.market.langpack.manageRefresh": "Please refresh",
                        "ui.market.langpack.manageEmpty": "No language packs available",
                        "ui.market.langpack.manageDelete": "Delete",
                        "ui.setting.latestVerText": "Already the latest version v",
                        "ui.setting.newVerText": "New version v",
                        "ui.setting.currentVerText": "Current Version: ",
                        "ui.setting.sourceText": ", source: ",
                        "ui.setting.checkFail": "Check failed: ",
                        "ui.setting.unavailable": "Unavailable",
                        "ui.setting.fetchFail": "Fetch failed: ",
                        "ui.setting.latestVerDesc": "Already the latest version, no new features.",
                        "ui.setting.roundDesc": "Rounded",
                        "ui.setting.squareDesc": "Square",
                        "ui.setting.layout.rowDesc": "One per row (prominent)",
                        "ui.setting.layout.scrollDesc": "LazyRow scroll (classic)",
                        "ui.setting.layout.continuousDesc": "Continuous display (classic)",
                        "ui.setting.layout.compactDesc": "Compact pagination (new, paged)",
                        "ui.setting.timePickerDesc": "Button picker (hour/min/sec buttons)",
                        "ui.setting.timeInputDesc": "Manual input (hh:mm:ss format)",
                        "ui.setting.displayHiddenDesc": "Show source (no questionnaire render)",
                        "ui.setting.displayBlockedDesc": "Blocked (warning page)",
                        "ui.setting.selectType": "Select a type to preview its rendering under the current theme",
                        "ui.setting.newFeature.desc": "Click \"Fetch Changelog\" to detect new versions",
                        "ui.setting.preview.single": "Single Choice Example",
                        "ui.setting.preview.multiple": "Multiple Choice Example",
                        "ui.setting.preview.text": "Single-line Text Example",
                        "ui.setting.preview.textarea": "Multi-line Text Example",
                        "ui.setting.preview.rating": "Rating Example",
                        "ui.setting.preview.likert": "Likert Scale Example",
                        "ui.setting.preview.nps": "NPS Example",
                        "ui.setting.preview.timePrefix": "Time Selection",
                        "ui.setting.preview.optionA": "Option A",
                        "ui.setting.preview.optionB": "Option B",
                        "ui.setting.preview.optionC": "Option C",
                        "ui.setting.preview.red": "Red",
                        "ui.setting.preview.blue": "Blue",
                        "ui.setting.preview.green": "Green",
                        "ui.setting.preview.inputText": "Type something...",
                        "ui.setting.preview.ratingExample": "3 stars - Average",
                        "ui.setting.preview.npsExample": "Score: 7 (Passive)",
                        "ui.setting.preview.timeExample": "Selected: 10:30",
                        "ui.setting.preview.likert1": "Strongly Disagree",
                        "ui.setting.preview.likert2": "Disagree",
                        "ui.setting.preview.likert3": "Neutral",
                        "ui.setting.preview.likert4": "Agree",
                        "ui.setting.preview.likert5": "Strongly Agree",
                        "ui.setting.preview.hour": "h",
                        "ui.setting.preview.minute": "m",
                        "ui.setting.preview.second": "s",
                        "ui.setting.type.single": "Single Choice",
                        "ui.setting.type.multiple": "Multiple Choice",
                        "ui.setting.type.text": "Single-line Text",
                        "ui.setting.type.textarea": "Multi-line Text",
                        "ui.setting.type.rating": "Rating",
                        "ui.setting.type.likert": "Likert Scale",
                        "ui.setting.type.nps": "NPS",
                        "ui.setting.type.time": "Time Selection",
                        "ui.setting.lparen": "(",
                        "ui.setting.rparen": ")",
                    }}
                ];
                for (var dpi = 0; dpi < defaultPacks.length; dpi++) {
                    var dp = defaultPacks[dpi];
                    var dpPath = langDir + "/" + dp.id + ".json";
                    try {
                        await ctx.callTool("read_file", { path: dpPath });
                    } catch(e) {
                        var dpContent = JSON.stringify({ id: dp.id, author: "Questionnaire", lang: dp.lang }, null, 2);
                        await ctx.callTool("write_file", { path: dpPath, content: dpContent });
                    }
                    packs.push({ id: dp.id, path: dpPath, displayName: dp.id === "zh_cn" ? "简体中文" : "English (US)", author: "Questionnaire" });
                }
            }
            langPacksState[1](packs);
            ctx.showToast("找到 " + packs.length + " 个语言包，请关闭设置页后重新打开");
        } catch(e) {
            ctx.showToast(_t("ui.setting.scanFail") + String(e));
        }
        langScanningState[1](false);
    }

    async function selectLangPack(fp) {
        try {
            Tools.SoftwareSettings.writeEnvironmentVariable("QUESTIONNAIRE_LANG_PATH", fp || "");
            currentLangPathState[1](fp || "");
            // 立即重新加载语言包
            if (fp) {
                try {
                    var _slr2 = await ctx.callTool("read_file", { path: fp });
                    var _slc2 = _slr2 && _slr2.content ? _slr2.content.replace(/^\s*\d+\|/gm, "") : "";
                    var _slp2 = JSON.parse(_slc2);
                    if (_slp2 && _slp2.lang) {
                        _settingsLang = _slp2.lang;
                        settingsLangState[1](_slp2.lang);
                        ctx.showToast(_t("ui.setting.switched"));
                        return;
                    }
                } catch(e2) {}
            }
            langPacksState[1](null);
            _settingsLang = null;
            settingsLangState[1](null);
            scanLangPacks();
        } catch(e) {
            ctx.showToast(_t("ui.setting.switchFail") + String(e));
        }
    }

    function renderLangPacksSection() {
        return ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
            ctx.UI.Column({ padding: 16, spacing: 8 }, [
                ctx.UI.Text({ text: _t("ui.setting.lang",), style: "titleSmall", color: onSurface }),
                ctx.UI.Text({ text: currentLangPathState[0] ? _t("ui.setting.currentPack") + currentLangPathState[0].split("/").pop().replace(".json", "") : _t("ui.setting.lang.current") + "：" + _t("ui.setting.builtinLang"), style: "bodySmall", color: onSurfaceVariant }),
                ctx.UI.Button({
                    onClick: scanLangPacks,
                    fillMaxWidth: true,
                    containerColor: langScanningState[0] ? onSurfaceVariant : primary,
                    content: langScanningState[0] ? ctx.UI.CircularProgressIndicator({ strokeWidth: 2, color: ctx.MaterialTheme.colorScheme.onPrimary }) : ctx.UI.Text({
                        text: _t("ui.setting.lang.scan",),
                        style: "labelMedium",
                        color: ctx.MaterialTheme.colorScheme.onPrimary
                    }),
                }),
                langPacksState[0] && Array.isArray(langPacksState[0]) ? ctx.UI.Column({ spacing: 4 }, langPacksState[0].map(function(p) {
                    var isActive = currentLangPathState[0] === p.path;
                    return ctx.UI.OutlinedButton({
                        containerColor: isActive ? primary : null,
                        contentColor: isActive ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                        onClick: function() { selectLangPack(isActive ? "" : p.path); },
                        fillMaxWidth: true,
                        content: ctx.UI.Text({ text: (isActive ? "✓ " : "") + p.displayName + (p.author ? " — " + p.author : "") + " (" + p.id + ")", style: "labelMedium", color: isActive ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                    });
                })) : null,
            ]),
        ]);
    }

    // ===== 关于区 =====
    var aboutCard = ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
        ctx.UI.Column({ padding: 16, spacing: 8 }, [
            ctx.UI.Text({ text: _t("ui.setting.about"), style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: _t("ui.setting.about.round"), style: "bodySmall", color: onSurfaceVariant }),
            ctx.UI.Text({ text: _t("ui.setting.about.square"), style: "bodySmall", color: onSurfaceVariant }),
            ctx.UI.Spacer({ height: 8 }),
            ctx.UI.Text({ text: _t("ui.setting.aboutPlugin"), style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: _t("ui.setting.pluginInfo") + "v1.7.5", style: "bodySmall", color: onSurfaceVariant }),
            ctx.UI.Text({ text: _t("ui.setting.supportedTypes"), style: "bodySmall", color: onSurfaceVariant }),
            ctx.UI.Text({ text: _t("ui.setting.supportedFeatures"), style: "bodySmall", color: onSurfaceVariant }),
            ctx.UI.Spacer({ height: 8 }),
            ctx.UI.Text({ text: _t("ui.setting.author") + "liu-baia", style: "bodySmall", color: onSurfaceVariant }),
            ctx.UI.Text({ text: _t("ui.setting.modder") + "yyswys-yjyj", style: "bodySmall", color: onSurfaceVariant }),
            ctx.UI.Text({ text: _t("ui.setting.lang.author") + (function(){ try { var cp = currentLangPathState[0]; if (cp && langPacksState[0]) { for(var pi=0;pi<langPacksState[0].length;pi++){ if(langPacksState[0][pi].path===cp) return langPacksState[0][pi].author || ""; } } } catch(e){} return ""; })(), style: "bodySmall", color: onSurfaceVariant }),
            ctx.UI.Text({ text: _t("ui.setting.based"), style: "bodySmall", color: onSurfaceVariant }),
        ]),
    ]);

    // ===== 版本检查区 =====
    var _versionUrls = [
        "https://open.serveryyswys.top/s/questionnaire",
        "https://raw.githubusercontent.com/yyswys-yjyj/questionnaire/refs/heads/main/api/version",
        "https://cdn.jsdelivr.net/gh/yyswys-yjyj/questionnaire@main/api/version"
    ];
    var _versionSourceLabels = [_t("ui.setting.authorServer"), _t("ui.setting.gitHubRaw"), _t("ui.setting.jsDelivr")];
    async function checkVersion() {
        if (versionCheckState[0] === "checking") return;
        versionCheckState[1]("checking");
        versionInfoState[1](_t("ui.setting.checking"));
        var currentVer = "175";
        var fmtCur = currentVer.charAt(0) + "." + currentVer.substring(1, 2) + "." + currentVer.substring(2);
        var si = versionSourceState[0];
        if (si < 0 || si >= _versionUrls.length) { si = 2; }
        try {
            var res = await ctx.callTool("http_request", { url: _versionUrls[si], method: "GET" });
            var content = res && res.content ? String(res.content).trim() : "";
            if (content === currentVer) {
                versionCheckState[1]("done");
                versionInfoState[1](_t("ui.setting.latestVerText") + fmtCur + _t("ui.setting.lparen") + _versionSourceLabels[si] + _t("ui.setting.rparen"));
                return;
            } else if (content) {
                versionCheckState[1]("done");
                versionInfoState[1](_t("ui.setting.newVerText") + content.charAt(0) + "." + content.substring(1, 2) + "." + content.substring(2) + _t("ui.setting.lparen") + _t("ui.setting.currentVerText") + fmtCur + _t("ui.setting.sourceText") + _versionSourceLabels[si] + _t("ui.setting.rparen"));
                return;
            }
        } catch(e) {}
        versionCheckState[1]("done");
        versionInfoState[1]("检查失败：" + _versionSourceLabels[si] + "不可用");
    }

    var versionCheckCard = ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
        ctx.UI.Column({ padding: 16, spacing: 8 }, [
            ctx.UI.Text({ text: _t("ui.setting.versionCheck"), style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: _t("ui.setting.currentVerText") + "1.7.5", style: "bodyMedium", color: onSurfaceVariant }),
            ctx.UI.Text({ text: _t("ui.setting.selectSource"), style: "labelSmall", color: onSurfaceVariant }),
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
                    text: _t("ui.setting.checkUpdate"),
                    style: "labelMedium",
                    color: ctx.MaterialTheme.colorScheme.onPrimary
                }),
            }),
            versionInfo ? ctx.UI.Text({ text: versionInfo, style: "bodySmall", color: onSurfaceVariant }) : null,
        ]),
    ]);

    var _changelogUrls = [
        "https://status.serveryyswys.top/questionnaire/api/changelog-json",
        "https://raw.githubusercontent.com/yyswys-yjyj/questionnaire/refs/heads/main/api/changelog.json",
        "https://cdn.jsdelivr.net/gh/yyswys-yjyj/questionnaire@main/api/changelog.json"
    ];
    var _changelogLabels = [_t("ui.setting.authorServer"), _t("ui.setting.gitHubRaw"), _t("ui.setting.jsDelivr")];
    async function fetchChangelog() {
        if (changelogState[0] === "loading") return;
        changelogState[1]("loading");
        changelogContentState[1](_t("ui.setting.fetching"));
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
                    var currentVerNum = 175;
                    for (var ei = 0; ei < parsed.list.length; ei++) {
                        var entry = parsed.list[ei];
                        if (ei > 0) lines.push("---");
                        lines.push("# " + (entry.version || _t("ui.setting.unknownVer")) + " (" + (entry.currentVer || "?") + ")");
                        if (entry.details) lines.push(entry.details);
                        if (entry.currentVer && entry.currentVer > currentVerNum) {
                            if (newLines.length > 0) newLines.push("---");
                            newLines.push("# " + (entry.version || _t("ui.setting.unknownVer")) + " (" + entry.currentVer + ")");
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
                        newFeatureContentState[1](_t("ui.setting.latestVerDesc"));
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
            ctx.UI.Text({ text: _t("ui.setting.changelog"), style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: _t("ui.setting.selectSource"), style: "labelSmall", color: onSurfaceVariant }),
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
                    text: changelogState[0] === "loading" ? _t("ui.setting.fetching") : _t("ui.setting.fetchChangelog"),
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
            ctx.UI.Text({ text: _t("ui.setting.newFeature"), style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: _t("ui.setting.newFeature.desc"), style: "bodySmall", color: onSurfaceVariant }),
            newFeatureContentState[0] && newFeatureState[0] === "done" ? (
                newFeatureContentState[0].indexOf(_t("ui.setting.latestVer")) >= 0
                    ? ctx.UI.Text({ text: newFeatureContentState[0], style: "bodySmall", color: onSurfaceVariant })
                    : renderChangelogText(newFeatureContentState[0])
            ) : (newFeatureState[0] === "loading" ? ctx.UI.CircularProgressIndicator({ strokeWidth: 2, color: primary }) : null),
        ]),
    ]);

    // ===== 整体布局 =====
    return ctx.UI.LazyColumn({ fillMaxSize: true, spacing: 12, padding: { horizontal: 16, top: 16, bottom: 24 } }, [
        ctx.UI.Text({ text: _t("ui.setting.title"), style: "titleLarge", color: primary }),
        settingsSection,
        typePicker,
        previewCard,
        renderLangPacksSection(),
        aboutCard,
        versionCheckCard,
        newFeatureCard,
        changelogCard,
    ]);
}
