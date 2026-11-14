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
// ui/shared/design.ts
// 设计令牌层 —— 按 Jetpack Compose / Material 3 的度量规范取值。
//
// 关键认知（这一版重写的起因）：
//   上一版把 SPACE.sm(=4dp) 当作选项行的上下留白，直接把控件压成了一条缝，
//   复选框被挤小、文字贴边。Compose 里行类控件的**最小高度是 48dp**（触控区），
//   垂直留白至少 8~12dp；这不是审美问题，是可用性问题。
//
// 本文件只导出常量与纯函数，不引用 ctx，任何 UI 模块都能安全 import。

/**
 * 间距刻度（dp）—— 按 4dp 栅格。
 */
export const SPACE = {
    /** 4dp —— 图标与文字之间的紧邻间隙 */
    xs: 4,
    /** 8dp —— 相邻控件之间 */
    sm: 8,
    /** 12dp —— 行内垂直留白（控件内部的上下 padding） */
    md: 12,
    /** 16dp —— 卡片内边距 / 页面左右留白 */
    lg: 16,
    /** 20dp —— 分组之间 */
    xl: 20,
    /** 28dp —— 大区块 */
    xxl: 28,
};

/**
 * 圆角刻度（dp）—— Material 3 shape scale。
 */
export const RADIUS = {
    /** 8dp —— 小控件 */
    xs: 8,
    /** 12dp —— 选项行 / 输入框 */
    item: 12,
    /** 16dp —— 卡片 */
    card: 16,
    /** 24dp —— 弹层 */
    sheet: 24,
    /** 999dp —— 胶囊 */
    pill: 999,
};

/**
 * 描边宽度（dp）。
 */
export const BORDER = {
    /** 1dp —— 常态 */
    thin: 1,
    /** 2dp —— 强调 / 选中 */
    strong: 2,
};

/**
 * 字号刻度（sp）。
 */
export const FONT = {
    /** 11sp —— 极小标注 */
    micro: 11,
    /** 12sp —— 辅助说明 */
    hint: 12,
    /** 14sp —— 正文次要 */
    small: 14,
    /** 16sp —— 正文（Material bodyLarge） */
    body: 16,
    /** 18sp —— 强调正文 */
    strong: 18,
    /** 20sp —— 标题 */
    title: 20,
    /** 24sp —— 页面标题 */
    heading: 24,
};

/**
 * 控件尺寸（dp）—— 对齐 Material 3 触控规范。
 */
export const SIZE = {
    /** 控件最小高度（Material 触控区下限） */
    minTouch: 48,
    /** 选项行高度 */
    optionRow: 56,
    /** 星级图标 */
    star: 32,
    /** 序号徽章边长 */
    indexBadge: 28,
    /** 分组主色竖条 */
    accentBar: 4,
};

/** 构造圆角 shape。 */
export function shape(radius: number) {
    return { type: "rounded" as const, cornerRadius: radius };
}

/** 给颜色套透明度；token 没有 copy 时原样返回。 */
export function fade(color: any, alpha: number) {
    if (!color) return color;
    if (typeof color === "string") return color;
    if (typeof color.copy === "function") return color.copy({ alpha: alpha });
    return color;
}

/**
 * 语义色集合 —— 按 Material 3 的「容器 / 前景」成对关系取。
 *
 * 重要：`MaterialTheme.colorScheme` 在宿主里是动态 Proxy，
 * 访问任何字符串都会返回 token。因此**必须只用真机验证过的名字**，
 * 下面这 23 个 token 是 UI 素材库（com.uigallery.demo）实际用过的集合。
 */
export interface SemanticColors {
    primary: any;
    onPrimary: any;
    primaryContainer: any;
    onPrimaryContainer: any;
    secondaryContainer: any;
    onSecondaryContainer: any;
    tertiary: any;
    onTertiary: any;
    tertiaryContainer: any;
    onTertiaryContainer: any;
    surface: any;
    onSurface: any;
    surfaceVariant: any;
    onSurfaceVariant: any;
    error: any;
    onError: any;
    errorContainer: any;
    onErrorContainer: any;
    outline: any;
    outlineVariant: any;
}

/** 从 ctx.MaterialTheme.colorScheme 抽语义色。 */
export function colors(ctx: any): SemanticColors {
    const c = ctx.MaterialTheme.colorScheme;
    return {
        primary: c.primary,
        onPrimary: c.onPrimary,
        primaryContainer: c.primaryContainer,
        onPrimaryContainer: c.onPrimaryContainer,
        secondaryContainer: c.secondaryContainer,
        onSecondaryContainer: c.onSecondaryContainer,
        tertiary: c.tertiary,
        onTertiary: c.onTertiary,
        tertiaryContainer: c.tertiaryContainer,
        onTertiaryContainer: c.onTertiaryContainer,
        surface: c.surface,
        onSurface: c.onSurface,
        surfaceVariant: c.surfaceVariant,
        onSurfaceVariant: c.onSurfaceVariant,
        error: c.error,
        onError: c.onError,
        errorContainer: c.errorContainer,
        onErrorContainer: c.onErrorContainer,
        outline: c.outline,
        outlineVariant: c.outlineVariant,
    };
}