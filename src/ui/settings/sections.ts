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
// ui/settings/sections.ts
// 外观 / 行为两个设置区块 —— 从 settings.ui.ts 里整块抽出，按素材库视觉重做。
//
// 视觉规则（对齐 com.uigallery.demo）：
//   1. 每个分组 = 小标题（primary, labelLarge）+ 一张 Card 容器（surface / elevation 1 / 16dp 圆角）
//   2. 行与行之间用 HorizontalDivider（outlineVariant）自己插，不靠 margin 分隔
//   3. 分段控件放在卡里，独占一行，左右 12dp 内边距
//   4. 危险操作（清历史）行标题用 error，图标也用 error
//
// 依赖注入约定：deps 里放全部闭包变量（state + 标签函数 + 回调），
// 模块内部不再访问 settings.ui.ts 的任何外部变量。

import { SPACE, FONT, shape, fade } from "../shared/design.js";
import {
    SectionCard,
    SettingsRow as SettingsItem,
    SegmentedRow,
} from "../components/SettingsItem.js";

export interface SectionsDeps {
    ctx: any;
    _t: (k: string) => string;
    c: any;
    currentTheme: string;
    currentLayout: string;
    currentQuestionLayout: string;
    currentTimeMode: string;
    currentDisplayMode: string;
    currentStrictMode: string;
    historyEnabledState: any;
    questionFilterState: any;
    blocklistState: any;
    blocklistInputState: any;
    _themeLabel: (t: string) => string;
    _layoutLabel: (l: string) => string;
    _questionLayoutLabel: (l: string) => string;
    _timeModeLabel: (m: string) => string;
    _displayModeLabel: (d: string) => string;
    selectTheme: (v: string) => void;
    selectLayout: (v: string) => void;
    selectTimeMode: (v: string) => void;
    selectDisplayMode: (v: string) => void;
    selectStrictMode: (v: string) => void;
    questionLayoutState: any;
    autoSave: (what: string, field?: string, val?: string) => void;
    showSnack: (msg: string) => void;
}

/**
 * 卡内分段的通用包装：给分段控件上下留白 + 左右 12dp，
 * 与设置行的左内边距视觉对齐（图标 20 + 12 间隙 = 32，这里用 12 起步即可）。
 */
function segBlock(ctx: any, p: { keyName: string; options: any[]; value: string; onSelect: any; disabled?: boolean }) {
    return ctx.UI.Box({
        key: p.keyName + "_wrap",
        fillMaxWidth: true,
        padding: { top: SPACE.sm, bottom: SPACE.md, horizontal: SPACE.md },
    }, [
        SegmentedRow(ctx, {
            keyName: p.keyName,
            options: p.options,
            value: p.value,
            onSelect: p.onSelect,
            disabled: p.disabled,
        }),
    ]);
}

/** 外观页主体（主题 / 按钮布局 / 问卷布局） */
export function buildAppearanceSection(deps: SectionsDeps) {
    const ctx = deps.ctx;
    const _t = deps._t;
    const currentTheme = deps.currentTheme;
    const currentLayout = deps.currentLayout;
    const currentQuestionLayout = deps.currentQuestionLayout;
    const _themeLabel = deps._themeLabel;
    const _layoutLabel = deps._layoutLabel;
    const _questionLayoutLabel = deps._questionLayoutLabel;
    const selectTheme = deps.selectTheme;
    const selectLayout = deps.selectLayout;
    const autoSave = deps.autoSave;
    const questionLayoutState = deps.questionLayoutState;
    // modern 主题锁定分页：每页 3 题（见 questionnaire.ui.ts 的 PAGE_SIZE 逻辑）
    const _isModernTheme = currentTheme === "modern";

    const nodes: any[] = [];

    // ── 主题 ──
    nodes.push(SectionCard(ctx, {
        title: _t("ui.setting.theme"),
        children: [
            
                ctx.UI.Column({ fillMaxWidth: true, padding: { top: SPACE.md } }, [
                    ctx.UI.Text({
                        text: _isModernTheme ? _t("ui.setting.modernDesc") : _t("ui.setting.themeDesc"),
                        fontSize: FONT.hint,
                        color: deps.c.onSurfaceVariant,
                        padding: { horizontal: SPACE.md },
                    }),
                ]),
                segBlock(ctx, {
                    keyName: "seg_theme",
                    options: [
                        { id: "classic", label: _t("ui.setting.roundDesc") },
                        { id: "modern", label: _t("ui.setting.modernDesc") },
                        { id: "compact", label: _t("ui.setting.squareDesc") },
                    ],
                    value: currentTheme,
                    onSelect: function (id) { selectTheme(id); },
                }),
        ],
    }));

    // ── 按钮布局（modern 下锁定竖排并置灰）──
    // 【v1.8.4】modern 主题的选项一律走 OptionRow 竖排整行，
    // 按钮布局这里选什么都没意义 —— 直接锁死 + 置灰，避免用户以为能改。
    const layoutDesc = _isModernTheme
        ? _t("ui.setting.layout.lockedByModern")
        : "";
    const layoutChildren: any[] = [];
    if (_isModernTheme) {
        layoutChildren.push(
            ctx.UI.Column({ fillMaxWidth: true, padding: { top: SPACE.sm } }, [
                ctx.UI.Row({
                    fillMaxWidth: true,
                    verticalAlignment: "center",
                    spacing: SPACE.xs,
                    padding: { horizontal: SPACE.md },
                }, [
                    ctx.UI.Icon({ name: "Lock", size: 14, tint: deps.c.primary }),
                    ctx.UI.Text({
                        text: layoutDesc,
                        fontSize: FONT.hint,
                        color: deps.c.primary,
                        weight: 1,
                    }),
                ]),
            ])
        );
    }
    layoutChildren.push(
        segBlock(ctx, {
            keyName: "seg_layout",
            options: [
                { id: "row", label: _t("ui.setting.layout.row") },
                { id: "scroll", label: _t("ui.setting.layout.scroll") },
            ],
            // modern 下视觉值固定显示为 row（实际渲染走 OptionRow 竖排）
            value: _isModernTheme ? "row" : currentLayout,
            disabled: _isModernTheme,
            onSelect: function (id) {
                if (_isModernTheme) return;
                selectLayout(id);
            },
        })
    );
    nodes.push(SectionCard(ctx, {
        title: _t("ui.setting.layout"),
        children: layoutChildren,
    }));

    // ── 问卷布局（modern 下锁定紧凑并置灰）──
    const qLayoutDesc = _isModernTheme
        ? _t("ui.setting.qLayout.lockedByModern")
        : (_t("ui.setting.current") + _questionLayoutLabel(currentQuestionLayout));

    nodes.push(SectionCard(ctx, {
        title: _t("ui.setting.questionLayout"),
        children: [
            
                ctx.UI.Column({ fillMaxWidth: true, padding: { top: SPACE.md } }, [
                    ctx.UI.Row({
                        fillMaxWidth: true,
                        verticalAlignment: "center",
                        spacing: SPACE.xs,
                        padding: { horizontal: SPACE.md },
                    }, [
                        ctx.UI.Icon({
                            name: _isModernTheme ? "Lock" : "Info",
                            size: 14,
                            tint: _isModernTheme ? deps.c.primary : deps.c.onSurfaceVariant,
                        }),
                        ctx.UI.Text({
                            text: qLayoutDesc,
                            fontSize: FONT.hint,
                            color: _isModernTheme ? deps.c.primary : deps.c.onSurfaceVariant,
                            weight: 1,
                        }),
                    ]),
                ]),
                segBlock(ctx, {
                    keyName: "seg_qlayout",
                    options: [
                        { id: "continuous", label: _t("ui.setting.layout.segContinuous") },
                        { id: "compact", label: _t("ui.setting.layout.segCompact") },
                    ],
                    // modern 下视觉值固定显示为 compact
                    value: _isModernTheme ? "compact" : currentQuestionLayout,
                    disabled: _isModernTheme,
                    onSelect: function (id) {
                        if (_isModernTheme) return;
                        questionLayoutState[1](id);
                        autoSave(id === "continuous" ? _t("ui.setting.layout.continuous") : _t("ui.setting.layout.compact"), "layout", id);
                    },
                }),
        ],
    }));

    return ctx.UI.Column({ fillMaxWidth: true, spacing: 0 }, nodes);
}

/** 行为页主体（时间/显示/严格/历史/题型过滤器/屏蔽词） */
export function buildBehaviorSection(deps: SectionsDeps) {
    const ctx = deps.ctx;
    const _t = deps._t;
    const currentTimeMode = deps.currentTimeMode;
    const currentDisplayMode = deps.currentDisplayMode;
    const currentStrictMode = deps.currentStrictMode;
    const historyEnabledState = deps.historyEnabledState;
    const questionFilterState = deps.questionFilterState;
    const blocklistState = deps.blocklistState;
    const blocklistInputState = deps.blocklistInputState;
    const _timeModeLabel = deps._timeModeLabel;
    const _displayModeLabel = deps._displayModeLabel;
    const selectTimeMode = deps.selectTimeMode;
    const selectDisplayMode = deps.selectDisplayMode;
    const selectStrictMode = deps.selectStrictMode;
    const autoSave = deps.autoSave;
    const showSnack = deps.showSnack;
    const c = deps.c;

    const nodes: any[] = [];

    // ── 时间模式 ──
    nodes.push(SectionCard(ctx, {
        title: _t("ui.setting.timeMode"),
        desc: _t("ui.setting.current") + _timeModeLabel(currentTimeMode),
        children: [
            
                segBlock(ctx, {
                    keyName: "seg_time",
                    options: [
                        { id: "picker", label: _t("ui.setting.timePicker") },
                        { id: "input", label: _t("ui.setting.timeInput") },
                    ],
                    value: currentTimeMode,
                    onSelect: function (id) { selectTimeMode(id); },
                }),
        ],
    }));

    // ── 显示模式 ──
    nodes.push(SectionCard(ctx, {
        title: _t("ui.setting.displayMode"),
        desc: _t("ui.setting.current") + _displayModeLabel(currentDisplayMode),
        children: [
            
                segBlock(ctx, {
                    keyName: "seg_display",
                    options: [
                        { id: "normal", label: _t("ui.setting.displayNormal") },
                        { id: "hidden", label: _t("ui.setting.displayHidden") },
                        { id: "blocked", label: _t("ui.setting.displayBlocked") },
                    ],
                    value: currentDisplayMode,
                    onSelect: function (id) { selectDisplayMode(id); },
                }),
        ],
    }));

    // ── 严格模式 ──
    nodes.push(SectionCard(ctx, {
        title: _t("ui.setting.strictMode"),
        desc: currentStrictMode === "true" ? _t("ui.setting.strictEnabled") : _t("ui.setting.strictDisabled"),
        children: [
            
                segBlock(ctx, {
                    keyName: "seg_strict",
                    options: [
                        { id: "true", label: _t("ui.setting.strictEnabled") },
                        { id: "false", label: _t("ui.setting.strictDisabled") },
                    ],
                    value: currentStrictMode,
                    onSelect: function (id) { selectStrictMode(id); },
                }),
        ],
    }));

    // ── 历史记录 ──
    nodes.push(SectionCard(ctx, {
        title: _t("ui.setting.history"),
        desc: _t("ui.setting.history.desc"),
        children: [
            
                SettingsItem(ctx, {
                    icon: "History",
                    title: _t("ui.setting.history"),
                    desc: _t("ui.setting.history.toggleDesc"),
                    right: ctx.UI.Switch({
                        checked: historyEnabledState[0] === "true",
                        onCheckedChange: function (v) {
                            var sv = v ? "true" : "false";
                            historyEnabledState[1](sv);
                            autoSave(v ? _t("ui.setting.enabled") : _t("ui.setting.disabled"), "historyEnabled", sv);
                        },
                    }),
                }),
                SettingsItem(ctx, {
                    icon: "DeleteForever",
                    title: _t("ui.setting.cleanHistory"),
                    titleColor: c.error,
                    onClick: function () {
                        try {
                            var path = "/sdcard/Download/Operit/questionnaire/history";
                            if (Tools.Files.exists(path)) {
                                Tools.Files.deleteFile(path, true);
                                showSnack(_t("ui.setting.cleanHistory.done"));
                            } else {
                                showSnack(_t("ui.setting.cleanHistory.none"));
                            }
                        } catch (e) {
                            showSnack(_t("ui.setting.cleanHistory.fail") + String(e));
                        }
                    },
                    showArrow: false,
                    last: true,
                }),
        ],
    }));

    // ── 题型过滤器 ──
    const qfChildren: any[] = [
        SettingsItem(ctx, {
            icon: "Public",
            title: _t("ui.setting.qf.useGlobalOn"),
            desc: _t("ui.setting.qf.useGlobal"),
            right: ctx.UI.Switch({
                checked: questionFilterState[0].useGlobal === true,
                onCheckedChange: function (v) {
                    var qf = JSON.parse(JSON.stringify(questionFilterState[0]));
                    qf.useGlobal = v;
                    if (!v && !Array.isArray(qf.types)) qf.types = [];
                    questionFilterState[1](qf);
                    autoSave(v ? _t("ui.setting.qf.useGlobal") : _t("ui.setting.qf.customOn"), "questionFilter", JSON.stringify(qf));
                },
            }),
            last: questionFilterState[0].useGlobal === true,
        }),
    ];

    if (!questionFilterState[0].useGlobal) {
        // 可用题型多选：LazyRow 横排 chip（素材库 btn-chip-filter 的写法）
        const qfTypeOpts = buildTypeOptions(_t);
        qfChildren.push(ctx.UI.Column({ fillMaxWidth: true, padding: { vertical: SPACE.md }, spacing: SPACE.sm }, [
            ctx.UI.Text({
                text: _t("ui.setting.qf.types"),
                fontSize: FONT.hint,
                color: c.onSurfaceVariant,
                padding: { horizontal: SPACE.md },
            }),
            ctx.UI.LazyRow({ spacing: 6, padding: { horizontal: SPACE.md } }, qfTypeOpts.map(function (t, ti) {
                var on2 = (questionFilterState[0].types || []).indexOf(t.id) >= 0;
                return ctx.UI.FilterChip({
                    key: "qf_type_" + ti,
                    selected: on2,
                    onClick: function () {
                        var qf = JSON.parse(JSON.stringify(questionFilterState[0]));
                        var arr = qf.types || [];
                        var idx = arr.indexOf(t.id);
                        if (idx >= 0) arr.splice(idx, 1); else arr.push(t.id);
                        qf.types = arr;
                        questionFilterState[1](qf);
                        autoSave(_t("ui.setting.qf.toggled"), "questionFilter", JSON.stringify(qf));
                    },
                    label: ctx.UI.Text({ text: t.label, style: "labelSmall" }),
                    leadingIcon: on2 ? ctx.UI.Icon({ name: "Check", size: 14, tint: c.onPrimary }) : null,
                });
            })),
        ]));
        qfChildren.push(ctx.UI.HorizontalDivider({ color: fade(c.outlineVariant, 0.6) }));
        qfChildren.push(SettingsItem(ctx, {
            icon: "PriorityHigh",
            title: _t("ui.setting.qf.required"),
            right: ctx.UI.Switch({
                checked: questionFilterState[0].allowRequired === true,
                onCheckedChange: function (v) {
                    var qf = JSON.parse(JSON.stringify(questionFilterState[0]));
                    qf.allowRequired = v;
                    questionFilterState[1](qf);
                    autoSave(_t("ui.setting.qf.requiredSwitch"), "questionFilter", JSON.stringify(qf));
                },
            }),
        }));
        qfChildren.push(SettingsItem(ctx, {
            icon: "MoreHoriz",
            title: _t("ui.setting.qf.other"),
            right: ctx.UI.Switch({
                checked: questionFilterState[0].allowOther === true,
                onCheckedChange: function (v) {
                    var qf = JSON.parse(JSON.stringify(questionFilterState[0]));
                    qf.allowOther = v;
                    questionFilterState[1](qf);
                    autoSave(_t("ui.setting.qf.otherSwitch"), "questionFilter", JSON.stringify(qf));
                },
            }),
            last: true,
        }));
    }

    nodes.push(SectionCard(ctx, {
        title: _t("ui.setting.qf.title"),
        desc: _t("ui.setting.qf.desc"),
        children: qfChildren,
    }));

    // ── 问卷屏蔽词 ──
    const blChildren: any[] = [
        ctx.UI.Row({
            fillMaxWidth: true,
            spacing: SPACE.sm,
            verticalAlignment: "center",
            padding: { top: SPACE.md, bottom: SPACE.sm, horizontal: SPACE.md },
        }, [
            ctx.UI.Column({ weight: 1 }, [
                ctx.UI.TextField({
                    value: blocklistInputState[0],
                    onValueChange: function (v) { blocklistInputState[1](v); },
                    placeholder: _t("ui.setting.blocklist.placeholder"),
                    singleLine: true,
                    fillMaxWidth: true,
                }),
            ]),
            ctx.UI.Button({
                onClick: function () {
                    var w = String(blocklistInputState[0] || "").trim();
                    if (!w) { showSnack(_t("ui.setting.blocklist.empty")); return; }
                    var arr = JSON.parse(JSON.stringify(blocklistState[0]));
                    if (arr.indexOf(w) < 0) { arr.push(w); blocklistState[1](arr); }
                    blocklistInputState[1]("");
                    Tools.SoftwareSettings.writeEnvironmentVariable("QUESTIONNAIRE_COMPILE_BLOCKLIST", JSON.stringify(arr));
                    showSnack(_t("ui.setting.blocklist.added"));
                },
                content: ctx.UI.Text({ text: _t("ui.setting.blocklist.add"), style: "labelMedium", color: c.onPrimary }),
            }),
        ]),
    ];

    if (blocklistState[0].length > 0) {
        blChildren.push(ctx.UI.LazyRow({
            spacing: 6,
            padding: { horizontal: SPACE.md, top: SPACE.xs, bottom: SPACE.md },
        }, blocklistState[0].map(function (w, wi) {
            return ctx.UI.FilterChip({
                key: "bl_" + wi,
                onClick: function () {
                    var arr = JSON.parse(JSON.stringify(blocklistState[0])).filter(function (x) { return x !== w; });
                    blocklistState[1](arr);
                    Tools.SoftwareSettings.writeEnvironmentVariable("QUESTIONNAIRE_COMPILE_BLOCKLIST", JSON.stringify(arr));
                    showSnack(_t("ui.setting.blocklist.removed"));
                },
                label: ctx.UI.Text({ text: w, style: "labelSmall" }),
                trailingIcon: ctx.UI.Icon({ name: "Close", size: 14 }),
            });
        })));
    } else {
        blChildren.push(ctx.UI.Text({
            text: _t("ui.setting.blocklist.none"),
            fontSize: FONT.hint,
            color: c.onSurfaceVariant,
            padding: { horizontal: SPACE.md, bottom: SPACE.md },
        }));
    }

    nodes.push(SectionCard(ctx, {
        title: _t("ui.setting.blocklist.title"),
        desc: _t("ui.setting.blocklist.desc"),
        children: blChildren,
    }));

    return ctx.UI.Column({ fillMaxWidth: true, spacing: 0 }, nodes);
}

/** 题型选项表（预览与题型过滤器共用） */
export type TypeOption = { id: string; label: string };
export function buildTypeOptions(_t: (k: string) => string): TypeOption[] {
    return [
        { id: "single", label: _t("ui.setting.type.single") },
        { id: "multiple", label: _t("ui.setting.type.multiple") },
        { id: "text", label: _t("ui.setting.type.text") },
        { id: "textarea", label: _t("ui.setting.type.textarea") },
        { id: "rating", label: _t("ui.setting.type.rating") },
        { id: "likert", label: _t("ui.setting.type.likert") },
        { id: "nps", label: _t("ui.setting.type.nps") },
        { id: "time", label: _t("ui.setting.type.time") },
        { id: "confirm", label: _t("ui.setting.type.confirm") },
        { id: "number", label: _t("ui.setting.type.number") },
    ];
}