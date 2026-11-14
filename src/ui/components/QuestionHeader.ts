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
// ui/components/QuestionHeader.ts
// 题干头部 + 分组标题 —— 按 Material 3 的排版层级写。
//
// Compose 排版三层级（对应 M3 的 title / body / label）：
//   序号徽章：primary 底 + onPrimary 字 —— 主题色在这里唱主角
//   题干    ：onSurface，titleMedium 字号与字重
//   副标题  ：onSurfaceVariant，bodySmall
//   必填星号：error，只占一个字符
//
// 尺寸：徽章 28dp 方形（不是小圆点），与 16sp 题干视觉平衡。

import { SPACE, RADIUS, FONT, SIZE, shape, fade, colors } from "../shared/design.js";

export interface QuestionHeaderProps {
    keyName: string;
    /** 题号（1-based）；0 = 不显示徽章 */
    index: number;
    text: string;
    subtitle?: string;
    required?: boolean;
    theme?: string;
}

export interface SectionHeaderProps {
    keyName: string;
    text: string;
    subtitle?: string;
    theme?: string;
}

/** 题干头部。 */
export function QuestionHeader(ctx: any, p: QuestionHeaderProps) {
    const c = colors(ctx);

    // ── 非 modern：保持原来的一行文本拼接 ──
    if (p.theme !== "modern") {
        return ctx.UI.Column({ key: p.keyName + "_c", fillMaxWidth: true, spacing: SPACE.xs }, [
            ctx.UI.Text({
                key: p.keyName + "_t",
                text: (p.index > 0 ? p.index + ". " : "") + p.text + (p.required ? " *" : ""),
                style: "labelMedium",
                color: p.required ? c.error : c.onSurface,
            }),
            p.subtitle
                ? ctx.UI.Text({
                    key: p.keyName + "_s",
                    text: p.subtitle,
                    style: "bodySmall",
                    color: c.onSurfaceVariant,
                })
                : null,
        ]);
    }

    const rowChildren: any[] = [];

    // 序号徽章：primary 实底 + onPrimary 字，方形，28dp
    if (p.index > 0) {
        rowChildren.push(
            ctx.UI.Surface({
                key: p.keyName + "_badge",
                width: SIZE.indexBadge,
                height: SIZE.indexBadge,
                shape: shape(RADIUS.xs),
                containerColor: c.primary,
                contentColor: c.onPrimary,
            }, [
                ctx.UI.Box({
                    key: p.keyName + "_badgeBox",
                    fillMaxSize: true,
                    contentAlignment: "center",
                }, [
                    ctx.UI.Text({
                        text: String(p.index),
                        fontSize: FONT.hint,
                    }),
                ]),
            ])
        );
        rowChildren.push(ctx.UI.Spacer({ width: SPACE.sm }));
    }

    // 题干（weight 扁平 prop 撑满剩余宽度）
    rowChildren.push(ctx.UI.Text({
        key: p.keyName + "_t",
        text: p.text,
        fontSize: FONT.body,
        color: c.onSurface,
        weight: 1,
    }));

    // 必填星号：只有它是 error 色
    if (p.required) {
        rowChildren.push(ctx.UI.Text({
            key: p.keyName + "_req",
            text: "*",
            fontSize: FONT.body,
            color: c.error,
        }));
    }

    const children: any[] = [
        ctx.UI.Row({
            key: p.keyName + "_row",
            fillMaxWidth: true,
            verticalAlignment: "center",
        }, rowChildren),
    ];

    if (p.subtitle) {
        children.push(ctx.UI.Text({
            key: p.keyName + "_sub",
            text: p.subtitle,
            fontSize: FONT.small,
            color: c.onSurfaceVariant,
            padding: { top: SPACE.xs, start: p.index > 0 ? SIZE.indexBadge + SPACE.sm : 0 },
        }));
    }

    return ctx.UI.Column({ key: p.keyName + "_wrap", fillMaxWidth: true, spacing: SPACE.xs }, children);
}

/**
 * 分组标题（section）：secondaryContainer 底 + 左侧 primary 竖条。
 * 用 secondaryContainer 而不是 primaryContainer，是因为分组头比「选中项」低一个强调层级，
 * 这样同屏出现时不会打架。
 */
export function SectionHeader(ctx: any, p: SectionHeaderProps) {
    const c = colors(ctx);

    if (p.theme !== "modern") {
        return ctx.UI.Column({ key: p.keyName + "_c", fillMaxWidth: true, spacing: SPACE.xs }, [
            ctx.UI.Text({ key: p.keyName + "_t", text: p.text, style: "titleSmall", color: c.primary }),
            p.subtitle
                ? ctx.UI.Text({ key: p.keyName + "_s", text: p.subtitle, style: "bodySmall", color: c.onSurfaceVariant })
                : null,
        ]);
    }

    const textCol: any[] = [
        ctx.UI.Text({
            key: p.keyName + "_t",
            text: p.text,
            fontSize: FONT.strong,
        }),
    ];
    if (p.subtitle) {
        textCol.push(ctx.UI.Text({
            key: p.keyName + "_s",
            text: p.subtitle,
            fontSize: FONT.small,
            padding: { top: SPACE.xs },
        }));
    }

    return ctx.UI.Surface({
        key: p.keyName + "_wrap",
        fillMaxWidth: true,
        shape: shape(RADIUS.card),
        containerColor: c.secondaryContainer,
        contentColor: c.onSecondaryContainer,
        padding: { horizontal: SPACE.lg, vertical: SPACE.md },
    }, [
        ctx.UI.Row({
            key: p.keyName + "_row",
            fillMaxWidth: true,
            verticalAlignment: "center",
        }, [
            // 左侧 primary 竖条：用主题色做视觉锚点
            ctx.UI.Box({
                key: p.keyName + "_bar",
                width: SIZE.accentBar,
                height: SIZE.indexBadge,
                background: c.primary,
                backgroundShape: shape(RADIUS.pill),
            }),
            ctx.UI.Spacer({ width: SPACE.md }),
            ctx.UI.Column({ key: p.keyName + "_col", weight: 1, spacing: 0 }, textCol),
        ]),
    ]);
}