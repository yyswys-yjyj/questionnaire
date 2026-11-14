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
// ui/components/SettingsItem.ts
// 设置页组件层 —— 严格对齐 UI 素材库（com.uigallery.demo）的 nav-settings / disp-stat / sel-segment。
//
// 这次翻新的核心判断（素材库原文）：
//   1. nav-settings = 「单张 Card 容器 + Row 列表 + HorizontalDivider 自己插」，不是一堆小卡片
//   2. 设置行 = 图标(20, primary) + Column[标题 bodyMedium / 副标题 bodySmall] + chevronRight(18)
//      行内 padding 只有 { vertical: 9 }，整行靠 Modifier.clickable 点，**不加箭头以外的装饰**
//   3. 分组标题 = 小标题文字（labelLarge + primary），不再有竖条 / 图标，越轻越好
//   4. 分段控件 = Box 胶囊底槽 + 每段 Surface(weight:1) + 选中 primaryContainer
//   5. 统计卡 = Card(surface, elevation 1) + weight:1 等分 2×2
//
// 平台硬约束（踩过的坑）：
//   - weight 必须是**扁平 prop**，写 modifier.weight() 无效
//   - Surface 必须 containerColor / contentColor 成对下发，否则字看不见
//   - 图标名是**大驼峰**（ChevronRight / ArrowBack / Palette），下划线名静默不渲染
//   - Card 没有 onClick，可点要靠 Modifier.clickable

import { SPACE, RADIUS, FONT, SIZE, BORDER, shape, fade, colors } from "../shared/design.js";
import { SegmentedList } from "./SegmentedList.js";

// ─────────────────────────────────────────────────────────────
// 顶栏
// ─────────────────────────────────────────────────────────────

export interface SubHeaderProps {
    title: string;
    /** 返回回调 */
    onBack: () => void;
    /** 标题下方的小字说明 */
    subtitle?: string;
    /** 右侧附加节点（可选） */
    trailing?: any;
}

/** 子页顶栏：返回 + 标题（+ 副标题），带状态栏安全区 */
export function SubHeader(ctx: any, p: SubHeaderProps) {
    const c = colors(ctx);

    const titleCol: any[] = [
        ctx.UI.Text({
            text: p.title,
            fontSize: FONT.title,
            color: c.onSurface,
            maxLines: 1,
        }),
    ];
    if (p.subtitle) {
        titleCol.push(ctx.UI.Text({
            text: p.subtitle,
            fontSize: FONT.hint,
            color: c.onSurfaceVariant,
            padding: { top: 2 },
            maxLines: 1,
        }));
    }

    const rowChildren: any[] = [
        // 返回：不是 IconButton（点击区不可控），照素材库 shellTopBar 自绘 36dp 圆
        ctx.UI.Box({
            key: "sub_back",
            width: 36,
            height: 36,
            contentAlignment: "center",
            modifier: ctx.Modifier.clip({ type: "circle" }).clickable(p.onBack),
        }, [
            ctx.UI.Icon({ name: "ArrowBack", size: 20, tint: c.onSurface }),
        ]),
        ctx.UI.Spacer({ width: SPACE.sm }),
        ctx.UI.Column({ weight: 1, spacing: 0 }, titleCol),
    ];
    if (p.trailing) {
        rowChildren.push(p.trailing);
    }

    return ctx.UI.Row({
        fillMaxWidth: true,
        verticalAlignment: "center",
        spacing: 0,
        // 顶栏必须自己加状态栏内边距，否则被状态栏压住（PITFALLS §3.5）
        modifier: ctx.Modifier.statusBarsPadding(),
        padding: { bottom: SPACE.md, top: SPACE.sm },
    }, rowChildren);
}

// ─────────────────────────────────────────────────────────────
// 分组
// ─────────────────────────────────────────────────────────────

export interface SectionProps {
    /** 分组标题 */
    title: string;
    /** 分组说明（可选，小标题下方一行小字） */
    desc?: string;
    /** 分组图标（可选，仅首页仪表盘用；常规设置分组不上图标） */
    icon?: string;
    /** 分组内容：直接铺开，不再套灰底 */
    children: any[];
}

/**
 * 分组（轻量版）：小标题 + 说明 + 内容，纯 Column，无卡片、无竖条、无边框。
 *
 * 素材库里所有页面都是「大 banner 色块 → 示例卡片带序号 → 内容」，
 * 而设置页对应的是「分组标题 → 列表」。所以这里只保留分组标题节奏，
 * 内容容器交给调用方用 SettingsGroupCard 决定（首页单卡 / 子页直接铺）。
 */
export function SectionCard(ctx: any, p: SectionProps) {
    const c = colors(ctx);

    // 素材库的结构：每个块就是一张 Card（surface / elevation 1 / 圆角16），
    // 卡片内部自带标题行，**没有再外面套一层"分组标题"的层级**。
    // 所以这里直接输出一张 Card，title 作为卡内首行。
    const inner: any[] = [];

    if (p.title) {
        const head: any[] = [];
        if (p.icon) {
            head.push(ctx.UI.Icon({ name: p.icon, size: 18, tint: c.primary }));
            head.push(ctx.UI.Spacer({ width: SPACE.sm }));
        }
        head.push(ctx.UI.Text({
            text: p.title,
            fontSize: FONT.strong,
            fontWeight: "bold" as const,
            color: c.onSurface,
            weight: 1,
            maxLines: 1,
            overflow: "ellipsis",
        }));
        inner.push(ctx.UI.Row({
            fillMaxWidth: true,
            verticalAlignment: "center",
            spacing: 0,
        }, head));
    }

    if (p.desc) {
        inner.push(ctx.UI.Text({
            text: p.desc,
            fontSize: FONT.hint,
            color: c.onSurfaceVariant,
            padding: { top: SPACE.xs },
        }));
    }

    for (let i = 0; i < p.children.length; i++) {
        if (p.children[i]) inner.push(p.children[i]);
    }

    return ctx.UI.Card({
        key: "card_" + (p.title || "block"),
        fillMaxWidth: true,
        containerColor: c.surface,
        contentColor: c.onSurface,
        shape: shape(RADIUS.card),
        elevation: 1,
    }, [
        ctx.UI.Column({ fillMaxWidth: true, padding: SPACE.md, spacing: SPACE.sm }, inner),
    ]);
}

/**
 * 单卡容器：把一段列表包进一张 Card，行之间用分隔线（素材库 nav-settings 的做法）。
 * 首页八项入口就是这一张卡。
 */
export function SettingsGroupCard(ctx: any, children: any[]) {
    const c = colors(ctx);
    return ctx.UI.Card({
        fillMaxWidth: true,
        containerColor: c.surface,
        contentColor: c.onSurface,
        shape: shape(RADIUS.card),
        elevation: 1,
        padding: { horizontal: SPACE.md },
    }, children);
}

// ─────────────────────────────────────────────────────────────
// 设置行
// ─────────────────────────────────────────────────────────────

export interface SettingsRowProps {
    /** 图标（可选，大驼峰名） */
    icon?: string;
    /** 图标底色方块（可选：给了就渲染色块，不给就裸图标） */
    iconTint?: any;
    /** 主标题 */
    title: string;
    /** 副标题说明 */
    desc?: string;
    /** 右侧附加文字（如当前值） */
    valueText?: string;
    /** 点击回调；与 right 二选一 */
    onClick?: () => void;
    /** 右侧自定义控件（开关等）；给了它就渲染它而不是箭头 */
    right?: any;
    /** 是否显示右箭头（onClick 且无 right 时默认显示） */
    showArrow?: boolean;
    /** 是否为分组最后一项（不画分隔线） */
    last?: boolean;
    /** 标题颜色覆盖（危险操作用 error） */
    titleColor?: any;
}

/** 单个设置项行：图标 + 标题/描述 + 右侧控件 */
export function SettingsRow(ctx: any, p: SettingsRowProps) {
    const c = colors(ctx);

    const children: any[] = [];

    if (p.icon) {
        const tint = p.titleColor || c.primary;
        if (p.iconTint) {
            // 有色块底：素材库 preference 行的写法（36dp 圆角方块 + 居中图标）
            children.push(ctx.UI.Box({
                key: (p.title || "row") + "_iconbox",
                width: 36,
                height: 36,
                contentAlignment: "center",
                background: p.iconTint,
                backgroundShape: shape(10),
            }, [
                ctx.UI.Icon({ name: p.icon, size: 19, tint: tint }),
            ]));
            children.push(ctx.UI.Spacer({ width: SPACE.md }));
        } else {
            children.push(ctx.UI.Icon({ name: p.icon, size: 20, tint: tint }));
            children.push(ctx.UI.Spacer({ width: SPACE.md }));
        }
    }

    const textCol: any[] = [
        ctx.UI.Text({
            text: p.title,
            fontSize: FONT.body,
            color: p.titleColor || c.onSurface,
            maxLines: 2,
        }),
    ];
    if (p.desc) {
        textCol.push(ctx.UI.Text({
            text: p.desc,
            fontSize: FONT.hint,
            color: c.onSurfaceVariant,
            padding: { top: 2 },
        }));
    }
    children.push(ctx.UI.Column({ weight: 1, spacing: 0 }, textCol));

    if (p.right) {
        children.push(ctx.UI.Spacer({ width: SPACE.md }));
        children.push(p.right);
        return buildRow(ctx, c, p, children);
    }

    if (p.valueText) {
        children.push(ctx.UI.Text({
            text: p.valueText,
            fontSize: FONT.small,
            color: c.onSurfaceVariant,
            maxLines: 1,
        }));
        children.push(ctx.UI.Spacer({ width: SPACE.xs }));
    }

    if (p.showArrow !== false && p.onClick) {
        children.push(ctx.UI.Icon({ name: "ChevronRight", size: 20, tint: fade(c.onSurfaceVariant, 0.8) }));
    }

    return buildRow(ctx, c, p, children);
}

/** 统一构造行节点（含分隔线）——素材库用 HorizontalDivider + outlineVariant */
function buildRow(ctx: any, c: any, p: SettingsRowProps, children: any[]) {
    const rowProps: any = {
        fillMaxWidth: true,
        verticalAlignment: "center",
        padding: { vertical: SPACE.md },
    };
    if (p.onClick) {
        rowProps.modifier = ctx.Modifier.clickable(p.onClick);
    }
    const nodes: any[] = [ctx.UI.Row(rowProps, children)];
    if (!p.last) {
        nodes.push(ctx.UI.HorizontalDivider({ color: fade(c.outlineVariant, 0.6) }));
    }
    return ctx.UI.Column({ fillMaxWidth: true, spacing: 0 }, nodes);
}

// ─────────────────────────────────────────────────────────────
// 分段控件
// ─────────────────────────────────────────────────────────────

export interface SegmentedProps {
    keyName: string;
    options: Array<{ id: string; label: string }>;
    /** 当前选中 id */
    value: string;
    onSelect: (id: string) => void;
    /** 置灰：不可点击，整体降透明度（用于「主题锁定此项」的场景） */
    disabled?: boolean;
}

/**
 * 分段选择器 —— 严格照素材库 sel-segment：
 *   Box(clip pill + background surfaceVariant + padding 4) 当底槽
 *   → 每段 Surface(weight:1, shape pill, 选中 primaryContainer + onPrimaryContainer)
 *   → 段内 Box center + padding vertical 8
 * 平台没有 SegmentedButton，只能手搭（PITFALLS §5）。
 */
export function SegmentedRow(ctx: any, p: SegmentedProps) {
    // v1.8.2：分段控件 = 「横向铺满整行、等分填充」的按钮组。
    //
    // 演进史：
    //   ① 胶囊底槽（Box clip pill + Surface）→ 每段等宽但被底槽内距进一步压缩，长标签被切。
    //   ② 纵向整行按钮（误解）→ 三个选项吃掉 3×48dp，完全没必要。
    //   ③ 现在：Row(fillMaxWidth) + 每个 Surface(weight:1)，一行横向铺满、等分、间距 8。
    //      这是素材库 btn-filled 的原始写法，也是「自动填充整行」的正确理解。
    return SegmentedList(ctx, {
        keyName: p.keyName,
        options: p.options,
        value: p.value,
        onSelect: p.onSelect,
        disabled: p.disabled,
        showCheck: false,
    });
}

/** 旧的胶囊分段实现，保留仅供对照，不要再用 */
export function SegmentedRowLegacy(ctx: any, p: SegmentedProps) {
    const c = colors(ctx);

    const segs: any[] = [];
    for (let i = 0; i < p.options.length; i++) {
        const opt = p.options[i];
        const chosen = opt.id === p.value;
        segs.push(
            ctx.UI.Surface({
                key: p.keyName + "_" + opt.id,
                weight: 1,
                shape: { type: "pill" as const },
                containerColor: chosen ? c.primaryContainer : c.surfaceVariant,
                contentColor: chosen ? c.onPrimaryContainer : c.onSurfaceVariant,
                onClick: p.disabled ? undefined : () => p.onSelect(opt.id),
                alpha: p.disabled ? 0.45 : undefined,
                // 注意：底槽的圆角由外层 Box 的 clip 负责，分段自己不 clip，
                // 否则长标签会被圆角切掉一角（PITFALLS §3.7）
            }, [
                ctx.UI.Box({
                    key: p.keyName + "_box_" + opt.id,
                    fillMaxWidth: true,
                    contentAlignment: "center",
                    padding: { vertical: SPACE.sm, horizontal: SPACE.xs },
                }, [
                    ctx.UI.Text({
                        text: opt.label,
                        fontSize: FONT.small,
                        maxLines: 1,
                        overflow: "ellipsis",
                        textAlign: "center",
                        color: chosen ? c.onPrimaryContainer : c.onSurfaceVariant,
                    }),
                ]),
            ])
        );
    }

    // 底槽：照素材库 sel-segment —— Box + clip(pill) + background(surfaceVariant) + padding 4
    return ctx.UI.Box({
        key: p.keyName + "_tray",
        fillMaxWidth: true,
        padding: SPACE.xs,
        modifier: ctx.Modifier
            .clip({ type: "pill" as const })
            .background(c.surfaceVariant),
    }, [
        ctx.UI.Row({ key: p.keyName + "_row", fillMaxWidth: true, spacing: SPACE.xs }, segs),
    ]);
}

// ─────────────────────────────────────────────────────────────
// 统计卡（首页仪表盘）
// ─────────────────────────────────────────────────────────────

export interface StatCell {
    /** 大数字 / 主值 */
    value: string;
    /** 小标签 */
    label: string;
    /** 值是否处于加载中（显示 spinner） */
    loading?: boolean;
    /** 值前面配一个图标（可空） */
    icon?: string;
}

/**
 * 2×2 统计卡组 —— 照素材库 disp-stat：
 *   Card(surface, elevation 1, cornerRadius 10) + weight:1 等分
 *   数字 headlineSmall bold(primary) / 标签 labelSmall(onSurfaceVariant)
 */
export function StatGrid(ctx: any, cells: StatCell[]) {
    const c = colors(ctx);

    const card = (cell: StatCell, idx: number) => {
        const valueLine: any[] = [];
        if (cell.loading) {
            valueLine.push(ctx.UI.CircularProgressIndicator({
                strokeWidth: 2,
                color: c.primary,
                modifier: { size: 14 },
            }));
            valueLine.push(ctx.UI.Spacer({ width: SPACE.sm }));
            valueLine.push(ctx.UI.Text({ text: "…", fontSize: FONT.strong, color: c.onSurfaceVariant }));
        } else {
            if (cell.icon) {
                valueLine.push(ctx.UI.Icon({ name: cell.icon, size: 18, tint: c.primary }));
                valueLine.push(ctx.UI.Spacer({ width: SPACE.xs }));
            }
            // 【v1.8.4】值可能是很长的语言包名（如 "Chinese (Simplified) / 简体中文"）。
// 原来 maxLines:1 只裁不滚，长名字要么被硬切、要么把格子撑变形。
// 改成横向可滚容器：超出部分可以左右滑出来，格子宽度永远稳定。
            valueLine.push(ctx.UI.LazyRow({
                key: "stat_" + idx + "_val",
                fillMaxWidth: true,
                spacing: 0,
            }, [
                ctx.UI.Text({
                    text: cell.value,
                    fontSize: FONT.title,
                    fontWeight: "bold" as const,
                    color: c.primary,
                    maxLines: 1,
                }),
            ]));
        }
        return ctx.UI.Card({
            key: "stat_" + idx,
            weight: 1,
            containerColor: c.surface,
            contentColor: c.onSurface,
            shape: shape(10),
            elevation: 1,
        }, [
            ctx.UI.Column({ fillMaxWidth: true, padding: SPACE.md, spacing: 2 }, [
                ctx.UI.Row({ fillMaxWidth: true, verticalAlignment: "center", spacing: 0 }, valueLine),
                ctx.UI.Text({
                    text: cell.label,
                    fontSize: FONT.micro,
                    color: c.onSurfaceVariant,
                    maxLines: 1,
                }),
            ]),
        ]);
    };

    const rows: any[] = [];
    for (let i = 0; i < cells.length; i += 2) {
        const rowCells: any[] = [card(cells[i], i)];
        if (cells[i + 1]) {
            rowCells.push(card(cells[i + 1], i + 1));
        } else {
            rowCells.push(ctx.UI.Spacer({ weight: 1 }));
        }
        rows.push(ctx.UI.Row({ fillMaxWidth: true, spacing: SPACE.sm }, rowCells));
    }

    return ctx.UI.Column({ fillMaxWidth: true, spacing: SPACE.sm }, rows);
}

// ─────────────────────────────────────────────────────────────
// 模块 banner（可选：首页顶部大色块）
// ─────────────────────────────────────────────────────────────

/**
 * 模块 banner —— 照素材库每页顶部那张 tertiaryContainer 大卡：
 *   大标题 + 副标题 + 一行说明 + 统计「共 N 项」。
 * 这是素材库层级感的主要来源，比普通标题强得多。
 */
export function SectionBanner(ctx: any, p: { title: string; subtitle?: string; note?: string; badge?: string }) {
    const c = colors(ctx);

    const col: any[] = [
        ctx.UI.Text({ text: p.title, fontSize: FONT.heading, fontWeight: "bold" as const, color: c.onPrimaryContainer }),
    ];
    if (p.subtitle) {
        col.push(ctx.UI.Text({
            text: p.subtitle,
            fontSize: FONT.small,
            color: fade(c.onPrimaryContainer, 0.85),
            padding: { top: SPACE.xs },
        }));
    }
    if (p.note) {
        col.push(ctx.UI.Text({
            text: p.note,
            fontSize: FONT.hint,
            color: fade(c.onPrimaryContainer, 0.72),
            padding: { top: SPACE.sm },
        }));
    }
    if (p.badge) {
        col.push(ctx.UI.Text({
            text: p.badge,
            fontSize: FONT.hint,
            color: fade(c.onPrimaryContainer, 0.72),
            padding: { top: SPACE.xs },
        }));
    }

    return ctx.UI.Box({
        key: "bannerwrap_" + p.title,
        fillMaxWidth: true,
        // Surface 不带 modifier，状态栏安全区只能由外层 Box 提供
        modifier: ctx.Modifier.statusBarsPadding(),
        padding: { top: SPACE.md },
    }, [
        ctx.UI.Surface({
            key: "banner_" + p.title,
            fillMaxWidth: true,
            shape: shape(RADIUS.card),
            containerColor: c.primaryContainer,
            contentColor: c.onPrimaryContainer,
            padding: SPACE.lg,
        }, [ctx.UI.Column({ fillMaxWidth: true, spacing: 0 }, col)]),
    ]);
}
