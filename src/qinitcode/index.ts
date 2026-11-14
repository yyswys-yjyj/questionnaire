/*
 * SPDX-FileCopyrightText: 2025-2026 liu-baia, yyswys-yjyj
 * SPDX-License-Identifier: GPL-3.0-only
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License only.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
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
