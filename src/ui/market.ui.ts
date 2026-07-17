// @ts-nocheck

/* ============================================
 * 语言包市场 - Language Pack Market
 * 
 * 命名空间：ui.market.langpack.*
 * 从 GitHub API 拉取语言包列表，支持下载与发布
 * ============================================ */

/* ---- 语言包地区友好名称表 ---- */
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

/* ---- 本地 _t 翻译函数 ---- */
var _marketLang = null;
function _t(key) {
    if (_marketLang && _marketLang[key]) return _marketLang[key];
    var builtin = {
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
        "ui.market.langpack.deleteSuccess": "已删除",
        "ui.market.langpack.deleteFail": "删除失败",
        "ui.market.langpack.manageTitle": "语言包管理",
        "ui.market.langpack.manageRefresh": "请刷新",
        "ui.market.langpack.manageEmpty": "当前无语言包",
        "ui.market.langpack.manageDelete": "删除",
    };
    return builtin[key] || key;
}

export default async function Screen(ctx) {
    var primary = ctx.MaterialTheme.colorScheme.primary;
    var onSurface = ctx.MaterialTheme.colorScheme.onSurface;
    var onSurfaceVariant = ctx.MaterialTheme.colorScheme.onSurfaceVariant;
    var surfaceVariant = ctx.MaterialTheme.colorScheme.surfaceVariant;
    var error = ctx.MaterialTheme.colorScheme.error;

    var marketListState = ctx.useState("_marketList", null);
    var fetchingState = ctx.useState("_fetching", false);
    var installedPacksState = ctx.useState("_installedPacks", []);
    var installedDetailState = ctx.useState("_installedDetail", null);
    var downloadingState = ctx.useState("_downloading", "");
    var installErrorState = ctx.useState("_installError", "");
    var langDir = "/sdcard/Download/Operit/questionnaire/lang";
    var currentVer = 175;

    /* ---- 获取已安装的语言包列表（含详情） ---- */
    async function refreshInstalled() {
        try {
            var dirResult = await ctx.callTool("list_files", { path: langDir });
            var entries = [];
            if (dirResult && dirResult.entries) entries = dirResult.entries;
            else if (dirResult && dirResult.data && dirResult.data.entries) entries = dirResult.data.entries;
            else if (Array.isArray(dirResult)) entries = dirResult;
            var ids = [];
            var details = [];
            for (var i = 0; i < entries.length; i++) {
                var entry = entries[i];
                var name = typeof entry === "string" ? entry : (entry.name || "");
                if (name.endsWith(".json")) {
                    var id = name.replace(".json", "");
                    ids.push(id);
                    try {
                        var fp = langDir + "/" + name;
                        var raw = await ctx.callTool("read_file", { path: fp });
                        var c = raw && raw.content ? raw.content.replace(/^\s*\d+\|/gm, "") : "";
                        var p = JSON.parse(c);
                        details.push({ id: id, author: p.author || "", displayName: langNames[id] || id });
                    } catch(e) {
                        details.push({ id: id, author: "", displayName: langNames[id] || id });
                    }
                }
            }
            installedPacksState[1](ids);
            installedDetailState[1](details);
        } catch(e) {}
    }

    /* ---- 从 API 拉取市场列表 ---- */
    async function fetchMarketList() {
        if (fetchingState[0]) return;
        fetchingState[1](true);
        marketListState[1](null);
        try {
            var resp = await ctx.callTool("http_request", {
                url: "https://cdn.serveryyswys.top/cdn/github/yyswys-yjyj/questionnaire/langpack-json",
                method: "GET"
            });
            var listData = null;
            if (resp && resp.content) {
                if (typeof resp.content === "string") {
                    try {
                        var parsed = JSON.parse(resp.content);
                        if (parsed && parsed.list) listData = parsed.list;
                    } catch(e) {}
                } else if (resp.content.list && Array.isArray(resp.content.list)) {
                    listData = resp.content.list;
                }
            }
            if (!listData && resp && resp.list && Array.isArray(resp.list)) {
                listData = resp.list;
            }
            if (!listData && resp && resp.data && resp.data.content) {
                try {
                    var p2 = typeof resp.data.content === "string" ? JSON.parse(resp.data.content) : resp.data.content;
                    if (p2 && p2.list) listData = p2.list;
                } catch(e) {}
            }
            if (listData && Array.isArray(listData)) {
                marketListState[1](listData);
            } else {
                throw new Error("Invalid format");
            }
        } catch(e) {
            ctx.showToast(_t("ui.market.langpack.loadFail") + String(e));
        }
        fetchingState[1](false);
    }

    /* ---- 删除语言包 ---- */
    async function deletePack(id) {
        try {
            var fp = langDir + "/" + id + ".json";
            await ctx.callTool("delete_file", { path: fp });
            ctx.showToast(_t("ui.market.langpack.deleteSuccess"));
            await refreshInstalled();
        } catch(e) {
            ctx.showToast(_t("ui.market.langpack.deleteFail") + ": " + String(e));
        }
    }

    /* ---- 下载语言包 ---- */
    async function downloadPack(item) {
        if (downloadingState[0]) return;
        downloadingState[1](item.id);
        installErrorState[1]("");
        try {
            var destPath = langDir + "/" + item.id + ".json";
            await ctx.callTool("make_directory", { path: langDir, create_parents: true });
            await ctx.callTool("download_file", {
                url: item.url,
                destination: destPath
            });
            ctx.showToast(_t("ui.market.langpack.downloadSuccess"));
            await refreshInstalled();
        } catch(e) {
            installErrorState[1](item.id);
            ctx.showToast(_t("ui.market.langpack.downloadFail") + "：" + (e && e.message ? e.message : String(e)));
        }
        downloadingState[1]("");
    }

    /* ---- 打开 GitHub Issue 发布页 ---- */
    function openPublishPage() {
        var url = "https://github.com/yyswys-yjyj/questionnaire/issues/new?template=语言包发布.yaml";
        try {
            ctx.callTool("browser_navigate", { url: url });
        } catch(e) {
            ctx.showToast("打开链接失败：" + String(e));
        }
    }

    /* ---- 初始化 ---- */
    try {
        var envLang = ctx.getEnv("QUESTIONNAIRE_LANG_PATH") || "";
        if (envLang) {
            try {
                var lr = await ctx.callTool("read_file", { path: envLang });
                var lc = lr && lr.content ? lr.content.replace(/^\s*\d+\|/gm, "") : "";
                var lp = JSON.parse(lc);
                if (lp && lp.lang) _marketLang = lp.lang;
            } catch(e) {}
        }
    } catch(e) {}

    await refreshInstalled();
    if (!marketListState[0] && !fetchingState[0]) {
        fetchMarketList();
    }

    var marketList = marketListState[0];
    var fetching = fetchingState[0];
    var downloading = downloadingState[0];
    var installed = installedPacksState[0] || [];

    /* ============= 渲染 ============= */
    return ctx.UI.LazyColumn({ spacing: 12, modifier: ctx.Modifier.fillMaxSize().padding(16) }, [
        /* ---- 顶部标题 + 刷新按钮 ---- */
        ctx.UI.Row({ verticalAlignment: "centerVertically", fillMaxWidth: true }, [
            ctx.UI.Text({ text: _t("ui.market.langpack.title"), style: "titleMedium", color: onSurface, modifier: ctx.Modifier.weight(1) }),
            ctx.UI.OutlinedButton({
                onClick: fetchMarketList,
                enabled: !fetching,
                content: ctx.UI.Text({ text: fetching ? _t("ui.market.langpack.fetching") : _t("ui.market.langpack.refresh"), style: "labelMedium", color: primary }),
            }),
        ]),

        ctx.UI.Divider({}),

        /* ---- 加载状态 ---- */
        fetching && !marketList ? ctx.UI.Box({ fillMaxWidth: true, contentAlignment: "center" }, [
            ctx.UI.CircularProgressIndicator({ strokeWidth: 2, color: primary }),
        ]) : null,

        /* ---- 语言包管理 ---- */
        ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
            ctx.UI.Column({ padding: 12, spacing: 6 }, [
                ctx.UI.Text({ text: _t("ui.market.langpack.manageTitle"), style: "titleSmall", color: onSurface }),
                installedDetailState[0] === null ? ctx.UI.Text({ text: _t("ui.market.langpack.manageRefresh"), style: "bodySmall", color: onSurfaceVariant }) : (installedDetailState[0].length > 0 ? ctx.UI.Column({ spacing: 4 }, installedDetailState[0].map(function(d) {
                    return ctx.UI.Row({ verticalAlignment: "centerVertically", fillMaxWidth: true }, [
                        ctx.UI.Text({ text: d.displayName + " (" + d.id + ")", style: "bodySmall", color: onSurface, modifier: ctx.Modifier.weight(1) }),
                        ctx.UI.TextButton({
                            onClick: function() { deletePack(d.id); },
                            content: ctx.UI.Text({ text: _t("ui.market.langpack.manageDelete"), style: "labelSmall", color: error }),
                        }),
                    ]);
                })) : ctx.UI.Text({ text: _t("ui.market.langpack.manageEmpty"), style: "bodySmall", color: onSurfaceVariant })),
            ]),
        ]),

        /* ---- 市场列表 ---- */
        !fetching && marketList && marketList.length > 0 ? ctx.UI.Column({ spacing: 8, fillMaxWidth: true }, marketList.map(function(item) {
            var isInstalled = installed.indexOf(item.id) >= 0;
            var isDownloading = downloading === item.id;
            var hasError = installErrorState[0] === item.id;
            var displayName = null;
            if (item.displayname && typeof item.displayname === "object") {
                var _mid = "";
                try { var _mlp = ctx.getEnv("QUESTIONNAIRE_LANG_PATH") || ""; if (_mlp) _mid = _mlp.split("/").pop().replace(".json", "").toLowerCase(); } catch(e){}
                displayName = item.displayname[_mid] || item.displayname["default"] || item.displayname["zh_cn"] || item.displayname["en_us"] || item.id;
            }
            if (!displayName) displayName = langNames[item.id] || item.id;
            var versionStr = item.version ? "v" + String(item.version).charAt(0) + "." + String(item.version).substring(1, 2) + "." + String(item.version).substring(2) : "";
            var versionWarn = item.version && item.version !== currentVer;
            return ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
                ctx.UI.Column({ padding: 12, spacing: 6 }, [
                    ctx.UI.Row({ verticalAlignment: "centerVertically", fillMaxWidth: true }, [
                        ctx.UI.Column({ modifier: ctx.Modifier.weight(1) }, [
                            ctx.UI.Text({ text: displayName, style: "titleSmall", color: onSurface }),
                            ctx.UI.Text({ text: item.id, style: "bodySmall", color: onSurfaceVariant }),
                        ]),
                        isInstalled ? ctx.UI.OutlinedButton({
                            enabled: false,
                            content: ctx.UI.Text({ text: _t("ui.market.langpack.installed"), style: "labelSmall", color: onSurfaceVariant }),
                        }) : (hasError ? ctx.UI.OutlinedButton({
                            onClick: function() { downloadPack(item); },
                            content: ctx.UI.Text({ text: _t("ui.market.langpack.reinstall"), style: "labelSmall", color: error }),
                        }) : (isDownloading ? ctx.UI.OutlinedButton({
                            enabled: false,
                            content: ctx.UI.Text({ text: _t("ui.market.langpack.installing"), style: "labelSmall", color: onSurfaceVariant }),
                        }) : ctx.UI.OutlinedButton({
                            onClick: function() { downloadPack(item); },
                            content: ctx.UI.Text({ text: _t("ui.market.langpack.download"), style: "labelSmall", color: primary }),
                        }))),
                    ]),
                    ctx.UI.Row({ verticalAlignment: "centerVertically" }, [
                        ctx.UI.Text({ text: _t("ui.market.langpack.authorLabel") + ": " + (item.author || "-"), style: "bodySmall", color: onSurfaceVariant }),
                        versionStr ? ctx.UI.Spacer({ width: 12 }) : null,
                        versionStr ? ctx.UI.Text({ text: _t("ui.market.langpack.version") + ": " + versionStr, style: "bodySmall", color: onSurfaceVariant }) : null,
                    ]),
                    versionWarn ? ctx.UI.Text({ text: "⚠ 版本不兼容（当前 v" + String(currentVer).charAt(0) + "." + String(currentVer).substring(1, 2) + "." + String(currentVer).substring(2) + "，该包版本 " + versionStr + "）", style: "bodySmall", color: error }) : null,
                ]),
            ]);
        })) : null,

        /* ---- 空状态 ---- */
        !fetching && marketList && marketList.length === 0 ? ctx.UI.Box({ fillMaxWidth: true, contentAlignment: "center" }, [
            ctx.UI.Text({ text: _t("ui.market.langpack.noItems"), style: "bodyMedium", color: onSurfaceVariant }),
        ]) : null,

        ctx.UI.Spacer({ height: 8 }),
        ctx.UI.Divider({}),

        /* ---- 发布区 ---- */
        ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
            ctx.UI.Column({ padding: 16, spacing: 8 }, [
                ctx.UI.Text({ text: _t("ui.market.langpack.publishTitle"), style: "titleSmall", color: onSurface }),
                ctx.UI.Text({ text: _t("ui.market.langpack.publishDesc"), style: "bodySmall", color: onSurfaceVariant }),
                ctx.UI.Spacer({ height: 4 }),
                ctx.UI.OutlinedButton({
                    onClick: openPublishPage,
                    fillMaxWidth: true,
                    content: ctx.UI.Text({ text: _t("ui.market.langpack.publishBtn"), style: "labelMedium", color: primary }),
                }),
            ]),
        ]),
    ]);
}
