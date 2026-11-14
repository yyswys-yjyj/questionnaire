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
// ui/components/NpsScale.ts
// NPS 净推荐值 —— 0~10 十一个档位。
//
// 原实现是"三行按钮（4+4+3）"，视觉上和普通多选题没区别，用户看不出这是 0~10 的连续刻度。
// 改版：一行 0~10 胶囊，均分宽度；选中实心主色，未选中弱描边。
// 因为 11 个格子分一行，单格宽度必须靠 weight:1 均分，字号压到 micro。

import { SPACE, RADIUS, FONT, SIZE, shape, fade, colors } from "../shared/design.js";

export interface NpsScaleProps {
    keyName: string;
    /** 当前值，-1 表示未选 */
    value: number;
    onChange: (score: number) => void;
    theme?: string;
}

export function NpsScale(ctx: any, p: NpsScaleProps) {
    const c = colors(ctx);

    if (p.theme !== "modern") {
        return buildCompact(ctx, p, c);
    }

    const cells: any[] = [];
    for (let i = 0; i <= 10; i++) {
        const selected = i === p.value;
        // 三档语义色：0~6 不推荐(弱) / 7~8 中性(次主色) / 9~10 推荐(主色)
        // 未选中时统一弱描边，选中时按档位取色，强化语义分区
        const accent = i >= 9 ? c.primary : (i >= 7 ? c.onPrimaryContainer : c.onSurfaceVariant);

        cells.push(ctx.UI.Box({
            key: p.keyName + "_n" + i,
            // weight 挂在 Row 直系子节点才能均分
            modifier: ctx.Modifier
                .weight(1)
                .height(SIZE.minTouch)
                .clickable(() => p.onChange(i)),
            background: selected ? accent : undefined,
            backgroundShape: shape(RADIUS.item),
        }, [
            ctx.UI.Box({
                key: p.keyName + "_inner" + i,
                fillMaxSize: true,
                contentAlignment: "center",
                // 未选中时靠 border 描出格子边界
                modifier: selected ? undefined : ctx.Modifier.border(1, fade(c.outlineVariant, 0.8), shape(RADIUS.item)),
            }, [
                ctx.UI.Text({
                    text: String(i),
                    fontSize: FONT.small,
                    color: selected ? (i >= 7 ? c.onPrimary : c.onSurface) : c.onSurfaceVariant,
                    textAlign: "center",
                }),
            ]),
        ]));
    }

    return ctx.UI.Column({ key: p.keyName + "_wrap", fillMaxWidth: true, spacing: SPACE.sm }, [
        ctx.UI.Row({
            key: p.keyName + "_row",
            fillMaxWidth: true,
            spacing: 2,
            verticalAlignment: "center",
        }, cells),
        // 两端语义说明，帮助用户理解刻度方向
        ctx.UI.Row({
            key: p.keyName + "_ax",
            fillMaxWidth: true,
            horizontalArrangement: "spaceBetween",
        }, [
            ctx.UI.Text({ text: "0", fontSize: FONT.small, color: fade(c.onSurfaceVariant, 0.8) }),
            ctx.UI.Text({ text: "10", fontSize: FONT.small, color: fade(c.onSurfaceVariant, 0.8) }),
        ]),
    ]);
}

/** compact 主题：保留三行按钮的旧观感 */
function buildCompact(ctx: any, p: NpsScaleProps, c: any) {
    const groups = [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10]];
    const rows: any[] = [];
    for (let gi = 0; gi < groups.length; gi++) {
        const btns: any[] = [];
        for (let gj = 0; gj < groups[gi].length; gj++) {
            const idx = groups[gi][gj];
            const selected = idx === p.value;
            btns.push(ctx.UI.OutlinedButton({
                key: p.keyName + "_cn" + idx,
                containerColor: selected ? c.primary : null,
                contentColor: selected ? c.onPrimary : c.onSurface,
                onClick: () => p.onChange(idx),
                content: ctx.UI.Text({
                    text: String(idx),
                    style: "labelSmall",
                    color: selected ? c.onPrimary : c.onSurface,
                }),
            }));
        }
        rows.push(ctx.UI.Row({
            key: p.keyName + "_crow" + gi,
            spacing: SPACE.sm,
            horizontalArrangement: "spaceEvenly",
            fillMaxWidth: true,
        }, btns));
    }
    return ctx.UI.Column({ key: p.keyName + "_cwrap", fillMaxWidth: true, spacing: SPACE.sm }, rows);
}