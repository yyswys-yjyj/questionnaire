// @ts-nocheck
// 语言包市场页 - 官方风格（参考 renju_sidepanel：字符串颜色 token + Card(primaryContainer) + Button(text)）
export default async function Screen(ctx) {
    const { UI } = ctx;
    var langNames = { zh_cn: "简体中文", zh_tw: "繁体中文", en_us: "English (US)", ja_jp: "日本語", ko_kr: "한국어" };
    var currentVer = 176;

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
        "ui.market.langpack.upToDate": "已是最新", "ui.market.langpack.readFail": "读取版本失败",
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
        upToDate: _tl("ui.market.langpack.upToDate"), readFail: _tl("ui.market.langpack.readFail"),
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
    var API_URL = "https://cdn.serveryyswys.top/cdn/github/yyswys-yjyj/questionnaire/langpack-json";
    // 无 version 字段的旧格式语言包默认视为 175（适配旧版插件）
    var legacyDefaultVer = 175;

    var serial = globalThis.__mrkSerial || (globalThis.__mrkSerial = Promise.resolve());
    function qCall(tool, params) {
        var p = serial.then(function () { return ctx.callTool(tool, params); });
        serial = p.then(function () {}, function () {});
        return p;
    }
    function vs(v) { var s = String(v); if (s.length < 3) return s; return s.slice(0, -2) + "." + s.slice(-2, -1) + "." + s.slice(-1); }
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
                    if (m) { pure = m[1]; pv = parseInt(m[2], 10); }
                    var rec = byPure[pure];
                    if (!rec) {
                        byPure[pure] = { id: id, pure: pure, displayName: langNames[pure] || pure, v: pv, hasPlain: !m };
                    } else {
                        if (!m && !rec.hasPlain) { rec.id = id; rec.hasPlain = true; rec.v = pv; }
                        else if (m && !rec.hasPlain && pv > rec.v) { rec.id = id; rec.v = pv; }
                    }
                    if (!m) {
                        chain = chain.then(function () {
                            return qCall("read_file", { path: LANG_DIR + "/" + name }).then(function (fr) {
                                try {
                                    var fc = String((fr && fr.content) || "").replace(/^\s*\d+\|/gm, "");
                                    var fo = JSON.parse(fc);
                                    if (fo && typeof fo.version === "number") pv = fo.version;
                                    else if (fo) pv = legacyDefaultVer;
                                } catch (e) {}
                                if (!(pure in vm) || (vm[pure] || 0) < pv) vm[pure] = pv;
                            }).catch(function () {
                                if (!(pure in vm) || (vm[pure] || 0) < pv) vm[pure] = pv;
                            });
                        });
                    } else {
                        if (!(pure in vm) || (vm[pure] || 0) < pv) vm[pure] = pv;
                    }
                })(entries[i]);
            }
            var items = [];
            for (var pk in byPure) items.push({ id: byPure[pk].id, pure: byPure[pk].pure, displayName: byPure[pk].displayName });
            return chain.then(function () { setInstalled(items); setVerMap(vm); });
        }).catch(function () { setVerMap({}); setInstalled([]); }).then(function () {
            return qCall("http_request", { method: "GET", url: API_URL }).then(function (r) {
                var txt = "";
                if (r && typeof r === "string") txt = r;
                else if (r && r.content) txt = String(r.content);
                else if (r && r.data && typeof r.data === "string") txt = r.data;
                var d = null;
                try { d = JSON.parse(txt); } catch (e) {}
                if (d && d.list && Array.isArray(d.list)) setMarket(d.list);
                else setMarket(null);
            }).catch(function () { setMarket(null); });
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
            if (it.id === id && (!best || it.version > best.version)) best = it;
        }
        if (!best || best.version <= (verMap[id] || 0)) { showBanner(TX.upToDate, false); return Promise.resolve(); }
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
    rows.push(UI.Card({ fillMaxWidth: true, containerColor: "primaryContainer" }, [
        UI.Column({ padding: 14, spacing: 8 }, [
            UI.Row({ fillMaxWidth: true, verticalAlignment: "center", horizontalArrangement: "spaceBetween" }, [
                UI.Text({ text: TX.title, style: "titleLarge", fontWeight: "bold", color: "onPrimaryContainer" }),
                busy || loading ? UI.CircularProgressIndicator({ strokeWidth: 2, color: "onPrimaryContainer", modifier: { size: 18 } }) : UI.IconButton({ icon: "refresh", enabled: busy === "", onClick: function () { return loadAll(); } }),
            ]),
            UI.Text({ text: TX.manageTitle + " · " + (loading ? TX.fetching : (installed.length ? installed.length + " 个" : TX.manageEmpty)), style: "labelMedium", color: "onPrimaryContainer" }),
        ]),
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
                var v = verMap[d.pure] || 0;
                var isLatest = v >= currentVer;
                var mBest = null;
                if (market) {
                    for (var bi = 0; bi < market.length; bi++) {
                        var bit = market[bi];
                        if (bit.id === d.pure && (!mBest || bit.version > mBest.version)) mBest = bit;
                    }
                }
                var needsUpdate = !isLatest && mBest && mBest.version > v;
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
            var vers = g.vers.slice().sort(function (a, b) { return b.v - a.v; });
            var verTxt = "";
            var mn = vers[vers.length - 1].v, mx = vers[0].v, gap = false;
            for (var k2 = 1; k2 < vers.length; k2++) { if (vers[k2 - 1].v - vers[k2].v > 1) { gap = true; break; } }
            if (gap) verTxt = vers.map(function (x) { return "v" + vs(x.v); }).join(" ");
            else verTxt = (mn === mx) ? "v" + vs(mn) : "v" + vs(mx) + "~" + vs(mn);
            var authorTxt = (g.author && String(g.author).trim()) ? g.author : TX.noAuthor;

            var inner = [
                UI.Row({ fillMaxWidth: true, verticalAlignment: "center", horizontalArrangement: "spaceBetween", onClick: function () { toggleExp(gid); } }, [
                    UI.Column({ spacing: 2 }, [
                        UI.Text({ text: dn, style: "titleMedium", fontWeight: "bold", maxLines: 1, overflow: "ellipsis" }),
                        UI.Text({ text: g.id + " · " + vers.length + " " + TX.version, style: "labelSmall", color: "onSurfaceVariant" }),
                    ]),
                    UI.Row({ verticalAlignment: "center", spacing: 6 }, [
                        UI.Text({ text: TX.version + " " + verTxt, style: "labelMedium", color: "onSurfaceVariant" }),
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
                        var isInst = typeof verMap[g.id] === "number" && verMap[g.id] === vv.v;
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

    return UI.LazyColumn({ fillMaxSize: true, padding: 12, spacing: 12, onLoad: function () { return loadAll(); } }, rows);
}