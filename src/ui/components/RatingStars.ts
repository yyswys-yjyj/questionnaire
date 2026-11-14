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
// ui/components/RatingStars.ts
// 星级评分 —— 把原来"5 个数字按钮分两行（3+2）"换成一排真星级图标。
//
// 交互：点第 N 颗星 = 选 N 分；再点同一颗不清空（与原行为一致，避免误触丢答案）。
// 视觉：已选星星填充实心主色，未选空心弱描边；下方显示语义标签。

import { SPACE, FONT, SIZE, fade, colors } from "../shared/design.js";

export interface RatingStarsProps {
    /** 唯一 key 前缀 */
    keyName: string;
    /** 当前分值 0~5，0 表示未选 */
    value: number;
    /** 0~5 对应的语义标签（下标 0 空着不用） */
    labels: string[];
    /** 未选时的提示文案 */
    hint: string;
    /** 分值变化回调 */
    onChange: (score: number) => void;
    /** 主题名（compact 走旧样式） */
    theme?: string;
}

export function RatingStars(ctx: any, p: RatingStarsProps) {
    const c = colors(ctx);

    // compact 主题保持原有的数字按钮观感
    if (p.theme !== "modern") {
        const btns: any[] = [];
        for (let i = 1; i <= 5; i++) {
            const filled = i <= p.value;
            btns.push(ctx.UI.OutlinedButton({
                key: p.keyName + "_c" + i,
                containerColor: filled ? c.primary : null,
                contentColor: filled ? c.onPrimary : c.onSurface,
                onClick: () => p.onChange(i),
                content: ctx.UI.Text({
                    text: String(i),
                    style: "labelSmall",
                    color: filled ? c.onPrimary : c.onSurface,
                }),
            }));
        }
        return ctx.UI.Column({ key: p.keyName + "_cwrap", spacing: SPACE.sm, fillMaxWidth: true }, [
            ctx.UI.LazyRow({ key: p.keyName + "_crow", spacing: SPACE.sm }, btns),
            buildHint(ctx, p, c),
        ]);
    }

    // ── 标准主题：一排星级 ──
    const stars: any[] = [];
    for (let i = 1; i <= 5; i++) {
        const filled = i <= p.value;
        stars.push(ctx.UI.Box({
            key: p.keyName + "_s" + i,
            padding: SPACE.xs,
            // 每颗星单独可点，避免整行点击导致误判落点
            modifier: ctx.Modifier.clickable(() => p.onChange(i)),
        }, [
            ctx.UI.Icon({
                name: filled ? "star" : "star_border",
                size: SIZE.star,
                tint: filled ? c.primary : fade(c.onSurfaceVariant, 0.7),
            }),
        ]));
    }

    return ctx.UI.Column({ key: p.keyName + "_wrap", spacing: SPACE.sm, fillMaxWidth: true }, [
        ctx.UI.Row({
            key: p.keyName + "_row",
            spacing: SPACE.sm,
            verticalAlignment: "center",
            horizontalArrangement: "start",
        }, stars),
        buildHint(ctx, p, c),
    ]);
}

/** 分值语义行：未选显示提示，已选显示"N 分 · 标签" */
function buildHint(ctx: any, p: RatingStarsProps, c: any) {
    if (p.value > 0) {
        const label = p.labels[p.value] || "";
        return ctx.UI.Row({ key: p.keyName + "_lbl", verticalAlignment: "center" }, [
            ctx.UI.Text({
                text: String(p.value) + "/5",
                fontSize: FONT.body,
                color: c.primary,
            }),
            label ? ctx.UI.Spacer({ width: SPACE.sm }) : null,
            label
                ? ctx.UI.Text({ text: "· " + label, fontSize: FONT.body, color: c.onSurfaceVariant })
                : null,
        ]);
    }
    return ctx.UI.Text({
        key: p.keyName + "_hint",
        text: p.hint,
        fontSize: FONT.body,
        color: fade(c.onSurfaceVariant, 0.75),
    });
}