// @ts-nocheck
// askstore — 问卷询问（userask）存储层
// 目录：/storage/emulated/0/Download/Operit/questionnaire/userask/（不存在自动创建）
// 双环境适配：优先 Tools.Files（工具脚本上下文），回退 NativeInterface（main 上下文）

export var ASK_DIR = "/sdcard/Download/Operit/questionnaire/userask";

export function askFileName(id) {
    return ASK_DIR + "/" + id + ".json";
}

async function readText(path) {
    var g = globalThis;
    if (g.Tools && g.Tools.Files && typeof g.Tools.Files.read === "function") {
        try {
            var r = await g.Tools.Files.read(path);
            var content = r && (r.content !== undefined ? r.content : r.data && r.data.content);
            if (content === undefined || content === null) return null;
            return typeof content === "string" ? content : JSON.stringify(content);
        } catch (e) { return null; }
    }
    if (g.NativeInterface && typeof g.NativeInterface.callTool === "function") {
        try {
            var raw = await g.NativeInterface.callTool("", "read_file", JSON.stringify({ path: path }));
            if (!raw) return null;
            var obj = typeof raw === "string" ? JSON.parse(raw) : raw;
            if (obj && typeof obj.data === "string") obj = JSON.parse(obj.data);
            var content2 = obj && (obj.content !== undefined ? obj.content : obj.data && obj.data.content);
            if (content2 === undefined || content2 === null) return null;
            // 去掉 read_file 的行号前缀
            return String(content2).replace(/^\s*\d+\|/gm, "");
        } catch (e) { return null; }
    }
    return null;
}

async function writeText(path, content) {
    var g = globalThis;
    if (g.Tools && g.Tools.Files && typeof g.Tools.Files.write === "function") {
        try {
            var r = await g.Tools.Files.write(path, content);
            return !!(r && r.success !== false);
        } catch (e) { return false; }
    }
    if (g.NativeInterface && typeof g.NativeInterface.callTool === "function") {
        try {
            var raw = await g.NativeInterface.callTool("", "write_file", JSON.stringify({ path: path, content: content }));
            return !!raw;
        } catch (e) { return false; }
    }
    return false;
}

async function makeDir(path) {
    var g = globalThis;
    if (g.Tools && g.Tools.Files && typeof g.Tools.Files.makeDirectory === "function") {
        try { await g.Tools.Files.makeDirectory(path, true); } catch (e) {}
        return;
    }
    if (g.NativeInterface && typeof g.NativeInterface.callTool === "function") {
        try { await g.NativeInterface.callTool("", "make_directory", JSON.stringify({ path: path, create_parents: true })); } catch (e) {}
        return;
    }
}

// 确保目录存在
export async function ensureDir() {
    await makeDir(ASK_DIR);
}

// 列出所有问卷 id（.json 文件）
export async function listAskIds() {
    var g = globalThis;
    var ids = [];
    try { await ensureDir(); } catch (e) {}
    if (g.Tools && g.Tools.Files && typeof g.Tools.Files.list === "function") {
        try {
            var r = await (g.Tools.Files.list ? g.Tools.Files.list(ASK_DIR, "android") : null);
            var list = r && (r.files || r.entries || r.data || []);
            var arr = Array.isArray(list) ? list : Array.isArray(r) ? r : (list && list.list) || [];
            for (var i = 0; i < arr.length; i++) {
                var name = typeof arr[i] === "string" ? arr[i] : (arr[i] && (arr[i].name || arr[i].path)) || "";
                if (typeof name === "string" && name.endsWith(".json")) ids.push(name.replace(/\.json$/, ""));
            }
            return ids;
        } catch (e) { return ids; }
    }
    if (g.NativeInterface && typeof g.NativeInterface.callTool === "function") {
        try {
            var raw = await g.NativeInterface.callTool("", "list_files", JSON.stringify({ path: ASK_DIR }));
            var obj = typeof raw === "string" ? JSON.parse(raw) : raw;
            var entries = obj && (obj.entries || (obj.data && obj.data.entries) || obj.list || []);
            if (!Array.isArray(entries)) entries = [];
            for (var j = 0; j < entries.length; j++) {
                var en = typeof entries[j] === "string" ? entries[j] : (entries[j] && (entries[j].name || entries[j].path)) || "";
                if (typeof en === "string" && en.endsWith(".json")) ids.push(en.replace(/\.json$/, ""));
            }
            return ids;
        } catch (e) { return ids; }
    }
    return ids;
}

// 加载问卷
export async function loadAsk(id) {
    if (!id) return null;
    try {
        var text = await readText(askFileName(id));
        if (!text) return null;
        var parsed = JSON.parse(text);
        if (!parsed || !parsed.id) return null;
        return parsed;
    } catch (e) { return null; }
}

// 保存问卷
export async function saveAsk(ask) {
    if (!ask || !ask.id) return false;
    ask.updatedAt = Date.now();
    return await writeText(askFileName(ask.id), JSON.stringify(ask));
}
