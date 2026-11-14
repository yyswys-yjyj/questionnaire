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
// ui/components/NoticeBar.ts
// 提醒条 —— 照 UI 素材库 fb-banner 的四级 severity 写法：
//   ① Surface(容器色) + contentColor 成对下发，图标与文字同色
//   ② 图标 16~18，文字 bodySmall，垂直 padding 8、水平 10
//   ③ 圆角 8dp，不描边、不阴影——提示条靠底色分区，不靠装饰
//   ④ 右侧可选动作（TextButton），点击区自己给足
//
// 四级配色（全部成对，深色主题也不会瞎）：
//   info    → secondaryContainer / onSecondaryContainer
//   success → primaryContainer   / onPrimaryContainer
//   warn    → tertiaryContainer  / onTertiaryContainer
//   error   → errorContainer     / onErrorContainer

import { SPACE, RADIUS, FONT, shape, colors } from "../shared/design.js";

/** 提示级别 */
export type NoticeSeverity = "info" | "success" | "warn" | "error";

export interface NoticeBarProps {
    /** 文案 */
    text: string;
    /** 级别，默认 info */
    severity?: NoticeSeverity;
    /** 右侧动作文字（可选，如「查看」「重试」） */
    actionText?: string;
    /** 右侧动作回调 */
    onAction?: () => void;
    /** 是否显示关闭按钮（默认 false） */
    closable?: boolean;
    /** 关闭回调 */
    onClose?: () => void;
    /** 是否显示左侧图标（默认 true） */
    showIcon?: boolean;
    /** 多行文字（默认单行省略） */
    multiline?: boolean;
}

/** 各级别对应的图标名（大驼峰，平台不认下划线） */
const ICONS: Record<NoticeSeverity, string> = {
    info: "Info",
    success: "CheckCircle",
    warn: "Warning",
    error: "Error",
};

/**
 * 单条提醒。
 * 注意 containerColor / contentColor 必须成对给：宿主不会替我们挑前景色，
 * 配错就是「深底深字」，这正是前面几轮看不清的原因。
 */
export function NoticeBar(ctx: any, p: NoticeBarProps) {
    const c = colors(ctx);
    const sev: NoticeSeverity = p.severity || "info";

    // 成对取色
    let bg: any;
    let fg: any;
    if (sev === "success") {
        bg = c.primaryContainer;
        fg = c.onPrimaryContainer;
    } else if (sev === "warn") {
        bg = c.tertiaryContainer;
        fg = c.onTertiaryContainer;
    } else if (sev === "error") {
        bg = c.errorContainer;
        fg = c.onErrorContainer;
    } else {
        bg = c.secondaryContainer;
        fg = c.onSecondaryContainer;
    }

    const children: any[] = [];

    if (p.showIcon !== false) {
        children.push(ctx.UI.Icon({ name: ICONS[sev], size: 18, tint: fg }));
        children.push(ctx.UI.Spacer({ width: SPACE.sm }));
    }

    children.push(ctx.UI.Text({
        text: p.text,
        fontSize: FONT.small,
        color: fg,
        weight: 1,
        maxLines: p.multiline ? 4 : 2,
    }));

    if (p.actionText) {
        children.push(ctx.UI.Spacer({ width: SPACE.sm }));
        children.push(ctx.UI.TextButton({
            onClick: p.onAction || (() => undefined),
            shape: shape(RADIUS.xs),
            contentPadding: { horizontal: SPACE.sm, vertical: SPACE.xs },
        }, [
            ctx.UI.Text({ text: p.actionText, fontSize: FONT.small, color: fg }),
        ]));
    }

    if (p.closable) {
        children.push(ctx.UI.Box({
            key: "notice_close",
            width: 28,
            height: 28,
            contentAlignment: "center",
            modifier: ctx.Modifier.clip({ type: "circle" as const }).clickable(p.onClose || (() => undefined)),
        }, [
            ctx.UI.Icon({ name: "Close", size: 15, tint: fg }),
        ]));
    }

    return ctx.UI.Surface({
        key: "notice_" + sev,
        fillMaxWidth: true,
        shape: shape(RADIUS.item),
        containerColor: bg,
        contentColor: fg,
        padding: { horizontal: SPACE.md, vertical: SPACE.sm },
    }, [
        ctx.UI.Row({
            fillMaxWidth: true,
            verticalAlignment: "center",
            spacing: 0,
        }, children),
    ]);
}

/**
 * 多条提醒堆叠（设置页顶部的消息区用）。
 * 返回 null 会被调用方过滤掉，这里统一返回数组。
 */
export function NoticeList(ctx: any, items: Array<NoticeBarProps & { key?: string }>) {
    const nodes: any[] = [];
    for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it || !it.text) continue;
        nodes.push(NoticeBar(ctx, it));
    }
    if (nodes.length === 0) return null;
    return ctx.UI.Column({
        key: "notice_list",
        fillMaxWidth: true,
        spacing: SPACE.sm,
    }, nodes);
}