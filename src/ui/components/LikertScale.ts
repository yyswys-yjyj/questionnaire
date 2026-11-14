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
// ui/components/LikertScale.ts
// 李克特量表 —— modern 主题用「两行数字按钮 + 独立标签行」，classic/compact 走旧按钮。
//
// 【v1.8.2 回滚说明】
//   上一轮我擅自把这里改成了「纵向整行按钮」，那是误解——这个形态本来就是对的，
//   用户要的是「设置页的分段控件参考它的按钮样式」，不是让李克特也变纵向。
//   现在恢复成：3+2 两行、按钮等宽 48dp、标签集中在一行。
//
//   标签行会断字（"非常不同意"→"非常不同/意"）的唯一解法：
//   标签字号要小（hint=12）、且按钮行不留多余水平内距，让 5 份等分拿到最大宽度。
//   这不是调参能完全解决的硬约束，但 12sp 中文 5 字在 1/5 屏宽（约 66dp）里刚好一行。

import { SPACE, RADIUS, FONT, SIZE, shape, colors } from "../shared/design.js";

export interface LikertScaleProps {
    keyName: string;
    /** 选项文字数组（通常 5 项） */
    options: string[];
    /** 当前选中索引（1-based）；0 = 未选 */
    value: number;
    onChange: (index1Based: number) => void;
    /** 主题名；只有 modern 走新样式 */
    theme?: string;
}

export function LikertScale(ctx: any, p: LikertScaleProps) {
    const c = colors(ctx);

    // ── classic / compact：旧的横滚数字按钮 ──
    if (p.theme !== "modern") {
        return buildLegacy(ctx, p, c);
    }

    const total = p.options.length;
    // 分两行：上行 ceil(total/2)，下行余下
    const topCount = Math.ceil(total / 2);
    const topIdx: number[] = [];
    const bottomIdx: number[] = [];
    for (let i = 1; i <= total; i++) {
        if (i <= topCount) topIdx.push(i); else bottomIdx.push(i);
    }

    // 单行内所有按钮等宽：weight 挂在 Row 直系子节点
    const buildRow = (key: string, idxs: number[]) => {
        const btns: any[] = [];
        for (let k = 0; k < idxs.length; k++) {
            const i = idxs[k];
            const selected = i === p.value;
            btns.push(
                ctx.UI.Surface({
                    key: p.keyName + "_b" + i,
                    weight: 1,
                    height: SIZE.minTouch,
                    shape: shape(RADIUS.item),
                    containerColor: selected ? c.primary : c.surfaceVariant,
                    contentColor: selected ? c.onPrimary : c.onSurface,
                    onClick: () => p.onChange(i),
                }, [
                    ctx.UI.Box({
                        key: p.keyName + "_bx" + i,
                        fillMaxSize: true,
                        contentAlignment: "center",
                    }, [
                        ctx.UI.Text({
                            text: String(i),
                            fontSize: FONT.body,
                            color: selected ? c.onPrimary : c.onSurface,
                        }),
                    ]),
                ])
            );
        }
        return ctx.UI.Row({
            key: key,
            fillMaxWidth: true,
            spacing: SPACE.sm,
        }, btns);
    };

    // 标签行：与按钮同宽对齐，12sp，选中项 primary
    const labels: any[] = [];
    for (let k = 0; k < total; k++) {
        const i = k + 1;
        const selected = i === p.value;
        labels.push(
            ctx.UI.Text({
                key: p.keyName + "_l" + i,
                text: p.options[k] || "",
                fontSize: FONT.micro,
                color: selected ? c.primary : c.onSurfaceVariant,
                textAlign: "center",
                weight: 1,
                maxLines: 2,
            })
        );
    }

    const children: any[] = [
        buildRow(p.keyName + "_row1", topIdx),
    ];
    if (bottomIdx.length > 0) {
        children.push(buildRow(p.keyName + "_row2", bottomIdx));
    }
    // 标签单独一行，不塞进按钮，不会被挤压折行
    children.push(ctx.UI.Row({
        key: p.keyName + "_labels",
        fillMaxWidth: true,
        spacing: SPACE.sm,
        padding: { top: SPACE.xs },
    }, labels));

    if (p.value > 0) {
        children.push(ctx.UI.Text({
            key: p.keyName + "_sel",
            text: p.options[Math.min(p.value - 1, total - 1)] || "",
            fontSize: FONT.small,
            color: c.primary,
        }));
    }

    return ctx.UI.Column({
        key: p.keyName + "_wrap",
        fillMaxWidth: true,
        spacing: SPACE.sm,
    }, children);
}

/** classic / compact：保留旧的数字按钮观感（一行横滚 + 选中提示） */
function buildLegacy(ctx: any, p: LikertScaleProps, c: any) {
    const nums: any[] = [];
    for (let i = 1; i <= p.options.length; i++) {
        const selected = i === p.value;
        nums.push(ctx.UI.OutlinedButton({
            key: p.keyName + "_c" + i,
            containerColor: selected ? c.primary : null,
            contentColor: selected ? c.onPrimary : c.onSurface,
            onClick: () => p.onChange(i),
            content: ctx.UI.Text({
                text: String(i),
                style: "labelSmall",
                color: selected ? c.onPrimary : c.onSurface,
            }),
        }));
    }
    return ctx.UI.Column({ key: p.keyName + "_cwrap", fillMaxWidth: true, spacing: SPACE.sm }, [
        ctx.UI.LazyRow({ key: p.keyName + "_crow", spacing: SPACE.sm }, nums),
        p.value > 0
            ? ctx.UI.Text({
                key: p.keyName + "_csel",
                text: p.options[Math.min(p.value - 1, p.options.length - 1)] || "",
                fontSize: FONT.small,
                color: c.primary,
            })
            : null,
    ]);
}