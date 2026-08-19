// @ts-nocheck
// 语言包市场页 - 官方风格（参考 renju_sidepanel：字符串颜色 token + Card(primaryContainer) + Button(text)）
// ⚠️ srcCache 必须在 Screen 函数体外（模块级）：Compose DSL 每次渲染会重新执行 Screen，
// 函数体内的 var 每次渲染都被重置为空，导致"读到了自定义源但渲染永远看不到"。
// 模块级变量每次挂载重置（onLoad 会重新 loadSources 回填），挂载内多次渲染则稳定保留。
var srcCache = { list: [], def: "" };
export default async function Screen(ctx) {
    const { UI } = ctx;
    var langNames = { zh_cn: "简体中文", zh_tw: "繁体中文", en_us: "English (US)", ja_jp: "日本語", ko_kr: "한국어" };
    var currentVer = "180"; // 比较版本号：十六进制（1.8.0 → 180），展示统一十进制

    // 版本号规则：比较用十六进制（每段转 hex 拼接，如 1.8.0 → "180"，大小写均可），展示用十进制
    // normHexVer：数字（旧格式十进制拼接，如 176=1.7.6）或字符串（hex 或十进制串）→ 统一 hex 大写字符串
    function normHexVer(v) {
        if (v === null || v === undefined || v === "") return "";
        if (typeof v === "number") {
            var s = String(v);
            var segs = s.length >= 3 ? [s.slice(0, -2), s.slice(-2, -1), s.slice(-1)] : [s];
            var parts = [];
            for (var i = 0; i < segs.length; i++) parts.push(parseInt(segs[i], 10).toString(16));
            return parts.join("").toUpperCase();
        }
        return String(v).trim().toUpperCase();
    }
    // hex 版本号 → 数值（用于比较；拼接的 hex 高位段权重天然更大）
    function hexVerNum(v) { return parseInt(normHexVer(v), 16) || 0; }
    // hex 版本号 → 十进制展示串（1.8.0）。前两段各 1 位 hex，其余为末段
    function vs(v) {
        var h = normHexVer(v);
        if (!h) return "";
        var s1 = parseInt(h.charAt(0), 16) || 0;
        var s2 = h.length > 1 ? (parseInt(h.charAt(1), 16) || 0) : 0;
        var s3 = h.length > 2 ? (parseInt(h.substring(2), 16) || 0) : 0;
        return s1 + "." + s2 + "." + s3;
    }

    // ── 翻译 ──
    var _marketLang = null;
    try {
        var envLang = ctx.getEnv("QUESTIONNAIRE_LANG_PATH") || "";
        if (envLang) {
            var lr = await ctx.callTool("read_file", { path: envLang });
            if (lr && lr.content) {
                var lc = String(lr.content).replace(/^\s*\d+\|/gm, "");
                var lp = JSON.parse(lc);
                if (lp && lp.lang) _marketLang = lp.lang;
            }
        }
    } catch (e) {}
    var _builtin = {
        "ui.market.langpack.title": "语言包市场", "ui.market.langpack.refresh": "刷新",
        "ui.market.langpack.download": "下载", "ui.market.langpack.installed": "已安装",
        "ui.market.langpack.manageTitle": "语言包管理", "ui.market.langpack.manageEmpty": "当前无语言包",
        "ui.market.langpack.manageDelete": "删除", "ui.market.langpack.noItems": "暂无可用语言包",
        "ui.market.langpack.fetching": "获取中...", "ui.market.langpack.authorLabel": "作者",
        "ui.market.langpack.expand": "展开", "ui.market.langpack.collapse": "收起",
        "ui.market.langpack.version": "版本", "ui.market.langpack.noAuthor": "未知作者",
        "ui.market.langpack.deleteOk": "已删除", "ui.market.langpack.deleteFail": "删除失败: ",
        "ui.market.langpack.dlOk": "下载成功", "ui.market.langpack.dlFail": "下载失败: ",
        "ui.market.langpack.search": "搜索语言包...", "ui.market.langpack.prev": "上一页",
        "ui.market.langpack.next": "下一页", "ui.market.langpack.update": "更新",
        "ui.market.langpack.upToDate": "已是最新", "ui.market.langpack.readFail": "读取版本失败", "ui.market.langpack.count": " 个",
        "ui.market.langpack.manageRefresh": "请刷新",
        "ui.market.source.title": "市场源", "ui.market.source.current": "当前源",
        "ui.market.source.add": "＋ 添加市场源", "ui.market.source.official": "官方",
        "ui.market.source.stepBase": "第一步：添加基源", "ui.market.source.basePlaceholder": "输入基源 URL，用于获取源信息...",
        "ui.market.source.fetch": "获取源信息", "ui.market.source.fetching": "获取中...", "ui.market.source.fetchFail": "获取失败: ",
        "ui.market.source.invalid": "源信息格式不正确（需要 title / organization / url / list）",
        "ui.market.source.stepConfirm": "第二步：确认源信息", "ui.market.source.org": "提供者",
        "ui.market.source.urlCount": "URL", "ui.market.source.packCount": "语言包",
        "ui.market.source.confirm": "✓ 确认无误", "ui.market.source.retry": "重新输入",
        "ui.market.source.stepUrls": "第三步：备用 URL（无 https:// 前缀自动补全）", "ui.market.source.extraPlaceholder": "添加代理 URL...",
        "ui.market.source.addUrl": "添加", "ui.market.source.done": "✓ 完成添加",
        "ui.market.source.added": "已添加源: ", "ui.market.source.setDefault": "设为默认", "ui.market.source.isDefault": "✓ 默认",
        "ui.market.source.delete": "删除", "ui.market.source.deleted": "已删除源: ",
        "ui.market.source.empty": "暂无自定义源", "ui.market.source.loadFail": "读取源配置失败: ",
        "ui.market.source.choose": "选择默认源（加载市场包时使用）", "ui.market.source.loadFrom": "从当前源加载中...",
        "ui.market.source.noList": "源返回的列表为空",
    };
    function _tl(k) { return (_marketLang && _marketLang[k]) || _builtin[k] || k; }
    var TX = {
        title: _tl("ui.market.langpack.title"), refresh: _tl("ui.market.langpack.refresh"),
        download: _tl("ui.market.langpack.download"), installed: _tl("ui.market.langpack.installed"),
        manageTitle: _tl("ui.market.langpack.manageTitle"), manageEmpty: _tl("ui.market.langpack.manageEmpty"),
        manageDelete: _tl("ui.market.langpack.manageDelete"), noItems: _tl("ui.market.langpack.noItems"),
        fetching: _tl("ui.market.langpack.fetching"), authorLabel: _tl("ui.market.langpack.authorLabel"),
        expand: _tl("ui.market.langpack.expand"), collapse: _tl("ui.market.langpack.collapse"),
        version: _tl("ui.market.langpack.version"), noAuthor: _tl("ui.market.langpack.noAuthor"),
        deleteOk: _tl("ui.market.langpack.deleteOk"), deleteFail: _tl("ui.market.langpack.deleteFail"),
        dlOk: _tl("ui.market.langpack.dlOk"), dlFail: _tl("ui.market.langpack.dlFail"),
        search: _tl("ui.market.langpack.search"), prev: _tl("ui.market.langpack.prev"),
        next: _tl("ui.market.langpack.next"), update: _tl("ui.market.langpack.update"),
        upToDate: _tl("ui.market.langpack.upToDate"), readFail: _tl("ui.market.langpack.readFail"), count: _tl("ui.market.langpack.count"),
        manageRefresh: _tl("ui.market.langpack.manageRefresh"),
        srcTitle: _tl("ui.market.source.title"), srcCurrent: _tl("ui.market.source.current"),
        srcAdd: _tl("ui.market.source.add"), srcOfficial: _tl("ui.market.source.official"),
        srcStepBase: _tl("ui.market.source.stepBase"), srcBasePlaceholder: _tl("ui.market.source.basePlaceholder"),
        srcFetch: _tl("ui.market.source.fetch"), srcFetching: _tl("ui.market.source.fetching"), srcFetchFail: _tl("ui.market.source.fetchFail"),
        srcInvalid: _tl("ui.market.source.invalid"), srcStepConfirm: _tl("ui.market.source.stepConfirm"), srcOrg: _tl("ui.market.source.org"),
        srcUrlCount: _tl("ui.market.source.urlCount"), srcPackCount: _tl("ui.market.source.packCount"),
        srcConfirm: _tl("ui.market.source.confirm"), srcRetry: _tl("ui.market.source.retry"),
        srcStepUrls: _tl("ui.market.source.stepUrls"), srcExtraPlaceholder: _tl("ui.market.source.extraPlaceholder"),
        srcAddUrl: _tl("ui.market.source.addUrl"), srcDone: _tl("ui.market.source.done"),
        srcAdded: _tl("ui.market.source.added"), srcSetDefault: _tl("ui.market.source.setDefault"), srcIsDefault: _tl("ui.market.source.isDefault"),
        srcDelete: _tl("ui.market.source.delete"), srcDeleted: _tl("ui.market.source.deleted"),
        srcEmpty: _tl("ui.market.source.empty"), srcLoadFail: _tl("ui.market.source.loadFail"),
        srcChoose: _tl("ui.market.source.choose"), srcLoadFrom: _tl("ui.market.source.loadFrom"), srcNoList: _tl("ui.market.source.noList"),
    };

    // ── state ──
    var installedState = ctx.useState("mrk_installed", []);
    var verState = ctx.useState("mrk_ver", {});
    var marketState = ctx.useState("mrk_market", null);
    var searchState = ctx.useState("mrk_search", "");
    var pageState = ctx.useState("mrk_page", 1);
    var expState = ctx.useState("mrk_exp", {});
    var bannerState = ctx.useState("mrk_banner", "");
    var bannerErrState = ctx.useState("mrk_bannerErr", false);
    var loadingState = ctx.useState("mrk_loading", false);
    var busyState = ctx.useState("mrk_busy", "");
    var installed = installedState[0], setInstalled = installedState[1];
    var verMap = verState[0], setVerMap = verState[1];
    var market = marketState[0], setMarket = marketState[1];
    var search = searchState[0], setSearch = searchState[1];
    var page = pageState[0], setPage = pageState[1];
    var expanded = expState[0], setExpanded = expState[1];
    var banner = bannerState[0], setBanner = bannerState[1];
    var bannerErr = bannerErrState[0], setBannerErr = bannerErrState[1];
    var loading = loadingState[0], setLoading = loadingState[1];
    var busy = busyState[0], setBusy = busyState[1];

    var LANG_DIR = "/sdcard/Download/Operit/questionnaire/lang";
    var SRC_FILE = "/sdcard/Download/Operit/questionnaire/lang-sources.json";
    // 官方源（内置，无需写入文件，优先级最高）：GitHub / jsDelivr / 作者服务器
    var OFFICIAL_SOURCES = [{
        title: "Questionnaire官方源",
        organization: "Questionnaire",
        official: true,
        url: [
            "https://raw.githubusercontent.com/yyswys-yjyj/questionnaire/refs/heads/main/api/langpack.json",
            "https://cdn.jsdelivr.net/gh/yyswys-yjyj/questionnaire/api/langpack.json",
            "https://cdn.serveryyswys.top/cdn/github/yyswys-yjyj/questionnaire/langpack-json"
        ]
    }];
    // 无 version 字段的旧格式语言包默认视为 175（适配旧版插件）——hex 比较版本号（1.7.5 → "175"）
    var legacyDefaultVer = "175";

    // ── 市场源 state ──
    var srcListState = ctx.useState("mrk_srcList", null);     // 自定义源数组（不含官方）
    var defSrcState = ctx.useState("mrk_defSrc", "");          // 默认源 title（"" = 官方源）
    var srcOpenState = ctx.useState("mrk_srcOpen", false);     // 源管理卡展开
    var addStepState = ctx.useState("mrk_addStep", "");        // "" / "base" / "confirm" / "urls"
    var baseUrlState = ctx.useState("mrk_baseUrl", "");        // 基源 URL 输入
    var baseInfoState = ctx.useState("mrk_baseInfo", null);    // 拉取到的源信息 {title, organization, url[], list[]}
    var extraUrlState = ctx.useState("mrk_extraUrl", "");      // 代理 URL 输入
    var srcBusyState = ctx.useState("mrk_srcBusy", false);     // 源操作中
    var srcList = srcListState[0], setSrcList = srcListState[1];
    var defSrc = defSrcState[0], setDefSrc = defSrcState[1];
    var srcOpen = srcOpenState[0], setSrcOpen = srcOpenState[1];
    var addStep = addStepState[0], setAddStep = addStepState[1];
    var baseUrl = baseUrlState[0], setBaseUrl = baseUrlState[1];
    var baseInfo = baseInfoState[0], setBaseInfo = baseInfoState[1];
    var extraUrl = extraUrlState[0], setExtraUrl = extraUrlState[1];
    var srcBusy = srcBusyState[0], setSrcBusy = srcBusyState[1];

    // 源配置运行时缓存（模块级，见文件头注释）：state 是渲染快照，事件处理器/异步链里读的是旧值，
    // 会导致"设了默认源但刷新仍走官方源"。所有写源操作同步更新本缓存，读取一律走这里。
    // 文件结构：{ list: [{title, organization, url[]}], default: "title-org" }；不缓存 list（实时拉取）

    // 所有源（官方 + 自定义），用于管理展示
    function allSources() {
        return OFFICIAL_SOURCES.concat(srcCache.list || []);
    }
    // 当前默认源：default 字段格式 "title-org"，在 list 中匹配；未指定/未命中用官方源
    function activeSource() {
        if (srcCache.def) {
            var all = allSources();
            for (var i = 0; i < all.length; i++) {
                if ((all[i].title || "") + "-" + (all[i].organization || "") === srcCache.def) return all[i];
            }
        }
        return OFFICIAL_SOURCES[0];
    }
    // URL 补全协议前缀（无 https:// 时自动加）
    function normSrcUrl(u) {
        u = String(u || "").trim();
        if (!u) return "";
        return /^https?:\/\//i.test(u) ? u : "https://" + u;
    }
    // 读取本地源配置（结构：{ list: [{title, organization, url[]}], default: "title-org" }）
    function loadSources() {
        return qCall("read_file", { path: SRC_FILE }).then(function (fr) {
            var c = "";
            if (fr && fr.content) c = String(fr.content).replace(/^\s*\d+\|/gm, "");
            else if (fr && fr.data && typeof fr.data === "string") c = String(fr.data).replace(/^\s*\d+\|/gm, "");
            else if (fr && fr.data && fr.data.content) c = String(fr.data.content).replace(/^\s*\d+\|/gm, "");
            if (!c) { srcCache.list = []; srcCache.def = ""; setSrcList([]); setDefSrc(""); return; }
            var o = JSON.parse(c);
            srcCache.list = Array.isArray(o.list) ? o.list : [];
            srcCache.def = o.default || "";
            setSrcList(srcCache.list);
            setDefSrc(srcCache.def);
        }).catch(function (e) {
            srcCache.list = [];
            srcCache.def = "";
            setSrcList([]);
            setDefSrc("");
        });
    }
    // 写入本地源配置（只存 title/organization/url，不缓存 list）
    function saveSources(list, def) {
        var clean = (list || []).map(function (s) {
            return { title: s.title || "", organization: s.organization || "", url: Array.isArray(s.url) ? s.url.slice() : [] };
        });
        var data = { list: clean, default: def || "" };
        return qCall("make_directory", { path: "/sdcard/Download/Operit/questionnaire", create_parents: true })
            .then(function () { return qCall("write_file", { path: SRC_FILE, content: JSON.stringify(data, null, 2) }); });
    }
    // 拉取基源信息（第一步）
    function fetchBase() {
        if (srcBusy) return Promise.resolve();
        var u = normSrcUrl(baseUrl);
        if (!u) { showBanner(TX.srcBasePlaceholder, true); return Promise.resolve(); }
        setSrcBusy(true);
        return qCall("http_request", { method: "GET", url: u }).then(function (r) {
            var txt = "";
            if (r && typeof r === "string") txt = r;
            else if (r && r.content) txt = String(r.content);
            else if (r && r.data && typeof r.data === "string") txt = r.data;
            else if (r && r.data && r.data.content) txt = String(r.data.content);
            var d = null;
            try { d = JSON.parse(String(txt || "").trim()); } catch (e) {}
            if (!d || !d.title || !d.organization || !Array.isArray(d.url) || !Array.isArray(d.list)) {
                showBanner(TX.srcInvalid, true);
                return;
            }
            // 归一化：url 补全前缀
            d.url = d.url.map(normSrcUrl).filter(function (x) { return x; });
            setBaseInfo(d);
            setAddStep("confirm");
        }).catch(function (e) {
            showBanner(TX.srcFetchFail + String(e && e.message || e), true);
        }).then(function () { setSrcBusy(false); });
    }
    // 确认信息（第二步）→ 进入备用 URL 步骤
    function confirmBase() {
        if (!baseInfo) return;
        if (!baseInfo.url || baseInfo.url.length === 0) {
            baseInfo.url = [normSrcUrl(baseUrl)];
        }
        setAddStep("urls");
    }
    // 添加代理 URL（第三步）
    function addExtraUrl() {
        var u = normSrcUrl(extraUrl);
        if (!u) return;
        var info = baseInfo;
        if (!info.url) info.url = [];
        if (info.url.indexOf(u) < 0) info.url.push(u);
        setBaseInfo(info);
        setExtraUrl("");
    }
    // 完成添加（第三步确认）→ 写入本地源表
    function finishAddSource() {
        if (!baseInfo || !baseInfo.title) return;
        // 以缓存为准（state 快照可能不同步）
        var list = (srcCache.list || []).slice();
        var cleanInfo = { title: baseInfo.title, organization: baseInfo.organization || "", url: Array.isArray(baseInfo.url) ? baseInfo.url.slice() : [] };
        var exists = false;
        for (var i = 0; i < list.length; i++) if (list[i].title === cleanInfo.title) { list[i] = cleanInfo; exists = true; break; }
        if (!exists) list.push(cleanInfo);
        return saveSources(list, srcCache.def).then(function () {
            srcCache.list = list;
            setSrcList(list);
            showBanner(TX.srcAdded + baseInfo.title, false);
            setAddStep("");
            setBaseInfo(null);
            setBaseUrl("");
            setExtraUrl("");
            setSrcOpen(true);
            // 重新从文件回读，确保 UI 与磁盘一致（也强制一次渲染刷新源列表）
            return loadSources();
        }).catch(function (e) {
            showBanner(TX.srcLoadFail + String(e && e.message || e), true);
        });
    }
    // 设默认源：default 字段写入 "title-org" 格式
    function setDefaultSource(title, org) {
        var def = String(title || "") + "-" + String(org || "");
        return saveSources(srcCache.list, def).then(function () {
            srcCache.def = def;
            setDefSrc(def);
            showBanner(TX.srcIsDefault + " " + title, false);
            // 切换源后刷新市场列表（loadAll 读 srcCache，立即生效）
            return loadAll();
        }).catch(function (e) {
            showBanner(TX.srcLoadFail + String(e && e.message || e), true);
        });
    }
    // 删除自定义源
    function deleteCustomSource(title, org) {
        var def = String(title || "") + "-" + String(org || "");
        var list = (srcCache.list || []).filter(function (s) { return (s.title || "") + "-" + (s.organization || "") !== def; });
        var newDef = srcCache.def === def ? "" : srcCache.def;
        return saveSources(list, newDef).then(function () {
            srcCache.list = list;
            srcCache.def = newDef;
            setSrcList(list);
            setDefSrc(newDef);
            showBanner(TX.srcDeleted + title, false);
            return loadAll();
        }).catch(function (e) {
            showBanner(TX.srcLoadFail + String(e && e.message || e), true);
        });
    }
    var serial = globalThis.__mrkSerial || (globalThis.__mrkSerial = Promise.resolve());
    function qCall(tool, params) {
        var p = serial.then(function () { return ctx.callTool(tool, params); });
        serial = p.then(function () {}, function () {});
        return p;
    }
    function showBanner(m, isErr) { setBanner(m); setBannerErr(!!isErr); }

    function loadAll() {
        if (busy) return Promise.resolve();
        setLoading(true);
        return qCall("list_files", { path: LANG_DIR }).then(function (dir) {
            var entries = [];
            if (dir && dir.entries) entries = dir.entries;
            else if (dir && dir.data && dir.data.entries) entries = dir.data.entries;
            else if (Array.isArray(dir)) entries = dir;
            var byPure = {};
            var vm = {};
            var chain = Promise.resolve();
            for (var i = 0; i < entries.length; i++) {
                (function (entry) {
                    var name = typeof entry === "string" ? entry : (entry.name || "");
                    if (!name.endsWith(".json")) return;
                    var id = name.replace(".json", "");
                    var pure = id, pv = 0;
                    var m = id.match(/^(.*)_(\d+)$/);
                    if (m) { pure = m[1]; pv = normHexVer(parseInt(m[2], 10)); } // 旧命名后缀为十进制拼接（如 176=1.7.6）→ 归一化 hex
                    var rec = byPure[pure];
                    if (!rec) {
                        byPure[pure] = { id: id, pure: pure, displayName: langNames[pure] || pure, v: pv, hasPlain: !m };
                    } else {
                        if (!m && !rec.hasPlain) { rec.id = id; rec.hasPlain = true; rec.v = pv; }
                        else if (m && !rec.hasPlain && hexVerNum(pv) > hexVerNum(rec.v)) { rec.id = id; rec.v = pv; }
                    }
                    if (!m) {
                        chain = chain.then(function () {
                            return qCall("read_file", { path: LANG_DIR + "/" + name }).then(function (fr) {
                                try {
                                    var fc = String((fr && fr.content) || "").replace(/^\s*\d+\|/gm, "");
                                    var fo = JSON.parse(fc);
                                    // 语言包 version：旧格式数字（176）或新格式 hex 字符串（"180"）→ 统一归一化
                                    if (fo && fo.version !== undefined && fo.version !== null) pv = normHexVer(fo.version);
                                    else if (fo) pv = legacyDefaultVer;
                                } catch (e) {}
                                if (!(pure in vm) || hexVerNum(vm[pure]) < hexVerNum(pv)) vm[pure] = pv;
                            }).catch(function () {
                                if (!(pure in vm) || hexVerNum(vm[pure]) < hexVerNum(pv)) vm[pure] = pv;
                            });
                        });
                    } else {
                        if (!(pure in vm) || hexVerNum(vm[pure]) < hexVerNum(pv)) vm[pure] = pv;
                    }
                })(entries[i]);
            }
            var items = [];
            for (var pk in byPure) items.push({ id: byPure[pk].id, pure: byPure[pk].pure, displayName: byPure[pk].displayName });
            return chain.then(function () { setInstalled(items); setVerMap(vm); });
        }).catch(function () { setVerMap({}); setInstalled([]); }).then(function () {
            // 从当前默认源加载市场列表：依次尝试该源的全部 URL（防反代容灾），第一个成功即用
            var src = activeSource();
            var urls = (src && src.url && src.url.length) ? src.url : OFFICIAL_SOURCES[0].url;
            var tryIdx = 0;
            function tryFetch() {
                if (tryIdx >= urls.length) { setMarket(null); return Promise.resolve(); }
                var u = urls[tryIdx++];
                return qCall("http_request", { method: "GET", url: u }).then(function (r) {
                    var txt = "";
                    if (r && typeof r === "string") txt = r;
                    else if (r && r.content) txt = String(r.content);
                    else if (r && r.data && typeof r.data === "string") txt = r.data;
                    else if (r && r.data && r.data.content) txt = String(r.data.content);
                    var d = null;
                    try { d = JSON.parse(String(txt || "").trim()); } catch (e) {}
                    if (d && d.list && Array.isArray(d.list)) { setMarket(d.list); return Promise.resolve(); }
                    if (d && Array.isArray(d)) { setMarket(d); return Promise.resolve(); }
                    return tryFetch(); // 该 URL 无效，尝试下一个
                }).catch(function () { return tryFetch(); });
            }
            return tryFetch();
        }).then(function () { setLoading(false); }).catch(function () { setLoading(false); });
    }

    function doDelete(id) {
        if (busy) return Promise.resolve();
        setBusy("del_" + id);
        var pure = id;
        var dm = id.match(/^(.*)_(\d+)$/);
        if (dm) pure = dm[1];
        return qCall("list_files", { path: LANG_DIR }).then(function (dir) {
            var entries = [];
            if (dir && dir.entries) entries = dir.entries;
            else if (dir && dir.data && dir.data.entries) entries = dir.data.entries;
            else if (Array.isArray(dir)) entries = dir;
            var chain = Promise.resolve();
            var found = false;
            for (var i = 0; i < entries.length; i++) {
                var name = typeof entries[i] === "string" ? entries[i] : (entries[i].name || "");
                if (name === pure + ".json" || (name.indexOf(pure + "_") === 0 && name.endsWith(".json"))) {
                    found = true;
                    (function (fn) {
                        chain = chain.then(function () { return qCall("delete_file", { path: LANG_DIR + "/" + fn }).catch(function () { return null; }); });
                    })(name);
                }
            }
            return chain.then(function () {
                if (!found) throw new Error("not found");
                setInstalled(installed.filter(function (x) { return x.pure !== pure; }));
                showBanner(TX.deleteOk + " " + pure, false);
            });
        }).catch(function (e) { showBanner(TX.deleteFail + String(e), true); }).then(function () { setBusy(""); });
    }
    function doDownload(url, id, v) {
        if (busy) return Promise.resolve();
        setBusy("dl_" + id + "_" + v);
        return qCall("make_directory", { path: LANG_DIR, create_parents: true })
            .then(function () { return qCall("download_file", { url: url, destination: LANG_DIR + "/" + id + ".json" }); })
            .then(function () { showBanner(TX.dlOk + " " + id, false); return loadAll(); })
            .catch(function (e) { showBanner(TX.dlFail + String(e), true); }).then(function () { setBusy(""); });
    }
    function doUpdate(id) {
        if (busy) return Promise.resolve();
        if (!market) { showBanner(TX.readFail, true); return Promise.resolve(); }
        var best = null;
        for (var i = 0; i < market.length; i++) {
            var it = market[i];
            if (it.id === id && (!best || hexVerNum(it.version) > hexVerNum(best.version))) best = it;
        }
        if (!best || hexVerNum(best.version) <= hexVerNum(verMap[id] || 0)) { showBanner(TX.upToDate, false); return Promise.resolve(); }
        setBusy("upd_" + id);
        return qCall("make_directory", { path: LANG_DIR, create_parents: true })
            .then(function () { return qCall("download_file", { url: best.url, destination: LANG_DIR + "/" + id + ".json" }); })
            .then(function () { showBanner(TX.dlOk + " " + id, false); return loadAll(); })
            .catch(function (e) { showBanner(TX.dlFail + String(e), true); }).then(function () { setBusy(""); });
    }
    function toggleExp(id) {
        var e = {};
        for (var k in expanded) e[k] = expanded[k];
        e[id] = !e[id];
        setExpanded(e);
    }
    function goPage(p) { setPage(p); }

    // ===== 渲染（官方风格：Card(primaryContainer) + Column(padding,spacing) + Button(text)）=====
    var rows = [];

    // 顶部横幅
    if (banner) {
        rows.push(UI.Card({ fillMaxWidth: true, containerColor: bannerErr ? "errorContainer" : "primaryContainer" }, [
            UI.Row({ fillMaxWidth: true, verticalAlignment: "center", horizontalArrangement: "spaceBetween" }, [
                UI.Text({ text: banner, style: "bodyMedium", color: bannerErr ? "onErrorContainer" : "onPrimaryContainer" }),
                UI.IconButton({ icon: "close", onClick: function () { setBanner(""); } }),
            ]),
        ]));
    }

    // 标题卡
    var curSrc = activeSource();
    rows.push(UI.Card({ fillMaxWidth: true, containerColor: "primaryContainer" }, [
        UI.Column({ padding: 14, spacing: 8 }, [
            UI.Row({ fillMaxWidth: true, verticalAlignment: "center", horizontalArrangement: "spaceBetween" }, [
                UI.Text({ text: TX.title, style: "titleLarge", fontWeight: "bold", color: "onPrimaryContainer" }),
                busy || loading ? UI.CircularProgressIndicator({ strokeWidth: 2, color: "onPrimaryContainer", modifier: { size: 18 } }) : UI.IconButton({ icon: "refresh", enabled: busy === "", onClick: function () { return loadAll(); } }),
            ]),
            UI.Text({ text: (curSrc ? curSrc.title : TX.srcOfficial) + " · " + (curSrc ? (curSrc.organization || "") : ""), style: "labelMedium", color: "onPrimaryContainer", maxLines: 1, overflow: "ellipsis" }),
        ]),
    ]));

    // ── 市场源管理卡（标题卡下方）──
    var srcNodes = [];
    srcNodes.push(UI.Row({ fillMaxWidth: true, verticalAlignment: "center", horizontalArrangement: "spaceBetween", spacing: 6 }, [
        UI.Column({ weight: 1 }, [
            UI.Text({ text: TX.srcTitle, style: "titleSmall", fontWeight: "bold" }),
            UI.Text({ text: TX.srcCurrent + ": " + (curSrc ? curSrc.title : TX.srcOfficial), style: "labelSmall", color: "onSurfaceVariant", maxLines: 1, overflow: "ellipsis" }),
        ]),
        UI.Row({ spacing: 4 }, [
            UI.IconButton({ icon: "add_circle", tint: "primary", enabled: !srcBusy, onClick: function () { setSrcOpen(true); setAddStep(addStep ? "" : "base"); return loadSources(); } }),
            UI.IconButton({ icon: srcOpen ? "expand_less" : "expand_more", tint: "onSurfaceVariant", onClick: function () { setSrcOpen(!srcOpen); return loadSources(); } }),
        ]),
    ]));
    if (srcOpen) {
        // 源列表（官方 + 自定义）
        var allSrc = allSources();
        if (allSrc.length) {
            for (var si = 0; si < allSrc.length; si++) {
                (function (s) {
                    var isDef = defSrc === (s.title + "-" + (s.organization || "")) || (!defSrc && s.official);
                    srcNodes.push(UI.Row({ fillMaxWidth: true, verticalAlignment: "center", horizontalArrangement: "spaceBetween", spacing: 6, padding: { vertical: 2 } }, [
                        UI.Column({ weight: 1, spacing: 1 }, [
                            UI.Text({ text: s.title + (s.official ? " (" + TX.srcOfficial + ")" : ""), style: "bodyMedium", fontWeight: "bold", color: isDef ? "primary" : "onSurface", maxLines: 1, overflow: "ellipsis" }),
                            UI.Text({ text: s.organization + " · " + (s.url ? s.url.length : 0) + " " + TX.srcUrlCount, style: "labelSmall", color: "onSurfaceVariant" }),
                        ]),
                        UI.Row({ spacing: 2 }, [
                            isDef ? UI.Text({ text: TX.srcIsDefault, style: "labelSmall", color: "primary" }) : UI.IconButton({ icon: "star_border", tint: "onSurfaceVariant", enabled: !srcBusy, onClick: function () { return setDefaultSource(s.title, s.organization); } }),
                            s.official ? null : UI.IconButton({ icon: "delete", tint: "onSurfaceVariant", enabled: !srcBusy, onClick: function () { return deleteCustomSource(s.title, s.organization); } }),
                        ]),
                    ]));
                })(allSrc[si]);
            }
        } else {
            srcNodes.push(UI.Text({ text: TX.srcEmpty, style: "bodySmall", color: "onSurfaceVariant", padding: { vertical: 4 } }));
        }
        srcNodes.push(UI.Divider({ thickness: 0.5, color: "onSurfaceVariant" }));
        srcNodes.push(UI.Text({ text: TX.srcChoose, style: "labelSmall", color: "onSurfaceVariant" }));
        // 添加流程
        if (addStep === "base") {
            srcNodes.push(UI.Text({ text: TX.srcStepBase, style: "labelMedium", fontWeight: "bold", padding: { top: 4 } }));
            srcNodes.push(UI.TextField({
                value: baseUrl,
                onValueChange: function (v) { setBaseUrl(v); },
                placeholder: TX.srcBasePlaceholder,
                singleLine: true,
            }));
            srcNodes.push(UI.Button({
                enabled: !srcBusy,
                onClick: function () { return fetchBase(); },
                content: UI.Text({ text: srcBusy ? TX.srcFetching : TX.srcFetch, style: "labelMedium", color: ctx.MaterialTheme.colorScheme.onPrimary }),
            }));
        } else if (addStep === "confirm" && baseInfo) {
            srcNodes.push(UI.Text({ text: TX.srcStepConfirm, style: "labelMedium", fontWeight: "bold", padding: { top: 4 } }));
            srcNodes.push(UI.Row({ fillMaxWidth: true, verticalAlignment: "center", horizontalArrangement: "spaceBetween", spacing: 6 }, [
                UI.Text({ text: baseInfo.title, style: "bodyLarge", fontWeight: "bold", color: "primary", maxLines: 1, overflow: "ellipsis" }),
                UI.Text({ text: baseInfo.official ? "(" + TX.srcOfficial + ")" : "", style: "labelSmall", color: "onSurfaceVariant" }),
            ]));
            srcNodes.push(UI.Text({ text: TX.srcOrg + ": " + baseInfo.organization, style: "bodySmall", color: "onSurfaceVariant" }));
            srcNodes.push(UI.Text({ text: TX.srcUrlCount + ": " + (baseInfo.url || []).length + " · " + TX.srcPackCount + ": " + (baseInfo.list || []).length, style: "bodySmall", color: "onSurfaceVariant" }));
            srcNodes.push(UI.Row({ fillMaxWidth: true, horizontalArrangement: "end", spacing: 8, padding: { top: 4 } }, [
                UI.TextButton({
                    onClick: function () { setAddStep("base"); setBaseInfo(null); },
                    content: UI.Text({ text: TX.srcRetry, style: "labelMedium", color: "onSurfaceVariant" }),
                }),
                UI.Button({
                    onClick: confirmBase,
                    content: UI.Text({ text: TX.srcConfirm, style: "labelMedium", color: ctx.MaterialTheme.colorScheme.onPrimary }),
                }),
            ]));
        } else if (addStep === "urls" && baseInfo) {
            srcNodes.push(UI.Text({ text: TX.srcStepUrls, style: "labelMedium", fontWeight: "bold", padding: { top: 4 } }));
            var urlList = baseInfo.url || [];
            for (var ui2 = 0; ui2 < urlList.length; ui2++) {
                (function (u) {
                    srcNodes.push(UI.Text({ text: "• " + u, style: "bodySmall", color: "onSurfaceVariant", maxLines: 2, overflow: "ellipsis" }));
                })(urlList[ui2]);
            }
            srcNodes.push(UI.Row({ fillMaxWidth: true, verticalAlignment: "center", spacing: 6 }, [
                UI.Column({ weight: 1 }, [
                    UI.TextField({
                        value: extraUrl,
                        onValueChange: function (v) { setExtraUrl(v); },
                        placeholder: TX.srcExtraPlaceholder,
                        singleLine: true,
                    }),
                ]),
                UI.IconButton({ icon: "add", tint: "primary", enabled: !srcBusy, onClick: addExtraUrl }),
            ]));
            srcNodes.push(UI.Button({
                enabled: !srcBusy,
                onClick: function () { return finishAddSource(); },
                content: UI.Text({ text: TX.srcDone, style: "labelMedium", color: ctx.MaterialTheme.colorScheme.onPrimary }),
            }));
        }
    }
    rows.push(UI.Card({ fillMaxWidth: true }, [
        UI.Column({ padding: 12, spacing: 6 }, srcNodes),
    ]));

    // 管理区
    var manageRows = [];
    if (loading) {
        manageRows.push(UI.Row({ verticalAlignment: "center", horizontalArrangement: "center", spacing: 8 }, [
            UI.CircularProgressIndicator({ strokeWidth: 2, color: "primary" }),
            UI.Text({ text: TX.fetching, style: "bodySmall", color: "onSurfaceVariant" }),
        ]));
    } else if (!installed.length) {
        manageRows.push(UI.Text({ text: TX.manageEmpty, style: "bodySmall", color: "onSurfaceVariant", padding: { vertical: 6 } }));
    } else {
        for (var mi = 0; mi < installed.length; mi++) {
            (function (d) {
                var v = verMap[d.pure] || 0;
                var isLatest = hexVerNum(v) >= hexVerNum(currentVer);
                var mBest = null;
                if (market) {
                    for (var bi = 0; bi < market.length; bi++) {
                        var bit = market[bi];
                        if (bit.id === d.pure && (!mBest || hexVerNum(bit.version) > hexVerNum(mBest.version))) mBest = bit;
                    }
                }
                var needsUpdate = !isLatest && mBest && hexVerNum(mBest.version) > hexVerNum(v);
                manageRows.push(UI.Row({ fillMaxWidth: true, verticalAlignment: "center", horizontalArrangement: "spaceBetween", spacing: 6 }, [
                    UI.Text({ text: d.displayName + "  v" + vs(v), style: "bodyLarge", fontWeight: "bold", color: isLatest ? "primary" : "onSurface", maxLines: 1, overflow: "ellipsis" }),
                    UI.Row({ verticalAlignment: "center", spacing: 4 }, [
                        needsUpdate ? UI.IconButton({ icon: "system_update_alt", tint: "primary", enabled: busy === "", onClick: function () { return doUpdate(d.pure); } }) : null,
                        UI.IconButton({ icon: "delete", enabled: busy === "", onClick: function () { return doDelete(d.id); } }),
                    ]),
                ]));
            })(installed[mi]);
        }
    }
    rows.push(UI.Card({ fillMaxWidth: true }, [
        UI.Column({ padding: 12, spacing: 8 }, [
            UI.Text({ text: TX.manageTitle, style: "titleSmall", fontWeight: "bold" }),
            UI.Column({ spacing: 4 }, manageRows),
        ]),
    ]));

    // 搜索
    rows.push(UI.Card({ fillMaxWidth: true }, [
        UI.Column({ padding: 12, spacing: 8 }, [
            UI.TextField({
                value: search,
                onValueChange: function (v) { setSearch(v); setPage(1); },
                placeholder: TX.search,
                singleLine: true,
            }),
        ]),
    ]));

    // 市场
    var grp = {};
    var marketArr = market || [];
    for (var gi = 0; gi < marketArr.length; gi++) {
        var it2 = marketArr[gi];
        if (!grp[it2.id]) grp[it2.id] = { id: it2.id, author: it2.author, vers: [] };
        grp[it2.id].vers.push({ v: it2.version, u: it2.url, author: it2.author });
    }
    var ids = Object.keys(grp).sort(function (a, b) { return (langNames[a] || a).localeCompare(langNames[b] || b); });
    var q = String(search || "").toLowerCase();
    if (q) {
        ids = ids.filter(function (id) {
            var dn = langNames[id] || id;
            return id.toLowerCase().indexOf(q) >= 0 || dn.toLowerCase().indexOf(q) >= 0;
        });
    }
    var per = 10, totalPage = Math.max(1, Math.ceil(ids.length / per));
    if (page > totalPage) { page = totalPage; }
    var start = (page - 1) * per;
    var pids = ids.slice(start, start + per);

    for (var pi = 0; pi < pids.length; pi++) {
        (function (gid) {
            var g = grp[gid];
            var dn = langNames[g.id] || g.id;
            var open = !!expanded[g.id];
            var vers = g.vers.slice().sort(function (a, b) { return hexVerNum(b.v) - hexVerNum(a.v); });
            // 兼容性判定：该语言包存在适配当前插件版本的版本（版本号 >= 当前插件版本）→ success 绿勾；否则 warning
            var compatOk = false;
            for (var kv = 0; kv < vers.length; kv++) { if (hexVerNum(vers[kv].v) >= hexVerNum(currentVer)) { compatOk = true; break; } }
            var authorTxt = (g.author && String(g.author).trim()) ? g.author : TX.noAuthor;

            var inner = [
                UI.Row({ fillMaxWidth: true, verticalAlignment: "center", horizontalArrangement: "spaceBetween", onClick: function () { toggleExp(gid); } }, [
                    UI.Column({ spacing: 2 }, [
                        UI.Text({ text: dn, style: "titleMedium", fontWeight: "bold", maxLines: 1, overflow: "ellipsis" }),
                        UI.Text({ text: g.id + " · " + vers.length + " " + TX.version, style: "labelSmall", color: "onSurfaceVariant" }),
                    ]),
                    UI.Row({ verticalAlignment: "center", spacing: 6 }, [
                        compatOk
                            ? UI.Icon({ name: "check_circle", size: 20, tint: "#4CAF50" })
                            : UI.Icon({ name: "warning", size: 20, tint: "#F9A825" }),
                        UI.FilterChip({
                            selected: open,
                            onClick: function () { toggleExp(gid); },
                            label: UI.Text({ text: open ? TX.collapse : TX.expand, style: "labelSmall" }),
                            leadingIcon: UI.Icon({ name: open ? "expand_less" : "expand_more", size: 16 }),
                        }),
                    ]),
                ]),
            ];
            if (open) {
                for (var vi = 0; vi < vers.length; vi++) {
                    (function (vv) {
                        var _instV = verMap[g.id];
                        var isInst = _instV !== undefined && _instV !== null && normHexVer(_instV) === normHexVer(vv.v);
                        inner.push(UI.Row({ fillMaxWidth: true, verticalAlignment: "center", horizontalArrangement: "spaceBetween", spacing: 6 }, [
                            UI.Column({ spacing: 1 }, [
                                UI.Text({ text: "v" + vs(vv.v), style: "bodyMedium", color: isInst ? "primary" : "onSurface" }),
                                UI.Text({ text: TX.authorLabel + " " + (vv.author && String(vv.author).trim() ? vv.author : TX.noAuthor), style: "labelSmall", color: "onSurfaceVariant" }),
                            ]),
                            isInst
                                ? null
                                : (busy === "dl_" + g.id + "_" + vv.v
                                    ? UI.Row({ spacing: 4, verticalAlignment: "center" }, [UI.CircularProgressIndicator({ strokeWidth: 2, color: "primary", modifier: { size: 14 } })])
                                    : UI.IconButton({ icon: "download", tint: "primary", enabled: busy === "", onClick: function () { return doDownload(vv.u, g.id, vv.v); } })),
                        ]));
                    })(vers[vi]);
                }
            }
            rows.push(UI.Card({ fillMaxWidth: true }, [
                UI.Column({ padding: 12, spacing: 8 }, inner),
            ]));
        })(pids[pi]);
    }
    if (!pids.length) {
        rows.push(UI.Text({ text: q ? TX.noItems : TX.manageRefresh, style: "bodyMedium", color: "onSurfaceVariant", padding: { vertical: 16 } }));
    }

    // 分页
    if (ids.length > per) {
        var pg = [];
        if (page > 1) pg.push(UI.IconButton({ icon: "chevron_left", tint: "primary", enabled: busy === "", onClick: function () { goPage(page - 1); } }));
        pg.push(UI.Text({ text: page + " / " + totalPage, style: "bodyMedium", color: "onSurfaceVariant" }));
        if (page < totalPage) pg.push(UI.IconButton({ icon: "chevron_right", tint: "primary", enabled: busy === "", onClick: function () { goPage(page + 1); } }));
        rows.push(UI.Row({ fillMaxWidth: true, horizontalArrangement: "spaceEvenly", verticalAlignment: "center" }, pg));
    }

    return UI.LazyColumn({ fillMaxSize: true, padding: 12, spacing: 12, onLoad: function () { return loadSources().then(function () { return loadAll(); }); } }, rows);
}