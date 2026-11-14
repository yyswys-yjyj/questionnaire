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
// ui/components/ConfirmField.ts
// 确认组件（confirm 题型）—— **长按确认**，照素材库 gest-long-press 的写法。
//
// 交互契约（重要，与普通勾选完全不同）：
//   未确认 ──长按 0.5s──▶ 已确认（armed）
//   已确认 ──单击────────▶ 取消（回到未确认）
//   未确认 ──单击────────▶ 什么都不做（防止误触，这正是"长按确认"的意义）
//
// 为什么用长按而不是勾选框：
//   确认类题目（同意条款 / 确认已核对信息）需要"防误触"，
//   单击就能打勾的组件太容易顺手勾上，长按是一个明确的、需要停留的动作。
//
// 平台实现（PITFALLS 重点）：
//   - 必须用 Modifier.combinedClickable({ onClick, onLongClick })，它同时提供两种语义
//   - **同一节点只能挂一个手势 modifier**：combinedClickable / tapGestures /
//     dragGestures / transformGestures 互斥，不能叠加
//   - 长按不会自动震动，也没有过渡动画：状态是否变化只能靠 **颜色 + 文案** 表达，
//     所以未确认/已确认两态必须换底色（errorContainer ↔ primaryContainer）
//   - 不能用 clip().background() 画底色，会连内容一起裁（§3.7）；要底色就用 Surface

import { SPACE, RADIUS, FONT, BORDER, shape, fade, colors } from "../shared/design.js";

export interface ConfirmFieldProps {
    keyName: string;
    /** 确认文案，如「我已阅读并同意上述条款」 */
    text: string;
    /** 是否已确认（长按后为 true） */
    checked: boolean;
    onChange: (next: boolean) => void;
    /** 是否必填 */
    required?: boolean;
    /** 是否已尝试提交（决定错误态是否显示） */
    tried?: boolean;
    /** 错误提示文案 */
    errText?: string;
    /** 长按提示文案（未确认时显示在按钮里） */
    longPressHint?: string;
    /** 已确认提示文案 */
    confirmedHint?: string;
    /** 主题名：modern 走长按卡，classic/compact 退回 Checkbox */
    theme?: string;
}

export function ConfirmField(ctx: any, p: ConfirmFieldProps) {
    const c = colors(ctx);
    const armed = p.checked === true;
    const bad = p.required === true && p.tried === true && !armed;

    // ── classic / compact：Checkbox 旧观感（不做长按，保持老主题行为一致） ──
    if (p.theme !== "modern") {
        const col: any[] = [
            ctx.UI.Row({
                fillMaxWidth: true,
                verticalAlignment: "center",
                spacing: SPACE.sm,
                padding: { vertical: SPACE.xs },
                modifier: ctx.Modifier.clickable(() => p.onChange(!armed)),
            }, [
                ctx.UI.Checkbox({
                    checked: armed,
                    onCheckedChange: (v: boolean) => p.onChange(v === true),
                }),
                ctx.UI.Text({
                    text: p.text,
                    fontSize: FONT.small,
                    color: bad ? c.error : c.onSurface,
                    weight: 1,
                }),
            ]),
        ];
        if (bad && p.errText) {
            col.push(ctx.UI.Text({ text: p.errText, fontSize: FONT.hint, color: c.error, padding: { top: 2 } }));
        }
        return ctx.UI.Column({ key: p.keyName, fillMaxWidth: true, spacing: 0 }, col);
    }

    // ── modern：长按确认卡 ──
    // 两态配色（成对下发）：
    //   未确认 → surfaceVariant / onSurfaceVariant（低调，不吸引误触）
    //   已确认 → primaryContainer / onPrimaryContainer（明确"已生效"）
    //   错误   → errorContainer / onErrorContainer（必填未确认且已尝试提交）
    let bg: any;
    let fg: any;
    if (bad) {
        bg = c.errorContainer;
        fg = c.onErrorContainer;
    } else if (armed) {
        bg = c.primaryContainer;
        fg = c.onPrimaryContainer;
    } else {
        bg = c.surfaceVariant;
        fg = c.onSurfaceVariant;
    }

    // 主文案
    const mainText: any[] = [
        ctx.UI.Text({
            text: armed
                ? (p.confirmedHint || p.text)
                : (p.longPressHint || p.text),
            fontSize: FONT.body,
            fontWeight: "bold" as const,
            color: fg,
            textAlign: "center",
            maxLines: 3,
            weight: 1,
        }),
    ];

    // 副文案：未确认时提示"长按"，已确认时提示"点击取消"
    const subText = armed
        ? "\u5df2\u786e\u8ba4\uff0c\u70b9\u51fb\u53ef\u53d6\u6d88"
        : "\u957f\u6309\u786e\u8ba4";
    mainText.push(ctx.UI.Text({
        text: subText,
        fontSize: FONT.hint,
        color: fade(fg, 0.85),
        textAlign: "center",
        padding: { top: SPACE.xs },
    }));

    // 已确认时给一个勾图标，弥补"没有动画"的反馈缺失
    if (armed) {
        mainText.unshift(ctx.UI.Icon({ name: "CheckCircle", size: 22, tint: fg }));
        mainText.unshift(ctx.UI.Spacer({ height: SPACE.xs }));
    }

    // 核心：combinedClickable 同时给 onClick 与 onLongClick
    //   未确认 → 单击无效（只响应长按）
    //   已确认 → 单击取消，长按保持已确认
    const gesture = ctx.Modifier.combinedClickable({
        onClick: () => {
            if (armed) p.onChange(false);
        },
        onLongClick: () => {
            if (!armed) p.onChange(true);
        },
    });

    const surfaceProps: any = {
        key: p.keyName + "_btn",
        fillMaxWidth: true,
        shape: shape(RADIUS.item),
        containerColor: bg,
        contentColor: fg,
        padding: { horizontal: SPACE.lg, vertical: SPACE.lg },
        modifier: gesture,
    };
    // 必填未确认：额外 error 描边强化（背景已经用 errorContainer，这里再加一圈）
    if (bad) {
        surfaceProps.border = { width: BORDER.strong, color: c.error };
    }

    const wrapped: any[] = [
        ctx.UI.Surface(surfaceProps, [
            ctx.UI.Column({
                fillMaxWidth: true,
                spacing: 0,
                horizontalAlignment: "center",
            }, mainText),
        ]),
    ];

    // 题目自带的说明文字（如果有）放在卡下方
    if (!armed && p.text && (p.longPressHint || "").length > 0) {
        wrapped.push(ctx.UI.Text({
            text: p.text,
            fontSize: FONT.small,
            color: bad ? c.error : c.onSurface,
            padding: { top: SPACE.sm, left: SPACE.xs },
        }));
    }
    if (bad && p.errText) {
        wrapped.push(ctx.UI.Text({
            text: p.errText,
            fontSize: FONT.hint,
            color: c.error,
            padding: { top: SPACE.xs, left: SPACE.xs },
        }));
    }

    return ctx.UI.Column({ key: p.keyName, fillMaxWidth: true, spacing: 0 }, wrapped);
}