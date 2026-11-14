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
// QCError — QinitCode 错误类型
// @ts-nocheck

export function QCError(msg, line) {
    this.message = 'QinitCode 错误: ' + msg;
    this.line = line || 0;
}
QCError.prototype = Object.create(Error.prototype);
QCError.prototype.constructor = QCError;
