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
// ui/components/OptionRow.ts
// 选项行 —— 按 Jetpack Compose 的组件模型写，而不是「拼 div」。
//
// 三个关键概念（上一版全错在这些点上）：
//
// 1. 【Surface 是容器，contentColor 决定子元素前景色】
//    Compose 里 Surface(containerColor, contentColor) 会把 contentColor 通过
//    CompositionLocal 下发给子节点；子 Text 不写 color 就自动继承。
//    上一版在 Row 上配 background、再给 Text 单独配 color，两套色不保证匹配 →
//    深底配深字，就是「看不清」。
//
// 2. 【尺寸由 minHeight 保证，不由 padding 挤出来】
//    Material 的行类控件最小高度 48dp。上一版 padding.vertical 只有 4dp，
//    复选框被压小、文字贴边。
//
// 3. 【主题色要有层级，不能一个色打天下】
//    未选中：surfaceVariant 底 + onSurface 文字（低强调）
//    选中  ：primaryContainer 底 + onPrimaryContainer 文字（中强调）
//    控件  ：RadioButton / Checkbox 自带 primary 着色，不手绘
//
// 平台事实（types/compose-dsl.d.ts 已核实）：
//   - ComposeCommonProps 有 weight?: number（扁平 prop）与 height / fillMaxWidth
//   - RadioButton: selected + onClick     Checkbox: checked + onCheckedChange
//   - MaterialTheme.colorScheme 是动态 Proxy，只用真机验证过的 token

import { SPACE, RADIUS, FONT, SIZE, shape, fade, colors } from "../shared/design.js";

export interface OptionRowProps {
    keyName: string;
    label: string;
    selected: boolean;
    /** true = RadioButton（单选）；false = Checkbox（多选） */
    radio: boolean;
    enabled?: boolean;
    onClick: () => void;
    last?: boolean;
}

/** 一行可点选项。真实问卷 / 设置页预览共用。 */
export function OptionRow(ctx: any, p: OptionRowProps) {
    const c = colors(ctx);
    const enabled = p.enabled !== false;

    // 未选中与选中两套成对配色
    const container = p.selected ? c.primaryContainer : c.surfaceVariant;
    const content = p.selected ? c.onPrimaryContainer : c.onSurface;

    // 原生勾选控件（自带走 primary 着色）
    const control = p.radio
        ? ctx.UI.RadioButton({
            key: p.keyName + "_rb",
            selected: p.selected,
            enabled: enabled,
            onClick: p.onClick,
        })
        : ctx.UI.Checkbox({
            key: p.keyName + "_cb",
            checked: p.selected,
            enabled: enabled,
            onCheckedChange: function () { p.onClick(); },
        });

    const nodes: any[] = [
        ctx.UI.Surface({
            key: p.keyName,
            fillMaxWidth: true,
            // 高度靠 minHeight 保证，不靠 padding 挤
            height: SIZE.optionRow,
            shape: shape(RADIUS.item),
            containerColor: container,
            contentColor: content,
            onClick: enabled ? p.onClick : undefined,
        }, [
            ctx.UI.Row({
                key: p.keyName + "_r",
                fillMaxWidth: true,
                height: SIZE.optionRow,
                verticalAlignment: "center",
                padding: { horizontal: SPACE.md },
            }, [
                control,
                ctx.UI.Spacer({ width: SPACE.sm }),
                // 文字不写 color —— 继承 Surface 的 contentColor
                ctx.UI.Text({
                    text: p.label,
                    fontSize: FONT.body,
                    weight: 1,
                }),
            ]),
        ]),
    ];

    // 行间留白交给外层 Column.spacing，这里不再画分隔线（M3 卡片式列表不画线）
    return ctx.UI.Column({ key: p.keyName + "_wrap", fillMaxWidth: true }, nodes);
}

/**
 * 选项容器。
 * compact → 横排 chip 行
 * 其它   → 竖排，超过阈值自动改 LazyColumn 限高滚动
 *
 * 【v1.8.4 长列表保护】
 *   原来一律用 Column —— AI 生成 10~20 个选项时，整张问卷被撑到三四屏长，
 *   想点最后一个选项得滑半天。改成超过 maxVisible 个就套限高 LazyColumn：
 *   页面长度恒定（默认最多露出 3 行），列表内部自己滚。
 *
 *   平台事实（素材库 scrolling 页核实）：
 *   - LazyColumn 没有 items()/itemsIndexed()，children 数组就是 item 列表
 *   - item 身份靠子节点自己的 key
 *   - 必须给 height，否则会被父约束撑满
 */
export function OptionList(ctx: any, theme: string, keyName: string, nodes: any[], maxVisible?: number, hintTemplate?: string) {
    if (theme === "compact") {
        return ctx.UI.LazyRow({ key: keyName, spacing: SPACE.sm }, nodes);
    }
    // 默认：露出 3 行就够，再多就滚
    const visibleRows = 3;
    const limit = maxVisible === undefined ? visibleRows : maxVisible;
    // 选项不多：保持普通 Column，避免无谓的懒加载开销
    if (nodes.length <= limit) {
        return ctx.UI.Column({ key: keyName, fillMaxWidth: true, spacing: SPACE.sm }, nodes);
    }
    // 选项过多：限高滚动，高度按 visibleRows 行算（每行 optionRow + 行距）
    const boxH = visibleRows * SIZE.optionRow + (visibleRows - 1) * SPACE.sm;
    return ctx.UI.Column({ key: keyName + "_out", fillMaxWidth: true, spacing: SPACE.xs }, [
        ctx.UI.LazyColumn({
            key: keyName,
            fillMaxWidth: true,
            height: boxH,
            spacing: SPACE.sm,
        }, nodes),
        ctx.UI.Text({
            key: keyName + "_hint",
            // hintTemplate 由调用方传入（已翻译），%s 换成项数；不传则用中文兜底
            text: (hintTemplate || "共 %s 项，可上下滑动 ↑↓").split("%s").join(String(nodes.length)),
            fontSize: FONT.hint,
            color: colors(ctx).onSurfaceVariant,
        }),
    ]);
}