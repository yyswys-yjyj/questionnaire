// @ts-nocheck
function readEnv(key, valid, def) {
    if (typeof getEnv !== "function") return def;
    try { var v = getEnv(key); if (valid.indexOf(v) >= 0) return v; } catch (e) {}
    return def;
}
var _settingsLang = null;
var _snackTimer = null; // Snackbar 自动消失定时器（模块级，跨渲染稳定）
var _forceTick = 0; // forceRerender 计数器（模块级：函数体内 var 每次渲染重置，异步回调 set 相同值不重绘）
var _currentPackDisplayName = null; // 当前语言包解析后的显示名（模块级缓存，供仪表盘/语言包页共用）
// ==== 方案管理：设置项注册表（工程化核心）====
// 后续新增可保存的设置项，只需在此加一行 { field, env }，保存/导入/序列化全流程自动适配。
// field：方案 JSON 里的字段名；env：对应环境变量键。
// 语言包（QUESTIONNAIRE_LANG_PATH）不属于"布局/行为"方案，刻意不列入（方案只存外观+行为）。
var _SETTING_DEFS = [
    { field: "theme",         env: "QUESTIONNAIRE_THEME" },
    { field: "buttonLayout",  env: "QUESTIONNAIRE_BUTTON_LAYOUT" },
    { field: "layout",        env: "QUESTIONNAIRE_LAYOUT" },
    { field: "timeMode",      env: "QUESTIONNAIRE_TIME_INPUT_MODE" },
    { field: "displayMode",   env: "QUESTIONNAIRE_DISPLAY_MODE" },
    { field: "strictMode",    env: "QUESTIONNAIRE_STRICT_MODE" },
    { field: "historyEnabled",env: "QUESTIONNAIRE_HISTORY_ENABLED" },
    { field: "questionFilter",env: "QUESTIONNAIRE_QUESTION_FILTER" },
    { field: "compileBlacklist",env: "QUESTIONNAIRE_COMPILE_BLOCKLIST" },
];
// 方案保存目录
var _SCHEME_DIR = "/sdcard/Download/Operit/questionnaire/theme";
var _SCHEME_VERSION = 1;
// 序列化方案为 compact 一键字符串：field=value;field=value;...
function _serializeSchemeItems(items) {
    var parts = [];
    for (var i = 0; i < _SETTING_DEFS.length; i++) {
        var env = _SETTING_DEFS[i].env;
        if (items[env] != null) parts.push(_SETTING_DEFS[i].field + "=" + encodeURIComponent(String(items[env])));
    }
    return parts.join(";");
}
// 解析一键字符串回 items（形如 theme=classic;layout=row;...），返回 {env: value}
function _parseSchemeString(str) {
    var items = {};
    if (!str) return items;
    var parts = String(str).split(";");
    for (var i = 0; i < parts.length; i++) {
        var seg = parts[i].trim();
        if (!seg) continue;
        var eq = seg.indexOf("=");
        if (eq < 0) continue;
        var field = seg.substring(0, eq).trim();
        var val = decodeURIComponent(seg.substring(eq + 1).trim());
        for (var j = 0; j < _SETTING_DEFS.length; j++) {
            if (_SETTING_DEFS[j].field === field) {
                items[_SETTING_DEFS[j].env] = val;
                break;
            }
        }
    }
    return items;
}
// 校验/规整一个方案 items（丢弃未知字段，保留注册表内字段）
function _sanitizeSchemeItems(items) {
    var out = {};
    if (!items) return out;
    for (var i = 0; i < _SETTING_DEFS.length; i++) {
        var env = _SETTING_DEFS[i].env;
        if (items[env] != null) out[env] = String(items[env]);
    }
    return out;
}
// 内置友好名映射（BCP47 地区码 → 语言友好名）。地区语言包不写 displayname，靠这层自动识别名称（文档 v1.7.4 约定）
var _langFriendlyNames = {
    "zh_cn": "简体中文", "zh_tw": "繁体中文",
    "en_us": "English (US)", "en_gb": "English (UK)",
    "ja_jp": "日本語", "ko_kr": "한국어", "fr_fr": "Français", "de_de": "Deutsch",
    "es_es": "Español", "ru_ru": "Русский", "ar_sa": "العربية",
    "pt_br": "Português (BR)", "pt_pt": "Português (PT)",
    "vi_vn": "Tiếng Việt", "th_th": "ไทย", "it_it": "Italiano", "nl_nl": "Nederlands",
    "pl_pl": "Polski", "tr_tr": "Türkçe", "sv_se": "Svenska", "da_dk": "Dansk",
    "fi_fi": "Suomi", "nb_no": "Norsk Bokmål", "cs_cz": "Čeština", "hu_hu": "Magyar",
    "ro_ro": "Română", "uk_ua": "Українська", "el_gr": "Ελληνικά", "he_il": "עברית",
    "hi_in": "हिन्दी", "id_id": "Bahasa Indonesia", "ms_my": "Bahasa Melayu", "fil_ph": "Filipino"
};
// 语言显示名解析链路（与 scanLangPacks 一致，文档 v1.7.4/1.7.5 约定）：
// 1) displayname（自定义语言包才有；string 直接用 / object 按 curLangId 取当前界面语言，default→zh_cn→en_us 兜底）
// 2) 内置友好名 _langFriendlyNames（地区语言包 BCP47 id 自动识别）
// 3) 地区码格式兜底（zh_cn → zh-CN，en_us → en-US）
// 4) id 兜底
// curLangId：当前界面语言 id（如 en_us），用于从 displayname 对象中选取对应语言的显示名
function _resolveLangDisplayName(displayname, id, curLangId) {
    var name = null;
    if (displayname != null) {
        if (typeof displayname === "string") {
            name = displayname;
        } else if (typeof displayname === "object") {
            var curId = curLangId ? String(curLangId).toLowerCase() : "";
            name = (curId && displayname[curId]) || displayname["default"] || displayname["zh_cn"] || displayname["en_us"];
        }
    }
    // 2) 内置友好名（地区语言包 BCP47）
    if (!name && id && _langFriendlyNames[id]) name = _langFriendlyNames[id];
    // 3) 地区码格式兜底
    if (!name && id) {
        var parts = String(id).split("_");
        name = parts.map(function (p, pi) { return pi === 0 ? p.toLowerCase() : p.toUpperCase(); }).join("-");
    }
    return name || id;
}
/* _settingsLang 将在 Screen 函数内用 ctx.callTool 初始化 */
function _t(key) {
    if (_settingsLang && _settingsLang[key]) return _settingsLang[key];
    var builtin = {
        "ui.setting.title": "问卷主题设置",
        "ui.setting.back": "返回",
        "ui.setting.home.title": "设置首页",
        "ui.setting.home.filled": "已填写问卷",
        "ui.setting.home.filledCount": "%d 份",
        "ui.setting.home.currentLang": "当前语言包",
        "ui.setting.home.entries": "功能",
        "ui.setting.page.appearance": "外观",
        "ui.setting.page.appearance.desc": "主题、按钮布局、问卷布局与题型预览",
        "ui.setting.page.behavior": "行为",
        "ui.setting.page.behavior.desc": "时间输入、显示模式、严格度与历史记录",
        "ui.setting.page.lang": "语言包",
        "ui.setting.page.lang.desc": "扫描、切换语言包",
        "ui.setting.page.drafts": "草稿",
        "ui.setting.page.drafts.desc": "管理问卷草稿",
        "ui.setting.page.update": "更新",
        "ui.setting.page.update.desc": "版本检查、新版特性与更新历程",
        "ui.setting.page.about": "关于",
        "ui.setting.page.about.desc": "插件信息与作者",
"ui.setting.scheme.title": "方案管理",
        "ui.setting.scheme.desc": "保存/导入问卷外观与行为方案",
        "ui.setting.scheme.saveTitle": "保存当前设置为方案",
        "ui.setting.scheme.nameReq": "请输入方案名称",
        "ui.setting.scheme.namePlaceholder": "方案名称",
        "ui.setting.scheme.saveBtn": "保存",
        "ui.setting.scheme.exportTitle": "一键导出当前配置",
        "ui.setting.scheme.exportBtn": "导出",
        "ui.setting.scheme.exportResult": "方案字符串（复制以下内容以便分享）：",
        "ui.setting.scheme.importTitle": "一键导入方案",
        "ui.setting.scheme.importPlaceholder": "粘贴方案字符串...",
        "ui.setting.scheme.importBtn": "导入",
        "ui.setting.scheme.imported": "已应用导入的方案",
        "ui.setting.scheme.importInvalid": "方案字符串无效",
        "ui.setting.scheme.listTitle": "已保存的方案",
        "ui.setting.scheme.empty": "暂无已保存方案",
        "ui.setting.scheme.emptyHint": "在上方输入名称，保存当前外观与行为设置。",
        "ui.setting.scheme.applyBtn": "应用",
        "ui.setting.scheme.deleteBtn": "删除",
        "ui.setting.scheme.deleted": "已删除方案",
        "ui.setting.scheme.deleFail": "删除失败：",
        "ui.setting.scheme.copied": "已复制到剪贴板",
        "ui.setting.scheme.copyFail": "复制失败：",
        "ui.setting.page.preview": "题型预览",
        "ui.setting.page.preview.desc": "按当前主题与布局实时预览各题型渲染",
        "ui.setting.preview.other": "其他…",
        "ui.setting.preview.otherPlaceholder": "请输入自定义内容...",
        "ui.setting.preview.star": "星",
        "ui.setting.preview.starHint": "点击评分",
        "ui.setting.preview.ratingVeryBad": "很差",
        "ui.setting.preview.ratingBad": "较差",
        "ui.setting.preview.ratingNormal": "一般",
        "ui.setting.preview.ratingGood": "满意",
        "ui.setting.preview.ratingVeryGood": "非常满意",
        "ui.setting.preview.likertSelected": "已选: ",
        "ui.setting.preview.npsPromoter": "推荐者",
        "ui.setting.preview.npsPassive": "被动者",
        "ui.setting.preview.npsDetractor": "贬损者",
        "ui.setting.preview.npsScore": "评分: ",
        "ui.setting.preview.npsMin": "0（不可能）",
        "ui.setting.preview.npsMax": "10（非常可能）",
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
        "ui.setting.saved": "已保存",
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
                "ui.setting.langParseFail": "解析语言包失败: ",
        "ui.setting.scanFail": "扫描失败：",
        "ui.setting.switchFail": "切换失败：",
        "ui.setting.foundPacks": "找到 %d 个语言包",
        "ui.setting.switched": "已切换语言包，界面已立即生效",
        "ui.setting.currentPack": "当前语言包：",
        "ui.setting.builtinLang": "内置语言包",
        "ui.setting.latestVerText": "已是最新版 v",
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

        "ui.setting.drafts": "问卷草稿管理",
        "ui.setting.draftsDesc": "查看 / 编辑 / 删除问卷草稿",
        "ui.setting.draftsScanning": "扫描中...",
        "ui.setting.draftsEmpty": "暂无问卷草稿",
        "ui.setting.draftsCount": "题",
        "ui.setting.draftsFail": "扫描草稿失败：",
        "ui.setting.draftDeleted": "已删除",
        "ui.setting.draftDelFail": "删除失败：",
        "ui.setting.draftEditHint": "已记录待编辑问卷 ID：",
        "ui.setting.draftDone": "已完成",
        "ui.setting.draftReady": "已就绪",
        "ui.setting.draftPending": "未发布",
        "ui.setting.draftFilled": "已填",
        "ui.setting.draftUnfilled": "未填",

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
        "ui.market.langpack.manageTitle": "语言包管理",
        "ui.market.langpack.manageRefresh": "请刷新",
        "ui.market.langpack.manageEmpty": "当前无语言包",
        "ui.market.langpack.manageDelete": "删除",
        "ui.market.langpack.expand": "展开",
        "ui.market.langpack.collapse": "收起",
        "ui.market.langpack.noAuthor": "未知作者",
        "ui.market.langpack.fillBoth": "请填写邮箱和JSON内容",
        "ui.market.langpack.submitting": "提交中...",
        "ui.market.langpack.submitFail": "提交失败: ",
        "ui.market.langpack.deleteOk": "已删除",
        "ui.market.langpack.deleteFail": "删除失败: ",
        "ui.market.langpack.dlOk": "下载成功",
        "ui.market.langpack.dlFail": "下载失败: ",
        "ui.market.langpack.search": "搜索语言包...",
        "ui.market.langpack.prev": "上一页",
        "ui.market.langpack.next": "下一页",
        "ui.market.langpack.update": "更新",
        "ui.market.langpack.upToDate": "已是最新",
        "ui.market.langpack.readFail": "读取版本失败",
        "ui.market.langpack.selectFile": "选择文件",

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
    "ui.setting.qf.title": "题型过滤器", "ui.setting.qf.desc": "控制问卷可使用的题型范围，以及是否允许必选和单选「其他」输入。", "ui.setting.qf.useGlobal": "使用全局配置", "ui.setting.qf.useGlobalOn": "使用全局配置（全部题型可用）", "ui.setting.qf.customOn": "自定义题型过滤器", "ui.setting.qf.types": "允许的题型", "ui.setting.qf.toggled": "题型过滤器", "ui.setting.qf.required": "允许必选", "ui.setting.qf.requiredSwitch": "是否允许必选", "ui.setting.qf.other": "允许单选「其他」", "ui.setting.qf.otherSwitch": "是否允许单选「其他」",
    "ui.setting.blocklist.title": "问卷屏蔽词", "ui.setting.blocklist.desc": "问卷标题、描述与所有题目内容中出现下方任一屏蔽词时会被拦截。留空则不使用屏蔽检查器。", "ui.setting.blocklist.placeholder": "输入屏蔽词...", "ui.setting.blocklist.add": "添加", "ui.setting.blocklist.empty": "请输入要屏蔽的词", "ui.setting.blocklist.added": "已添加屏蔽词", "ui.setting.blocklist.removed": "已移除屏蔽词", "ui.setting.blocklist.none": "当前不使用屏蔽检查器", "ui.setting.blocklist.count": " 个",
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
// 题型过滤器：默认"干净空集 + 启用全局配置"。env 值 = JSON 串：
// { "useGlobal":true, "types":[], "allowRequired":true, "allowOther":true }
// - useGlobal=true（默认）：使用全局默认（所有题型/必选/其他 全部放行），types 为空干净集合
// - useGlobal=false：仅 types 中列出的题型可用；allowRequired/allowOther 分别控制必选/单选"其他"
var _defaultQuestionFilter = { useGlobal: true, types: [], allowRequired: true, allowOther: true };
function _readQuestionFilter() {
    if (typeof getEnv !== "function") return JSON.parse(JSON.stringify(_defaultQuestionFilter));
    try {
        var raw = getEnv("QUESTIONNAIRE_QUESTION_FILTER") || "";
        if (raw) {
            var p = JSON.parse(raw);
            var out = JSON.parse(JSON.stringify(_defaultQuestionFilter));
            if (p && typeof p === "object") {
                if (typeof p.useGlobal === "boolean") out.useGlobal = p.useGlobal;
                if (Array.isArray(p.types)) out.types = p.types.filter(function(x){ return typeof x === "string"; });
                if (typeof p.allowRequired === "boolean") out.allowRequired = p.allowRequired;
                if (typeof p.allowOther === "boolean") out.allowOther = p.allowOther;
            }
            return out;
        }
    } catch (e) {}
    return JSON.parse(JSON.stringify(_defaultQuestionFilter));
}
var _initialQuestionFilter = _readQuestionFilter();
// ===== 问卷屏蔽词检测（命中即拦截显示）：env = JSON 字符串数组，默认空 = 不使用屏蔽检查器 =====
function _readBlocklist() {
    if (typeof getEnv !== "function") return [];
    try {
        var raw = getEnv("QUESTIONNAIRE_COMPILE_BLOCKLIST") || "";
        if (raw) {
            var p = JSON.parse(raw);
            if (Array.isArray(p)) return p.filter(function(x){ return typeof x === "string" && x.trim() !== ""; });
        }
    } catch (e) {}
    return [];
}
var _initialBlocklist = _readBlocklist();
var _themeLabel = function(t) { return t === "classic" ? _t("ui.setting.round") : _t("ui.setting.square"); };
var _layoutLabel = function(l) { return l === "row" ? _t("ui.setting.layout.row") : _t("ui.setting.layout.scroll"); };
var _questionLayoutLabel = function(l) { return l === "continuous" ? _t("ui.setting.layout.continuous") : _t("ui.setting.layout.compact"); };
var _timeModeLabel = function(m) { return m === "picker" ? _t("ui.setting.timePicker") : _t("ui.setting.timeInput"); };
var _displayModeLabel = function(d) { return d === "normal" ? _t("ui.setting.displayNormal") : (d === "hidden" ? _t("ui.setting.displayHidden") : _t("ui.setting.displayBlocked")); };

// 版本号规则：展示用十进制（1.8.0），比较用十六进制（1.8.0 → "180"，每段转 hex 拼接，大小写均可）
// hexVerToStr：hex 比较版本号 → 十进制展示串。前两段各 1 位 hex，其余为末段。
function hexVerToStr(h) {
    if (h === null || h === undefined || h === "") return "";
    h = String(h).trim().toUpperCase();
    var s1 = parseInt(h.charAt(0), 16) || 0;
    var s2 = h.length > 1 ? (parseInt(h.charAt(1), 16) || 0) : 0;
    var s3 = h.length > 2 ? (parseInt(h.substring(2), 16) || 0) : 0;
    return s1 + "." + s2 + "." + s3;
}
// hexVerNum：hex 比较版本号 → 数值（用于比较；兼容旧格式 3 位十进制数字，如 176=1.7.6）
function hexVerNum(h) {
    if (h === null || h === undefined || h === "") return 0;
    return parseInt(String(h).trim().toUpperCase(), 16) || 0;
}

export default async function Screen(ctx) {
    var _PLUGIN_VER = "180"; // 比较版本号：十六进制（1.8.0 → 180），展示统一十进制
    var primary = ctx.MaterialTheme.colorScheme.primary;
    var onSurface = ctx.MaterialTheme.colorScheme.onSurface;
    var onSurfaceVariant = ctx.MaterialTheme.colorScheme.onSurfaceVariant;
    var surfaceVariant = ctx.MaterialTheme.colorScheme.surfaceVariant;

    var currentThemeState = ctx.useState("_theme", _initialTheme);
    var savedState = ctx.useState("_saved", false);
    var previewTypeState = ctx.useState("_previewType", "single");
    var previewAnswerState = ctx.useState("_previewAnswer", null);
    var layoutState = ctx.useState("_layout", _initialLayout);
    var questionLayoutState = ctx.useState("_questionLayout", _initialQuestionLayout);
    var timeModeState = ctx.useState("_timeMode", _initialTimeMode);
    var displayModeState = ctx.useState("_displayMode", _initialDisplayMode);
    var strictModeState = ctx.useState("_strictMode", _initialStrictMode);
    var historyEnabledState = ctx.useState("_historyEnabled", _initialHistoryEnabled);
    var questionFilterState = ctx.useState("_questionFilter", JSON.parse(JSON.stringify(_initialQuestionFilter)));
    var blocklistState = ctx.useState("_blocklist", JSON.parse(JSON.stringify(_initialBlocklist)));
    var blocklistInputState = ctx.useState("_blocklistInput", "");

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
    // 横幅消息（Snackbar）：替代旧 toast。showSnack 设置内容 + 3s 自动消失
    var snackState = ctx.useState("_snack", "");
    function showSnack(msg) {
        snackState[1](msg);
        forceRerender();
        if (_snackTimer) { try { clearTimeout(_snackTimer); } catch (e) {} }
        _snackTimer = setTimeout(function () { snackState[1](""); forceRerender(); }, 3000);
    }
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
    // 公告（最顶层横幅）：远程 JSON {status, connect}，status=true 才显示，connect 为显示内容
    var noticeState = ctx.useState("_notice", "");
    var noticeHiddenState = ctx.useState("_noticeHidden", false);
    var noticeLoadedState = ctx.useState("_noticeLoaded", false);
    var notice = noticeState[0];
    // 草稿管理 state
    var ASK_DIR_SET = "/sdcard/Download/Operit/questionnaire/userask";
    var draftsState = ctx.useState("_drafts", null);
    var draftsScanningState = ctx.useState("_draftsScanning", false);
    var expandedDraftState = ctx.useState("_expandedDraft", "");
    var drafts = draftsState[0];
    var draftsScanning = draftsScanningState[0];
    // 子页路由：home=仪表盘 / appearance / behavior / lang / drafts / update / about
    var pageState = ctx.useState("_settingsPage", "home");
    // 仪表盘统计（模块级渲染稳定：history 统计缓存）
    var homeStatsState = ctx.useState("_homeStats", null);
    var homeStatsLoadedState = ctx.useState("_homeStatsLoaded", false);
    var homeStats = homeStatsState[0];

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
                    // 解析当前包显示名缓存（displayname → 地区码 → id），供仪表盘/语言包页使用
                    _currentPackDisplayName = _resolveLangDisplayName(parsed.displayname, parsed.id, parsed.id || "");
                }
            }
        }
    } catch(e) {
        /* catch 块在 var _t 赋值之前，直接用外部 _t (function _t) 引用，避免被 hoisting 遮蔽 */
        showSnack((typeof _t === "function" ? _t : function(k){ return k; })("语言包加载失败：") + String(e));
    }
    // 覆盖 _t 为使用 state 的版本
    var _t = function(key) {
        if (_settingsLang && _settingsLang[key]) return _settingsLang[key];
        var _sl = settingsLangState[0];
        if (_sl && _sl[key]) return _sl[key];
        var builtin = {
            "ui.setting.title": "问卷主题设置",
            "ui.setting.back": "返回",
            "ui.setting.home.title": "设置首页",
            "ui.setting.home.filled": "已填写问卷",
            "ui.setting.home.filledCount": "%d 份",
            "ui.setting.home.currentLang": "当前语言包",
            "ui.setting.home.entries": "功能",
            "ui.setting.page.appearance": "外观",
            "ui.setting.page.appearance.desc": "主题、按钮布局、问卷布局与题型预览",
            "ui.setting.page.behavior": "行为",
            "ui.setting.page.behavior.desc": "时间输入、显示模式、严格度与历史记录",
            "ui.setting.page.lang": "语言包",
            "ui.setting.page.lang.desc": "扫描、切换语言包",
            "ui.setting.page.drafts": "草稿",
            "ui.setting.page.drafts.desc": "管理问卷草稿",
            "ui.setting.page.update": "更新",
            "ui.setting.page.update.desc": "版本检查、新版特性与更新历程",
            "ui.setting.page.about": "关于",
            "ui.setting.page.about.desc": "插件信息与作者",
"ui.setting.scheme.title": "方案管理",
        "ui.setting.scheme.desc": "保存/导入问卷外观与行为方案",
        "ui.setting.scheme.saveTitle": "保存当前设置为方案",
        "ui.setting.scheme.nameReq": "请输入方案名称",
        "ui.setting.scheme.namePlaceholder": "方案名称",
        "ui.setting.scheme.saveBtn": "保存",
        "ui.setting.scheme.exportTitle": "一键导出当前配置",
        "ui.setting.scheme.exportBtn": "导出",
        "ui.setting.scheme.exportResult": "方案字符串（复制以下内容以便分享）：",
        "ui.setting.scheme.importTitle": "一键导入方案",
        "ui.setting.scheme.importPlaceholder": "粘贴方案字符串...",
        "ui.setting.scheme.importBtn": "导入",
        "ui.setting.scheme.imported": "已应用导入的方案",
        "ui.setting.scheme.importInvalid": "方案字符串无效",
        "ui.setting.scheme.listTitle": "已保存的方案",
        "ui.setting.scheme.empty": "暂无已保存方案",
        "ui.setting.scheme.emptyHint": "在上方输入名称，保存当前外观与行为设置。",
        "ui.setting.scheme.applyBtn": "应用",
        "ui.setting.scheme.deleteBtn": "删除",
        "ui.setting.scheme.deleted": "已删除方案",
        "ui.setting.scheme.deleFail": "删除失败：",
                        "ui.setting.scheme.copied": "已复制到剪贴板",
                        "ui.setting.scheme.copyFail": "复制失败：",
            "ui.setting.page.preview": "题型预览",
            "ui.setting.page.preview.desc": "按当前主题与布局实时预览各题型渲染",
            "ui.setting.preview.other": "其他…",
            "ui.setting.preview.otherPlaceholder": "请输入自定义内容...",
            "ui.setting.preview.star": "星",
            "ui.setting.preview.starHint": "点击评分",
            "ui.setting.preview.ratingVeryBad": "很差",
            "ui.setting.preview.ratingBad": "较差",
            "ui.setting.preview.ratingNormal": "一般",
            "ui.setting.preview.ratingGood": "满意",
            "ui.setting.preview.ratingVeryGood": "非常满意",
            "ui.setting.preview.likertSelected": "已选: ",
            "ui.setting.preview.npsPromoter": "推荐者",
            "ui.setting.preview.npsPassive": "被动者",
            "ui.setting.preview.npsDetractor": "贬损者",
            "ui.setting.preview.npsScore": "评分: ",
            "ui.setting.preview.npsMin": "0（不可能）",
            "ui.setting.preview.npsMax": "10（非常可能）",
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
            "ui.setting.saved": "已保存",
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
                        "ui.setting.langParseFail": "解析语言包失败: ",
            "ui.setting.scanFail": "扫描失败：",
            "ui.setting.switchFail": "切换失败：",
            "ui.setting.foundPacks": "找到 %d 个语言包",
            "ui.setting.switched": "已切换语言包，界面已立即生效",
            "ui.setting.currentPack": "当前语言包：",
            "ui.setting.builtinLang": "内置语言包",
            "ui.setting.latestVerText": "已是最新版 v",
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
    "ui.setting.qf.title": "题型过滤器", "ui.setting.qf.desc": "控制问卷可使用的题型范围，以及是否允许必选和单选「其他」输入。", "ui.setting.qf.useGlobal": "使用全局配置", "ui.setting.qf.useGlobalOn": "使用全局配置（全部题型可用）", "ui.setting.qf.customOn": "自定义题型过滤器", "ui.setting.qf.types": "允许的题型", "ui.setting.qf.toggled": "题型过滤器", "ui.setting.qf.required": "允许必选", "ui.setting.qf.requiredSwitch": "是否允许必选", "ui.setting.qf.other": "允许单选「其他」", "ui.setting.qf.otherSwitch": "是否允许单选「其他」",
    "ui.setting.blocklist.title": "问卷屏蔽词", "ui.setting.blocklist.desc": "问卷标题、描述与所有题目内容中出现下方任一屏蔽词时会被拦截。留空则不使用屏蔽检查器。", "ui.setting.blocklist.placeholder": "输入屏蔽词...", "ui.setting.blocklist.add": "添加", "ui.setting.blocklist.empty": "请输入要屏蔽的词", "ui.setting.blocklist.added": "已添加屏蔽词", "ui.setting.blocklist.removed": "已移除屏蔽词", "ui.setting.blocklist.none": "当前不使用屏蔽检查器", "ui.setting.blocklist.count": " 个",
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

        "ui.setting.drafts": "问卷草稿管理",
        "ui.setting.draftsDesc": "查看 / 编辑 / 删除问卷草稿",
        "ui.setting.draftsScanning": "扫描中...",
        "ui.setting.draftsEmpty": "暂无问卷草稿",
        "ui.setting.draftsCount": "题",
        "ui.setting.draftsFail": "扫描草稿失败：",
        "ui.setting.draftDeleted": "已删除",
        "ui.setting.draftDelFail": "删除失败：",
        "ui.setting.draftEditHint": "已记录待编辑问卷 ID：",
        "ui.setting.draftDone": "已完成",
        "ui.setting.draftReady": "已就绪",
        "ui.setting.draftPending": "未发布",
        "ui.setting.draftFilled": "已填",
        "ui.setting.draftUnfilled": "未填",
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
        autoSave(theme === "classic" ? _t("ui.setting.round") : _t("ui.setting.square"), "theme", theme);
    }
    function selectLayout(layout) {
        layoutState[1](layout);
        autoSave(layout === "row" ? _t("ui.setting.layout.row") : _t("ui.setting.layout.scroll"), "buttonLayout", layout);
    }
    function selectTimeMode(mode) {
        timeModeState[1](mode);
        autoSave(mode === "picker" ? _t("ui.setting.timePicker") : _t("ui.setting.timeInput"), "timeMode", mode);
    }
    function selectDisplayMode(mode) {
        displayModeState[1](mode);
        autoSave(mode === "normal" ? _t("ui.setting.displayNormal") : (mode === "hidden" ? _t("ui.setting.displayHidden") : _t("ui.setting.displayBlocked")), "displayMode", mode);
    }
    function selectStrictMode(mode) {
        strictModeState[1](mode);
        autoSave(mode === "true" ? _t("ui.setting.strictEnabled") : _t("ui.setting.strictDisabled"), "strictMode", mode);
    }
    // 自动保存：修改即写环境变量（无需保存按钮），横幅显示修改项 + 已保存
    // 工程化：遍历 _SETTING_DEFS 注册表写 env，后续加设置项无需改这里
    // 关键：selectXxx 先 setState 是异步生效，此处读 state[0] 可能还是旧值，
    // 因此 autoSave(what) 需配合显式传入的 field/newVal 覆盖本次变更项，避免写入旧值
    function autoSave(what, overrideField, overrideVal) {
        try {
            for (var _di = 0; _di < _SETTING_DEFS.length; _di++) {
                var _envKey = _SETTING_DEFS[_di].env;
                var _val;
                if (overrideField && overrideField === _SETTING_DEFS[_di].field) {
                    _val = overrideVal; // 本次变更项：用显式传入的新值，不读可能未更新的 state[0]
                } else {
                    _val = _readCurrentSetting(_SETTING_DEFS[_di].field);
                }
                if (_val != null) Tools.SoftwareSettings.writeEnvironmentVariable(_envKey, String(_val));
            }
            showSnack(what + " · " + _t("ui.setting.saved"));
        } catch (e) {
            showSnack(_t("ui.setting.saveFail") + String(e));
        }
    }
    // 读取当前某项设置值（由 _STATE_MAP 提供，复用方案加载逻辑）
    function _readCurrentSetting(field) {
        var sm = _STATE_MAP[field];
        return sm ? sm.read() : null;
    }
    // 设置项 → 读写 state 的映射（field 见模块级 _SETTING_DEFS；state 为 Screen 内的状态）
    // 后续加设置项：在 _SETTING_DEFS 加行 + 在此加 {read, write}，两处即可，保存/导入/序列化自动适配
    var _STATE_MAP = {
        "theme":          { read: function() { return currentThemeState[0]; },      write: function(v) { currentThemeState[1](v); } },
        "buttonLayout":   { read: function() { return layoutState[0]; },             write: function(v) { layoutState[1](v); } },
        "layout":         { read: function() { return questionLayoutState[0]; },     write: function(v) { questionLayoutState[1](v); } },
        "timeMode":       { read: function() { return timeModeState[0]; },           write: function(v) { timeModeState[1](v); } },
        "displayMode":    { read: function() { return displayModeState[0]; },        write: function(v) { displayModeState[1](v); } },
        "strictMode":     { read: function() { return strictModeState[0]; },         write: function(v) { strictModeState[1](v); } },
        "historyEnabled": { read: function() { return historyEnabledState[0]; },     write: function(v) { historyEnabledState[1](v); } },
        // questionFilter：state 存对象，read 返回 JSON 串（供 autoSave String() 写 env 为 JSON），write 解析回对象
        "questionFilter": { read: function() { return JSON.stringify(questionFilterState[0]); }, write: function(v) { try { questionFilterState[1](JSON.parse(v)); } catch(e) { questionFilterState[1](JSON.parse(JSON.stringify(_defaultQuestionFilter))); } } },
        // compileBlacklist：state 存数组，read 返回 JSON 串，write 解析回数组
        "compileBlacklist": { read: function() { return JSON.stringify(blocklistState[0]); }, write: function(v) { try { var a = JSON.parse(v); blocklistState[1](Array.isArray(a) ? a : []); } catch(e) { blocklistState[1]([]); } } },
    };

    // ===== 外观子页（主题 + 按钮布局 + 问卷布局） =====
    var appearanceSection = ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
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
                onClick: function () { questionLayoutState[1]("continuous"); autoSave(_t("ui.setting.layout.continuous"), "layout", "continuous"); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: _t("ui.setting.layout.continuousDesc"), style: "labelMedium", color: currentQuestionLayout === "continuous" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.OutlinedButton({
                containerColor: currentQuestionLayout === "compact" ? primary : null,
                contentColor: currentQuestionLayout === "compact" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { questionLayoutState[1]("compact"); autoSave(_t("ui.setting.layout.compact"), "layout", "compact"); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: _t("ui.setting.layout.compactDesc"), style: "labelMedium", color: currentQuestionLayout === "compact" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
        ]),
    ]);

    // ===== 行为子页（时间模式 + 显示模式 + 严格模式 + 历史记录 + 保存） =====
    var behaviorSection = ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
        ctx.UI.Column({ padding: 16, spacing: 8 }, [
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
                onClick: function () { historyEnabledState[1]("true"); autoSave(_t("ui.setting.enabled"), "historyEnabled", "true"); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: _t("ui.setting.enabled"), style: "labelMedium", color: historyEnabledState[0] === "true" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.OutlinedButton({
                containerColor: historyEnabledState[0] === "false" ? primary : null,
                contentColor: historyEnabledState[0] === "false" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () { historyEnabledState[1]("false"); autoSave(_t("ui.setting.disabled"), "historyEnabled", "false"); },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: _t("ui.setting.disabled"), style: "labelMedium", color: historyEnabledState[0] === "false" ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.OutlinedButton({
                onClick: function() {
                    try {
                        var path = "/sdcard/Download/Operit/questionnaire/history";
                        if (Tools.Files.exists(path)) {
                            Tools.Files.deleteFile(path, true);
                            showSnack(_t("ui.setting.cleanHistory.done"));
                        } else {
                            showSnack(_t("ui.setting.cleanHistory.none"));
                        }
                    } catch(e) {
                        showSnack(_t("ui.setting.cleanHistory.fail") + String(e));
                    }
                },
                fillMaxWidth: true,
                containerColor: ctx.MaterialTheme.colorScheme.error,
                content: ctx.UI.Text({ text: _t("ui.setting.cleanHistory"), style: "labelMedium", color: ctx.MaterialTheme.colorScheme.onPrimary }),
            }),
            ctx.UI.Divider({ thickness: 0.5, color: onSurfaceVariant.copy({ alpha: 0.3 }) }),
            ctx.UI.Spacer({ height: 4 }),
            // ===== 题型过滤器（可用的题型 / 必选 / 单选"其他"） =====
            ctx.UI.Text({ text: _t("ui.setting.qf.title"), style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: _t("ui.setting.qf.desc"), style: "bodySmall", color: onSurfaceVariant }),
            // 使用全局配置开关（默认开）→ 开时隐藏二级内容
            ctx.UI.OutlinedButton({
                containerColor: questionFilterState[0].useGlobal ? primary : null,
                contentColor: questionFilterState[0].useGlobal ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () {
                    var qf = JSON.parse(JSON.stringify(questionFilterState[0]));
                    qf.useGlobal = true;
                    questionFilterState[1](qf);
                    autoSave(_t("ui.setting.qf.useGlobal"), "questionFilter", JSON.stringify(qf));
                },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: _t("ui.setting.qf.useGlobalOn"), style: "labelMedium", color: questionFilterState[0].useGlobal ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            ctx.UI.OutlinedButton({
                containerColor: !questionFilterState[0].useGlobal ? primary : null,
                contentColor: !questionFilterState[0].useGlobal ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: function () {
                    var qf = JSON.parse(JSON.stringify(questionFilterState[0]));
                    qf.useGlobal = false;
                    if (!Array.isArray(qf.types)) qf.types = [];
                    questionFilterState[1](qf);
                    autoSave(_t("ui.setting.qf.custom"), "questionFilter", JSON.stringify(qf));
                },
                fillMaxWidth: true,
                content: ctx.UI.Text({ text: _t("ui.setting.qf.customOn"), style: "labelMedium", color: !questionFilterState[0].useGlobal ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            }),
            (function () {
                if (questionFilterState[0].useGlobal) return null;
                var sec = [];
                // 可用题型多选（不含 section 特殊题型）
                sec.push(ctx.UI.Text({ text: _t("ui.setting.qf.types"), style: "labelMedium", color: onSurface, padding: { top: 4 } }));
                // 题型选项：与 typeOptions 一致但不依赖其定义顺序（behaviorSection 在 typeOptions 之前渲染）
                var qfTypeOpts = [
                    { id: "single", label: _t("ui.setting.type.single") },
                    { id: "multiple", label: _t("ui.setting.type.multiple") },
                    { id: "text", label: _t("ui.setting.type.text") },
                    { id: "textarea", label: _t("ui.setting.type.textarea") },
                    { id: "rating", label: _t("ui.setting.type.rating") },
                    { id: "likert", label: _t("ui.setting.type.likert") },
                    { id: "nps", label: _t("ui.setting.type.nps") },
                    { id: "time", label: _t("ui.setting.type.time") },
                ];
                sec.push(ctx.UI.LazyRow({ spacing: 6 }, qfTypeOpts.map(function (t) {
                    var on2 = (questionFilterState[0].types || []).indexOf(t.id) >= 0;
                    return ctx.UI.FilterChip({
                        selected: on2,
                        onClick: function () {
                            var qf = JSON.parse(JSON.stringify(questionFilterState[0]));
                            var arr = qf.types || [];
                            var idx = arr.indexOf(t.id);
                            if (idx >= 0) arr.splice(idx, 1); else arr.push(t.id);
                            qf.types = arr;
                            questionFilterState[1](qf);
                            autoSave(_t("ui.setting.qf.toggled"), "questionFilter", JSON.stringify(qf));
                        },
                        label: ctx.UI.Text({ text: t.label, style: "labelSmall", color: on2 ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                        leadingIcon: on2 ? ctx.UI.Icon({ name: "check", size: 14, tint: ctx.MaterialTheme.colorScheme.onPrimary }) : null,
                    });
                })));
                // 允许必选开关
                sec.push(ctx.UI.OutlinedButton({
                    containerColor: questionFilterState[0].allowRequired ? primary : null,
                    contentColor: questionFilterState[0].allowRequired ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                    onClick: function () {
                        var qf = JSON.parse(JSON.stringify(questionFilterState[0]));
                        qf.allowRequired = !qf.allowRequired;
                        questionFilterState[1](qf);
                        autoSave(_t("ui.setting.qf.requiredSwitch"), "questionFilter", JSON.stringify(qf));
                    },
                    fillMaxWidth: true,
                    content: ctx.UI.Text({ text: _t("ui.setting.qf.required") + (questionFilterState[0].allowRequired ? " · " + _t("ui.setting.enabled") : " · " + _t("ui.setting.disabled")), style: "labelMedium", color: questionFilterState[0].allowRequired ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                }));
                // 允许单选「其他」开关
                sec.push(ctx.UI.OutlinedButton({
                    containerColor: questionFilterState[0].allowOther ? primary : null,
                    contentColor: questionFilterState[0].allowOther ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                    onClick: function () {
                        var qf = JSON.parse(JSON.stringify(questionFilterState[0]));
                        qf.allowOther = !qf.allowOther;
                        questionFilterState[1](qf);
                        autoSave(_t("ui.setting.qf.otherSwitch"), "questionFilter", JSON.stringify(qf));
                    },
                    fillMaxWidth: true,
                    content: ctx.UI.Text({ text: _t("ui.setting.qf.other") + (questionFilterState[0].allowOther ? " · " + _t("ui.setting.enabled") : " · " + _t("ui.setting.disabled")), style: "labelMedium", color: questionFilterState[0].allowOther ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                }));
                    return ctx.UI.Column({ spacing: 6, fillMaxWidth: true, padding: { top: 4 } }, sec);
            })(),
            ctx.UI.Divider({ thickness: 0.5, color: onSurfaceVariant.copy({ alpha: 0.3 }) }),
            ctx.UI.Spacer({ height: 4 }),
            // ===== 问卷屏蔽词（命中即拦截显示）=====
            ctx.UI.Text({ text: _t("ui.setting.blocklist.title"), style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: _t("ui.setting.blocklist.desc"), style: "bodySmall", color: onSurfaceVariant }),
            // 输入文本框 + 添加按钮
            ctx.UI.Row({ fillMaxWidth: true, spacing: 8, verticalAlignment: "center" }, [
                ctx.UI.Column({ weight: 1 }, [
                    ctx.UI.TextField({
                        value: blocklistInputState[0],
                        onValueChange: function (v) { blocklistInputState[1](v); },
                        placeholder: _t("ui.setting.blocklist.placeholder"),
                        singleLine: true,
                    }),
                ]),
                ctx.UI.Button({
                    onClick: function () {
                        var w = String(blocklistInputState[0] || "").trim();
                        if (!w) { showSnack(_t("ui.setting.blocklist.empty")); return; }
                        var arr = JSON.parse(JSON.stringify(blocklistState[0]));
                        if (arr.indexOf(w) < 0) { arr.push(w); blocklistState[1](arr); }
                        blocklistInputState[1]("");
                        Tools.SoftwareSettings.writeEnvironmentVariable("QUESTIONNAIRE_COMPILE_BLOCKLIST", JSON.stringify(arr));
                        showSnack(_t("ui.setting.blocklist.added"));
                    },
                    content: ctx.UI.Text({ text: _t("ui.setting.blocklist.add"), style: "labelMedium", color: ctx.MaterialTheme.colorScheme.onPrimary }),
                }),
            ]),
            // 词条 LazyRow（每个词条可点击删除）
            (blocklistState[0].length > 0)
                ? ctx.UI.LazyRow({ spacing: 6 }, blocklistState[0].map(function (w) {
                    return ctx.UI.FilterChip({
                        onClick: function () {
                            var arr = JSON.parse(JSON.stringify(blocklistState[0]));
                            var idx = arr.indexOf(w);
                            if (idx >= 0) arr.splice(idx, 1);
                            blocklistState[1](arr);
                            Tools.SoftwareSettings.writeEnvironmentVariable("QUESTIONNAIRE_COMPILE_BLOCKLIST", JSON.stringify(arr));
                            showSnack(_t("ui.setting.blocklist.removed"));
                        },
                        label: ctx.UI.Text({ text: w, style: "labelSmall" }),
                        leadingIcon: ctx.UI.Icon({ name: "close", size: 14 }),
                    });
                }))
                : ctx.UI.Text({ text: _t("ui.setting.blocklist.none"), style: "bodySmall", color: onSurfaceVariant, padding: { vertical: 4 } }),
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

    // ===== 题型预览区（复刻真实问卷渲染，可交互选中） =====
    function renderTypePreview(type) {
        var curAns = previewAnswerState[0];
        var curOther = (curAns && curAns.other) || "";
        var setAns = function (v, o) { previewAnswerState[1]({ ans: v, other: (o === undefined ? curOther : o) }); };
        // 选项按钮：compact→FilterChip / classic→OutlinedButton（与真实问卷一致）
        var optBtn = function (label, isSel, onPick) {
            if (isCompact) {
                return ctx.UI.FilterChip({
                    selected: isSel,
                    onClick: onPick,
                    label: ctx.UI.Text({ text: label, style: "labelSmall", color: isSel ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                    leadingIcon: isSel ? ctx.UI.Icon({ name: "check", size: 16, tint: ctx.MaterialTheme.colorScheme.onPrimary }) : null,
                });
            }
            return ctx.UI.OutlinedButton({
                containerColor: isSel ? primary : null,
                contentColor: isSel ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                onClick: onPick,
                border: { width: 1.5, color: onSurfaceVariant },
                content: ctx.UI.Text({ text: label, style: "labelSmall", color: isSel ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
            });
        };
        // 按钮容器：跟随按钮布局设置（row→纵向堆叠 / scroll→LazyRow）
        var wrapBtns = function (btnArr) {
            if (currentLayout === "row") {
                return ctx.UI.Column({ spacing: 4, fillMaxWidth: true, padding: { vertical: 2 } }, btnArr.map(function (b) { return ctx.UI.Column({ spacing: 0, fillMaxWidth: true }, [b]); }));
            }
            return ctx.UI.LazyRow({ spacing: 4 }, btnArr);
        };
        // 题头（编号 + 题干 + 必答标记 + 副标题）
        var qHeader = function (label, sub) {
            return ctx.UI.Column({ spacing: 1 }, [
                ctx.UI.Text({ text: label, style: "labelMedium", color: onSurface }),
                sub ? ctx.UI.Text({ text: sub, style: "bodySmall", color: onSurfaceVariant, padding: { top: 2, bottom: 2 } }) : null,
            ]);
        };

        if (type === "single") {
            var sOpts = [_t("ui.setting.preview.optionA"), _t("ui.setting.preview.optionB"), _t("ui.setting.preview.optionC")];
            var sBtns = [];
            for (var soi = 0; soi < sOpts.length; soi++) {
                (function (ov) {
                    sBtns.push(optBtn(ov, curAns && curAns.ans === ov, function () { setAns(ov); }));
                })(sOpts[soi]);
            }
            var sOtherSel = curAns && curAns.ans === "__other__";
            sBtns.push(optBtn(_t("ui.setting.preview.other"), sOtherSel, function () { setAns("__other__"); }));
            var sNodes = [qHeader("1. " + _t("ui.setting.preview.single") + " *"), wrapBtns(sBtns)];
            if (sOtherSel) {
                sNodes.push(ctx.UI.TextField({
                    value: curOther,
                    onValueChange: function (nv) { setAns("__other__", nv); },
                    placeholder: _t("ui.setting.preview.otherPlaceholder"),
                    singleLine: true,
                    enabled: true,
                    style: "compact",
                }));
            }
            return ctx.UI.Column({ spacing: 6, padding: { vertical: 4 } }, sNodes);
        }
        if (type === "multiple") {
            var mOpts = [_t("ui.setting.preview.red"), _t("ui.setting.preview.blue"), _t("ui.setting.preview.green")];
            var mArr = Array.isArray(curAns && curAns.ans) ? curAns.ans : [];
            var mBtns = [];
            for (var moi = 0; moi < mOpts.length; moi++) {
                (function (ov) {
                    var checked = mArr.indexOf(ov) >= 0;
                    mBtns.push(optBtn(ov, checked, function () {
                        var na = checked ? mArr.filter(function (x) { return x !== ov; }) : mArr.concat([ov]);
                        setAns(na);
                    }));
                })(mOpts[moi]);
            }
            return ctx.UI.Column({ spacing: 6, padding: { vertical: 4 } }, [
                qHeader("2. " + _t("ui.setting.preview.multiple") + " *"),
                wrapBtns(mBtns),
            ]);
        }
        if (type === "text") {
            return ctx.UI.Column({ spacing: 6, padding: { vertical: 4 } }, [
                qHeader("3. " + _t("ui.setting.preview.text")),
                ctx.UI.TextField({
                    value: curAns && curAns.ans ? curAns.ans : "",
                    onValueChange: function (nv) { setAns(nv); },
                    placeholder: _t("ui.setting.preview.inputText"),
                    singleLine: true,
                    enabled: true,
                    style: "compact",
                }),
            ]);
        }
        if (type === "textarea") {
            return ctx.UI.Column({ spacing: 6, padding: { vertical: 4 } }, [
                qHeader("4. " + _t("ui.setting.preview.textarea")),
                ctx.UI.TextField({
                    value: curAns && curAns.ans ? curAns.ans : "",
                    onValueChange: function (nv) { setAns(nv); },
                    placeholder: _t("ui.setting.preview.inputText"),
                    singleLine: false,
                    minLines: 3,
                    maxLines: 5,
                    enabled: true,
                    style: "compact",
                }),
            ]);
        }
        if (type === "rating") {
            var rVal = parseInt(curAns && curAns.ans) || 0;
            var rLabels = ["", _t("ui.setting.preview.ratingVeryBad"), _t("ui.setting.preview.ratingBad"), _t("ui.setting.preview.ratingNormal"), _t("ui.setting.preview.ratingGood"), _t("ui.setting.preview.ratingVeryGood")];
            var rRow1 = [], rRow2 = [];
            for (var rsi = 1; rsi <= 5; rsi++) {
                (function (starIdx) {
                    var filled = starIdx <= rVal;
                    var b = ctx.UI.OutlinedButton({
                        containerColor: filled ? primary : null,
                        contentColor: filled ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                        onClick: function () { setAns(String(starIdx)); },
                        content: ctx.UI.Text({ text: String(starIdx), style: "labelSmall", color: filled ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                    });
                    if (starIdx <= 3) rRow1.push(b); else rRow2.push(b);
                })(rsi);
            }
            return ctx.UI.Column({ spacing: 6, padding: { vertical: 4 } }, [
                qHeader("5. " + _t("ui.setting.preview.rating")),
                ctx.UI.Row({ spacing: 6, horizontalArrangement: "spaceEvenly", fillMaxWidth: true }, rRow1),
                ctx.UI.Row({ spacing: 6, horizontalArrangement: "spaceEvenly", fillMaxWidth: true }, rRow2),
                ctx.UI.Text({ text: rVal > 0 ? (rVal + _t("ui.setting.preview.star") + " - " + rLabels[rVal]) : _t("ui.setting.preview.starHint"), style: "bodySmall", color: rVal > 0 ? primary : onSurfaceVariant }),
            ]);
        }
        if (type === "likert") {
            var lOpts = [_t("ui.setting.preview.likert1"), _t("ui.setting.preview.likert2"), _t("ui.setting.preview.likert3"), _t("ui.setting.preview.likert4"), _t("ui.setting.preview.likert5")];
            var lVal = parseInt(curAns && curAns.ans) || 0;
            var lRow1 = [], lRow2 = [];
            var halfLen = 3;
            for (var li = 1; li <= lOpts.length; li++) {
                (function (likertIdx) {
                    var b = ctx.UI.OutlinedButton({
                        containerColor: likertIdx === lVal ? primary : null,
                        contentColor: likertIdx === lVal ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                        onClick: function () { setAns(String(likertIdx)); },
                        content: ctx.UI.Text({ text: String(likertIdx), style: "labelSmall", color: likertIdx === lVal ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                    });
                    if (likertIdx <= halfLen) lRow1.push(b); else lRow2.push(b);
                })(li);
            }
            return ctx.UI.Column({ spacing: 6, padding: { vertical: 4 } }, [
                qHeader("6. " + _t("ui.setting.preview.likert")),
                ctx.UI.Row({ spacing: 4, horizontalArrangement: "spaceEvenly", fillMaxWidth: true }, lRow1),
                ctx.UI.Row({ spacing: 4, horizontalArrangement: "spaceEvenly", fillMaxWidth: true }, lRow2),
                ctx.UI.Row({ spacing: 4, horizontalArrangement: "spaceEvenly", fillMaxWidth: true, padding: { top: 2 } },
                    lOpts.map(function (lbl) { return ctx.UI.Text({ text: lbl, style: "labelSmall", color: onSurfaceVariant, maxLines: 2 }); })
                ),
                lVal > 0 ? ctx.UI.Text({ text: _t("ui.setting.preview.likertSelected") + lOpts[Math.min(lVal - 1, lOpts.length - 1)], style: "bodySmall", color: primary }) : null,
            ]);
        }
        if (type === "nps") {
            var nVal = parseInt(curAns && curAns.ans);
            if (isNaN(nVal)) nVal = -1;
            var nGroups = [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10]];
            var nRows = nGroups.map(function (g) {
                return ctx.UI.Row({ spacing: 6, horizontalArrangement: "spaceEvenly", fillMaxWidth: true }, g.map(function (n) {
                    var selN = n === nVal;
                    return ctx.UI.OutlinedButton({
                        containerColor: selN ? primary : null,
                        contentColor: selN ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface,
                        onClick: function () { setAns(String(n)); },
                        content: ctx.UI.Text({ text: String(n), style: "labelSmall", color: selN ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
                    });
                }));
            });
            var nLabel = nVal >= 9 ? _t("ui.setting.preview.npsPromoter") : (nVal >= 7 ? _t("ui.setting.preview.npsPassive") : _t("ui.setting.preview.npsDetractor"));
            return ctx.UI.Column({ spacing: 6, padding: { vertical: 4 } }, [
                qHeader("7. " + _t("ui.setting.preview.nps")),
                ctx.UI.Column({ spacing: 4 }, nRows),
                nVal >= 0
                    ? ctx.UI.Text({ text: _t("ui.setting.preview.npsScore") + nVal + " (" + nLabel + ")", style: "bodySmall", color: primary })
                    : ctx.UI.Row({ spacing: 8, horizontalArrangement: "center", fillMaxWidth: true, padding: { top: 2 } }, [
                        ctx.UI.Text({ text: _t("ui.setting.preview.npsMin"), style: "labelSmall", color: onSurfaceVariant }),
                        ctx.UI.Text({ text: _t("ui.setting.preview.npsMax"), style: "labelSmall", color: onSurfaceVariant }),
                    ]),
            ]);
        }
        if (type === "time") {
            var tVal = curAns && curAns.ans ? curAns.ans : "";
            return ctx.UI.Column({ spacing: 6, padding: { vertical: 4 } }, [
                qHeader("8. " + _t("ui.setting.preview.timePrefix") + " (" + _timeModeLabel(currentTimeMode) + ")"),
                currentTimeMode === "input" ? ctx.UI.TextField({
                    value: tVal,
                    onValueChange: function (nv) { setAns(nv); },
                    placeholder: "hh:mm:ss",
                    fillMaxWidth: true,
                    style: "compact",
                }) : ctx.UI.Column({ spacing: 4 }, [
                    ctx.UI.Text({ text: _t("ui.setting.preview.hour"), style: "labelSmall", color: onSurfaceVariant }),
                    ctx.UI.LazyRow({ spacing: 4 }, (function() { var hs = []; for (var hi = 8; hi <= 12; hi++) { (function(hv){ hs.push(optBtn(hv, tVal.indexOf(hv + ":") === 0, function () { setAns(hv + ":30:00"); })); })(hi < 10 ? "0" + hi : "" + hi); } return hs; })()),
                    ctx.UI.Text({ text: _t("ui.setting.preview.minute"), style: "labelSmall", color: onSurfaceVariant }),
                    ctx.UI.LazyRow({ spacing: 4 }, (function() { var ms = []; for (var mi = 0; mi <= 55; mi += 15) { (function(mv){ ms.push(optBtn(mv, tVal.indexOf(":" + mv + ":") === 0, function () { setAns("10:" + mv + ":00"); })); })(mi < 10 ? "0" + mi : "" + mi); } return ms; })()),
                    ctx.UI.Text({ text: tVal ? _t("ui.setting.preview.timeExample") : _t("ui.setting.preview.timeExample"), style: "bodySmall", color: primary }),
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
        if (langScanningState[0]) return; // 用 state 最新值判断，避免闭包快照过期导致刷新按钮失效
        langScanningState[1](true);
        langPacksState[1](null);
        forceRerender(); // 同步段 setState 后立即重绘：显示“扫描中”并清空旧列表
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
                                    displayName = langNames[parsed.id];
                                } else if (typeof displayName === "object") {
                                    var _langId = (currentLangPathState[0] || "").split("/").pop().replace(".json", "").toLowerCase();
                                    displayName = displayName[_langId] || displayName["default"] || displayName["zh_cn"] || displayName["en_us"];
                                }
                                // 兜底：按地区码格式展示（zh_cn → zh-CN，en_us → en-US）
                                if (!displayName) {
                                    var _idParts = String(parsed.id).split("_");
                                    displayName = _idParts.map(function (p, pi) {
                                        return pi === 0 ? p.toLowerCase() : p.toUpperCase();
                                    }).join("-");
                                }
                                packs.push({ id: parsed.id, path: fp, displayName: displayName, author: parsed.author || "", lang: parsed.lang || null });
                            }
                        } catch(e) {
                            showSnack(_t("ui.setting.langParseFail") + (e && e.message ? e.message : String(e)));
                        }
                    }
            }
            if (packs.length === 0) {
                showSnack("未找到可用语言包，将在 lang 目录生成默认语言包");
                await ctx.callTool("make_directory", { path: langDir, create_parents: true });
                var defaultPacks = [
                    { id: "zh_cn", displayname: { "zh_cn": "简体中文", "en_us": "Chinese (Simplified)" }, lang: {
                        "ui.form.submit": "提交",
                        "ui.form.cancel": "取消",
                        "ui.form.fill": "一键补全",
                        "ui.form.fillOk": "已自动补全上次的答案",
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
                        "ui.form.edit": "修改",
                        "ui.form.editResubmit": "🔄 修改后重新提交",
                        "ui.form.unfilled": "未填项：",
                        "ui.form.reported": "已报告表单问题",
                        "ui.form.computing": "⏳ 计算中...",
                        "ui.form.submitBtn": "提交",
                        "ui.form.submitBtnFull": "提交问卷",
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

"ui.ask.title": "问卷询问",
"ui.ask.subtitle": "向 AI 出题，AI 将通过工具作答",
"ui.ask.titlePlaceholder": "输入问卷标题...",
"ui.ask.addQuestion": "＋ 添加题目",
"ui.ask.editQuestion": "编辑题目",
"ui.ask.edit": "编辑",
"ui.ask.delete": "删除",
"ui.ask.type": "题型",
"ui.ask.question": "题干",
"ui.ask.questionPlaceholder": "输入题目内容...",
"ui.ask.options": "选项",
"ui.ask.optionsPlaceholder": "选项用逗号分隔，例如：是,否",
"ui.ask.required": "必答",
        "ui.ask.allowOther": "启用其他",
"ui.ask.confirm": "确认添加",
"ui.ask.cancel": "取消",
"ui.ask.saved": "已保存",
"ui.ask.started": "已出题，问卷ID已发送给 AI",
"ui.ask.noTitle": "请先输入问卷标题",
"ui.ask.noQuestions": "请至少添加一道题目",
"ui.ask.ready": "已就绪",
"ui.ask.done": "已完成",
"ui.ask.unpublished": "未发布",
"ui.ask.unfilled": "未填",
"ui.ask.filled": "已填",
"ui.ask.answered": "已答",
"ui.ask.total": "共 %d 题",
"ui.ask.answer": "答案",
"ui.ask.type.single": "单选",
"ui.ask.type.multiple": "多选",
"ui.ask.type.text": "文本",
"ui.ask.type.textarea": "多行文本",
"ui.ask.type.rating": "评分",
"ui.ask.aiReady": "请使用 ask 子包工具作答（query / read / answer / finish）",
"ui.ask.finishedAt": "完成时间",
"ui.ask.emptyQuestions": "暂无题目，点击下方按钮添加",
"ui.ask.needOptions": "选择题型至少需要 2 个选项",
"ui.ask.fetching": "加载草稿中...",
"ui.ask.draftListEmpty": "未找到草稿：目录为空或 list_files 无返回",
"ui.ask.draftScanDone": "扫描完成，无未完成草稿",
"ui.ask.draftListFail": "列出草稿失败: ",
"ui.ask.draftSwitched": "已切换到草稿：",
"ui.ask.draftLoadFail": "加载草稿失败: ",
"ui.ask.draftPickerTitle": "继续填写未完成问卷",
"ui.ask.draftPickerEmpty": "暂无未完成问卷",
"ui.de.title": "编辑草稿",
"ui.de.loading": "加载草稿中...",
"ui.de.titlePlaceholder": "输入问卷标题...",
"ui.de.noTitle": "请输入问卷标题",
"ui.de.noId": "缺少草稿 ID",
"ui.de.corrupt": "草稿不存在或已损坏",
"ui.de.loadFail": "加载草稿失败: ",
"ui.de.saveFail": "保存失败: ",
"ui.de.saved": "已保存到该草稿",
"ui.de.questionEmpty": "题干不能为空",
"ui.de.needOptions": "选择题型至少需要 2 个选项",
"ui.de.add": "＋ 添加题目",
"ui.de.empty": "暂无题目，点击上方按钮添加",
"ui.de.editQuestion": "编辑题目",
"ui.de.addQuestion": "添加题目",
"ui.de.type": "题型",
"ui.de.question": "题干",
"ui.de.questionPlaceholder": "输入题目内容...",
"ui.de.options": "选项（逗号分隔）",
"ui.de.optionsPlaceholder": "例如：是,否",
"ui.de.required": "必答",
"ui.de.cancel": "取消",
"ui.de.confirm": "确定",
"ui.de.count": "题",
"ui.de.done": "已完成",
"ui.de.ready": "已就绪",
"ui.de.pending": "未发布",
"ui.de.type.single": "单选",
"ui.de.type.multiple": "多选",
"ui.de.type.text": "单行文本",
"ui.de.type.textarea": "多行文本",
"ui.de.type.rating": "评分",
"ui.de.type.likert": "李克特",
"ui.de.type.nps": "NPS",
"ui.de.type.time": "时间",
"ui.ask.saveFail": "保存失败: ",
                        "ui.setting.title": "问卷主题设置",
                        "ui.setting.back": "返回",
                        "ui.setting.home.title": "设置首页",
                        "ui.setting.home.filled": "已填写问卷",
                        "ui.setting.home.filledCount": "%d 份",
                        "ui.setting.home.currentLang": "当前语言包",
                        "ui.setting.home.entries": "功能",
                        "ui.setting.page.appearance": "外观",
                        "ui.setting.page.appearance.desc": "主题、按钮布局、问卷布局与题型预览",
                        "ui.setting.page.behavior": "行为",
                        "ui.setting.page.behavior.desc": "时间输入、显示模式、严格度与历史记录",
                        "ui.setting.page.lang": "语言包",
                        "ui.setting.page.lang.desc": "扫描、切换语言包",
                        "ui.setting.page.drafts": "草稿",
                        "ui.setting.page.drafts.desc": "管理问卷草稿",
                        "ui.setting.page.update": "更新",
                        "ui.setting.page.update.desc": "版本检查、新版特性与更新历程",
                        "ui.setting.page.about": "关于",
                        "ui.setting.page.about.desc": "插件信息与作者",
"ui.setting.scheme.title": "方案管理",
        "ui.setting.scheme.desc": "保存/导入问卷外观与行为方案",
        "ui.setting.scheme.saveTitle": "保存当前设置为方案",
        "ui.setting.scheme.nameReq": "请输入方案名称",
        "ui.setting.scheme.namePlaceholder": "方案名称",
        "ui.setting.scheme.saveBtn": "保存",
        "ui.setting.scheme.exportTitle": "一键导出当前配置",
        "ui.setting.scheme.exportBtn": "导出",
        "ui.setting.scheme.exportResult": "方案字符串（复制以下内容以便分享）：",
        "ui.setting.scheme.importTitle": "一键导入方案",
        "ui.setting.scheme.importPlaceholder": "粘贴方案字符串...",
        "ui.setting.scheme.importBtn": "导入",
        "ui.setting.scheme.imported": "已应用导入的方案",
        "ui.setting.scheme.importInvalid": "方案字符串无效",
        "ui.setting.scheme.listTitle": "已保存的方案",
        "ui.setting.scheme.empty": "暂无已保存方案",
        "ui.setting.scheme.emptyHint": "在上方输入名称，保存当前外观与行为设置。",
        "ui.setting.scheme.applyBtn": "应用",
        "ui.setting.scheme.deleteBtn": "删除",
        "ui.setting.scheme.deleted": "已删除方案",
        "ui.setting.scheme.deleFail": "删除失败：",
                        "ui.setting.page.preview": "题型预览",
                        "ui.setting.page.preview.desc": "按当前主题与布局实时预览各题型渲染",
                        "ui.setting.preview.other": "其他…",
                        "ui.setting.preview.otherPlaceholder": "请输入自定义内容...",
                        "ui.setting.preview.star": "星",
                        "ui.setting.preview.starHint": "点击评分",
                        "ui.setting.preview.ratingVeryBad": "很差",
                        "ui.setting.preview.ratingBad": "较差",
                        "ui.setting.preview.ratingNormal": "一般",
                        "ui.setting.preview.ratingGood": "满意",
                        "ui.setting.preview.ratingVeryGood": "非常满意",
                        "ui.setting.preview.likertSelected": "已选: ",
                        "ui.setting.preview.npsPromoter": "推荐者",
                        "ui.setting.preview.npsPassive": "被动者",
                        "ui.setting.preview.npsDetractor": "贬损者",
                        "ui.setting.preview.npsScore": "评分: ",
                        "ui.setting.preview.npsMin": "0（不可能）",
                        "ui.setting.preview.npsMax": "10（非常可能）",
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
                        "ui.setting.saved": "已保存",
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
                                                "ui.setting.langParseFail": "解析语言包失败: ",
                        "ui.setting.scanFail": "扫描失败：",
                        "ui.setting.switchFail": "切换失败：",
                        "ui.setting.foundPacks": "找到 %d 个语言包",
                        "ui.setting.switched": "已切换语言包，界面已立即生效",
                        "ui.setting.currentPack": "当前语言包：",
                        "ui.setting.builtinLang": "内置语言包",
                        "ui.setting.latestVerText": "已是最新版 v",
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
    "ui.setting.qf.title": "题型过滤器", "ui.setting.qf.desc": "控制问卷可使用的题型范围，以及是否允许必选和单选「其他」输入。", "ui.setting.qf.useGlobal": "使用全局配置", "ui.setting.qf.useGlobalOn": "使用全局配置（全部题型可用）", "ui.setting.qf.customOn": "自定义题型过滤器", "ui.setting.qf.types": "允许的题型", "ui.setting.qf.toggled": "题型过滤器", "ui.setting.qf.required": "允许必选", "ui.setting.qf.requiredSwitch": "是否允许必选", "ui.setting.qf.other": "允许单选「其他」", "ui.setting.qf.otherSwitch": "是否允许单选「其他」",
    "ui.setting.blocklist.title": "问卷屏蔽词", "ui.setting.blocklist.desc": "问卷标题、描述与所有题目内容中出现下方任一屏蔽词时会被拦截。留空则不使用屏蔽检查器。", "ui.setting.blocklist.placeholder": "输入屏蔽词...", "ui.setting.blocklist.add": "添加", "ui.setting.blocklist.empty": "请输入要屏蔽的词", "ui.setting.blocklist.added": "已添加屏蔽词", "ui.setting.blocklist.removed": "已移除屏蔽词", "ui.setting.blocklist.none": "当前不使用屏蔽检查器", "ui.setting.blocklist.count": " 个",
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

        "ui.setting.drafts": "问卷草稿管理",
        "ui.setting.draftsDesc": "查看 / 编辑 / 删除问卷草稿",
        "ui.setting.draftsScanning": "扫描中...",
        "ui.setting.draftsEmpty": "暂无问卷草稿",
        "ui.setting.draftsCount": "题",
        "ui.setting.draftsFail": "扫描草稿失败：",
        "ui.setting.draftDeleted": "已删除",
        "ui.setting.draftDelFail": "删除失败：",
        "ui.setting.draftEditHint": "已记录待编辑问卷 ID：",
        "ui.setting.draftDone": "已完成",
        "ui.setting.draftReady": "已就绪",
        "ui.setting.draftPending": "未发布",
        "ui.setting.draftFilled": "已填",
        "ui.setting.draftUnfilled": "未填",
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

                        "ui.market.langpack.expand": "展开",
                        "ui.market.langpack.collapse": "收起",
                        "ui.market.langpack.noAuthor": "未知作者",
                        "ui.market.langpack.fillBoth": "请填写邮箱和JSON内容",
                        "ui.market.langpack.submitting": "提交中...",
                        "ui.market.langpack.submitFail": "提交失败: ",
                        "ui.market.langpack.deleteOk": "已删除",
                        "ui.market.langpack.deleteFail": "删除失败: ",
                        "ui.market.langpack.dlOk": "下载成功",
                        "ui.market.langpack.dlFail": "下载失败: ",
                        "ui.market.langpack.search": "搜索语言包...",
                        "ui.market.langpack.prev": "上一页",
                        "ui.market.langpack.next": "下一页",
                        "ui.market.langpack.update": "更新",
                        "ui.market.langpack.upToDate": "已是最新",
                        "ui.market.langpack.readFail": "读取版本失败",                        "ui.market.langpack.selectFile": "选择文件",                        "ui.market.langpack.manageTitle": "语言包管理",
                        "ui.market.langpack.manageRefresh": "请刷新",
                        "ui.market.langpack.manageEmpty": "当前无语言包",
                        "ui.market.langpack.manageDelete": "删除",
                        "ui.ask.idLabel": "问卷ID: ",
                        "ui.ask.noAskId": "问卷 ID 未分配",
                        "ui.ask.untitled": "(无标题)",
                        "ui.form.building": "📋 表单制作中...",
                        "ui.form.defaultTitle": "问卷",
                        "ui.form.err.attrSyntax": "不支持的属性写法：请在 <questionnaire> 标签内使用标准 JSON 格式，不要将 title/questions 等作为标签属性。正确示例：<questionnaire>{\"title\":\"问卷标题\",\"questions\":[...]}</questionnaire>",
                        "ui.form.err.badType": "第%s题 type 不合法: %s",
                        "ui.form.err.blockedMsg": "问卷已被拦截：当前设置为拦截模式，问卷不会显示。",
                        "ui.form.err.blockedTitle": "(问卷已被拦截)",
                        "ui.form.err.emptyData": "问卷数据为空或格式不正确",
                        "ui.form.err.emptyQuestion": "第%s题 question 为空",
                        "ui.form.err.enableOtherSingle": "第%s题 enableOther 仅支持 single 题型",
                        "ui.form.err.exprNoQuestion": "第%s组第%s个缺少?",
                        "ui.form.err.groupNotArray": "第%s组不是数组",
                        "ui.form.err.jsonSyntax": "JSON 语法错误: %s",
                        "ui.form.err.noOptionsField": "第%s题（%s）不应有 options 字段",
                        "ui.form.err.optionsShort": "第%s题（%s）选项不足",
                        "ui.form.err.parseFailTitle": "(解析失败)",
                        "ui.form.err.qNoName": "第%s题",
                        "ui.form.err.refUnknownVar": "引用了不存在的变量: %s",
                        "ui.form.err.resultFormat": "result 格式错误",
                        "ui.form.err.resultNotArray": "result 格式错误：result 必须是二维数组",
                        "ui.form.err.resultSyntax": "结果表达式语法错误: %s",
                        "ui.form.err.resultcodeConflict": "resultcode 和 result 不能同时存在，请只使用其中一个",
                        "ui.form.err.sectionRequired": "第%s题 section 类型不能设置 required",
                        "ui.form.err.unknownField": "第%s题存在不支持的字段 '%s'，正确字段名：type/question/options/required/subtitle/enableOther/id",
                        "ui.form.err.wrongClose": "XML 标签错误：使用了 \"%s\" 作为闭合标签，正确应为 </questionnaire>",
                        "ui.form.err.wrongCloseTitle": "(标签错误)",
                        "ui.market.langpack.count": " 个",
                        "ui.market.source.add": "＋ 添加市场源",
                        "ui.market.source.addUrl": "添加",
                        "ui.market.source.added": "已添加源: ",
                        "ui.market.source.basePlaceholder": "输入基源 URL，用于获取源信息...",
                        "ui.market.source.choose": "选择默认源（加载市场包时使用）",
                        "ui.market.source.confirm": "确认无误",
                        "ui.market.source.current": "当前源",
                        "ui.market.source.delete": "删除",
                        "ui.market.source.deleted": "已删除源: ",
                        "ui.market.source.done": "完成添加",
                        "ui.market.source.empty": "暂无自定义源",
                        "ui.market.source.extraPlaceholder": "添加代理 URL...",
                        "ui.market.source.fetch": "获取源信息",
                        "ui.market.source.fetchFail": "获取失败: ",
                        "ui.market.source.fetching": "获取中...",
                        "ui.market.source.invalid": "源信息格式不正确（需要 title / organization / url / list）",
                        "ui.market.source.isDefault": "默认",
                        "ui.market.source.loadFail": "读取源配置失败: ",
                        "ui.market.source.loadFrom": "从当前源加载中...",
                        "ui.market.source.noList": "源返回的列表为空",
                        "ui.market.source.official": "官方",
                        "ui.market.source.org": "提供者",
                        "ui.market.source.packCount": "语言包",
                        "ui.market.source.retry": "重新输入",
                        "ui.market.source.setDefault": "设为默认",
                        "ui.market.source.stepBase": "第一步：添加基源",
                        "ui.market.source.stepConfirm": "第二步：确认源信息",
                        "ui.market.source.stepUrls": "第三步：备用 URL（无 https:// 前缀自动补全）",
                        "ui.market.source.title": "市场源",
                        "ui.market.source.urlCount": "URL",
                        "ui.de.allowOther": "启用其他",

                    }},
                    { id: "en_us", displayname: { "zh_cn": "英语（美国）", "en_us": "English (US)" }, lang: {
                        "ui.form.submit": "Submit",
                        "ui.form.cancel": "Cancel",
                        "ui.form.fill": "Auto Fill",
                        "ui.form.fillOk": "Auto-filled from history",
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
                        "ui.form.edit": "Edit",
                        "ui.form.editResubmit": "🔄 Resubmitted after edit",
                        "ui.form.unfilled": "Unfilled:",
                        "ui.form.reported": "Reported form issues",
                        "ui.form.computing": "⏳ Computing...",
                        "ui.form.submitBtn": "Submit",
                        "ui.form.submitBtnFull": "Submit questionnaire",
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

"ui.ask.title": "Ask Questionnaire",
"ui.ask.subtitle": "Quiz the AI; it answers via tools",
"ui.ask.titlePlaceholder": "Enter questionnaire title...",
"ui.ask.addQuestion": "＋ Add Question",
"ui.ask.editQuestion": "Edit Question",
"ui.ask.edit": "Edit",
"ui.ask.delete": "Delete",
"ui.ask.type": "Type",
"ui.ask.question": "Question",
"ui.ask.questionPlaceholder": "Enter question text...",
"ui.ask.options": "Options",
"ui.ask.optionsPlaceholder": "Options separated by commas, e.g. Yes,No",
"ui.ask.required": "Required",
        "ui.ask.allowOther": "Enable Other",
"ui.ask.confirm": "Add",
"ui.ask.cancel": "Cancel",
"ui.ask.saved": "Saved",
"ui.ask.started": "Created, questionnaire ID sent to AI",
"ui.ask.noTitle": "Please enter a title first",
"ui.ask.noQuestions": "Add at least one question",
"ui.ask.ready": "Ready",
"ui.ask.done": "Done",
"ui.ask.unpublished": "Unpublished",
"ui.ask.unfilled": "Unfilled",
"ui.ask.filled": "Filled",
"ui.ask.answered": "Answered",
"ui.ask.total": "%d questions",
"ui.ask.answer": "Answer",
"ui.ask.type.single": "Single",
"ui.ask.type.multiple": "Multiple",
"ui.ask.type.text": "Text",
"ui.ask.type.textarea": "Textarea",
"ui.ask.type.rating": "Rating",
"ui.ask.aiReady": "Use ask tools to answer (query / read / answer / finish)",
"ui.ask.finishedAt": "Finished at",
"ui.ask.emptyQuestions": "No questions yet, add below",
"ui.ask.needOptions": "Choice types need at least 2 options",
"ui.ask.fetching": "Loading drafts...",
"ui.ask.draftListEmpty": "No drafts found: directory empty or list_files returned nothing",
"ui.ask.draftScanDone": "Scan complete, no drafts",
"ui.ask.draftListFail": "List drafts failed: ",
"ui.ask.draftSwitched": "Switched to draft: ",
"ui.ask.draftLoadFail": "Load draft failed: ",
"ui.ask.draftPickerTitle": "Continue unfinished questionnaire",
"ui.ask.draftPickerEmpty": "No unfinished questionnaires",
"ui.de.title": "Edit Draft",
"ui.de.loading": "Loading draft...",
"ui.de.titlePlaceholder": "Enter questionnaire title...",
"ui.de.noTitle": "Please enter a title",
"ui.de.noId": "Missing draft ID",
"ui.de.corrupt": "Draft missing or corrupted",
"ui.de.loadFail": "Load draft failed: ",
"ui.de.saveFail": "Save failed: ",
"ui.de.saved": "Saved to this draft",
"ui.de.questionEmpty": "Question text cannot be empty",
"ui.de.needOptions": "Choice types need at least 2 options",
"ui.de.add": "＋ Add Question",
"ui.de.empty": "No questions yet, add one above",
"ui.de.editQuestion": "Edit Question",
"ui.de.addQuestion": "Add Question",
"ui.de.type": "Type",
"ui.de.question": "Question",
"ui.de.questionPlaceholder": "Enter question text...",
"ui.de.options": "Options (comma separated)",
"ui.de.optionsPlaceholder": "e.g. Yes,No",
"ui.de.required": "Required",
"ui.de.cancel": "Cancel",
"ui.de.confirm": "Confirm",
"ui.de.count": "Q",
"ui.de.done": "Done",
"ui.de.ready": "Ready",
"ui.de.pending": "Unpublished",
"ui.de.type.single": "Single",
"ui.de.type.multiple": "Multiple",
"ui.de.type.text": "Text",
"ui.de.type.textarea": "Textarea",
"ui.de.type.rating": "Rating",
"ui.de.type.likert": "Likert",
"ui.de.type.nps": "NPS",
"ui.de.type.time": "Time",
"ui.ask.saveFail": "Save failed: ",
                        "ui.setting.title": "Theme Settings",
                        "ui.setting.back": "Back",
                        "ui.setting.home.title": "Settings Home",
                        "ui.setting.home.filled": "Filled Questionnaires",
                        "ui.setting.home.filledCount": "%d filled",
                        "ui.setting.home.currentLang": "Current Language Pack",
                        "ui.setting.home.entries": "Features",
                        "ui.setting.page.appearance": "Appearance",
                        "ui.setting.page.appearance.desc": "Theme, button layout, question layout & preview",
                        "ui.setting.page.behavior": "Behavior",
                        "ui.setting.page.behavior.desc": "Time input, display mode, strictness & history",
                        "ui.setting.page.lang": "Language Pack",
                        "ui.setting.page.lang.desc": "Scan & switch language packs",
                        "ui.setting.page.drafts": "Drafts",
                        "ui.setting.page.drafts.desc": "Manage questionnaire drafts",
                        "ui.setting.page.update": "Update",
                        "ui.setting.page.update.desc": "Version check, new features & changelog",
                        "ui.setting.page.about": "About",
                        "ui.setting.page.about.desc": "Plugin info & authors",
"ui.setting.scheme.title": "Scheme Manager",
        "ui.setting.scheme.desc": "Save/import questionnaire appearance & behavior schemes",
        "ui.setting.scheme.saveTitle": "Save current settings as scheme",
        "ui.setting.scheme.nameReq": "Please enter a scheme name",
        "ui.setting.scheme.namePlaceholder": "Scheme name",
        "ui.setting.scheme.saveBtn": "Save",
        "ui.setting.scheme.exportTitle": "Export current config as string",
        "ui.setting.scheme.exportBtn": "Export",
        "ui.setting.scheme.exportResult": "Scheme string (copy to share):",
        "ui.setting.scheme.importTitle": "Import scheme from string",
        "ui.setting.scheme.importPlaceholder": "Paste scheme string...",
        "ui.setting.scheme.importBtn": "Import",
        "ui.setting.scheme.imported": "Scheme imported and applied",
        "ui.setting.scheme.importInvalid": "Invalid scheme string",
        "ui.setting.scheme.listTitle": "Saved schemes",
        "ui.setting.scheme.empty": "No saved schemes",
        "ui.setting.scheme.emptyHint": "Enter a name above to save current appearance & behavior settings.",
        "ui.setting.scheme.applyBtn": "Apply",
        "ui.setting.scheme.deleteBtn": "Delete",
        "ui.setting.scheme.deleted": "Scheme deleted",
        "ui.setting.scheme.deleFail": "Delete failed: ",
                        "ui.setting.scheme.copied": "Copied to clipboard",
                        "ui.setting.scheme.copyFail": "Copy failed: ",
                        "ui.setting.page.preview": "Type Preview",
                        "ui.setting.page.preview.desc": "Live preview of all types under current theme & layout",
                        "ui.setting.preview.other": "Other…",
                        "ui.setting.preview.otherPlaceholder": "Enter custom content...",
                        "ui.setting.preview.star": "stars",
                        "ui.setting.preview.starHint": "Tap to rate",
                        "ui.setting.preview.ratingVeryBad": "Very bad",
                        "ui.setting.preview.ratingBad": "Poor",
                        "ui.setting.preview.ratingNormal": "Average",
                        "ui.setting.preview.ratingGood": "Good",
                        "ui.setting.preview.ratingVeryGood": "Excellent",
                        "ui.setting.preview.likertSelected": "Selected: ",
                        "ui.setting.preview.npsPromoter": "Promoter",
                        "ui.setting.preview.npsPassive": "Passive",
                        "ui.setting.preview.npsDetractor": "Detractor",
                        "ui.setting.preview.npsScore": "Score: ",
                        "ui.setting.preview.npsMin": "0 (Not likely)",
                        "ui.setting.preview.npsMax": "10 (Very likely)",
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
                        "ui.setting.saved": "Saved",
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
                                                "ui.setting.langParseFail": "解析语言包失败: ",
                        "ui.setting.scanFail": "Scan failed: ",
                        "ui.setting.switchFail": "Switch failed: ",
                        "ui.setting.foundPacks": "Found %d language pack(s)",
                        "ui.setting.switched": "Language pack switched, applied immediately",
                        "ui.setting.currentPack": "Current pack: ",
                        "ui.setting.builtinLang": "Built-in Language Pack",
                        "ui.setting.lang.author": "Language Pack Author: ",
                        "ui.setting.drafts": "Questionnaire Drafts",
                        "ui.setting.draftsDesc": "View / Edit / Delete questionnaire drafts",
                        "ui.setting.draftsScanning": "Scanning...",
                        "ui.setting.draftsEmpty": "No questionnaire drafts",
                        "ui.setting.draftsCount": "Q",
                        "ui.setting.draftsFail": "Scan drafts failed: ",
                        "ui.setting.draftDeleted": "Deleted",
                        "ui.setting.draftDelFail": "Delete failed: ",
                        "ui.setting.draftEditHint": "Recorded draft ID to edit: ",
                        "ui.setting.draftDone": "Done",
                        "ui.setting.draftReady": "Ready",
                        "ui.setting.draftPending": "Unpublished",
                        "ui.setting.draftFilled": "Filled",
                        "ui.setting.draftUnfilled": "Unfilled",
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
                        "ui.market.langpack.manageEmpty": "No language packs",
                        "ui.market.langpack.manageDelete": "Delete",
                        "ui.market.langpack.expand": "Expand",
                        "ui.market.langpack.collapse": "Collapse",
                        "ui.market.langpack.noAuthor": "Unknown Author",
                        "ui.market.langpack.fillBoth": "Please enter email and JSON",
                        "ui.market.langpack.submitting": "Submitting...",
                        "ui.market.langpack.submitFail": "Submit failed: ",
                        "ui.market.langpack.deleteOk": "Deleted",
                        "ui.market.langpack.deleteFail": "Delete failed: ",
                        "ui.market.langpack.dlOk": "Download OK",
                        "ui.market.langpack.dlFail": "Download failed: ",
                        "ui.market.langpack.search": "Search language packs...",
                        "ui.market.langpack.prev": "Prev",
                        "ui.market.langpack.next": "Next",
                        "ui.market.langpack.update": "Update",
                        "ui.market.langpack.upToDate": "Up to date",
                        "ui.market.langpack.readFail": "Failed to read version",                        "ui.market.langpack.selectFile": "Select file",                        "ui.market.langpack.manageTitle": "Language Pack Management",
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
    "ui.setting.qf.title": "Question Type Filter", "ui.setting.qf.desc": "Control which question types may be used, and whether required flags and single-choice other input are allowed.", "ui.setting.qf.useGlobal": "Use global config", "ui.setting.qf.useGlobalOn": "Use global config (all types allowed)", "ui.setting.qf.customOn": "Custom question filter", "ui.setting.qf.types": "Allowed types", "ui.setting.qf.toggled": "Question filter", "ui.setting.qf.required": "Allow required", "ui.setting.qf.requiredSwitch": "Allow required flag", "ui.setting.qf.other": "Allow single other input", "ui.setting.qf.otherSwitch": "Allow single other input switch",
    "ui.setting.blocklist.title": "Question Blocklist", "ui.setting.blocklist.desc": "Intercept questions whose title, description or any question content contains a blocked word below. Empty means no blocking.", "ui.setting.blocklist.placeholder": "Enter blocked word...", "ui.setting.blocklist.add": "Add", "ui.setting.blocklist.empty": "Enter a word to block", "ui.setting.blocklist.added": "Blocked word added", "ui.setting.blocklist.removed": "Blocked word removed", "ui.setting.blocklist.none": "Blocklist is currently empty", "ui.setting.blocklist.count": " words",
                        "ui.setting.type.multiple": "Multiple Choice",
                        "ui.setting.type.text": "Single-line Text",
                        "ui.setting.type.textarea": "Multi-line Text",
                        "ui.setting.type.rating": "Rating",
                        "ui.setting.type.likert": "Likert Scale",
                        "ui.setting.type.nps": "NPS",
                        "ui.setting.type.time": "Time Selection",
                        "ui.setting.lparen": "(",
                        "ui.setting.rparen": ")",
                        "ui.ask.idLabel": "Questionnaire ID: ",
                        "ui.ask.noAskId": "Questionnaire ID not assigned",
                        "ui.ask.untitled": "(Untitled)",
                        "ui.form.building": "📋 Building form...",
                        "ui.form.defaultTitle": "Questionnaire",
                        "ui.form.err.attrSyntax": "Unsupported attribute syntax: use standard JSON inside <questionnaire> tag, do not put title/questions as tag attributes. Example: <questionnaire>{\"title\":\"Survey title\",\"questions\":[...]}</questionnaire>",
                        "ui.form.err.badType": "Q%s invalid type: %s",
                        "ui.form.err.blockedMsg": "Questionnaire blocked: display mode is set to block, form will not show.",
                        "ui.form.err.blockedTitle": "(Questionnaire blocked)",
                        "ui.form.err.emptyData": "Questionnaire data is empty or invalid",
                        "ui.form.err.emptyQuestion": "Q%s question is empty",
                        "ui.form.err.enableOtherSingle": "Q%s enableOther only supported for single type",
                        "ui.form.err.exprNoQuestion": "Group %s item %s missing '?'",
                        "ui.form.err.groupNotArray": "Group %s is not an array",
                        "ui.form.err.jsonSyntax": "JSON syntax error: %s",
                        "ui.form.err.noOptionsField": "Q%s (%s) should not have options field",
                        "ui.form.err.optionsShort": "Q%s (%s) needs at least 2 options",
                        "ui.form.err.parseFailTitle": "(Parse failed)",
                        "ui.form.err.qNoName": "Question %s",
                        "ui.form.err.refUnknownVar": "References unknown variable: %s",
                        "ui.form.err.resultFormat": "result format error",
                        "ui.form.err.resultNotArray": "result format error: result must be a 2D array",
                        "ui.form.err.resultSyntax": "Result expression syntax error: %s",
                        "ui.form.err.resultcodeConflict": "resultcode and result cannot coexist, use only one",
                        "ui.form.err.sectionRequired": "Q%s section cannot have required",
                        "ui.form.err.unknownField": "Q%s has unsupported field '%s'. Valid fields: type/question/options/required/subtitle/enableOther/id",
                        "ui.form.err.wrongClose": "XML tag error: used \"%s\" as closing tag, expected </questionnaire>",
                        "ui.form.err.wrongCloseTitle": "(Tag error)",
                        "ui.market.langpack.count": " installed",
                        "ui.market.source.add": "＋ Add Source",
                        "ui.market.source.addUrl": "Add",
                        "ui.market.source.added": "Source added: ",
                        "ui.market.source.basePlaceholder": "Enter base source URL to fetch info...",
                        "ui.market.source.choose": "Choose default source (used to load market)",
                        "ui.market.source.confirm": "Confirm",
                        "ui.market.source.current": "Current Source",
                        "ui.market.source.delete": "Delete",
                        "ui.market.source.deleted": "Source deleted: ",
                        "ui.market.source.done": "Finish",
                        "ui.market.source.empty": "No custom sources",
                        "ui.market.source.extraPlaceholder": "Add proxy URL...",
                        "ui.market.source.fetch": "Fetch Info",
                        "ui.market.source.fetchFail": "Fetch failed: ",
                        "ui.market.source.fetching": "Fetching...",
                        "ui.market.source.invalid": "Invalid source format (need title / organization / url / list)",
                        "ui.market.source.isDefault": "Default",
                        "ui.market.source.loadFail": "Load source config failed: ",
                        "ui.market.source.loadFrom": "Loading from current source...",
                        "ui.market.source.noList": "Source returned empty list",
                        "ui.market.source.official": "Official",
                        "ui.market.source.org": "Organization",
                        "ui.market.source.packCount": "Packs",
                        "ui.market.source.retry": "Re-enter",
                        "ui.market.source.setDefault": "Set Default",
                        "ui.market.source.stepBase": "Step 1: Add Base Source",
                        "ui.market.source.stepConfirm": "Step 2: Confirm Source Info",
                        "ui.market.source.stepUrls": "Step 3: Backup URLs (https:// auto-added)",
                        "ui.market.source.title": "Market Sources",
                        "ui.market.source.urlCount": "URLs",
                        "ui.de.allowOther": "Enable Other",

                    }}
                ];
                for (var dpi = 0; dpi < defaultPacks.length; dpi++) {
                    var dp = defaultPacks[dpi];
                    var dpPath = langDir + "/" + dp.id + ".json";
                    try {
                        await ctx.callTool("read_file", { path: dpPath });
                    } catch(e) {
                        var dpContent = JSON.stringify({ id: dp.id, author: "Questionnaire", version: _PLUGIN_VER, displayname: dp.displayname, lang: dp.lang }, null, 2);
                        await ctx.callTool("write_file", { path: dpPath, content: dpContent });
                    }
                    packs.push({ id: dp.id, path: dpPath, displayName: dp.id === "zh_cn" ? "简体中文" : "English (US)", author: "Questionnaire", lang: dp.lang || null });
                }
            }
            langPacksState[1](packs);
            forceRerenderAsync(); // 用 macrotask 延迟触发重绘，确保脱离 await 上下文后被 Compose 识别
            showSnack(_t("ui.setting.foundPacks").replace("%d", String(packs.length)));
        } catch(e) {
            showSnack(_t("ui.setting.scanFail") + String(e));
        }
        langScanningState[1](false);
        forceRerenderAsync();
    }

    // 强制重绘：异步回调（await 后）setState 脱离 action 窗口不触发 Compose 重绘，
    // 用 tickState bump 强制整页重绘。计数器 _forceTick 在模块级（保证跨渲染递增）。
    function forceRerender() { _forceTick++; tickState[1](_forceTick); }
    // 异步安全重绘：await 后 setState 可能在同 action 窗口内被合并/忽略，
    // 用 macrotask 延迟到当前调用栈清空后再 bump tick，确保触发真正的新一帧重绘。
    function forceRerenderAsync() { setTimeout(function () { forceRerender(); }, 0); }

    // 语言切换：纯同步流程（语言包内容已在 scanLangPacks 时缓存进 langPacksState）
    // 用户切换语言 → 按钮监听触发 → 修改指向语言包的环境变量 → 修改 state 以重绘
    // 整个过程在 onClick 同步段内完成，setState 自然驱动 Compose 重绘，不需要 async/forceRerender
    function selectLangPack(fp) {
        var newId = "";
        if (fp) {
            var _fpParts = String(fp).split("/").pop() || "";
            newId = _fpParts.replace(".json", "");
        }
        // 从扫描结果缓存里找该语言包内容（同步，不读文件）
        var _newLang = null;
        var _newDisp = null;
        var packsArr = langPacksState[0];
        if (packsArr && Array.isArray(packsArr)) {
            for (var pi2 = 0; pi2 < packsArr.length; pi2++) {
                if (packsArr[pi2].path === fp) {
                    _newLang = packsArr[pi2].lang || null;
                    _newDisp = _resolveLangDisplayName(packsArr[pi2].displayName, packsArr[pi2].id, newId);
                    break;
                }
            }
        }
        // 兜底：缓存没有 displayname（可能是纯字符串），用内置友好名/地区码/id 解析
        if (!_newDisp) _newDisp = _resolveLangDisplayName(null, newId, newId);
        // 1) 修改指向语言包的环境变量
        Tools.SoftwareSettings.writeEnvironmentVariable("QUESTIONNAIRE_LANG_PATH", fp || "");
        // 2) 修改 state 以重绘（全部同步，setState 自然触发 Compose 重绘）
        _currentPackDisplayName = _newDisp;
        currentLangPathState[1](fp || "");
        if (_newLang) {
            _settingsLang = _newLang;
            settingsLangState[1](_newLang);
            showSnack(_t("ui.setting.switched"));
            return;
        }
        langPacksState[1](null);
        _settingsLang = null;
        settingsLangState[1](null);
        scanLangPacks();
    }

    // ===== 方案管理区（保存/导入外观+行为设置，语言包除外） =====
    var schemesState = ctx.useState("_schemes", null);
    var schemeInputState = ctx.useState("_schemeInput", "");
    var schemeNameState = ctx.useState("_schemeName", "");
    var schemeVerState = ctx.useState("_schemeVer", "");
    var schemeExpandState = ctx.useState("_schemeExpand", "");
    var schemesLoadedState = ctx.useState("_schemesLoaded", false);
    var schemesLoadingState = ctx.useState("_schemesLoading", false);
    var schemesReloadState = ctx.useState("_schemesReload", 0); // 方案列表专用刷新计数：每次加载完成+1，renderSchemePage 读取它确保被订阅，bump 触发本页重绘
    function _readAllCurrentItems() {
        var items = {};
        for (var i = 0; i < _SETTING_DEFS.length; i++) {
            var f = _SETTING_DEFS[i].field;
            var sm = _STATE_MAP[f];
            items[_SETTING_DEFS[i].env] = sm ? sm.read() : "";
        }
        return items;
    }
    // 方案的可读描述（用户化展示，不暴露工程化参数串）
    // 复用既有 label 函数，把 field=value 转成中文片段，用 · 连接
    // 题型 id → 中文标签（复用于题型过滤器 / 方案描述）
    function _typeLabel(tid) {
        var lm = {
            "single": _t("ui.setting.type.single"), "multiple": _t("ui.setting.type.multiple"),
            "text": _t("ui.setting.type.text"), "textarea": _t("ui.setting.type.textarea"),
            "rating": _t("ui.setting.type.rating"), "likert": _t("ui.setting.type.likert"),
            "nps": _t("ui.setting.type.nps"), "time": _t("ui.setting.type.time")
        };
        return lm[tid] || tid;
    }
    function _describeSchemeItems(items) {
        var clean = _sanitizeSchemeItems(items);
        var parts = [];
        for (var i = 0; i < _SETTING_DEFS.length; i++) {
            var field = _SETTING_DEFS[i].field;
            var val = clean[_SETTING_DEFS[i].env];
            if (val == null) continue;
            var label = _fieldValueLabel(field, String(val));
            if (label) parts.push(label);
        }
        return parts.join(" · ");
    }
    function _fieldValueLabel(field, sv) {
        var tm = { "classic": _themeLabel("classic"), "compact": _themeLabel("compact") };
        if (field === "theme") return tm[sv] || "";
        var bl = { "row": _layoutLabel("row"), "scroll": _layoutLabel("scroll") };
        if (field === "buttonLayout") return bl[sv] || "";
        var ql = { "continuous": _questionLayoutLabel("continuous"), "compact": _questionLayoutLabel("compact") };
        if (field === "layout") return ql[sv] || "";
        var lm = {
            "timeMode": { "picker": _t("ui.setting.timePicker"), "input": _t("ui.setting.timeInput") },
            "displayMode": { "normal": _t("ui.setting.displayNormal"), "hidden": _t("ui.setting.displayHidden"), "blocked": _t("ui.setting.displayBlocked") },
            "strictMode": { "true": _t("ui.setting.strictEnabled"), "false": _t("ui.setting.strictDisabled") },
            "historyEnabled": { "true": _t("ui.setting.enabled"), "false": _t("ui.setting.disabled") },
        };
        var m = lm[field];
        if (m) return m[sv] || "";
        if (field === "questionFilter") {
            try {
                var qf = JSON.parse(sv);
                if (qf && qf.useGlobal) return _t("ui.setting.qf.useGlobal");
                var lbls = [];
                if (qf) {
                    for (var ti = 0; ti < qf.types.length; ti++) lbls.push(_typeLabel(qf.types[ti]));
                }
                if (typeof qf.allowRequired === "boolean") lbls.push((qf.allowRequired ? "+" : "-") + _t("ui.setting.qf.required"));
                if (typeof qf.allowOther === "boolean") lbls.push((qf.allowOther ? "+" : "-") + _t("ui.setting.qf.other"));
                return lbls.join(" ");
            } catch (e) { return ""; }
        }
        if (field === "compileBlacklist") {
            try {
                var bl = JSON.parse(sv);
                if (Array.isArray(bl) && bl.length > 0) return _t("ui.setting.blocklist.title") + " " + bl.length + _t("ui.setting.blocklist.count");
                return _t("ui.setting.blocklist.none");
            } catch (e) { return _t("ui.setting.blocklist.none"); }
        }
        return "";
    }
    // 应用方案 items 到 state + env（写 state 触发重绘，写 env 持久化）
    function applySchemeItems(items) {
        var clean = _sanitizeSchemeItems(items);
        for (var i = 0; i < _SETTING_DEFS.length; i++) {
            var f = _SETTING_DEFS[i].field;
            var env = _SETTING_DEFS[i].env;
            var sm = _STATE_MAP[f];
            if (sm && clean[env] != null) {
                sm.write(clean[env]);
                try { Tools.SoftwareSettings.writeEnvironmentVariable(env, String(clean[env])); } catch(e) {}
            }
        }
        forceRerender();
    }
    // 列出已保存方案
    // 关键：onClick 必须 return 本函数的 Promise（loadSchemeList 是异步，return 后宿主保持 action 窗口，
    // 结尾的 setState 才能触发 UI 重绘 —— 文档 3.4：异步数据更新必须返回 Promise 给宿主）
    function loadSchemeList() {
        schemesLoadingState[1](true); // 同步 setState，onClick/onLoad 窗口内触发重绘显示"加载中"
        return ctx.callTool("make_directory", { path: _SCHEME_DIR, create_parents: true })
            .then(function () { return ctx.callTool("list_files", { path: _SCHEME_DIR }); })
            .then(function (dir) {
                var entries = [];
                if (dir && dir.entries) entries = dir.entries;
                else if (dir && dir.data && dir.data.entries) entries = dir.data.entries;
                else if (Array.isArray(dir)) entries = dir;
                var list = [];
                var reads = [];
                for (var i = 0; i < entries.length; i++) {
                    var en = entries[i];
                    var enName = typeof en === "string" ? en : (en.name || en.path || "");
                    if (enName.endsWith(".json")) {
                        (function (fn) {
                            reads.push(ctx.callTool("read_file", { path: _SCHEME_DIR + "/" + fn })
                                .then(function (raw) {
                                    var content = raw && raw.content ? raw.content.replace(/^\s*\d+\|/gm, "") : "";
                                    try {
                                        var parsed = JSON.parse(content);
                                        if (parsed && parsed.items) list.push({
                                            file: fn,
                                            name: parsed.name || fn.replace(".json", ""),
                                            description: parsed.description || "",
                                            version: parsed.version || _SCHEME_VERSION,
                                            items: parsed.items,
                                            createdAt: parsed.createdAt || 0
                                        });
                                    } catch(e) {}
                                }));
                        })(enName);
                    }
                }
                return Promise.all(reads).then(function () {
                    list.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
                    schemesState[1](list);
                    schemesLoadingState[1](false);
                    // 此 .then 在 onClick return 的 Promise 链内，setState 会随 action 窗口触发重绘
                });
            });
    }
    // 保存当前外观+行为设置为方案
    function saveCurrentScheme() {
        var name = (schemeNameState[0] || "").trim();
        if (!name) {
            showSnack(_t("ui.setting.scheme.nameReq"));
            return;
        }
        var items = _readAllCurrentItems();
        var scheme = {
            name: name,
            version: _SCHEME_VERSION,
            description: "",
            createdAt: Date.now(),
            items: items
        };
        var fileName = "scheme_" + Date.now() + ".json";
        return ctx.callTool("make_directory", { path: _SCHEME_DIR, create_parents: true })
            .then(function () {
                return ctx.callTool("write_file", { path: _SCHEME_DIR + "/" + fileName, content: JSON.stringify(scheme, null, 2) });
            })
            .then(function () {
                schemeNameState[1]("");
                schemesLoadedState[1](false);
                schemesState[1](null);
                showSnack("已保存方案「" + name + "」");
                return loadSchemeList();
            })
            .catch(function (e) { showSnack(_t("ui.setting.saveFail") + String(e)); });
    }
    // 应用某个已保存方案
    function applySavedScheme(scheme) {
        applySchemeItems(scheme.items);
        showSnack("已应用方案「" + (scheme.name || scheme.file) + "」");
    }
    // 删除某个方案文件
    function deleteScheme(scheme) {
        // return Promise 给宿主：保持 action 窗口，.then 里的 schemesState[1] 才能触发 UI 重绘（文档 3.4）
        return ctx.callTool("delete_file", { path: _SCHEME_DIR + "/" + scheme.file }).then(function () {
            var arr = schemesState[0] || [];
            var narr = [];
            for (var i = 0; i < arr.length; i++) if (arr[i].file !== scheme.file) narr.push(arr[i]);
            schemesState[1](narr);
            showSnack(_t("ui.setting.scheme.deleted"));
        }).catch(function (e) {
            showSnack(_t("ui.setting.scheme.deleFail") + String(e));
        });
    }
    // 导出当前配置为一键字符串
    function exportSchemeString() {
        var items = _readAllCurrentItems();
        var s = _serializeSchemeItems(items);
        schemeVerState[1](s);
        schemeExpandState[1]("export");
        forceRerender();
        // 导出即自动复制到剪贴板（免去独立复制按钮/翻译键）
        copySchemeToClipboard(s);
    }
    // 通过 Java 桥复制文本到系统剪贴板
    function copySchemeToClipboard(text) {
        try {
            try {
                var ctx = Java.getContext();
                var cm = ctx.getSystemService("clipboard");
                var ClipData = Java.type("android.content.ClipData");
                cm.setPrimaryClip(ClipData.newPlainText("scheme", String(text)));
            } catch (e2) {
                // 兜底：直接反射路径
                var CM = Java.type("android.content.ClipboardManager");
                var c2 = Java.getContext().getSystemService("clipboard");
                var CD2 = Java.type("android.content.ClipData");
                c2.setPrimaryClip(CD2.newPlainText("scheme", String(text)));
            }
            showSnack(_t("ui.setting.scheme.copied"));
            return true;
        } catch (e) {
            showSnack(_t("ui.setting.scheme.copyFail") + String(e && e.message ? e.message : e));
            return false;
        }
    }
    // 从一键字符串导入
    function importSchemeFromString() {
        var raw = (schemeInputState[0] || "").trim();
        var items = _parseSchemeString(raw);
        if (Object.keys(items).length === 0) {
            showSnack(_t("ui.setting.scheme.importInvalid"));
            return;
        }
        applySchemeItems(items);
        schemeInputState[1]("");
        showSnack(_t("ui.setting.scheme.imported"));
    }
    // 渲染方案管理子页
    function renderSchemePage() {
        var _reloadFlag = schemesReloadState[0]; // 读取刷新计数：确保本页订阅该 state，bump 后必重绘
        var schemeNodes = [];
        schemeNodes.push(renderSubHeader(_t("ui.setting.scheme.title")));
        schemeNodes.push(renderSnackbar());
        // 保存当前设置
        schemeNodes.push(ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
            ctx.UI.Column({ padding: 16, spacing: 8 }, [
                ctx.UI.Text({ text: _t("ui.setting.scheme.saveTitle"), style: "titleSmall", color: onSurface }),
                ctx.UI.Row({ fillMaxWidth: true, spacing: 8 }, [
                    ctx.UI.Column({ weight: 1 }, [
                        ctx.UI.TextField({
                            value: schemeNameState[0],
                            onValueChange: function (v) { schemeNameState[1](v); },
                            placeholder: _t("ui.setting.scheme.namePlaceholder"),
                            singleLine: true
                        }),
                    ]),
                    ctx.UI.Button({ onClick: saveCurrentScheme, content: ctx.UI.Text({ text: _t("ui.setting.scheme.saveBtn"), style: "labelMedium", color: ctx.MaterialTheme.colorScheme.onPrimary }) }),
                ]),
                ctx.UI.Divider({ thickness: 0.5, color: onSurfaceVariant.copy({ alpha: 0.3 }) }),
                // 一键导出
                ctx.UI.Row({ fillMaxWidth: true, horizontalArrangement: "spaceBetween", verticalAlignment: "center" }, [
                    ctx.UI.Text({ text: _t("ui.setting.scheme.exportTitle"), style: "bodyMedium", color: onSurface }),
                    ctx.UI.OutlinedButton({ onClick: exportSchemeString, content: ctx.UI.Text({ text: _t("ui.setting.scheme.exportBtn"), style: "labelSmall" }) }),
                ]),
            ]),
        ]));
        if (schemeExpandState[0] === "export" && schemeVerState[0]) {
            schemeNodes.push(ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
                ctx.UI.Column({ padding: 16, spacing: 8 }, [
                    ctx.UI.Text({ text: _t("ui.setting.scheme.exportResult"), style: "labelSmall", color: onSurfaceVariant }),
                    ctx.UI.Text({ text: schemeVerState[0], style: "bodySmall", color: onSurface, maxLines: 3, overflow: "ellipsis" }),
                ]),
            ]));
        }
        // 一键导入
        schemeNodes.push(ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
            ctx.UI.Column({ padding: 16, spacing: 8 }, [
                ctx.UI.Text({ text: _t("ui.setting.scheme.importTitle"), style: "titleSmall", color: onSurface }),
                ctx.UI.TextField({
                    value: schemeInputState[0],
                    onValueChange: function (v) { schemeInputState[1](v); },
                    placeholder: _t("ui.setting.scheme.importPlaceholder"),
                }),
                ctx.UI.Button({ onClick: importSchemeFromString, fillMaxWidth: true, containerColor: primary, content: ctx.UI.Text({ text: _t("ui.setting.scheme.importBtn"), style: "labelMedium", color: ctx.MaterialTheme.colorScheme.onPrimary }) }),
            ]),
        ]));
        // 已保存方案列表
        schemeNodes.push(ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
            ctx.UI.Column({ padding: 16, spacing: 8 }, [
ctx.UI.Row({ fillMaxWidth: true, horizontalArrangement: "spaceBetween", verticalAlignment: "center" }, [
                    ctx.UI.Text({ text: _t("ui.setting.scheme.listTitle"), style: "titleSmall", color: onSurface }),
                    ctx.UI.IconButton({ icon: "refresh", tint: "onSurfaceVariant", onClick: function () { schemesState[1](null); return loadSchemeList(); } }),
                ]),
            ]),
        ]));
        if ((schemesState[0] || []).length === 0) {
            schemeNodes.push(ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
                ctx.UI.Column({ padding: 16, spacing: 8 }, [
                    ctx.UI.Text({ text: _t("ui.setting.scheme.empty"), style: "bodyMedium", color: onSurfaceVariant }),
                    ctx.UI.Text({ text: _t("ui.setting.scheme.emptyHint"), style: "bodySmall", color: onSurfaceVariant }),
                ]),
            ]));
        } else {
            var sl = schemesState[0];
            for (var si = 0; si < sl.length; si++) {
                (function (sc) {
                    schemeNodes.push(ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
                        ctx.UI.Column({ padding: 14, spacing: 6 }, [
                            ctx.UI.Row({ fillMaxWidth: true, horizontalArrangement: "spaceBetween", verticalAlignment: "center" }, [
                                ctx.UI.Text({ text: sc.name, style: "titleSmall", color: onSurface, maxLines: 1, overflow: "ellipsis" }),
                                ctx.UI.Row({ spacing: 6 }, [
                                    ctx.UI.OutlinedButton({ onClick: function () { applySavedScheme(sc); }, content: ctx.UI.Text({ text: _t("ui.setting.scheme.applyBtn"), style: "labelSmall" }) }),
                                    ctx.UI.OutlinedButton({ onClick: function () { return deleteScheme(sc); }, content: ctx.UI.Text({ text: _t("ui.setting.scheme.deleteBtn"), style: "labelSmall" }) }),
                                ]),
                            ]),
                            ctx.UI.Text({ text: _describeSchemeItems(sc.items), style: "bodySmall", color: onSurfaceVariant, maxLines: 2, overflow: "ellipsis" }),
                        ]),
                    ]));
                })(sl[si]);
            }
        }
        return ctx.UI.LazyColumn({ fillMaxSize: true, spacing: 12, padding: { horizontal: 16, top: 8, bottom: 24 }, onLoad: function () { var p = loadNotice(); if (!schemesState[0]) p = p.then(function () { return loadSchemeList(); }); return p; } }, schemeNodes);
    }

    var ASK_DIR_LIST = "/sdcard/Download/Operit/questionnaire/userask";
    function loadDraftList() {
        if (draftsScanning) return;
        draftsScanningState[1](true);
        draftsState[1](null);
        return ctx.callTool("make_directory", { path: ASK_DIR_LIST, create_parents: true })
            .then(function () { return ctx.callTool("list_files", { path: ASK_DIR_LIST }); })
            .then(function (dir) {
                var entries = [];
                if (dir && dir.entries) entries = dir.entries;
                else if (dir && dir.data && dir.data.entries) entries = dir.data.entries;
                else if (Array.isArray(dir)) entries = dir;
                else if (dir && Array.isArray(dir.data)) entries = dir.data;
                else if (dir && Array.isArray(dir.files)) entries = dir.files;
                var chain = Promise.resolve();
                var out = [];
                for (var di = 0; di < entries.length; di++) {
                    (function (entry) {
                        var name = typeof entry === "string" ? entry : (entry.name || entry.path || "");
                        if (typeof name !== "string" || !name.endsWith(".json")) return;
                        var fid = name.replace(/\.json$/, "").split("/").pop();
                        chain = chain.then(function () {
                            return ctx.callTool("read_file", { path: ASK_DIR_LIST + "/" + fid + ".json" }).then(function (fr) {
                                try {
                                    var fc = String((fr && fr.content) || "").replace(/^\s*\d+\|/gm, "");
                                    var fo = JSON.parse(fc);
                                    if (fo && fo.id) {
                                        out.push({ id: fo.id, title: fo.title || "", status: fo.status || "draft", questions: fo.questions || [], updatedAt: fo.updatedAt || fo.createdAt || 0, raw: fo });
                                    }
                                } catch (e) {}
                            }).catch(function () {});
                        });
                    })(entries[di]);
                }
                return chain.then(function () {
                    out.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
                    draftsState[1](out);
                    draftsScanningState[1](false);
                    forceRerender();
                });
            })
            .catch(function (e) {
                draftsState[1]([]);
                draftsScanningState[1](false);
                forceRerender();
                showSnack(_t("ui.setting.draftsFail") + String(e));
            });
    }
    function deleteDraft(id) {
        return ctx.callTool("delete_file", { path: ASK_DIR_LIST + "/" + id + ".json" })
            .then(function () {
                showSnack(_t("ui.setting.draftDeleted"));
                if (expandedDraftState[0] === id) expandedDraftState[1]("");
                loadDraftList();
            })
            .catch(function (e) { showSnack(_t("ui.setting.draftDelFail") + String(e)); });
    }
    function editDraft(id) {
        // 单一实例编辑：先写环境变量记录要编辑的草稿 id（navigate 第二参不会传给子页面 ctx.params，
        // 参考 openbridge 用 active 状态传递的模式），再 navigate 进入编辑器
        try {
            if (typeof Tools !== "undefined" && Tools.SoftwareSettings && typeof Tools.SoftwareSettings.writeEnvironmentVariable === "function") {
                Tools.SoftwareSettings.writeEnvironmentVariable("QUESTIONNAIRE_EDIT_DRAFT", id);
            }
        } catch (e) {}
        try {
            if (typeof ctx.navigate === "function") {
                ctx.navigate("toolpkg:com.operit.questionnaire.fix:ui:draft_editor", {});
            } else {
                showSnack("navigate 不可用");
            }
        } catch (e) { showSnack(_t("ui.setting.draftEditHint") + id); }
    }
    var _draftStatusLabel = function (s) {
        if (s === "done") return _t("ui.setting.draftDone");
        if (s === "ready") return _t("ui.setting.draftReady");
        return _t("ui.setting.draftPending");
    };
    function renderDraftsSection() {
        var nodes = [];
        nodes.push(ctx.UI.Text({ text: _t("ui.setting.drafts"), style: "titleSmall", color: onSurface }));
        nodes.push(ctx.UI.Row({ fillMaxWidth: true, verticalAlignment: "center", horizontalArrangement: "spaceBetween" }, [
            ctx.UI.Text({ text: _t("ui.setting.draftsDesc"), style: "bodySmall", color: onSurfaceVariant }),
            ctx.UI.IconButton({
                icon: "refresh",
                onClick: loadDraftList,
                enabled: !draftsScanning,
            }),
        ]));
        if (draftsScanning) {
            nodes.push(ctx.UI.Row({ verticalAlignment: "center", horizontalArrangement: "center", fillMaxWidth: true, spacing: 8, padding: { vertical: 8 } }, [
                ctx.UI.CircularProgressIndicator({ strokeWidth: 2, color: primary, modifier: { size: 16 } }),
                ctx.UI.Text({ text: _t("ui.setting.draftsScanning"), style: "bodySmall", color: onSurfaceVariant }),
            ]));
        } else if (!drafts || drafts.length === 0) {
            nodes.push(ctx.UI.Text({ text: _t("ui.setting.draftsEmpty"), style: "bodySmall", color: onSurfaceVariant, padding: { vertical: 6 } }));
        } else {
            for (var dni = 0; dni < drafts.length; dni++) {
                (function (d) {
                    var isOpen = expandedDraftState[0] === d.id;
                    nodes.push(ctx.UI.Card({ fillMaxWidth: true, containerColor: "surfaceContainer" }, [
                        ctx.UI.Column({ padding: 10, spacing: 6 }, [
                            // 单条草稿整体 LazyRow：标题列 + 操作按钮横向滚动，标题过长时按钮不被挤出
                            ctx.UI.LazyRow({ fillMaxWidth: true, verticalAlignment: "center", spacing: 8 }, [
                                ctx.UI.Column({ spacing: 1 }, [
                                    ctx.UI.Text({ text: d.title || "(无标题)", style: "bodyMedium", fontWeight: "bold", maxLines: 1, overflow: "ellipsis" }),
                                    ctx.UI.Text({ text: d.id + " · " + _draftStatusLabel(d.status) + " · " + d.questions.length + " " + _t("ui.setting.draftsCount"), style: "labelSmall", color: onSurfaceVariant }),
                                ]),
                                ctx.UI.IconButton({ icon: "visibility", onClick: function () { expandedDraftState[1](isOpen ? "" : d.id); } }),
                                ctx.UI.IconButton({ icon: "edit", onClick: function () { editDraft(d.id); } }),
                                ctx.UI.IconButton({ icon: "delete", onClick: function () { deleteDraft(d.id); } }),
                            ]),
                            isOpen ? ctx.UI.Column({ spacing: 4 }, d.questions.map(function (q, qi) {
                                var filled = (q.answer !== null && q.answer !== undefined && q.answer !== "");
                                return ctx.UI.Row({ fillMaxWidth: true, verticalAlignment: "center", horizontalArrangement: "spaceBetween", spacing: 4, padding: { top: 2 } }, [
                                    ctx.UI.Text({ text: (qi + 1) + ". " + q.question + (q.required ? " *" : ""), style: "bodySmall", maxLines: 2, overflow: "ellipsis" }),
                                    ctx.UI.Text({ text: filled ? _t("ui.setting.draftFilled") : _t("ui.setting.draftUnfilled"), style: "labelSmall", color: filled ? primary : onSurfaceVariant }),
                                ]);
                            })) : null,
                        ]),
                    ]));
                })(drafts[dni]);
            }
        }
        return ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
            ctx.UI.Column({ padding: 16, spacing: 8 }, nodes),
        ]);
    }

    function renderLangPacksSection() {
        return ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
            ctx.UI.Column({ padding: 16, spacing: 8 }, [
                ctx.UI.Text({ text: _t("ui.setting.lang",), style: "titleSmall", color: onSurface }),
                ctx.UI.Text({ text: currentLangPathState[0] ? _t("ui.setting.currentPack") + _currentLangName() : _t("ui.setting.lang.current") + "：" + _t("ui.setting.builtinLang"), style: "bodySmall", color: onSurfaceVariant }),
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
                        content: ctx.UI.Text({ text: (isActive ? "" : "") + p.displayName + (p.author ? " — " + p.author : "") + " (" + p.id + ")", style: "labelMedium", color: isActive ? ctx.MaterialTheme.colorScheme.onPrimary : onSurface }),
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
            ctx.UI.Text({ text: _t("ui.setting.pluginInfo") + "v1.8.0", style: "bodySmall", color: onSurfaceVariant }),
            ctx.UI.Text({ text: _t("ui.setting.supportedTypes"), style: "bodySmall", color: onSurfaceVariant }),
            ctx.UI.Text({ text: _t("ui.setting.supportedFeatures"), style: "bodySmall", color: onSurfaceVariant }),
            ctx.UI.Spacer({ height: 8 }),
            ctx.UI.Text({ text: _t("ui.setting.author") + "liu-baia", style: "bodySmall", color: onSurfaceVariant }),
            ctx.UI.Text({ text: _t("ui.setting.modder") + "yyswys-yjyj", style: "bodySmall", color: onSurfaceVariant }),
            ctx.UI.Text({ text: _t("ui.setting.lang.author") + (function(){ try { var cp = currentLangPathState[0]; if (cp && langPacksState[0]) { for(var pi=0;pi<langPacksState[0].length;pi++){ if(langPacksState[0][pi].path===cp) return langPacksState[0][pi].author || ""; } } } catch(e){} return ""; })(), style: "bodySmall", color: onSurfaceVariant }),
            ctx.UI.Text({ text: _t("ui.setting.based"), style: "bodySmall", color: onSurfaceVariant }),
        ]),
    ]);

    // ===== 公告区（最顶层横幅）=====
    // 远程 JSON 格式：{"status": true, "connect": "公告内容"}；status=true 才显示，connect 为显示内容
    var _noticeUrls = [
        "https://raw.githubusercontent.com/yyswys-yjyj/questionnaire/refs/heads/main/api/notice.json",
        "https://cdn.jsdelivr.net/gh/yyswys-yjyj/questionnaire@main/api/notice.json",
        "https://cdn.serveryyswys.top/cdn/github/yyswys-yjyj/toolpkg-uno/refs/heads/main/api/notice.json"
    ];
    async function loadNotice() {
        if (noticeLoadedState[0]) return Promise.resolve();
        for (var ni = 0; ni < _noticeUrls.length; ni++) {
            try {
                var res = await ctx.callTool("http_request", { url: _noticeUrls[ni], method: "GET" });
                // 兼容多种返回格式（同 market 页处理）：裸字符串 / {content} / {data} / {data:{content}}
                var txt = "";
                if (res && typeof res === "string") txt = res;
                else if (res && res.content) txt = String(res.content);
                else if (res && res.data && typeof res.data === "string") txt = res.data;
                else if (res && res.data && res.data.content) txt = String(res.data.content);
                txt = String(txt || "").trim();
                if (!txt) continue;
                var obj = JSON.parse(txt);
                if (obj && (obj.status === true || obj.status === "true") && obj.connect) {
                    noticeState[1](String(obj.connect));
                    noticeLoadedState[1](true);
                    forceRerender();
                    return;
                }
            } catch (e) {}
        }
        noticeLoadedState[1](true); // 全部失败/未启用：标记已加载，避免重复请求
        forceRerender();
        return;
    }

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
        var currentVer = String(_PLUGIN_VER); // hex 比较版本号（如 180）
        var fmtCur = hexVerToStr(currentVer); // 展示统一十进制（1.8.0）
        var si = versionSourceState[0];
        if (si < 0 || si >= _versionUrls.length) { si = 2; }
        try {
            var res = await ctx.callTool("http_request", { url: _versionUrls[si], method: "GET" });
            var content = res && res.content ? String(res.content).trim().toUpperCase() : "";
            if (content === String(currentVer).toUpperCase()) {
                versionCheckState[1]("done");
                versionInfoState[1](_t("ui.setting.latestVerText") + fmtCur + _t("ui.setting.lparen") + _versionSourceLabels[si] + _t("ui.setting.rparen"));
                forceRerender();
                return;
            } else if (content) {
                versionCheckState[1]("done");
                versionInfoState[1](_t("ui.setting.newVerText") + hexVerToStr(content) + _t("ui.setting.lparen") + _t("ui.setting.currentVerText") + fmtCur + _t("ui.setting.sourceText") + _versionSourceLabels[si] + _t("ui.setting.rparen"));
                forceRerender();
                return;
            }
        } catch(e) {}
        versionCheckState[1]("done");
        versionInfoState[1](_t("ui.setting.checkFail") + _versionSourceLabels[si] + _t("ui.setting.unavailable"));
        forceRerender();
    }

    var versionCheckCard = ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
        ctx.UI.Column({ padding: 16, spacing: 8 }, [
            ctx.UI.Text({ text: _t("ui.setting.versionCheck"), style: "titleSmall", color: onSurface }),
            ctx.UI.Text({ text: _t("ui.setting.currentVerText") + "1.8.0", style: "bodyMedium", color: onSurfaceVariant }),
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
                    var currentVerNum = _PLUGIN_VER; // hex 比较版本号
                    for (var ei = 0; ei < parsed.list.length; ei++) {
                        var entry = parsed.list[ei];
                        if (ei > 0) lines.push("---");
                        lines.push("# " + (entry.version || _t("ui.setting.unknownVer")) + " (" + (entry.currentVer ? hexVerToStr(entry.currentVer) : "?") + ")");
                        if (entry.details) lines.push(entry.details);
                        if (entry.currentVer && hexVerNum(entry.currentVer) > hexVerNum(currentVerNum)) {
                            if (newLines.length > 0) newLines.push("---");
                            newLines.push("# " + (entry.version || _t("ui.setting.unknownVer")) + " (" + hexVerToStr(entry.currentVer) + ")");
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
                    forceRerender();
                    return;
                }
            }
        } catch(e) {}
        changelogState[1]("done");
        changelogContentState[1](_t("ui.setting.fetchFail") + _changelogLabels[si] + _t("ui.setting.unavailable"));
        forceRerender();
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

    // ===== 整体布局（子页路由） =====
    var _noticeCard = (notice && !noticeHiddenState[0]) ? ctx.UI.Card({ fillMaxWidth: true, containerColor: "primaryContainer" }, [
        ctx.UI.Row({ fillMaxWidth: true, verticalAlignment: "center", spacing: 8, padding: { horizontal: 14, vertical: 8 }, horizontalArrangement: "spaceBetween" }, [
            ctx.UI.Column({ weight: 1 }, [
                ctx.UI.Row({ verticalAlignment: "center", spacing: 6 }, [
                    ctx.UI.Icon({ name: "campaign", size: 18, tint: "onPrimaryContainer" }),
                    ctx.UI.Text({ text: notice, style: "bodyMedium", color: "onPrimaryContainer", maxLines: 4, overflow: "ellipsis" }),
                ]),
            ]),
            ctx.UI.IconButton({ icon: "close", tint: "onPrimaryContainer", onClick: function () { noticeHiddenState[1](true); } }),
        ]),
    ]) : null;

    // ---- 仪表盘统计：读取 history 目录，统计已填写问卷缓存数 ----
    function loadHomeStats() {
        if (homeStatsLoadedState[0]) return Promise.resolve();
        homeStatsLoadedState[1](true);
        var histDir = "/sdcard/Download/Operit/questionnaire/history";
        return ctx.callTool("make_directory", { path: histDir, create_parents: true })
            .then(function () { return ctx.callTool("list_files", { path: histDir }); })
            .then(function (dir) {
                var entries = [];
                if (dir && dir.entries) entries = dir.entries;
                else if (dir && dir.data && dir.data.entries) entries = dir.data.entries;
                else if (Array.isArray(dir)) entries = dir;
                else if (dir && Array.isArray(dir.data)) entries = dir.data;
                var count = 0;
                for (var hi = 0; hi < entries.length; hi++) {
                    var hn = typeof entries[hi] === "string" ? entries[hi] : (entries[hi].name || entries[hi].path || "");
                    if (typeof hn === "string" && hn.endsWith(".json")) count++;
                }
                homeStatsState[1]({ filledCount: count });
                forceRerender();
            })
            .catch(function () { homeStatsState[1]({ filledCount: 0 }); forceRerender(); });
    }

    // ---- 子页头部：返回按钮 + 标题 ----
    function renderSubHeader(title) {
        return ctx.UI.Row({ fillMaxWidth: true, verticalAlignment: "center", spacing: 4 }, [
            ctx.UI.IconButton({ icon: "arrow_back", onClick: function () { pageState[1]("home"); } }),
            ctx.UI.Column({ weight: 1 }, [
                ctx.UI.Text({ text: title, style: "titleLarge", color: primary }),
            ]),
        ]);
    }

    // ---- 横幅消息：公告同款样式（primaryContainer 卡），showSnack 设置后显示在控制栏下方，3s 自动消失 ----
    function renderSnackbar() {
        var msg = snackState[0];
        if (!msg) return null;
        return ctx.UI.Card({ fillMaxWidth: true, containerColor: "primaryContainer" }, [
            ctx.UI.Row({ fillMaxWidth: true, verticalAlignment: "center", spacing: 8, padding: { horizontal: 14, vertical: 8 }, horizontalArrangement: "spaceBetween" }, [
                ctx.UI.Column({ weight: 1 }, [
                    ctx.UI.Row({ verticalAlignment: "center", spacing: 6 }, [
                        ctx.UI.Icon({ name: "check_circle", size: 18, tint: "onPrimaryContainer" }),
                        ctx.UI.Text({ text: msg, style: "bodyMedium", color: "onPrimaryContainer", maxLines: 3, overflow: "ellipsis" }),
                    ]),
                ]),
                ctx.UI.IconButton({ icon: "close", tint: "onPrimaryContainer", onClick: function () { snackState[1](""); } }),
            ]),
        ]);
    }

    // ---- 当前语言显示名解析：优先 displayname 缓存，其次 langPacks 解析，最后地区码/id 兜底 ----
    function _currentLangName() {
        var cur = currentLangPathState[0] || "";
        if (!cur) return _t("ui.setting.builtinLang");
        var id = (cur.split("/").pop() || "").replace(".json", "");
        // 1) 切换/读取时缓存的 displayname 解析结果（模块级）
        if (_currentPackDisplayName) return _currentPackDisplayName;
        // 2) langPacks 扫描结果里的 displayName（已按 displayname→地区码解析）
        var packsArr = langPacksState[0];
        if (packsArr) {
            for (var pi = 0; pi < packsArr.length; pi++) {
                if (packsArr[pi].id === id && packsArr[pi].displayName) return packsArr[pi].displayName;
            }
        }
        // 3) 地区码格式兜底（zh_cn → zh-CN），id 兜底
        return _resolveLangDisplayName(null, id);
    }

    // ---- 功能入口定义（home 仪表盘） ----
    var _homeEntries = [
        { id: "scheme", icon: "save", title: _t("ui.setting.scheme.title"), desc: _t("ui.setting.scheme.desc") },
        { id: "appearance", icon: "palette", title: _t("ui.setting.page.appearance"), desc: _t("ui.setting.page.appearance.desc") },
        { id: "behavior", icon: "tune", title: _t("ui.setting.page.behavior"), desc: _t("ui.setting.page.behavior.desc") },
        { id: "preview", icon: "preview", title: _t("ui.setting.page.preview"), desc: _t("ui.setting.page.preview.desc") },
        { id: "lang", icon: "translate", title: _t("ui.setting.page.lang"), desc: _t("ui.setting.page.lang.desc") },
        { id: "drafts", icon: "edit_note", title: _t("ui.setting.page.drafts"), desc: _t("ui.setting.page.drafts.desc") },
        { id: "update", icon: "system_update", title: _t("ui.setting.page.update"), desc: _t("ui.setting.page.update.desc") },
        { id: "about", icon: "info", title: _t("ui.setting.page.about"), desc: _t("ui.setting.page.about.desc") },
    ];

    function renderHome() {
        var nodes = [];
        nodes.push(ctx.UI.Text({ text: _t("ui.setting.title"), style: "titleLarge", color: primary }));
        nodes.push(renderSnackbar());
        // 统计卡：已填写问卷 + 当前语言包
        nodes.push(ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
            ctx.UI.Row({ fillMaxWidth: true, verticalAlignment: "center", spacing: 12, padding: { horizontal: 16, vertical: 14 } }, [
                ctx.UI.Column({ weight: 1, spacing: 4 }, [
                    ctx.UI.Text({ text: _t("ui.setting.home.filled"), style: "labelMedium", color: onSurfaceVariant }),
                    homeStats ? ctx.UI.Text({
                        text: _t("ui.setting.home.filledCount").replace("%d", String(homeStats.filledCount)),
                        style: "headlineMedium", fontWeight: "bold", color: primary,
                    }) : ctx.UI.Row({ verticalAlignment: "center", spacing: 6 }, [
                        ctx.UI.CircularProgressIndicator({ strokeWidth: 2, color: primary, modifier: { size: 14 } }),
                        ctx.UI.Text({ text: "…", style: "bodyMedium", color: onSurfaceVariant }),
                    ]),
                ]),
                ctx.UI.Column({ weight: 1, spacing: 4 }, [
                    ctx.UI.Text({ text: _t("ui.setting.home.currentLang"), style: "labelMedium", color: onSurfaceVariant }),
                    ctx.UI.Row({ verticalAlignment: "center", spacing: 4 }, [
                        ctx.UI.Icon({ name: "translate", size: 16, tint: primary }),
                        ctx.UI.Text({
                            text: _currentLangName(),
                            style: "bodyLarge", fontWeight: "bold", color: onSurface, maxLines: 1, overflow: "ellipsis",
                        }),
                    ]),
                ]),
            ]),
        ]));
        // 公告（仅首页，位于仪表盘下方）
        nodes.push(_noticeCard);
        nodes.push(ctx.UI.Text({ text: _t("ui.setting.home.entries"), style: "titleMedium", color: onSurface, padding: { top: 6 } }));
        for (var hei = 0; hei < _homeEntries.length; hei++) {
            (function (e) {
                nodes.push(ctx.UI.Card({
                    fillMaxWidth: true,
                    containerColor: surfaceVariant,
                    modifier: ctx.Modifier.clickable(function () { pageState[1](e.id); }),
                }, [
                    ctx.UI.Row({ fillMaxWidth: true, verticalAlignment: "center", spacing: 12, padding: { horizontal: 14, vertical: 12 } }, [
                        ctx.UI.Icon({ name: e.icon, size: 22, tint: primary }),
                        ctx.UI.Column({ weight: 1, spacing: 2 }, [
                            ctx.UI.Text({ text: e.title, style: "bodyLarge", fontWeight: "bold", color: onSurface }),
                            ctx.UI.Text({ text: e.desc, style: "bodySmall", color: onSurfaceVariant, maxLines: 2, overflow: "ellipsis" }),
                        ]),
                        ctx.UI.Icon({ name: "chevron_right", size: 20, tint: onSurfaceVariant }),
                    ]),
                ]));
            })(_homeEntries[hei]);
        }
        return ctx.UI.LazyColumn({ fillMaxSize: true, spacing: 12, padding: { horizontal: 16, top: 16, bottom: 24 }, onLoad: function () { return Promise.all([loadNotice(), loadHomeStats()]); } }, nodes);
    }

    // ---- 子页 ----
    function renderAppearancePage() {
        return ctx.UI.LazyColumn({ fillMaxSize: true, spacing: 12, padding: { horizontal: 16, top: 8, bottom: 24 }, onLoad: function () { return loadNotice(); } }, [
            renderSubHeader(_t("ui.setting.page.appearance")),
            renderSnackbar(),
            appearanceSection,
        
        ]);
    }
    function renderPreviewPage() {
        return ctx.UI.LazyColumn({ fillMaxSize: true, spacing: 12, padding: { horizontal: 16, top: 8, bottom: 24 }, onLoad: function () { return loadNotice(); } }, [
            renderSubHeader(_t("ui.setting.page.preview")),
            renderSnackbar(),
            typePicker,
            previewCard,
        
        ]);
    }
    function renderBehaviorPage() {
        return ctx.UI.LazyColumn({ fillMaxSize: true, spacing: 12, padding: { horizontal: 16, top: 8, bottom: 24 }, onLoad: function () { return loadNotice(); } }, [
            renderSubHeader(_t("ui.setting.page.behavior")),
            renderSnackbar(),
            behaviorSection,
        
        ]);
    }
    function renderLangPage() {
        return ctx.UI.LazyColumn({ fillMaxWidth: true, spacing: 12, padding: { horizontal: 16, top: 8, bottom: 24 }, onLoad: function () { return loadNotice(); } }, [
            renderSubHeader(_t("ui.setting.page.lang")),
            renderSnackbar(),
            renderLangPacksSection(),
        
        ]);
    }
    function renderDraftsPage() {
        return ctx.UI.LazyColumn({ fillMaxSize: true, spacing: 12, padding: { horizontal: 16, top: 8, bottom: 24 }, onLoad: function () { return loadNotice(); } }, [
            renderSubHeader(_t("ui.setting.page.drafts")),
            renderSnackbar(),
            renderDraftsSection(),
        
        ]);
    }
    function renderUpdatePage() {
        return ctx.UI.LazyColumn({ fillMaxSize: true, spacing: 12, padding: { horizontal: 16, top: 8, bottom: 24 }, onLoad: function () { return loadNotice(); } }, [
            renderSubHeader(_t("ui.setting.page.update")),
            renderSnackbar(),
            versionCheckCard,
            newFeatureCard,
            changelogCard,
        
        ]);
    }
    function renderAboutPage() {
        return ctx.UI.LazyColumn({ fillMaxSize: true, spacing: 12, padding: { horizontal: 16, top: 8, bottom: 24 }, onLoad: function () { return loadNotice(); } }, [
            renderSubHeader(_t("ui.setting.page.about")),
            renderSnackbar(),
            aboutCard,
        
        ]);
    }

    // ---- 路由 ----
    var _curPage = pageState[0];
    if (_curPage === "scheme") return renderSchemePage();
    if (_curPage === "appearance") return renderAppearancePage();
    if (_curPage === "preview") return renderPreviewPage();
    if (_curPage === "behavior") return renderBehaviorPage();
    if (_curPage === "lang") return renderLangPage();
    if (_curPage === "drafts") return renderDraftsPage();
    if (_curPage === "update") return renderUpdatePage();
    if (_curPage === "about") return renderAboutPage();
    return renderHome();
}
