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
// ui/components/NumberField.ts
// 数字组件（number 题型）—— 素材库 form-stepper 的「− 值 +」手搭步进器。
//
// 为什么不用输入框：
//   平台没有 NumberInput，TextField 也不限数字。用手搭步进器可以：
//   ① 天然约束 min/max（到边界按钮禁用，不是把图标涂灰）
//   ② 不会出现「输入了 abc」这类脏数据
//   ③ 单击就能改值，触控区 48dp
//
// 结构（照素材库 form-stepper）：
//   Row: [− 圆钮 48×48] [值 + 单位 居中 weight:1] [＋ 圆钮 48×48]
//   ↓
//   hint 一行（范围说明）
//
// 平台约束：
//   - weight 是扁平 prop，且只认 Row/Column 直系子节点
//   - 圆钮用 Box + backgroundShape，不用 clip（clip 会裁内容，PITFALLS §3.7）

import { SPACE, RADIUS, FONT, SIZE, shape, colors } from "../shared/design.js";

export interface NumberFieldProps {
    keyName: string;
    /** 当前值；null 表示未填 */
    value: number | null;
    onChange: (next: number | null) => void;
    /** 最小值，默认 0 */
    min?: number;
    /** 最大值，默认 100 */
    max?: number;
    /** 步进，默认 1 */
    step?: number;
    /** 单位后缀，如「个」「分」「%」 */
    unit?: string;
    /** 说明文字（范围提示） */
    hint?: string;
    /** 是否必填 */
    required?: boolean;
    /** 是否已尝试提交 */
    tried?: boolean;
    /** 错误文案 */
    errText?: string;
    /** 主题名 */
    theme?: string;
}

export function NumberField(ctx: any, p: NumberFieldProps) {
    const c = colors(ctx);

    const min = typeof p.min === "number" ? p.min : 0;
    const max = typeof p.max === "number" ? p.max : 100;
    const step = typeof p.step === "number" && p.step > 0 ? p.step : 1;

    const has = p.value !== null && p.value !== undefined && !isNaN(Number(p.value));
    const cur = has ? Number(p.value) : null;

    const atMin = cur === null || cur <= min;
    const atMax = cur !== null && cur >= max;

    const dec = () => {
        if (cur === null) { p.onChange(min); return; }
        const next = cur - step;
        p.onChange(next < min ? min : next);
    };
    const inc = () => {
        if (cur === null) { p.onChange(min); return; }
        const next = cur + step;
        p.onChange(next > max ? max : next);
    };

    const bad = p.required === true && p.tried === true && cur === null;
    const isModern = p.theme === "modern";

    // 未填显示占位横线，避免看起来像 0
    const valueText = cur === null ? "\u2014" : String(cur) + (p.unit ? " " + p.unit : "");

    const stepper = ctx.UI.Row({
        key: p.keyName + "_row",
        fillMaxWidth: true,
        verticalAlignment: "center",
        spacing: SPACE.sm,
    }, [
        // − 按钮：到最小值禁用
        ctx.UI.Box({
            key: p.keyName + "_minus",
            width: SIZE.minTouch,
            height: SIZE.minTouch,
            contentAlignment: "center",
            background: c.surfaceVariant,
            backgroundShape: shape(RADIUS.pill),
            modifier: atMin ? undefined : ctx.Modifier.clickable(dec),
            alpha: atMin ? 0.45 : undefined,
        }, [
            ctx.UI.Icon({ name: "Remove", size: 22, tint: atMin ? c.onSurfaceVariant : c.onSurface }),
        ]),

        // 值
        ctx.UI.Box({
            key: p.keyName + "_val",
            weight: 1,
            contentAlignment: "center",
            padding: { vertical: SPACE.xs },
        }, [
            ctx.UI.Text({
                text: valueText,
                fontSize: FONT.title,
                fontWeight: "bold" as const,
                color: bad ? c.error : (cur === null ? c.onSurfaceVariant : c.onSurface),
                maxLines: 1,
            }),
        ]),

        // ＋ 按钮
        ctx.UI.Box({
            key: p.keyName + "_plus",
            width: SIZE.minTouch,
            height: SIZE.minTouch,
            contentAlignment: "center",
            background: c.surfaceVariant,
            backgroundShape: shape(RADIUS.pill),
            modifier: atMax ? undefined : ctx.Modifier.clickable(inc),
            alpha: atMax ? 0.45 : undefined,
        }, [
            ctx.UI.Icon({ name: "Add", size: 22, tint: atMax ? c.onSurfaceVariant : c.onSurface }),
        ]),
    ]);

    // 说明行：错误 > 范围提示
    const hintText = bad && p.errText
        ? p.errText
        : (p.hint || ("范围 " + min + " ~ " + max + (step !== 1 ? "\uff0c\u6b65\u8fdb " + step : "") + (p.unit ? "\uff08" + p.unit + "\uff09" : "")));

    const hintColor = bad ? c.error : c.onSurfaceVariant;

    if (!isModern) {
        return ctx.UI.Column({ key: p.keyName, fillMaxWidth: true, spacing: SPACE.xs }, [
            stepper,
            ctx.UI.Text({ text: hintText, fontSize: FONT.hint, color: hintColor }),
        ]);
    }

    // modern：包一层 Surface，与其它题型视觉对齐
    const wrapProps: any = {
        key: p.keyName + "_wrap",
        fillMaxWidth: true,
        shape: shape(RADIUS.item),
        containerColor: c.surfaceVariant,
        contentColor: c.onSurface,
        padding: { horizontal: SPACE.md, vertical: SPACE.md },
    };
    if (bad) {
        wrapProps.border = { width: 2, color: c.error };
    }

    return ctx.UI.Surface(wrapProps, [
        ctx.UI.Column({ fillMaxWidth: true, spacing: SPACE.xs }, [
            stepper,
            ctx.UI.Text({
                text: hintText,
                fontSize: FONT.hint,
                color: hintColor,
                textAlign: "center",
            }),
        ]),
    ]);
}