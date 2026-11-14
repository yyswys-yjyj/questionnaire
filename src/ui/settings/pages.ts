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
// @ts-nocheck
// ui/settings/pages.ts
// 设置页骨架 —— 完全照抄 UI 素材库的 shared/shell.ts 结构，不自己发明。
//
// 素材库的真实骨架（source of truth）：
//   Box(fillMaxSize, onLoad)                       ← onLoad 只能挂根节点
//     └ customShell:
//         Column(fillMaxSize, background: surface)
//           ├ shellTopBar: Row(height 54, statusBarsPadding)
//           └ Box(weight:1) → LazyColumn(spacing 16, padding 16)
//
// 硬约束（PITFALLS）：
//   §3.1 Column/Row 不能滚 → 内容必须 LazyColumn
//   §3.5 顶栏必须自己 statusBarsPadding，底栏 navigationBarsPadding
//   §2.6 onLoad 只有根节点生效、只跑一次
//   §7.2 不做包内自绘返回箭头去 navigate（push 会造出"两个返回"）

import { SPACE } from "../shared/design.js";

/** 顶栏高度，照素材库 TOP_BAR_HEIGHT。没有 TopAppBar，高度只能自己定。 */
export const TOP_BAR_HEIGHT = 54;

/** 子页外壳依赖 */
export interface PageDeps {
    ctx: any;
    /** 页标题 */
    title: string;
    /** 顶栏副标题（可空） */
    subtitle?: string;
    /** 返回回调 */
    onBack?: () => void;
    /** 提示条（可能为 null） */
    snackbar?: any;
    /** 页面主体节点 */
    body: any[];
    /** 页面进入时触发（只能挂在根节点） */
    onLoad?: () => any;
}

/**
 * 顶栏 —— 照素材库 shellTopBar 逐行对应：
 *   - 返回：Box(36×36) + clip(circle) + clickable，不是 IconButton（点击区不可控）
 *   - 标题：Column(weight:1) + Text(titleMedium bold) + Text(labelSmall 副标题)
 *   - 整行 height:54 固定，靠 verticalAlignment 居中，不靠 padding 撑
 */
export function TopBar(ctx: any, p: { title: string; subtitle?: string; onBack?: () => void; trailing?: any }) {
    const c = ctx.MaterialTheme.colorScheme;

    // 首页没有顶栏文字（页头由 banner 承担）：直接不渲染这一行，
    // 否则会留下一条 54dp 的空白带，把 banner 挤下去（素材库 gallery 就是纯 banner 开头）。
    if (!p.title && !p.onBack && !p.trailing) {
        return ctx.UI.Box({
            key: "tb_phantom",
            fillMaxWidth: true,
            modifier: ctx.Modifier.statusBarsPadding(),
        }, []);
    }

    const children: any[] = [];

    if (p.onBack) {
        children.push(ctx.UI.Box({
            key: "tb_back",
            width: 36,
            height: 36,
            contentAlignment: "center",
            modifier: ctx.Modifier.clip({ type: "circle" }).clickable(p.onBack),
        }, [
            ctx.UI.Icon({ name: "ArrowBack", size: 20, tint: c.onSurface }),
        ]));
    }

    const titleLines: any[] = [
        ctx.UI.Text({
            text: p.title,
            fontSize: 18,
            fontWeight: "bold" as const,
            color: c.onSurface,
            maxLines: 1,
            overflow: "ellipsis",
        }),
    ];
    if (p.subtitle) {
        titleLines.push(ctx.UI.Text({
            text: p.subtitle,
            fontSize: 12,
            color: c.onSurfaceVariant,
            maxLines: 1,
            overflow: "ellipsis",
        }));
    }

    children.push(ctx.UI.Column({
        key: "tb_title",
        weight: 1,
        spacing: 0,
        // 【v1.8.5 文本不居中修复】
        // 原来这里只有 weight:1，Column 内部两行文字会从顶部开始堆，
        // 而 36dp 的返回箭头按 Row 的 center 居中 —— 两者基准不同，
        // 视觉上标题就贴着箭头上沿往下掉。
        // 把 Column 高度吃满、内容 verticalArrangement 居中，两个元素才共用同一条中轴。
        fillMaxHeight: true,
        verticalArrangement: "center",
        padding: { left: p.onBack ? SPACE.xs : 0 },
    }, titleLines));

    if (p.trailing) {
        children.push(p.trailing);
    }

    // 【v1.8.4 文字上飘修复】
    // 原写法 Row 同时有 height:54 和 statusBarsPadding() ——
    // height 把整行钉死 54dp，statusBarsPadding 再从这 54dp 里扣掉状态栏高度，
    // 剩下的空间不够放 18px 标题 + 12px 副标题，内容被挤出上边界 → 文字压到返回箭头/状态栏。
    // 正确做法：外层 Column 吃安全区 padding，内层 Row 用 height 固定内容行高。
    // 两者分层，互不抢空间。
    return ctx.UI.Column({
        key: "tb_wrap",
        fillMaxWidth: true,
        background: c.surface,
        modifier: ctx.Modifier.statusBarsPadding(),
    }, [
        ctx.UI.Row({
            key: "tb_row",
            fillMaxWidth: true,
            height: TOP_BAR_HEIGHT,
            verticalAlignment: "center",
            padding: { left: SPACE.sm, right: SPACE.md },
        }, children),
    ]);
}

/**
 * 子页外壳：Column[顶栏 + Box(weight:1)[LazyColumn]]，最外层 Box 挂 onLoad。
 * 与素材库 customShell + categoryPage 完全同构。
 */
export function SettingsPageShell(d: PageDeps) {
    const ctx = d.ctx;
    const c = ctx.MaterialTheme.colorScheme;

    const listChildren: any[] = [];
    if (d.snackbar) listChildren.push(d.snackbar);
    for (let i = 0; i < d.body.length; i++) {
        if (d.body[i]) listChildren.push(d.body[i]);
    }

    const list = ctx.UI.LazyColumn({
        fillMaxSize: true,
        spacing: SPACE.lg,
        padding: SPACE.lg,
    }, listChildren);

    const shell = ctx.UI.Column({
        fillMaxSize: true,
        background: c.surface,
    }, [
        TopBar(ctx, { title: d.title, subtitle: d.subtitle, onBack: d.onBack }),
        ctx.UI.Box({ weight: 1, fillMaxWidth: true }, [list]),
    ]);

    return ctx.UI.Box({
        fillMaxSize: true,
        onLoad: d.onLoad,
    }, [shell]);
}

/** 首页外壳：无返回按钮 */
export interface HomeShellDeps {
    ctx: any;
    title: string;
    subtitle?: string;
    snackbar?: any;
    body: any[];
    onLoad?: () => any;
}

export function SettingsHomeShell(d: HomeShellDeps) {
    const ctx = d.ctx;
    const c = ctx.MaterialTheme.colorScheme;

    const listChildren: any[] = [];
    if (d.snackbar) listChildren.push(d.snackbar);
    for (let i = 0; i < d.body.length; i++) {
        if (d.body[i]) listChildren.push(d.body[i]);
    }

    const list = ctx.UI.LazyColumn({
        fillMaxSize: true,
        spacing: SPACE.lg,
        padding: SPACE.lg,
    }, listChildren);

    const shell = ctx.UI.Column({
        fillMaxSize: true,
        background: c.surface,
    }, [
        TopBar(ctx, { title: d.title, subtitle: d.subtitle }),
        ctx.UI.Box({ weight: 1, fillMaxWidth: true }, [list]),
    ]);

    return ctx.UI.Box({
        fillMaxSize: true,
        onLoad: d.onLoad,
    }, [shell]);
}