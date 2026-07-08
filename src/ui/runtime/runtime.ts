// @ts-nocheck
// runtime.ts — 结果脚本执行引擎
// resultcode 格式：二维字符串数组，每组独立执行，每组输出在单独一行
// 示例：[["int a=1","print(a)"],["int a[100]={1,2}","print(a[0])"]]

import { resolveVar, setVar, evalAssignRHS, parseForHeader, parseWhileCond, builtinParseInt, evalIfCond } from './basicfunc.js';
import { formatScriptOutput, formatScriptError } from './output.js';

var TIMEOUT_MS = 5000;
var MAX_ARRAY_SIZE = 10000;
var MAX_VARS = 500;

export function executeResultCode(resultCodeData, answers, otherInputs, qs) {
    if (!resultCodeData || !Array.isArray(resultCodeData))
        return '';
    
    var allOutputs = [];
    
    for (var gi = 0; gi < resultCodeData.length; gi++) {
        var group = resultCodeData[gi];
        if (!Array.isArray(group)) continue;
        
        var groupOutput = executeGroup(group, answers, otherInputs, qs);
        if (groupOutput) {
            for (var oi = 0; oi < groupOutput.length; oi++) {
                allOutputs.push(groupOutput[oi]);
            }
        }
    }
    
    if (allOutputs.length > 0) {
        return formatScriptOutput(allOutputs);
    }
    return '';
}

var _qidSet = {}; // 用于记录 qid，赋值时检查只读
function executeGroup(lines, answers, otherInputs, qs) {
    var env = {}; // 变量环境
    var outputs = [];
    var startTime = Date.now();
    _qidSet = {};
    
    // 注入问卷答案（以 q1, q2... 形式，和 result 表达式一样）
    for (var qid in answers) {
        var ans = answers[qid];
        _qidSet[qid] = true;
        if (typeof ans === 'string' || typeof ans === 'number') {
            // 始终注入原始值（字符串）
            env[qid] = ans;
            // 如果能转数字也注入数字值（覆盖）
            var numVal = parseInt(ans, 10);
            if (!isNaN(numVal)) env[qid] = numVal;
            // 尝试浮点数
            var floatVal = parseFloat(ans);
            if (!isNaN(floatVal) && String(floatVal) !== String(numVal)) env[qid] = floatVal;
        }
    }
    
    for (var li = 0; li < lines.length; li++) {
        var line = String(lines[li]).trim();
        if (!line) continue;
        
        if (Date.now() - startTime > TIMEOUT_MS) {
            throw new Error('Runtime Error: 执行超时（超过5秒）');
        }
        
        try {
            executeStatement(line, env, outputs, startTime, answers, otherInputs, qs);
        } catch (e) {
            throw new Error('Runtime Error at line "' + line + '": ' + e.message);
        }
    }
    
    return outputs;
}

function executeStatement(line, env, outputs, startTime, answers, otherInputs, qs) {
    line = line.trim();
    
    // 1. cout 流式输出：cout << "text" << a << b << endl
    if (line.indexOf('cout') === 0) {
        var coutParts = line.substring(3).split('<<');
        var coutResult = '';
        for (var ci = 1; ci < coutParts.length; ci++) {
            var cp = coutParts[ci].trim();
            if (!cp || cp === 'endl') {
                if (cp === 'endl') coutResult += '\n';
                continue;
            }
            // 字符串字面量
            if ((cp[0] === '"' && cp[cp.length-1] === '"') || (cp[0] === "'" && cp[cp.length-1] === "'")) {
                coutResult += cp.substring(1, cp.length - 1);
            } else {
                // 变量或表达式（直接计算）
                try { coutResult += String(evalAssignRHS(cp, env)); } catch (e) { coutResult += String(resolveVar(cp, env)); }
            }
        }
        outputs.push(coutResult);
        return;
    }
    
    // 2. print(x) — 仅支持单个变量/数字/字符串：print(a) / print(123) / print('text')
    if (line.indexOf('print(') === 0 && line[line.length-1] === ')') {
        var innerStart = line.indexOf('(') + 1;
        var depth = 0;
        var inner = '';
        for (var pi = innerStart; pi < line.length - 1; pi++) {
            var c = line[pi];
            if (c === '(') depth++;
            else if (c === ')') { if (depth === 0) break; depth--; }
            inner += c;
        }
        var pv = String(evalAssignRHS(inner, env));
        outputs.push(pv);
        return;
    }
    
    // 2. for 循环：for(10):{...} 或 for(int i=1;i<=10;i++):{...}
    var forMatch = line.match(/^for\s*\(([^)]+)\)\s*:\s*\{([\s\S]*)\}$/);
    if (forMatch) {
        var header = forMatch[1];
        var body = forMatch[2].trim();
        var parsed = parseForHeader(header);
        if (!parsed) throw new Error('无法解析 for 循环头: ' + header);
        
        if (parsed.type === 'simple') {
            // for(10):{...} — 注入变量 i
            for (var si = 1; si <= parsed.count; si++) {
                env['i'] = si;
                if (Date.now() - startTime > TIMEOUT_MS) throw new Error('执行超时');
                executeBlock(body, env, outputs, startTime, answers, otherInputs, qs);
            }
            delete env['i'];
        } else if (parsed.type === 'cpp') {
            // for(int i=1;i<=10;i++):{...}
            setVar(parsed.varName, parsed.initVal, env);
            while (parseWhileCond(parsed.condStr, env)) {
                if (Date.now() - startTime > TIMEOUT_MS) throw new Error('执行超时');
                executeBlock(body, env, outputs, startTime, answers, otherInputs, qs);
                var cur = resolveVar(parsed.varName, env);
                setVar(parsed.varName, cur + parsed.stepDelta, env);
            }
        }
        return;
    }
    
    // 3. while 循环：while(条件):{...}
    var whileMatch = line.match(/^while\s*\(([^)]+)\)\s*:\s*\{([\s\S]*)\}$/);
    if (whileMatch) {
        var condStr = whileMatch[1];
        var whileBody = whileMatch[2].trim();
        var maxIter = 100000; // 防止死循环
        var iterCount = 0;
        while (parseWhileCond(condStr, env)) {
            if (Date.now() - startTime > TIMEOUT_MS) throw new Error('执行超时');
            if (++iterCount > maxIter) throw new Error('循环迭代超限（超过10万次）');
            executeBlock(whileBody, env, outputs, startTime, answers, otherInputs, qs);
        }
        return;
    }
    
    // 4. if-else if-else：if(条件):{...} else if(条件):{...} else:{...}
    var ifMatch = line.match(/^if\s*\(([^)]+)\)\s*:\s*\{([\s\S]*)\}(.*)$/);
    if (ifMatch) {
        var ifCond = ifMatch[1];
        var ifBody = ifMatch[2].trim();
        var rest = ifMatch[3].trim();
        if (evalIfCond(ifCond, env)) {
            executeBlock(ifBody, env, outputs, startTime, answers, otherInputs, qs);
        } else {
            // 处理 else if / else 链
            tryElseChain(rest, env, outputs, startTime, answers, otherInputs, qs);
        }
        return;
    }
    
    // 5. 变量声明：int/float/double/char/string 以及 int[]/char[]
    // 先检查是否为 qid（只读）
    function checkQid(name) {
        if (_qidSet[name]) throw new Error('不能修改问卷变量 "' + name + '"');
    }
    
    // int a[100] 无初始化声明
    var arrDeclNoInit = line.match(/^(int|char)\s+([a-zA-Z_]\w*)\[(\d+)\]\s*$/);
    if (arrDeclNoInit) {
        var ait = arrDeclNoInit[1];
        var ain = arrDeclNoInit[2];
        checkQid(ain);
        var ais = parseInt(arrDeclNoInit[3], 10);
        if (ais > MAX_ARRAY_SIZE) throw new Error('数组 "' + ain + '" 大小 ' + ais + ' 超过上限 ' + MAX_ARRAY_SIZE);
        env[ain] = new Array(ais);
        return;
    }
    
    // int a[100]={1,2} 或 char arr[100]={'a','b'}
    var arrDeclMatch = line.match(/^(int|char)\s+([a-zA-Z_]\w*)\[(\d+)\]\s*=\s*\{(.*)\}\s*$/);
    if (arrDeclMatch) {
        var arrType = arrDeclMatch[1];
        var arrName = arrDeclMatch[2];
        checkQid(arrName);
        var arrSize = parseInt(arrDeclMatch[3], 10);
        if (arrSize > MAX_ARRAY_SIZE) throw new Error('数组 "' + arrName + '" 大小 ' + arrSize + ' 超过上限 ' + MAX_ARRAY_SIZE);
        var arrValuesStr = arrDeclMatch[4];
        var arr = new Array(arrSize);
        var valParts = splitSmartComma(arrValuesStr);
        for (var ai = 0; ai < valParts.length && ai < arrSize; ai++) {
            var p = valParts[ai].trim();
            if (arrType === 'int') {
                arr[ai] = parseInt(p, 10);
                if (isNaN(arr[ai])) arr[ai] = 0;
            } else {
                arr[ai] = parseStringLiteral(p);
            }
        }
        env[arrName] = arr;
        return;
    }
    
    // 二维数组声明：int arr[3][4]={{1,2},{3,4}}
    var arr2DDecl = line.match(/^(int)\s+([a-zA-Z_]\w*)\[(\d+)\]\[(\d+)\]\s*=\s*\{([\s\S]*)\}\s*$/);
    if (arr2DDecl) {
        checkQid(arr2DDecl[2]);
        var d1 = parseInt(arr2DDecl[3], 10);
        var d2 = parseInt(arr2DDecl[4], 10);
        if (d1 * d2 > MAX_ARRAY_SIZE * 10) throw new Error('二维数组过大');
        var arr2d = new Array(d1);
        var innerParts = splitSmartCommaOuter(arr2DDecl[5]);
        for (var di = 0; di < d1; di++) {
            arr2d[di] = new Array(d2);
            var innerVals = di < innerParts.length ? splitSmartComma(innerParts[di]) : [];
            for (var dj = 0; dj < d2; dj++) {
                arr2d[di][dj] = dj < innerVals.length ? (parseInt(innerVals[dj].trim(), 10) || 0) : 0;
            }
        }
        env[arr2DDecl[2]] = arr2d;
        return;
    }

    // bool/ int/float/double/char/string 声明
    var typeMatch = line.match(/^(bool|int|float|double|char|string)\s+([a-zA-Z_]\w*)\s*(?:=\s*(.*))?$/);
    if (typeMatch) {
        var varType = typeMatch[1];
        var varName = typeMatch[2];
        checkQid(varName);
        var rhs = typeMatch[3];
        if (rhs !== undefined) {
            rhs = rhs.trim();
            var v = parseTypedValue(varType, rhs, env);
            setVar(varName, v, env);
        } else {
            // 默认值
            if (varType === 'int') setVar(varName, 0, env);
            else if (varType === 'float' || varType === 'double') setVar(varName, 0.0, env);
            else if (varType === 'char') setVar(varName, '', env);
            else if (varType === 'bool') setVar(varName, false, env);
            else setVar(varName, '', env);
        }
        return;
    }
    
    // 5. parseInt 内置函数调用
    var parseIntMatch = line.match(/^parseInt\s*\(\s*([^)]*)\s*\)$/);
    if (parseIntMatch) {
        var piVal = builtinParseInt(parseIntMatch[1].trim(), env);
        // 单独调用 parseInt 无效，但结果会丢弃
        return;
    }
    
    // 6. 普通赋值：a=1, a=b+1, a[0]=5, a=parseInt(10/3) 等
    var assignMatch = line.match(/^([a-zA-Z_]\w*(?:\[[^\]]+\])?)\s*=\s*(.+)$/);
    if (assignMatch) {
        var target = assignMatch[1];
        // qid 只读
        var targetName = target.replace(/\[.*\]/, '');
        checkQid(targetName);
        var valueExpr = assignMatch[2].trim();
        // 检查右侧是否有 parseInt() — 支持嵌套算术如 parseInt(a/b)
        if (valueExpr.indexOf('parseInt(') >= 0) {
            var piInner = valueExpr.match(/parseInt\s*\(([\s\S]*)\)\s*$/);
            if (piInner) {
                var innerExpr = piInner[1].trim();
                var rawVal = evalAssignRHS(innerExpr, env);
                var val = typeof rawVal === 'number' ? (rawVal >= 0 ? Math.floor(rawVal) : Math.ceil(rawVal)) : 0;
                setVar(target, val, env);
            } else {
                var val = evalAssignRHS(valueExpr, env);
                setVar(target, val, env);
            }
        } else {
            var val = evalAssignRHS(valueExpr, env);
            setVar(target, val, env);
        }
        return;
    }
    
    // 6. 自增/自减：i++, i--
    var incMatch = line.match(/^([a-zA-Z_]\w*)\s*\+\+$/);
    if (incMatch) {
        checkQid(incMatch[1]);
        var iv = resolveVar(incMatch[1], env);
        setVar(incMatch[1], iv + 1, env);
        return;
    }
    var decMatch = line.match(/^([a-zA-Z_]\w*)\s*--$/);
    if (decMatch) {
        checkQid(decMatch[1]);
        var dv = resolveVar(decMatch[1], env);
        setVar(decMatch[1], dv - 1, env);
        return;
    }
    
    // 7. 复合赋值：a+=1, a-=2
    var compMatch = line.match(/^([a-zA-Z_]\w*)\s*([+\-])=(.+)$/);
    if (compMatch) {
        var cv = resolveVar(compMatch[1], env);
        var delta = evalAssignRHS(compMatch[3].trim(), env);
        setVar(compMatch[1], compMatch[2] === '+' ? cv + delta : cv - delta, env);
        return;
    }
}

// ── 类型工具函数 ──

// 根据类型解析右侧表达式
function parseTypedValue(type, rhs, env) {
    rhs = rhs.trim();
    if (type === 'bool') {
        if (rhs === 'true') return true;
        if (rhs === 'false') return false;
        return false;
    }
    if (type === 'int') {
        if (rhs.indexOf('parseInt(') >= 0) {
            var pi = rhs.match(/parseInt\s*\(([\s\S]*)\)\s*$/);
            if (pi) {
                var raw = evalAssignRHS(pi[1].trim(), env);
                return typeof raw === 'number' ? (raw >= 0 ? Math.floor(raw) : Math.ceil(raw)) : 0;
            }
        }
        var v = evalAssignRHS(rhs, env);
        if (typeof v === 'number') return Math.round(v);
        return parseInt(v, 10) || 0;
    }
    if (type === 'float' || type === 'double') {
        var v = evalAssignRHS(rhs, env);
        if (typeof v === 'number') return v;
        return parseFloat(v) || 0.0;
    }
    if (type === 'char') {
        var v = parseStringLiteral(rhs, env);
        if (typeof v === 'string' && v.length > 0) return v[0];
        // 支持 int->char
        var n = parseInt(rhs, 10);
        if (!isNaN(n)) return String.fromCharCode(n);
        return '';
    }
    if (type === 'string') {
        return parseStringLiteral(rhs, env);
    }
    return evalAssignRHS(rhs, env);
}

// 解析字符串字面量或变量引用
function parseStringLiteral(str, env) {
    str = str.trim();
    // 带引号的字符串
    if ((str[0] === '"' && str[str.length-1] === '"') || (str[0] === "'" && str[str.length-1] === "'")) {
        return str.substring(1, str.length - 1);
    }
    // 变量
    if (/^[a-zA-Z_]\w*$/.test(str)) {
        return String(resolveVar(str, env));
    }
    // 拼接
    if (str.indexOf('+') >= 0) {
        var parts = smartSplitPlus(str);
        var result = '';
        for (var pi = 0; pi < parts.length; pi++) {
            var p = parts[pi].trim();
            if ((p[0] === '"' && p[p.length-1] === '"') || (p[0] === "'" && p[p.length-1] === "'")) {
                result += p.substring(1, p.length - 1);
            } else {
                result += String(evalAssignRHS(p, env));
            }
        }
        return result;
    }
    return str;
}

// 智能逗号分割（忽略引号内的逗号）
function splitSmartComma(str) {
    var result = [];
    var buf = '';
    var inStr = false;
    var strChar = '';
    for (var i = 0; i < str.length; i++) {
        var c = str[i];
        if ((c === '"' || c === "'") && !inStr) { inStr = true; strChar = c; buf += c; }
        else if (c === strChar && inStr) { inStr = false; strChar = ''; buf += c; }
        else if (c === ',' && !inStr) { result.push(buf); buf = ''; }
        else buf += c;
    }
    if (buf.trim()) result.push(buf);
    return result;
}

// 解析 print 参数：支持字符串拼接 'a='+a、'text'、a+b 等
function evalPrintArg(arg, env) {
    // 智能拼接：按 + 分割但避开引号内部的 +
    var parts = smartSplitPlus(arg);
    if (parts.length > 1) {
        // 检查是否有字符串字面量——有则走拼接，没有则走算术
        var hasString = false;
        for (var ci = 0; ci < parts.length; ci++) {
            var cp = parts[ci].trim();
            if ((cp[0] === '"' && cp[cp.length-1] === '"') || (cp[0] === "'" && cp[cp.length-1] === "'")) {
                hasString = true;
                break;
            }
        }
        if (!hasString) {
            // 纯算术：直接计算整个表达式
            return String(evalAssignRHS(arg, env));
        }
        // 字符串拼接模式
        var resultStr = '';
        for (var pi = 0; pi < parts.length; pi++) {
            var p = parts[pi].trim();
            if ((p[0] === '"' && p[p.length-1] === '"') || (p[0] === "'" && p[p.length-1] === "'")) {
                resultStr += p.substring(1, p.length - 1);
            } else {
                resultStr += String(evalAssignRHS(p, env));
            }
        }
        return resultStr;
    }
    // 纯字符串
    if ((arg[0] === '"' && arg[arg.length-1] === '"') || (arg[0] === "'" && arg[arg.length-1] === "'")) {
        return arg.substring(1, arg.length - 1);
    }
    // 变量或表达式
    return String(evalAssignRHS(arg, env));
}

// 智能按 + 分割：避开支引号内部的 +
function smartSplitPlus(str) {
    var result = [];
    var buf = '';
    var inStr = false;
    var strChar = '';
    for (var i = 0; i < str.length; i++) {
        var c = str[i];
        if ((c === '"' || c === "'") && !inStr) {
            inStr = true;
            strChar = c;
            buf += c;
        } else if (c === strChar && inStr) {
            inStr = false;
            strChar = '';
            buf += c;
        } else if (c === '+' && !inStr) {
            result.push(buf);
            buf = '';
        } else {
            buf += c;
        }
    }
    if (buf) result.push(buf);
    return result;
}

function executeBlock(block, env, outputs, startTime, answers, otherInputs, qs) {
    // 用分号分割多条语句，但要避开 {} 里的分号
    var stmts = smartSplit(block);
    for (var si = 0; si < stmts.length; si++) {
        var stmt = stmts[si].trim();
        if (!stmt) continue;
        if (Date.now() - startTime > TIMEOUT_MS) throw new Error('执行超时');
        executeStatement(stmt, env, outputs, startTime, answers, otherInputs, qs);
    }
}

// 智能分号分割：避开花括号 {} 内部
function smartSplit(code) {
    var result = [];
    var buf = '';
    var braceDepth = 0;
    for (var i = 0; i < code.length; i++) {
        var c = code[i];
        if (c === '{') braceDepth++;
        else if (c === '}') braceDepth--;
        if (c === ';' && braceDepth === 0) {
            result.push(buf);
            buf = '';
        } else {
            buf += c;
        }
    }
    if (buf.trim()) result.push(buf);
    return result;
}

// 处理 else if / else 链
function tryElseChain(rest, env, outputs, startTime, answers, otherInputs, qs) {
    rest = rest.trim();
    if (!rest) return;
    // else if(条件):{...}
    var elseIfMatch = rest.match(/^else\s+if\s*\(([^)]+)\)\s*:\s*\{([\s\S]*)\}(.*)$/);
    if (elseIfMatch) {
        var eifCond = elseIfMatch[1];
        var eifBody = elseIfMatch[2].trim();
        var eifRest = elseIfMatch[3].trim();
        if (evalIfCond(eifCond, env)) {
            executeBlock(eifBody, env, outputs, startTime, answers, otherInputs, qs);
        } else {
            tryElseChain(eifRest, env, outputs, startTime, answers, otherInputs, qs);
        }
        return;
    }
    // else:{...}
    var elseMatch = rest.match(/^else\s*:\s*\{([\s\S]*)\}$/);
    if (elseMatch) {
        executeBlock(elseMatch[1].trim(), env, outputs, startTime, answers, otherInputs, qs);
        return;
    }
}

// 智能按外层花括号分割：{1,2},{3,4} -> ["{1,2}", "{3,4}"]
function splitSmartCommaOuter(str) {
    var result = [];
    var buf = '';
    var depth = 0;
    for (var i = 0; i < str.length; i++) {
        var c = str[i];
        if (c === '{') depth++;
        else if (c === '}') depth--;
        if (c === ',' && depth === 0) {
            result.push(buf);
            buf = '';
        } else {
            buf += c;
        }
    }
    if (buf.trim()) result.push(buf);
    return result;
}
