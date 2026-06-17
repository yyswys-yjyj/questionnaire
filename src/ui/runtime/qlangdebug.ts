// @ts-nocheck
// qlangdebug.ts — QLang 调试工具

import { executeQLang } from './QLangInterpreter.js';

/* METADATA
{
    "name": "qlang_debug",
    "display_name": {
        "zh": "QLang 脚本调试",
        "en": "QLang Script Debug"
    },
    "description": {
        "zh": "调试运行 QLang v2 脚本。支持两种模式：1）传入 code 参数直接执行 QLang 代码；2）传入 path 参数读取 .qlg 文件并执行。用于在开发时快速测试脚本逻辑。结果直接返回执行输出。",
        "en": "Debug-run QLang v2 scripts. Two modes: 1) Pass 'code' to execute inline QLang code. 2) Pass 'path' to read and execute a .qlg file. Returns execution output directly. Useful for rapid script development testing."
    },
    "category": "Development",
    "tools": [
        {
            "name": "qlang_debug",
            "description": {
                "zh": "调试运行 QLang v2 脚本。支持两种模式：1）传入 code 参数直接执行 QLang 代码；2）传入 path 参数读取 .qlg 文件并执行。代码必须包含完整的 main() 函数作为入口。结果直接返回执行输出。",
                "en": "Debug-run QLang v2 scripts. Two modes: 1) Pass 'code' parameter to execute inline QLang code. 2) Pass 'path' parameter to read and execute a .qlg file. Code must include a complete main() function entry. Returns execution output directly."
            },
            "parameters": [
                {
                    "name": "code",
                    "description": {
                        "zh": "QLang v2 脚本代码字符串（与 path 二选一）。应包含完整的 main() 函数定义。示例：\"int main(){int sum=0;for(int i=1;i<=100;i++){sum=sum+i;}print(sum);return 0;}\"",
                        "en": "QLang v2 script code string (alternative to path). Should include a complete main() function. Example: \"int main(){int sum=0;for(int i=1;i<=100;i++){sum=sum+i;}print(sum);return 0;}\""
                    },
                    "type": "string",
                    "required": false
                },
                {
                    "name": "path",
                    "description": {
                        "zh": ".qlg 文件路径（与 code 二选一）。读取指定路径的 .qlg 文件并执行其中的 QLang v2 代码。",
                        "en": "Path to .qlg file (alternative to code). Reads and executes the QLang v2 code from the specified .qlg file."
                    },
                    "type": "string",
                    "required": false
                }
            ]
        }
    ]
}
*/

export function qlang_debug(params) {
    var code = params.code;
    var path = params.path;
    
    if (!code && !path) {
        return { success: false, error: "请提供 code 或 path 参数" };
    }
    if (code && path) {
        return { success: false, error: "code 和 path 不能同时使用，请二选一" };
    }
    
    try {
        var scriptCode = code;
        if (path) {
            try {
                scriptCode = Tools.Files.read(path);
            } catch (e) {
                return { success: false, error: "文件读取失败：" + String(e) };
            }
            if (scriptCode === undefined || scriptCode === null || String(scriptCode).trim() === '') {
                return { success: false, error: "文件为空或读取失败：" + path };
            }
        }
        
        var result = executeQLang(String(scriptCode), {}, {}, []);
        
        if (result) {
            return {
                success: true,
                output: result,
                message: "QLang 脚本执行完成",
                data: { result: result }
            };
        }
        return {
            success: true,
            output: "",
            message: "QLang 脚本执行完成（无输出）"
        };
    } catch (e) {
        return {
            success: false,
            error: "QLang 脚本错误: " + String(e.message || e)
        };
    }
}

export function main() {
    complete({
        success: true,
        message: "QLang 调试工具已加载。使用 qlang_debug 工具运行 QLang 脚本。"
    });
}
