// @ts-nocheck
// output.ts — 结果脚本的输出解析与格式化

export function formatScriptOutput(lines) {
    // lines 是执行过程中收集的 print 输出数组
    if (!lines || lines.length === 0) return '';
    return '\n\n── 结果 ──\n' + lines.join('\n');
}

export function formatScriptError(errMsg) {
    return '\n\n── 结果（错误）──\n' + errMsg;
}
