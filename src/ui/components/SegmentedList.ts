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
// ui/components/SegmentedList.ts
// 分段选择器 —— 「横向铺满整行、等分填充」的按钮组。
//
// 【v1.8.2 两次误解的修正】
//   误解①：以为要「一个按钮占一行」→ 做成了纵向堆叠，三个选项吃掉 3×48dp，极其浪费。
//   误解②：以为李克特要改 → 李克特本来就是对的，不该动。
//
//   真实需求：**按钮组占满整行宽度**（fillMaxWidth），一行内横向等分填充。
//   这正是素材库 btn-filled 的 Row(spacing) + 每个子项 weight:1 的写法。
//
// 【等分 vs 自适应】
//   平台没有 FlowRow，也没有"按内容自适应 + 自动换行"。
//   所以只有两种可行形态：
//     a) 一行等分：items.length 个，每个 weight:1 —— 铺满整行、间距均匀，文本过长省略
//     b) 横滚：LazyRow —— 不铺满，靠滑动容纳
//   设置页的分段选项是「圆润/现代/方正」「一行一个/LazyRow滑动」这种，
//   数量固定 2~3 个，用 (a) 一行等分最合适；超过 4 个自动退回 (b) 横滚。
//
// 平台约束（已核对）：
//   - weight 是扁平 prop，只认 Row/Column 直系父节点
//   - Surface 必须 containerColor / contentColor 成对
//   - 居中靠 Box 的 contentAlignment + Row 的 horizontalArrangement，不单靠 Text 的 textAlign

import { SPACE, RADIUS, FONT, SIZE, shape, colors, fade } from "../shared/design.js";

export interface SegmentedListOption {
    id: string;
    label: string;
}

export interface SegmentedListProps {
    keyName: string;
    options: SegmentedListOption[];
    /** 当前选中 id */
    value: string;
    onSelect: (id: string) => void;
    /** 整体置灰 */
    disabled?: boolean;
    /** 是否在选中项前显示勾（默认 false，纯色块更干净） */
    showCheck?: boolean;
    /** 超过这个数量改用横滚（默认 4） */
    maxInline?: number;
}

/**
 * 构造单个分段按钮。
 * 高度 48dp（Material 触控下限），圆角 12，内距水平 8（给等分的文字争取宽度）。
 */
function buildSegment(
    ctx: any,
    c: any,
    p: SegmentedListProps,
    opt: SegmentedListOption,
    /** 是否用 weight 等分（横滚模式下不传） */
    useWeight: boolean
) {
    const chosen = opt.id === p.value;

    let bg: any;
    let fg: any;
    if (p.disabled) {
        // 【v1.8.4】置灰要「看得出被锁」，不能只是换个浅色 ——
        // 底色压到 surfaceVariant 的一半透明度，文字走 outline，
        // 这样和可点的正常按钮有明显反差，用户一眼知道点了没用。
        bg = chosen ? fade(c.surfaceVariant, 0.45) : fade(c.surface, 0.45);
        fg = fade(c.onSurfaceVariant, 0.55);
    } else {
        bg = chosen ? c.primary : c.surfaceVariant;
        fg = chosen ? c.onPrimary : c.onSurface;
    }

    const props: any = {
        key: p.keyName + "_" + opt.id,
        height: SIZE.minTouch,
        shape: shape(RADIUS.item),
        containerColor: bg,
        contentColor: fg,
        padding: { horizontal: useWeight ? SPACE.sm : SPACE.md },
    };
    if (useWeight) {
        props.weight = 1;
    }
    if (!p.disabled) {
        props.onClick = () => p.onSelect(opt.id);
    }

    const inner: any[] = [];
    if (p.showCheck && chosen && !p.disabled) {
        inner.push(ctx.UI.Icon({ name: "Check", size: 16, tint: fg }));
        inner.push(ctx.UI.Spacer({ width: SPACE.xs }));
    }
    inner.push(ctx.UI.Text({
        text: opt.label,
        fontSize: FONT.small,
        color: fg,
        maxLines: 1,
        overflow: "ellipsis",
        textAlign: "center",
    }));

    return ctx.UI.Surface(props, [
        // 【v1.8.4 点击失效修复】原来是 fillMaxSize: true —— 会把 Surface 的
        // minHeight（SIZE.minTouch）撑成无限大约束，导致 Surface.onClick 命中区异常，
        // 整组按钮点不动。素材库 sel-segment 的写法是 fillMaxWidth + contentAlignment，
        // 高度交给 Surface 自己撑，这里照抄。
        ctx.UI.Box({
            key: p.keyName + "_bx_" + opt.id,
            fillMaxWidth: true,
            contentAlignment: "center",
        }, [
            ctx.UI.Row({
                fillMaxWidth: true,
                verticalAlignment: "center",
                horizontalArrangement: "center",
                spacing: 0,
            }, inner),
        ]),
    ]);
}

/**
 * 分段选择器：默认一行等分铺满整行。
 * 选项数 > maxInline（默认 4）时改用 LazyRow 横滚，避免每段被压到无法阅读。
 */
export function SegmentedList(ctx: any, p: SegmentedListProps) {
    const c = colors(ctx);
    const maxInline = p.maxInline === undefined ? 4 : p.maxInline;

    // ── 横滚模式：选项太多，等分会把文字压没 ──
    if (p.options.length > maxInline) {
        const items: any[] = [];
        for (let i = 0; i < p.options.length; i++) {
            items.push(buildSegment(ctx, c, p, p.options[i], false));
        }
        return ctx.UI.LazyRow({
            key: p.keyName + "_scroll",
            fillMaxWidth: true,
            spacing: SPACE.sm,
        }, items);
    }

    // ── 一行等分模式（默认）：铺满整行、每段 weight:1 ──
    const segs: any[] = [];
    for (let i = 0; i < p.options.length; i++) {
        segs.push(buildSegment(ctx, c, p, p.options[i], true));
    }
    return ctx.UI.Row({
        key: p.keyName + "_row",
        fillMaxWidth: true,
        spacing: SPACE.sm,
        verticalAlignment: "center",
    }, segs);
}