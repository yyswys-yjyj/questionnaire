// QCRuntime — QinitCode 执行器
// @ts-nocheck

import { QCError } from './QCError';

var builtinHandlers = {};

var runtimeState = {
    vars: {}, arrs: {}, funcs: {}, callbacks: {},
    questions: {}, qinitData: {}, ansers: {},
    events: {}, callStack: [], outputs: [],
};

function regBuiltin(name, handler) {
    builtinHandlers['@' + name] = handler;
}

// === 内置事件实现 ===

regBuiltin('SetCallBackName', function(args, namedArgs, block, state) {
    var name = args[0];
    if (typeof name !== 'string') throw new QCError('SetCallBackName 需要字符串参数');
    if (state.callbacks[name]) throw new QCError('重复的 SetCallBackName: ' + name);
    state.callbacks[name] = true;
    return true;
});

regBuiltin('RunFunc', function(args, namedArgs, block, state) {
    var name = args[0];
    if (!name || typeof name !== 'string') throw new QCError('RunFunc 需要函数名');
    var func = state.funcs[name];
    if (!func) throw new QCError('未定义的函数: ' + name);
    if (state.callStack.indexOf(name) >= 0) throw new QCError('不允许递归调用: ' + name);
    state.callStack.push(name);
    try {
        // 创建函数执行作用域，绑定参数
        var funcState = createSubState(state);
        if (func.params) {
            for (var pi = 0; pi < func.params.length; pi++) {
                var p = func.params[pi];
                var pv = pi + 1 < args.length ? args[pi + 1] : null;
                if (p.isRef) {
                    // 引用传参：存变量名，写回时用
                    funcState.vars[p.name] = pv;
                    funcState.__refs__[p.name] = pi + 1;
                } else {
                    funcState.vars[p.name] = pv;
                }
            }
        }
        return runBlock(func.body, funcState);
    } finally {
        state.callStack.pop();
    }
});

regBuiltin('RunQLangCode', function(args, namedArgs, block, state) {
    // 将 namedArgs 中的 Send 参数映射到 block (QLang 代码段) 的变量
    // 实际 QLang 执行由外部集成，这里只做桩
    var sendParams = namedArgs['Send'] || {};
    var returnVar = namedArgs['Return'] || null;
    var collectFunc = namedArgs['CollectFunc'] || 'main';
    
    // 如果有 block (QLang 代码段)，将其存储到 events 中供外部执行
    if (block) {
        state.events['__qlang__'] = {
            sendParams: sendParams,
            returnVar: returnVar,
            collectFunc: collectFunc,
            code: block,
        };
    }
    
    // 标记运行状态
    state.events['__qlang_status__'] = 'pending';
    
    return true;
});

regBuiltin('CallBackReturn', function(args, namedArgs, block, state) {
    return { type: 'return', value: args[0] };
});

regBuiltin('EventRestart', function(args, namedArgs, block, state) {
    return true;
});

regBuiltin('GetEventInfo', function(args, namedArgs, block, state) {
    var source = args[0];
    var field = args[1];
    if (field === 'result') return state.ansers['__current__'] || [];
    if (field === 'status') return true;
    if (field && typeof field === 'string' && field.indexOf('result->') === 0) {
        return state.vars[field.substring(8)] || null;
    }
    if (field === 'size') {
        if (Array.isArray(source)) return source.length;
        if (typeof source === 'string') return source.length;
        return 0;
    }
    return null;
});

regBuiltin('SearchQuestionID', function(args, namedArgs, block, state) {
    var title = args[0], type = args[1];
    if (state.__questionMap__) {
        for (var key in state.__questionMap__) {
            var q = state.__questionMap__[key];
            if (q.title === title && (!type || q.type === type)) return key;
        }
    }
    return null;
});

regBuiltin('GetAllCustomComponentInUse', function(args, namedArgs, block, state) {
    return Object.keys(state.questions);
});

regBuiltin('QinitSet', function(args, namedArgs, block, state) {
    state.qinitData[args[0]] = args.length > 1 ? args[1] : null;
    return true;
});

regBuiltin('SetQName', function(args, namedArgs, block, state) {
    state.__qname__ = args[0];
    if (!state.__qname__ || typeof state.__qname__ !== 'string') throw new QCError('SetQName 需要字符串参数');
    return true;
});

regBuiltin('ComponentDef', function(args, namedArgs, block, state) {
    state.__componentDef__ = args[0] || {};
    return true;
});

regBuiltin('ComponentSet', function(args, namedArgs, block, state) {
    // ComponentSet 是容器，直接在父状态上执行 block
    if (block) {
        for (var csi = 0; csi < block.length; csi++) {
            var rc = execStmt(block[csi], state);
            if (rc && rc.type === 'return') return rc;
            if (rc && rc.type === 'anserReturn') return rc;
        }
    }
    return true;
});

regBuiltin('RegAnserTool', function(args, namedArgs, block, state) {
    state.__anserTool__ = {
        apiSpec: args[0] || {},
        fieldName: args[1] || null,
        receiverSpec: args[2] || null,
        handler: block || null,
    };
    return true;
});

regBuiltin('AnserEventReturn', function(args, namedArgs, block, state) {
    state.__anserResult__ = args[0];
    return { type: 'anserReturn', value: args[0] };
});

regBuiltin('StringFormat', function(args, namedArgs, block, state) {
    var arr = args[0];
    var sep = args[1] || ' ';
    return Array.isArray(arr) ? arr.join(sep) : String(arr);
});

regBuiltin('join', function(args, namedArgs, block, state) {
    return args[0] || ' ';
});

regBuiltin('len', function(args, namedArgs, block, state) {
    var v = args[0];
    if (Array.isArray(v)) return v.length;
    if (typeof v === 'string') return v.length;
    return 0;
});

regBuiltin('typeOf', function(args, namedArgs, block, state) {
    var v = args[0];
    if (v === null || v === undefined) return 'null';
    if (Array.isArray(v)) return 'array';
    return typeof v;
});

regBuiltin('toString', function(args) { return String(args[0] !== undefined ? args[0] : ''); });
regBuiltin('toInt', function(args) { return parseInt(args[0]) || 0; });
regBuiltin('toBool', function(args) { return !!args[0]; });
regBuiltin('throw', function(args) { throw new QCError(String(args[0] || 'throw')); });
regBuiltin('log', function(args, namedArgs, block, state) {
    state.outputs.push(String(args[0] || ''));
    return true;
});

// === 表达式求值 ===

function evalExpr(expr, state) {
    if (!expr || typeof expr !== 'object') return expr;
    // 纯 JS 对象（非 AST 节点，如 JSON 解析结果）直接返回
    if (!expr.type) return expr;
    switch (expr.type) {
        case 'number': return parseFloat(expr.value);
        case 'string': return expr.value ? expr.value.substring(1, expr.value.length - 1) : '';
        case 'char': return expr.value ? expr.value.charAt(1) : '';
        case 'bool': return expr.value;
        case 'null': return null;
        case 'variable': return state.vars[expr.name] !== undefined ? state.vars[expr.name] : null;
        case 'memberAccess':
            var obj = state.vars[expr.obj];
            return (obj && typeof obj === 'object') ? obj[expr.member] : null;
        case 'receiver':
            return expr;
        case 'arrExpr':
            var src = evalExpr(expr.expr, state);
            if (Array.isArray(src)) return src;
            if (src && typeof src === 'object') return Object.values(src);
            return [src];
        case 'unary':
            var v = evalExpr(expr.arg, state);
            if (expr.op === '-') return -v;
            if (expr.op === '!') return !v;
            return v;
        case 'binary':
            var l = evalExpr(expr.left, state);
            var r = evalExpr(expr.right, state);
            switch (expr.op) {
                case '+': return (l||0) + (r||0); case '-': return (l||0) - (r||0);
                case '*': return (l||0) * (r||0); case '/': return (l||0) / (r||0);
                case '%': return (l||0) % (r||0);
                case '==': return l == r; case '!=': return l != r;
                case '<': return l < r; case '>': return l > r;
                case '<=': return l <= r; case '>=': return l >= r;
                case '&&': return l && r; case '||': return l || r;
            }
            return 0;
        case 'ternary':
            return evalExpr(expr.cond, state) ? evalExpr(expr.trueExpr, state) : evalExpr(expr.falseExpr, state);
        case 'call':
            var handler = builtinHandlers[expr.name];
            if (handler) {
                return handler(expr.args.map(function(a) { return evalExpr(a, state); }), {}, null, state);
            }
            throw new QCError('未定义的事件: ' + expr.name);
        case 'atCall': return execAtCall(expr, state);
        case 'identifier':
            // 尝试作为变量名查找
            if (state.vars[expr.value] !== undefined) return state.vars[expr.value];
            return expr.value;
        default: return expr.value !== undefined ? expr.value : null;
    }
}

function execAtCall(stmt, state) {
    var handler = builtinHandlers[stmt.name];
    if (!handler) throw new QCError('未定义的事件: ' + stmt.name);
    var args = stmt.args.map(function(a) { return evalExpr(a, state); });
    if (stmt.block) {
        var subState = createSubState(state);
        var result = handler(args, stmt.namedArgs, stmt.block, subState);
        // 回写子状态的关键字段到父状态
        if (subState.__qname__ != null) state.__qname__ = subState.__qname__;
        if (subState.__componentDef__ != null) state.__componentDef__ = subState.__componentDef__;
        if (subState.__anserTool__ != null) state.__anserTool__ = subState.__anserTool__;
        if (subState.__anserResult__ != null) state.__anserResult__ = subState.__anserResult__;
        if (result && result.type === 'anserReturn') state.__anserResult__ = result.value;
        return result;
    }
    return handler(args, stmt.namedArgs, null, state);
}

function createSubState(parent) {
    return {
        vars: {}, arrs: {}, funcs: parent.funcs, callbacks: parent.callbacks,
        questions: parent.questions, qinitData: parent.qinitData,
        ansers: parent.ansers, events: parent.events,
        callStack: parent.callStack, outputs: parent.outputs,
        __questionMap__: parent.__questionMap__,
        __qname__: null, __componentDef__: null, __refs__: {}, __parent__: parent,
        __anserTool__: null, __anserResult__: null, __i__: 0,
    };
}

function execStmt(stmt, state) {
    if (!stmt) return;
    switch (stmt.type) {
        case 'empty': return;
        case 'block':
            for (var bi = 0; bi < stmt.body.length; bi++) {
                var r = execStmt(stmt.body[bi], state);
                if (r && (r.type === 'return' || r.type === 'break' || r.type === 'continue' || r.type === 'anserReturn')) return r;
            }
            return;
        case 'assign': state.vars[stmt.name] = evalExpr(stmt.value, state); return;
        case 'arrAssign': state.arrs[stmt.name] = evalExpr(stmt.value, state); return;
        case 'compAssign':
            var old = state.vars[stmt.name] || 0;
            var delta = evalExpr(stmt.value, state);
            state.vars[stmt.name] = stmt.op === '+=' ? old + delta : old - delta;
            return;
        case 'expr': evalExpr(stmt.expr, state); return;
        case 'if':
            if (evalExpr(stmt.cond, state)) return execStmt(stmt.then, state);
            else if (stmt.else) return execStmt(stmt.else, state);
            return;
        case 'while':
            var maxIter = 100000, iter = 0;
            while (evalExpr(stmt.cond, state)) {
                if (++iter > maxIter) throw new QCError('while 循环超限');
                var rw = execStmt(stmt.body, state);
                if (rw && rw.type === 'return') return rw;
                if (rw && rw.type === 'break') break;
            }
            return;
        case 'for':
            var forState = createSubState(state);
            if (stmt.init) execStmt(stmt.init, forState);
            var maxF = 100000, iterF = 0;
            while (!stmt.cond || evalExpr(stmt.cond, forState)) {
                if (++iterF > maxF) throw new QCError('for 循环超限');
                var rf = execStmt(stmt.body, forState);
                if (rf && rf.type === 'return') return rf;
                if (rf && rf.type === 'break') break;
                if (stmt.inc) evalExpr(stmt.inc, forState);
            }
            return;
        case 'forRange':
            var start = evalExpr(stmt.start, state);
            var end = evalExpr(stmt.end, state);
            var maxR = 100000, iterR = 0;
            for (var i = start; i <= end; i++) {
                if (++iterR > maxR) throw new QCError('for 循环超限');
                state.vars['__i__'] = i;
                var rr = execStmt(stmt.body, state);
                if (rr && rr.type === 'return') return rr;
                if (rr && rr.type === 'break') break;
            }
            return;
        case 'break': return { type: 'break' };
        case 'continue': return { type: 'continue' };
        case 'atCall': return execAtCall(stmt, state);
        case 'qinit': return runBlock(stmt.body, state);
        case 'regfunc': {
            var cbState = createSubState(state);
            runBlock(stmt.body, cbState);
            var cbNames = Object.keys(cbState.callbacks);
            var funcName = cbNames.length > 0 ? cbNames[0] : '__anon_' + Math.random().toString(36).substring(2, 8);
            state.funcs[funcName] = { returnType: stmt.returnType, params: stmt.params, body: stmt.body };
            return;
        }
        case 'regQuestion': {
            var qSubState = createSubState(state);
            runBlock(stmt.body, qSubState);
            if (!qSubState.__qname__) throw new QCError('RegQuestion 缺少 SetQName');
            state.questions[qSubState.__qname__] = {
                name: qSubState.__qname__,
                componentDef: qSubState.__componentDef__ || {},
                anserTool: qSubState.__anserTool__ || null,
            };
            return;
        }
        default: throw new QCError('不支持的语句: ' + stmt.type);
    }
}

function runBlock(body, state) {
    for (var si = 0; si < body.length; si++) {
        var r = execStmt(body[si], state);
        if (r && r.type === 'return') return r.value;
        if (r && r.type === 'anserReturn') return r.value;
    }
    return null;
}

export function execBlock(body, ansVal) {
    var state = {
        vars: { '$ans': ansVal },
        arrs: {}, funcs: {}, callbacks: {}, questions: {}, qinitData: {}, ansers: {}, events: {},
        callStack: [], outputs: [],
        __questionMap__: {}, __qname__: null, __componentDef__: null, __refs__: {}, __parent__: null,
        __anserTool__: null, __anserResult__: null, __i__: 0
    };
    return runBlock(body, state);
}

export function resetRuntime() {
    runtimeState = { vars: {}, arrs: {}, funcs: {}, callbacks: {}, questions: {}, qinitData: {}, ansers: {}, events: {}, callStack: [], outputs: [] };
}

export function executeQinitCode(ast, options) {
    resetRuntime();
    var state = runtimeState;
    if (options) {
        if (options.questionMap) state.__questionMap__ = options.questionMap;
        if (options.initialVars) { for (var k in options.initialVars) state.vars[k] = options.initialVars[k]; }
    }
    var result = runBlock(ast.body, state);
    return { qinitData: state.qinitData, questions: state.questions, outputs: state.outputs, result: result, vars: state.vars };
}

export function getRuntimeState() { return runtimeState; }
