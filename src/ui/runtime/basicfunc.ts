// @ts-nocheck
// basicfunc.ts — 结果脚本引擎：变量解析、算术求值、循环解析

export function resolveVar(name, env) {
    name = name.trim();
    // 二维数组：arr[i][j]
    var bracket2Match = name.match(/^([a-zA-Z_]\w*)\[([^\]]+)\]\[([^\]]+)\]$/);
    if (bracket2Match) {
        var arr2 = env[bracket2Match[1]];
        if (!Array.isArray(arr2)) throw new Error('数组 "' + bracket2Match[1] + '" 未声明');
        var i1 = resolveIndex(bracket2Match[2], env);
        var i2 = resolveIndex(bracket2Match[3], env);
        if (!arr2[i1] || !Array.isArray(arr2[i1])) throw new Error('二维数组索引越界');
        if (i2 < 0 || i2 >= arr2[i1].length) throw new Error('二维数组索引 ' + i2 + ' 越界');
        return arr2[i1][i2];
    }
    // 一维数组：a[0]、a[i]
    var bracketMatch = name.match(/^([a-zA-Z_]\w*)\[([^\]]+)\]$/);
    if (bracketMatch) {
        var arrName = bracketMatch[1];
        var idxStr = bracketMatch[2].trim();
        var arr = env[arrName];
        if (!Array.isArray(arr)) throw new Error('数组 "' + arrName + '" 未声明');
        var idx = resolveIndex(idxStr, env);
        if (idx < 0 || idx >= arr.length) throw new Error('数组 "' + arrName + '" 索引 ' + idx + ' 越界（长度 ' + arr.length + '）');
        return arr[idx];
    }
    // true / false 字面量
    if (name === 'true') return true;
    if (name === 'false') return false;
    var v = env[name];
    if (v === undefined) throw new Error('未定义的变量 "' + name + '"');
    return v;
}

function resolveIndex(idxStr, env) {
    idxStr = idxStr.trim();
    var idx = env[idxStr];
    if (idx === undefined) idx = parseInt(idxStr, 10);
    if (isNaN(idx)) throw new Error('数组索引无效: ' + idxStr);
    return idx;
}

var MAX_VARS = 500;
export function setVar(name, value, env) {
    name = name.trim();
    if (!(name in env) && Object.keys(env).length >= MAX_VARS) throw new Error('变量数超过上限 ' + MAX_VARS);
    // 二维数组赋值：arr[i][j]=x
    var bracket2Match = name.match(/^([a-zA-Z_]\w*)\[([^\]]+)\]\[([^\]]+)\]$/);
    if (bracket2Match) {
        var arr2 = env[bracket2Match[1]];
        if (!Array.isArray(arr2)) throw new Error('数组 "' + bracket2Match[1] + '" 未声明');
        var i1 = resolveIndex(bracket2Match[2], env);
        var i2 = resolveIndex(bracket2Match[3], env);
        if (!arr2[i1] || !Array.isArray(arr2[i1])) throw new Error('二维数组索引越界');
        arr2[i1][i2] = value;
        return;
    }
    var bracketMatch = name.match(/^([a-zA-Z_]\w*)\[([^\]]+)\]$/);
    if (bracketMatch) {
        var arrName = bracketMatch[1];
        var idxStr = bracketMatch[2].trim();
        var arr = env[arrName];
        if (!Array.isArray(arr)) {
            env[arrName] = [];
            arr = env[arrName];
        }
        var idx = resolveIndex(idxStr, env);
        arr[idx] = value;
        return;
    }
    env[name] = value;
}

// 解析整数值（支持变量引用和数组引用）
export function parseIntValue(expr, env) {
    expr = expr.trim();
    // 变量或数组引用
    if (/^[a-zA-Z_]\w*(\[[^\]]+\])?$/.test(expr)) {
        return resolveVar(expr, env);
    }
    // 纯数字
    var n = parseInt(expr, 10);
    if (!isNaN(n)) return n;
    return 0;
}

// parseInt 辅助函数
export function builtinParseInt(expr, env) {
    var v = evalAssignRHS(expr, env);
    if (typeof v !== 'number') return 0;
    // 整数除法向零取整
    return v >= 0 ? Math.floor(v) : Math.ceil(v);
}

// 解析赋值语句右侧的表达式（完整算术：+-*/）
export function evalAssignRHS(expr, env) {
    expr = expr.trim();
    // true / false
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    // 字符串字面量直接返回
    if ((expr[0] === '"' && expr[expr.length-1] === '"') || (expr[0] === "'" && expr[expr.length-1] === "'")) {
        return expr.substring(1, expr.length - 1);
    }
    // 去掉外层括号
    while (expr[0] === '(' && expr[expr.length-1] === ')') {
        var depth = 0, bal = true;
        for (var bi = 0; bi < expr.length; bi++) {
            if (expr[bi] === '(') depth++;
            else if (expr[bi] === ')') depth--;
            if (depth === 0 && bi < expr.length - 1) { bal = false; break; }
        }
        if (bal) expr = expr.substring(1, expr.length - 1).trim();
        else break;
    }
    // 变量或数组引用
    if (/^[a-zA-Z_]\w*(\[[^\]]+\])?(\[[^\]]+\])?$/.test(expr)) {
        return resolveVar(expr, env);
    }
    // 数字（优先浮点数，有*/的不算）
    if (expr.indexOf('*') < 0 && expr.indexOf('/') < 0) {
        var fn = parseFloat(expr);
        if (!isNaN(fn) && expr.indexOf('.') >= 0) return fn;
        var n = parseInt(expr, 10);
        if (!isNaN(n)) return n;
    }
    // 完整算术：先处理乘除，再处理加减
    // 先按 +- 分割（避开括号内的）
    var addParts = smartSplitOp(expr, ['+', '-']);
    var result = 0;
    var op = '+';
    for (var i = 0; i < addParts.length; i++) {
        var p = addParts[i].trim();
        if (p === '+' || p === '-') {
            op = p;
            continue;
        }
        if (p === '') continue;
        // {}内的表达式递归
        if (p[0] === '(' || p.indexOf('(') >= 0) {
            var evalVal = evalAssignRHS(p, env);
            if (op === '+') result += (typeof evalVal === 'number' ? evalVal : 0);
            else result -= (typeof evalVal === 'number' ? evalVal : 0);
            continue;
        }
        // 处理乘除（避开括号内的）
        var mulParts = smartSplitOp(p, ['*', '/']);
        var mulResult = evalAssignRHS(mulParts[0].trim(), env);
        if (typeof mulResult !== 'number') mulResult = parseInt(mulResult, 10) || 0;
        for (var mi = 1; mi < mulParts.length; mi += 2) {
            var mop = mulParts[mi];
            var mval = evalAssignRHS(mulParts[mi + 1].trim(), env);
            if (typeof mval !== 'number') mval = parseInt(mval, 10) || 0;
            if (mop === '*') mulResult *= mval;
            else if (mval !== 0) mulResult = Math.floor(mulResult / mval);
            else throw new Error('除零错误');
        }
        if (op === '+') result += mulResult;
        else result -= mulResult;
    }
    return result;
}

// 解析 for 循环头："10"、"int i=1;i<=10;i++"、"int i=1;i<=10;i=i+1"
export function parseForHeader(header) {
    header = header.trim();
    // 简单数字：for(10)
    var simpleMatch = header.match(/^\d+$/);
    if (simpleMatch) {
        var count = parseInt(header, 10);
        return { type: 'simple', count: count };
    }
    // CPP式：int i=1;i<=10;i++ 或 int i=1;i<=10;i=i+1
    var cppParts = header.split(';');
    if (cppParts.length === 3) {
        var initStr = cppParts[0].trim();
        var condStr = cppParts[1].trim();
        var stepStr = cppParts[2].trim();
        // 解析 init: "int i=1"
        var varName = '';
        var initVal = 0;
        var initMatch = initStr.match(/^int\s+([a-zA-Z_]\w*)\s*=\s*(.+)$/);
        if (initMatch) {
            varName = initMatch[1];
            initVal = parseInt(initMatch[2].trim(), 10);
            if (isNaN(initVal)) initVal = 0;
        }
        // 解析 step: "i++" 或 "i=i+1" 或 "i+=1"
        var stepDelta = 1;
        if (stepStr.indexOf('++') >= 0) stepDelta = 1;
        else if (stepStr.indexOf('--') >= 0) stepDelta = -1;
        else {
            var stepMatch = stepStr.match(/=\s*([^+\-]*)\s*([+\-]?)\s*(\d*)$/);
            if (stepMatch) {
                var s2 = stepMatch[3] ? parseInt(stepMatch[3], 10) : 1;
                stepDelta = stepMatch[2] === '-' ? -s2 : s2;
            }
        }
        return { type: 'cpp', varName: varName, initVal: initVal, condStr: condStr, stepDelta: stepDelta };
    }
    return null;
}

// 正则匹配：a===/表达式/
export function regexMatch(valExpr, regexStr, env) {
    var val = String(evalAssignRHS(valExpr.trim(), env));
    var match = regexStr.match(/^\/(.+)\/([a-z]*)$/);
    if (!match) throw new Error('正则格式错误: ' + regexStr);
    try {
        return new RegExp(match[1], match[2]).test(val);
    } catch (e) {
        throw new Error('正则解析错误: ' + e.message);
    }
}

// 通用条件求值函数（if/while 共用）
function evalCond(cond, env) {
    cond = cond.trim();
    if (cond === 'true') return true;
    if (cond === 'false') return false;
    var n = parseInt(cond, 10);
    if (!isNaN(n)) return n !== 0;
    if (/^[a-zA-Z_]\w*$/.test(cond)) {
        var cv = resolveVar(cond, env);
        if (typeof cv === 'boolean') return cv;
        return cv !== 0;
    }
    var cmpMatch = cond.match(/^([^=!<>]+)\s*(>=|<=|==|!=|>|<)\s*(.+)$/);
    if (cmpMatch) {
        var lv = evalAssignRHS(cmpMatch[1].trim(), env);
        var rv = evalAssignRHS(cmpMatch[3].trim(), env);
        switch (cmpMatch[2]) {
            case '>': return lv > rv;
            case '<': return lv < rv;
            case '>=': return lv >= rv;
            case '<=': return lv <= rv;
            case '==': return lv === rv;
            case '!=': return lv !== rv;
        }
    }
    return false;
}

// 解析 if 条件
export function evalIfCond(cond, env) {
    cond = cond.trim();
    var regexCond = cond.match(/^([^=]+)\s*===\s*\/(.+)\/([a-z]*)\s*$/);
    if (regexCond) {
        return regexMatch(regexCond[1].trim(), '/' + regexCond[2] + '/' + regexCond[3], env);
    }
    return evalCond(cond, env);
}

// 解析 while 条件
export function parseWhileCond(cond, env) {
    return evalCond(cond, env);
}

// 智能按操作符分割（避开括号内部的）
function smartSplitOp(str, ops) {
    var result = [];
    var buf = '';
    var depth = 0;
    for (var i = 0; i < str.length; i++) {
        var c = str[i];
        if (c === '(') depth++;
        else if (c === ')') depth--;
        else if (depth === 0 && ops.indexOf(c) >= 0) {
            result.push(buf);
            result.push(c);
            buf = '';
            continue;
        }
        buf += c;
    }
    if (buf) result.push(buf);
    return result;
}
