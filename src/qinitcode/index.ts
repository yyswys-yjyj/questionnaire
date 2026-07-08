// QinitCode — 入口导出
// @ts-nocheck

import { tokenize as _tokenize } from './QCTokenizer';
import { parse as _parse } from './QCParser';
import { executeQinitCode as _executeQinitCode, execBlock as _execBlock, resetRuntime as _resetRuntime, getRuntimeState as _getRuntimeState } from './QCRuntime';
import { QCError as _QCError } from './QCError';

export var tokenize = _tokenize;
export var parse = _parse;
export var executeQinitCode = _executeQinitCode;
export var execBlock = _execBlock;
export var resetRuntime = _resetRuntime;
export var getRuntimeState = _getRuntimeState;
export var QCError = _QCError;

export function compileAndRun(code, options) {
    var ast = _parse(code);
    return _executeQinitCode(ast, options);
}
