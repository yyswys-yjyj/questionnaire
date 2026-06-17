// @ts-nocheck
// QLangInterpreter.ts — QLang v2 结果脚本引擎
// 支持入口函数 main()、作用域、注释、return、自定义函数（预留）

var QLANG_MAX_STACK_DEPTH = 100;
var QLANG_TIMEOUT_MS = 10000;
var QLANG_TOTAL_TIMEOUT_MS = 10000;
var QLANG_MAX_ARRAY_SIZE = 1000000;
var QLANG_MAX_VARS = 500;
var QLANG_MAX_2D_ARRAY = 100000;

// 从源代码去除注释
function removeQLangComments(code) {
    // 去除 // 单行注释
    code = code.replace(/\/\/.*$/gm, '');
    // 去除 /* */ 块注释
    code = code.replace(/\/\*[\s\S]*?\*\//g, '');
    return code;
}

// 分词器：将代码分割为 Token 流
function tokenize(code) {
    code = removeQLangComments(code);
    var tokens = [];
    var i = 0;
    var line = 1;
    while (i < code.length) {
        var c = code[i];
        // 跳过空白
        if (/\s/.test(c)) {
            if (c === '\n') line++;
            i++;
            continue;
        }
        // 字符串字面量
        if (c === '"' || c === "'") {
            var quote = c;
            var start = i;
            i++;
            while (i < code.length && code[i] !== quote) {
                if (code[i] === '\\' && i + 1 < code.length) i += 2;
                else i++;
            }
            if (i < code.length) i++;
            tokens.push({ type: 'string', value: code.substring(start, i), line: line });
            continue;
        }
        // 数字（支持 1e9、0x 十六进制、小数点）
        if (/[0-9]/.test(c) || (c === '.' && i + 1 < code.length && /[0-9]/.test(code[i + 1]))) {
            var start = i;
            if (code[i] === '0' && i + 1 < code.length && (code[i + 1] === 'x' || code[i + 1] === 'X')) {
                i += 2;
                while (i < code.length && /[0-9a-fA-F]/.test(code[i])) i++;
            } else {
                while (i < code.length && /[0-9.eE]/.test(code[i])) i++;
            }
            tokens.push({ type: 'number', value: code.substring(start, i), line: line });
            continue;
        }
        // $PHP风格变量名
        if (c === '$') {
            var start = i;
            i++;
            while (i < code.length && /[a-zA-Z0-9_]/.test(code[i])) i++;
            tokens.push({ type: 'phpVar', value: code.substring(start, i), line: line });
            continue;
        }
        // 标识符/关键字
        if (/[a-zA-Z_]/.test(c)) {
            var start = i;
            while (i < code.length && /[a-zA-Z0-9_]/.test(code[i])) i++;
            var word = code.substring(start, i);
            var keywords = { 'int': true, 'float': true, 'double': true, 'char': true, 'string': true, 'bool': true, 'true': true, 'false': true, 'if': true, 'else': true, 'while': true, 'for': true, 'return': true, 'void': true, 'const': true, 'break': true, 'continue': true, 'stack': true, 'queue': true, 'vector': true, 'pair': true, 'priority_queue': true };
            tokens.push({ type: keywords[word] ? 'keyword' : 'identifier', value: word, line: line });
            continue;
        }
        // 多字符操作符
        var twoChar = code.substring(i, i + 2);
        var twoOps = { '++': true, '--': true, '<<': true, '>>': true, '>=': true, '<=': true, '==': true, '!=': true, '&&': true, '||': true, '+=': true, '-=': true, '*=': true, '/=': true, '%=': true };
        if (twoOps[twoChar]) {
            tokens.push({ type: 'operator', value: twoChar, line: line });
            i += 2;
            continue;
        }
        // 单字符
        tokens.push({ type: 'symbol', value: c, line: line });
        i++;
    }
    return tokens;
}

// 解析器：从 Token 流构建 AST
// 顶层：查找函数定义
function parse(code) {
    var tokens = tokenize(code);
    var pos = 0;
    
    function peek() { return pos < tokens.length ? tokens[pos] : { type: 'eof', value: '' }; }
    function consume() { return pos < tokens.length ? tokens[pos++] : { type: 'eof', value: '' }; }
    function expect(type, value) {
        var t = consume();
        if (t.type !== type || (value !== undefined && t.value !== value)) {
            throw new ScriptError('第' + (t.line || '?') + '行: 期望 ' + (value || type) + '，得到 ' + t.value);
        }
        return t;
    }
    
    // 解析函数定义
    function parseFunction() {
        var returnType = consume().value; // 返回类型
        var name = expect('identifier').value;
        expect('symbol', '(');
        var params = [];
        while (peek().value !== ')') {
            var pType = consume().value;
            var pName = expect('identifier').value;
            params.push({ type: pType, name: pName });
            if (peek().value === ',') consume();
        }
        expect('symbol', ')');
        expect('symbol', '{');
        var body = parseBlock();
        return { type: 'function', returnType: returnType, name: name, params: params, body: body };
    }
    
    // 解析语句块
    function parseBlock() {
        var stmts = [];
        while (peek().value !== '}' && peek().type !== 'eof') {
            stmts.push(parseStatement());
        }
        if (peek().value === '}') consume();
        return stmts;
    }
    
    // 解析语句
    function parseStatement() {
        // 分号结尾的空语句
        if (peek().value === ';') { consume(); return { type: 'empty' }; }
        // 块
        if (peek().value === '{') {
            consume();
            var body = parseBlock();
            return { type: 'block', body: body };
        }
        // 变量声明（含 const）
        var typeKeywords = { 'int': true, 'float': true, 'double': true, 'char': true, 'string': true, 'bool': true, 'stack': true, 'queue': true, 'vector': true, 'pair': true, 'priority_queue': true };
        if (typeKeywords[peek().value] || (peek().value === 'const' && tokens[pos + 1] && typeKeywords[tokens[pos + 1].value])) {
            return parseVarDecl();
        }
        // PHP风格变量定义 $var = value
        if (peek().type === 'phpVar' && tokens[pos + 1] && tokens[pos + 1].value === '=') {
            return parsePhpVarDecl();
        }
        // 关键字
        if (peek().value === 'if') return parseIf();
        if (peek().value === 'while') return parseWhile();
        if (peek().value === 'for') return parseFor();
        if (peek().value === 'return') return parseReturn();
        if (peek().value === 'cout') return parseCout();
        if (peek().value === 'print') return parsePrint();
        if (peek().value === 'break') { consume(); expect('symbol', ';'); return { type: 'break' }; }
        if (peek().value === 'continue') { consume(); expect('symbol', ';'); return { type: 'continue' }; }
        // 表达式语句
        return parseExpressionStmt();
    }
    
    function parsePhpVarDecl() {
        var name = consume().value;
        consume(); // =
        var init = parseExpression();
        expect('symbol', ';');
        return { type: 'phpVarDecl', name: name, init: init };
    }
    
    function parseVarDecl() {
        var isConst = false;
        if (peek().value === 'const') { isConst = true; consume(); }
        var type = consume().value;
        var name = expect('identifier').value;
        var init = null;
        if (peek().value === '[') {
            // 数组声明
            consume();
            var sizeExpr1 = null;
            if (peek().value !== ']') {
                sizeExpr1 = parseExpression();
            }
            expect('symbol', ']');
            var sizeExpr2 = null;
            // 检测二维
            if (peek().value === '[') {
                consume();
                if (peek().value !== ']') {
                    sizeExpr2 = parseExpression();
                }
                expect('symbol', ']');
            }
            var initArr = null;
            var initStr = null;
            if (peek().value === '=') {
                consume();
                // char数组支持字符串字面量初始化
                if ((type === 'char' || type === 'string') && (peek().type === 'string')) {
                    initStr = consume().value;
                } else {
                    expect('symbol', '{');
                    initArr = parseArrayInit();
                }
            }
            expect('symbol', ';');
            if (sizeExpr2 !== null) {
                return { type: 'arrayDecl2D', varType: type, name: name, size1: sizeExpr1, size2: sizeExpr2, init: initArr, isConst: isConst };
            }
            return { type: 'arrayDecl', varType: type, name: name, size: sizeExpr1, init: initArr, initStr: initStr, isConst: isConst };
        }
        if (peek().value === '=') {
            consume();
            init = parseExpression();
        }
        expect('symbol', ';');
        return { type: 'varDecl', varType: type, name: name, init: init, isConst: isConst };
    }
    
    function parseArrayInit() {
        var values = [];
        while (peek().value !== '}') {
            if (peek().value === '{') {
                consume();
                values.push(parseArrayInit());
            } else {
                values.push(parseExpression());
            }
            if (peek().value === ',') consume();
        }
        expect('symbol', '}');
        return values;
    }
    
    function parseIf() {
        consume(); // 'if'
        expect('symbol', '(');
        var cond = parseExpression();
        expect('symbol', ')');
        var then = parseStatement();
        var elseStmt = null;
        if (peek().value === 'else') {
            consume();
            elseStmt = parseStatement();
        }
        return { type: 'if', cond: cond, then: then, else: elseStmt };
    }
    
    function parseWhile() {
        consume();
        expect('symbol', '(');
        var cond = parseExpression();
        expect('symbol', ')');
        var body = parseStatement();
        return { type: 'while', cond: cond, body: body };
    }
    
    function parseFor() {
        consume();
        expect('symbol', '(');
        var init = null;
        if (peek().value !== ';') {
            // for init 支持赋值：int i=0 / i=1 / $i=0
            if (peek().type === 'phpVar' && tokens[pos + 1] && tokens[pos + 1].value === '=') {
                var pName = consume().value;
                consume(); // =
                init = { type: 'phpVarDecl', name: pName, init: parseExpression() };
            } else if (peek().type === 'identifier' && tokens[pos + 1] && (tokens[pos + 1].value === '=' || tokens[pos + 1].value === '+=' || tokens[pos + 1].value === '-=')) {
                var iName = consume().value;
                var iOp = consume().value;
                init = { type: 'assign', name: iName, value: parseExpression() };
            } else {
                init = parseStatementPart();
            }
        }
        expect('symbol', ';');
        var cond = null;
        if (peek().value !== ';') cond = parseExpression();
        expect('symbol', ';');
        var inc = null;
        if (peek().value !== ')') {
            // 检测 inc 中的赋值
            if (peek().type === 'identifier' && tokens[pos + 1] && (tokens[pos + 1].value === '=' || tokens[pos + 1].value === '+=' || tokens[pos + 1].value === '-=')) {
                var incName = consume().value;
                var incOp = consume().value;
                inc = { type: 'forInc', name: incName, op: incOp, value: parseExpression() };
            } else {
                inc = parseExpression();
            }
        }
        expect('symbol', ')');
        var body = parseStatement();
        return { type: 'for', init: init, cond: cond, inc: inc, body: body };
    }
    
    function parseReturn() {
        consume();
        var value = null;
        if (peek().value !== ';') value = parseExpression();
        expect('symbol', ';');
        return { type: 'return', value: value };
    }
    
    function parseCout() {
        consume();
        expect('operator', '<<');
        var parts = [];
        while (peek().value !== ';') {
            if (peek().value === 'endl') {
                consume();
                parts.push({ type: 'endl' });
            } else {
                parts.push(parseExpression());
            }
            if (peek().value === '<<') consume();
        }
        expect('symbol', ';');
        return { type: 'cout', parts: parts };
    }
    
    function parsePrint() {
        consume();
        expect('symbol', '(');
        var args = [];
        while (peek().value !== ')') {
            args.push(parseExpression());
            if (peek().value === ',') consume();
        }
        expect('symbol', ')');
        expect('symbol', ';');
        return { type: 'print', args: args };
    }
    
    function parseStatementPart() {
        var typeKeywords = { 'int': true, 'float': true, 'double': true, 'char': true, 'string': true, 'bool': true, 'stack': true, 'queue': true, 'vector': true, 'pair': true, 'priority_queue': true };
        if (typeKeywords[peek().value]) {
            var type = consume().value;
            var name = expect('identifier').value;
            var init = null;
            if (peek().value === '=') { consume(); init = parseExpression(); }
            return { type: 'varDecl', varType: type, name: name, init: init };
        }
        return parseExpression();
    }
    
    function parseExpressionStmt() {
        // 检测赋值语句：identifier = expr 或 identifier[expr] = expr 或 identifier.member = expr
        if (peek().type === 'identifier' && tokens[pos + 1]) {
            var lookAhead = tokens[pos + 1].value;
            if (lookAhead === '[') {
                // 数组赋值：arr[idx] = expr
                var arrName = consume().value;
                consume(); // [
                var arrIdx = parseExpression();
                expect('symbol', ']');
                if (peek().value === '=' || peek().value === '+=' || peek().value === '-=') {
                    var arrOp = consume().value;
                    var arrVal = parseExpression();
                    expect('symbol', ';');
                    return { type: 'arrAssign', name: arrName, index: arrIdx, op: arrOp, value: arrVal };
                }
                // 不是赋值，回退
                pos = pos - 3; // 回退到 identifier
                var expr = parseExpression();
                expect('symbol', ';');
                return { type: 'expr', expr: expr };
            }
            if (lookAhead === '=' && tokens[pos + 2] && tokens[pos + 2].value !== '=') {
                var name = consume().value;
                consume(); // =
                var value = parseExpression();
                expect('symbol', ';');
                return { type: 'assign', name: name, value: value };
            }
            if (lookAhead === '+=' || lookAhead === '-=') {
                var name = consume().value;
                var op = consume().value;
                var value = parseExpression();
                expect('symbol', ';');
                return { type: 'compAssign', name: name, op: op, value: value };
            }
            // 成员赋值 obj.member = expr
            if (lookAhead === '.' && tokens[pos + 2] && tokens[pos + 3] && (tokens[pos + 3].value === '=')) {
                var objName = consume().value;
                consume(); // .
                var memberName = expect('identifier').value;
                consume(); // =
                var value = parseExpression();
                expect('symbol', ';');
                return { type: 'memberAssign', obj: objName, member: memberName, value: value };
            }
        }
        var expr = parseExpression();
        expect('symbol', ';');
        return { type: 'expr', expr: expr };
    }
    
    // 表达式解析
    function parseExpression() {
        return parseLogic();
    }
    
    function parseLogic() {
        var left = parseCompare();
        while (peek().value === '&&' || peek().value === '||') {
            var op = consume().value;
            var right = parseCompare();
            left = { type: 'binary', op: op, left: left, right: right };
        }
        return left;
    }
    
    var cmpOps = { '>': true, '<': true, '>=': true, '<=': true, '==': true, '!=': true };
    function parseCompare() {
        var left = parseAddSub();
        var op = peek().value;
        var nextOp = op + tokens[pos + 1]?.value || '';
        if (cmpOps[op] || cmpOps[nextOp]) {
            if (cmpOps[nextOp]) { op = nextOp; consume(); }
            consume();
            var right = parseAddSub();
            return { type: 'binary', op: op, left: left, right: right };
        }
        return left;
    }
    
    function parseAddSub() {
        var left = parseMulDiv();
        while (peek().value === '+' || peek().value === '-') {
            var op = consume().value;
            var right = parseMulDiv();
            left = { type: 'binary', op: op, left: left, right: right };
        }
        return left;
    }
    
    function parseMulDiv() {
        var left = parseUnary();
        while (peek().value === '*' || peek().value === '/' || peek().value === '%') {
            var op = consume().value;
            var right = parseUnary();
            left = { type: 'binary', op: op, left: left, right: right };
        }
        return left;
    }
    
    function parseUnary() {
        if (peek().value === '+' || peek().value === '-' || peek().value === '!') {
            var op = consume().value;
            return { type: 'unary', op: op, arg: parseUnary() };
        }
        return parsePrimary();
    }
    
    function parsePrimary() {
        var t = peek();
        // 数值
        if (t.type === 'number') {
            consume();
            return { type: 'number', value: t.value };
        }
        // 字符串
        if (t.type === 'string') {
            consume();
            return { type: 'string', value: t.value };
        }
        // true/false
        if (t.value === 'true' || t.value === 'false') {
            consume();
            return { type: 'bool', value: t.value === 'true' };
        }
        // $php变量
        if (t.type === 'phpVar') {
            consume();
            var name = t.value;
            // 只支持变量引用和数组访问
            if (peek().value === '[') {
                consume();
                var index = parseExpression();
                expect('symbol', ']');
                return { type: 'arrayAccess', name: name, index: index };
            }
            return { type: 'variable', name: name };
        }
        // 标识符（变量、函数调用、数组访问）
        if (t.type === 'identifier') {
            consume();
            var name = t.value;
            if (peek().value === '(') {
                // 函数调用
                consume();
                var args = [];
                while (peek().value !== ')') {
                    args.push(parseExpression());
                    if (peek().value === ',') consume();
                }
                expect('symbol', ')');
                return { type: 'call', name: name, args: args };
            }
            if (peek().value === '[') {
                consume();
                var index = parseExpression();
                expect('symbol', ']');
                // 支持二维 arr[i][j]
                if (peek().value === '[') {
                    consume();
                    var index2 = parseExpression();
                    expect('symbol', ']');
                    return { type: 'arrayAccess', name: name, index: index, index2: index2 };
                }
                return { type: 'arrayAccess', name: name, index: index };
            }
            // 点号成员访问/方法调用
            if (peek().value === '.') {
                consume();
                var member = expect('identifier').value;
                if (peek().value === '(') {
                    // 方法调用 s.push(x)
                    consume();
                    var args = [];
                    while (peek().value !== ')') {
                        args.push(parseExpression());
                        if (peek().value === ',') consume();
                    }
                    expect('symbol', ')');
                    return { type: 'methodCall', obj: name, method: member, args: args };
                }
                return { type: 'memberAccess', obj: name, member: member };
            }
            // 自增/自减
            if (peek().value === '++') { consume(); return { type: 'postInc', name: name }; }
            if (peek().value === '--') { consume(); return { type: 'postDec', name: name }; }
            return { type: 'variable', name: name };
        }
        // 括号表达式
        if (t.value === '(') {
            consume();
            var expr = parseExpression();
            expect('symbol', ')');
            return expr;
        }
        throw new ScriptError('第' + (t.line || '?') + '行: 意外的 token: ' + t.value);
    }
    
    // 顶层：搜索函数定义
    var functions = {};
    var globalStmts = [];
    while (peek().type !== 'eof') {
        var typeKw = { 'int': true, 'float': true, 'double': true, 'char': true, 'string': true, 'bool': true, 'void': true, 'stack': true, 'queue': true, 'vector': true, 'pair': true, 'priority_queue': true };
        if (typeKw[peek().value]) {
            var typeName = consume().value;
            var funcName = peek();
            if (funcName.type === 'identifier' && tokens[pos + 1] && tokens[pos + 1].value === '(') {
                // 这是函数定义
                pos--; // 回退 type
                var func = parseFunction();
                functions[func.name] = func;
            } else {
                // 全局变量声明
                pos--;
                var stmt = parseStatement();
                globalStmts.push(stmt);
            }
        } else {
            globalStmts.push(parseStatement());
        }
    }
    
    return { functions: functions, globalStmts: globalStmts };
}

// 脚本错误
function ScriptError(msg) {
    this.message = '脚本错误: ' + msg;
}
ScriptError.prototype = Object.create(Error.prototype);
ScriptError.prototype.constructor = ScriptError;

// 执行器
function execute(ast, answers, otherInputs, qs) {
    if (!ast.functions['main']) throw new ScriptError('未找到入口函数 main()');
    
    var globalEnv = {};
    globalEnv['__ast__'] = ast;
    globalEnv['__outputs__'] = [];
    globalEnv['__startTime__'] = Date.now();
    var outputs = globalEnv['__outputs__'];
    var startTime = globalEnv['__startTime__'];
    
    // 注入问卷答案
    for (var qid in answers) {
        var ans = answers[qid];
        if (typeof ans === 'string' || typeof ans === 'number') {
            globalEnv[qid] = ans;
            var numVal = parseInt(ans, 10);
            if (!isNaN(numVal)) globalEnv[qid] = numVal;
        }
        // 注入 .num 和 .text 独立变量
        var numVal2 = parseInt(ans, 10);
        var foundOption = false;
        // .text 映射：查找对应题目的选项映射
        if (qs && Array.isArray(qs)) {
            for (var qi = 0; qi < qs.length; qi++) {
                var q = qs[qi];
                if (q.id === qid && q.options && Array.isArray(q.options)) {
                    globalEnv[qid + '.options'] = q.options;
                    foundOption = true;
                    // 尝试按选项文本匹配
                    var optIdx = q.options.indexOf(String(ans));
                    if (optIdx >= 0) {
                        // 按选项文本匹配成功 -> num = 序号(1-indexed), text = 选项文本
                        globalEnv[qid + '.num'] = optIdx + 1;
                        globalEnv[qid + '.text'] = q.options[optIdx];
                    } else {
                        // 按数字索引匹配
                        var idx = parseInt(ans, 10);
                        if (!isNaN(idx) && idx >= 1 && idx <= q.options.length) {
                            globalEnv[qid + '.num'] = idx;
                            globalEnv[qid + '.text'] = q.options[idx - 1];
                        } else {
                            globalEnv[qid + '.num'] = isNaN(numVal2) ? 0 : numVal2;
                            globalEnv[qid + '.text'] = String(ans);
                        }
                    }
                    break;
                }
            }
        }
        if (!foundOption) {
            globalEnv[qid + '.num'] = isNaN(numVal2) ? 0 : numVal2;
            globalEnv[qid + '.text'] = String(ans);
        }
    }
    
    // 执行全局变量声明
    for (var gi = 0; gi < ast.globalStmts.length; gi++) {
        execStmt(ast.globalStmts[gi], globalEnv, outputs, startTime, 0);
    }
    
    // 调用 main
    callFunction(ast.functions['main'], [], globalEnv, outputs, startTime);
    
    return outputs;
}

function callFunction(func, args, globalEnv, outputs, startTime, depth) {
    if (depth === undefined) depth = 0;
    if (depth > QLANG_MAX_STACK_DEPTH) throw new ScriptError('栈溢出（超过' + QLANG_MAX_STACK_DEPTH + '层调用）');
    
    var localEnv = {};
    // 参数绑定
    for (var pi = 0; pi < func.params.length; pi++) {
        localEnv[func.params[pi].name] = pi < args.length ? evalExpr(args[pi], localEnv, globalEnv) : 0;
    }
    
    for (var si = 0; si < func.body.length; si++) {
        var result = execStmt(func.body[si], localEnv, outputs, startTime, depth, globalEnv);
        if (result && result.type === 'return') return result.value;
    }
    return 0;
}

function execStmt(stmt, env, outputs, startTime, depth, globalEnv) {
    if (Date.now() - startTime > QLANG_TOTAL_TIMEOUT_MS) throw new ScriptError('执行超时（超过10秒）');
    
    if (!stmt) return;
    
    switch (stmt.type) {
        case 'empty': return;
        case 'block':
            // 块作用域：记录执行前的变量列表
            var beforeKeys = {};
            for (var bk in env) beforeKeys[bk] = true;
            for (var bi = 0; bi < stmt.body.length; bi++) {
                var r = execStmt(stmt.body[bi], env, outputs, startTime, depth, globalEnv);
                if (r && r.type === 'return') return r;
            }
            // 清理块内新增的变量（块作用域隔离）
            for (var bk in env) {
                if (!(bk in beforeKeys)) delete env[bk];
            }
            return;
        case 'phpVarDecl':
            // $var = value → auto var = value
            env[stmt.name] = evalExpr(stmt.init, env, globalEnv || env);
            return;
        case 'varDecl':
            var val = stmt.init !== null ? evalExpr(stmt.init, env, globalEnv || env) : defaultValue(stmt.varType);
            env[stmt.name] = val;
            env['__const_' + stmt.name] = stmt.isConst ? true : false;
            return;
        case 'arrayDecl':
            var arr;
            if (stmt.initStr) {
                // 字符串字面量初始化 char s[] = "hello"
                var rawStr = stmt.initStr.substring(1, stmt.initStr.length - 1);
                var strLen = rawStr.length;
                var arrSize = stmt.size ? evalExpr(stmt.size, env, globalEnv || env) : (strLen + 1);
                if (typeof arrSize !== 'number' || arrSize <= 0 || arrSize > QLANG_MAX_ARRAY_SIZE) throw new ScriptError('数组大小无效');
                arr = new Array(arrSize);
                for (var si = 0; si < strLen && si < arrSize; si++) {
                    arr[si] = rawStr[si];
                }
                if (si < arrSize) arr[si] = '\0';
            } else {
                var size = stmt.size ? evalExpr(stmt.size, env, globalEnv || env) : (stmt.init ? stmt.init.length : 1);
                if (typeof size !== 'number' || size <= 0 || size > QLANG_MAX_ARRAY_SIZE) throw new ScriptError('数组大小无效');
                arr = new Array(size);
                if (stmt.init) {
                    for (var ai = 0; ai < stmt.init.length && ai < size; ai++) {
                        arr[ai] = evalExpr(stmt.init[ai], env, globalEnv || env);
                    }
                }
            }
            env[stmt.name] = arr;
            env['__const_' + stmt.name] = stmt.isConst ? true : false;
            return;
        case 'arrayDecl2D':
            var s1 = evalExpr(stmt.size1, env, globalEnv || env);
            var s2 = evalExpr(stmt.size2, env, globalEnv || env);
            if (typeof s1 !== 'number' || s1 <= 0 || typeof s2 !== 'number' || s2 <= 0 || s1 * s2 > QLANG_MAX_2D_ARRAY) throw new ScriptError('二维数组大小无效');
            var arr2 = new Array(s1);
            for (var di = 0; di < s1; di++) {
                arr2[di] = new Array(s2);
                if (stmt.init && di < stmt.init.length && Array.isArray(stmt.init[di])) {
                    for (var dj = 0; dj < s2 && dj < stmt.init[di].length; dj++) {
                        arr2[di][dj] = evalExpr(stmt.init[di][dj], env, globalEnv || env);
                    }
                }
            }
            env[stmt.name] = arr2;
            env['__const_' + stmt.name] = stmt.isConst ? true : false;
            return;
        case 'if':
            var condVal = evalExpr(stmt.cond, env, globalEnv || env);
            if (isTruthy(condVal)) {
                return execStmt(stmt.then, env, outputs, startTime, depth, globalEnv);
            } else if (stmt.else) {
                return execStmt(stmt.else, env, outputs, startTime, depth, globalEnv);
            }
            return;
        case 'while':
            var maxIter = 100000;
            var iter = 0;
            var whileStart = Date.now();
            while (isTruthy(evalExpr(stmt.cond, env, globalEnv || env))) {
                if (Date.now() - whileStart > 10000) throw new ScriptError('while 循环执行超时（超过10秒）');
                if (++iter > maxIter) throw new ScriptError('循环迭代超限（超过10万次）');
                var r = execStmt(stmt.body, env, outputs, startTime, depth, globalEnv);
                if (r && r.type === 'return') return r;
                if (r && r.type === 'break') break;
            }
            return;
        case 'for':
            var forEnv = Object.create(env);
            if (stmt.init) execStmt(stmt.init, forEnv, outputs, startTime, depth, globalEnv);
            var maxIter = 100000;
            var iter = 0;
            var forStart = Date.now();
            while (!stmt.cond || isTruthy(evalExpr(stmt.cond, forEnv, globalEnv || env))) {
                if (Date.now() - forStart > 10000) throw new ScriptError('for 循环执行超时（超过10秒）');
                if (++iter > maxIter) throw new ScriptError('循环迭代超限（超过10万次）');
                var r = execStmt(stmt.body, forEnv, outputs, startTime, depth, globalEnv);
                if (r && r.type === 'return') return r;
                if (r && r.type === 'break') break;
                if (r && r.type === 'continue') { /* 继续到下一轮 inc */ }
                if (stmt.inc) {
                    if (stmt.inc.type === 'forInc') {
                        var oldVal = forEnv[stmt.inc.name];
                        if (oldVal === undefined) oldVal = 0;
                        var delta = evalExpr(stmt.inc.value, forEnv, globalEnv || env);
                        if (stmt.inc.op === '=') forEnv[stmt.inc.name] = delta;
                        else if (stmt.inc.op === '+=') forEnv[stmt.inc.name] = oldVal + delta;
                        else if (stmt.inc.op === '-=') forEnv[stmt.inc.name] = oldVal - delta;
                    } else {
                        evalExpr(stmt.inc, forEnv, globalEnv || env);
                    }
                }
            }
            // 将 forEnv 中的变量同步回 env
            for (var fk in forEnv) {
                if (fk !== (stmt.init && stmt.init.name)) {
                    env[fk] = forEnv[fk];
                }
            }
            return;
        case 'break':
            return { type: 'break' };
        case 'continue':
            return { type: 'continue' };
        case 'return':
            var retVal = stmt.value !== null ? evalExpr(stmt.value, env, globalEnv || env) : 0;
            return { type: 'return', value: retVal };
        case 'cout':
            var result = '';
            for (var ci = 0; ci < stmt.parts.length; ci++) {
                var part = stmt.parts[ci];
                if (part.type === 'endl') { result += '\n'; continue; }
                var v = evalExpr(part, env, globalEnv || env);
                result += stringify(v);
            }
            outputs.push(result);
            return;
        case 'print':
            var parts = [];
            for (var pi = 0; pi < stmt.args.length; pi++) {
                parts.push(stringify(evalExpr(stmt.args[pi], env, globalEnv || env)));
            }
            outputs.push(parts.join(' '));
            return;
        case 'arrAssign':
            var arrV = env[stmt.name];
            if (!Array.isArray(arrV) && globalEnv) arrV = globalEnv[stmt.name];
            if (!Array.isArray(arrV)) throw new ScriptError('数组 "' + stmt.name + '" 未声明');
            if (env['__const_' + stmt.name] || (globalEnv && globalEnv['__const_' + stmt.name])) throw new ScriptError('不能修改 const 数组 "' + stmt.name + '"');
            var idxV = evalExpr(stmt.index, env, globalEnv || env);
            if (typeof idxV !== 'number') throw new ScriptError('数组索引必须为数字');
            var valV = evalExpr(stmt.value, env, globalEnv || env);
            if (stmt.op === '=') arrV[idxV] = valV;
            else if (stmt.op === '+=') arrV[idxV] = (arrV[idxV] || 0) + valV;
            else if (stmt.op === '-=') arrV[idxV] = (arrV[idxV] || 0) - valV;
            return;
        case 'memberAssign':
            // obj.member = value
            var targetObj = env[stmt.obj];
            if (targetObj === undefined && globalEnv) targetObj = globalEnv[stmt.obj];
            if (targetObj === undefined) throw new ScriptError('未定义的变量 "' + stmt.obj + '"');
            targetObj[stmt.member] = evalExpr(stmt.value, env, globalEnv || env);
            return;
        case 'assign':
            if (env['__const_' + stmt.name] || (globalEnv && globalEnv['__const_' + stmt.name])) throw new ScriptError('不能修改 const 变量 "' + stmt.name + '"');
            var av = evalExpr(stmt.value, env, globalEnv || env);
            env[stmt.name] = av;
            return;
        case 'compAssign':
            if (env['__const_' + stmt.name] || (globalEnv && globalEnv['__const_' + stmt.name])) throw new ScriptError('不能修改 const 变量 "' + stmt.name + '"');
            var old = env[stmt.name];
            if (old === undefined && globalEnv) old = globalEnv[stmt.name];
            if (old === undefined) throw new ScriptError('未定义的变量 "' + stmt.name + '"');
            var delta = evalExpr(stmt.value, env, globalEnv || env);
            var nv = stmt.op === '+=' ? old + delta : old - delta;
            env[stmt.name] = nv;
            return;
            return;
        case 'expr':
            return evalExpr(stmt.expr, env, globalEnv || env);
        default:
            throw new ScriptError('不支持的语句类型: ' + stmt.type);
    }
}

function evalExpr(expr, env, globalEnv) {
    if (!expr || typeof expr !== 'object') return expr;
    
    switch (expr.type) {
        case 'number':
            var n = parseFloat(expr.value);
            return isNaN(n) ? 0 : n;
        case 'string':
            var s = expr.value;
            return s.substring(1, s.length - 1);
        case 'bool':
            return expr.value;
        case 'variable':
            if (expr.name in env) return env[expr.name];
            if (globalEnv && expr.name in globalEnv) return globalEnv[expr.name];
            throw new ScriptError('未定义的变量 "' + expr.name + '"');
        case 'memberAccess':
            // 优先查独立变量名 obj.member（q1.num, q1.text 等）
            var compoundKey = expr.obj + '.' + expr.member;
            if (compoundKey in env) return env[compoundKey];
            if (globalEnv && compoundKey in globalEnv) return globalEnv[compoundKey];
            // 回退到对象属性访问
            var objVal = null;
            if (expr.obj in env) objVal = env[expr.obj];
            else if (globalEnv && expr.obj in globalEnv) objVal = globalEnv[expr.obj];
            if (objVal === null || objVal === undefined) throw new ScriptError('未定义的变量 "' + expr.obj + '"');
            return objVal[expr.member];
        case 'arrayAccess':
            var arr = env[expr.name];
            if (!Array.isArray(arr) && globalEnv) arr = globalEnv[expr.name];
            if (!Array.isArray(arr)) throw new ScriptError('数组 "' + expr.name + '" 未声明');
            var idx = evalExpr(expr.index, env, globalEnv);
            if (typeof idx !== 'number') throw new ScriptError('数组索引必须为数字');
            if (expr.index2) {
                var idx2 = evalExpr(expr.index2, env, globalEnv);
                if (typeof idx2 !== 'number') throw new ScriptError('数组索引必须为数字');
                if (!arr[idx] || !Array.isArray(arr[idx])) throw new ScriptError('二维数组索引越界');
                return arr[idx][idx2];
            }
            if (idx < 0 || idx >= arr.length) throw new ScriptError('数组索引 ' + idx + ' 越界（长度 ' + arr.length + '）');
            return arr[idx];
        case 'binary':
            var l = evalExpr(expr.left, env, globalEnv);
            var r = evalExpr(expr.right, env, globalEnv);
            if (expr.op === '+') {
                if (typeof l === 'string' || typeof r === 'string') return String(l) + String(r);
                return (typeof l === 'number' ? l : 0) + (typeof r === 'number' ? r : 0);
            }
            if (expr.op === '-') return (typeof l === 'number' ? l : 0) - (typeof r === 'number' ? r : 0);
            if (expr.op === '*') return (typeof l === 'number' ? l : 0) * (typeof r === 'number' ? r : 0);
            if (expr.op === '/') {
                if (r === 0) throw new ScriptError('除零错误');
                return Math.floor((typeof l === 'number' ? l : 0) / r);
            }
            if (expr.op === '%') {
                if (r === 0) throw new ScriptError('除零错误');
                return (typeof l === 'number' ? l : 0) % (typeof r === 'number' ? r : 0);
            }
            if (expr.op === '>') return l > r;
            if (expr.op === '<') return l < r;
            if (expr.op === '>=') return l >= r;
            if (expr.op === '<=') return l <= r;
            if (expr.op === '==') return l === r;
            if (expr.op === '!=') return l !== r;
            if (expr.op === '!') return !isTruthy(l);
            if (expr.op === '&&') return isTruthy(l) && isTruthy(r);
            if (expr.op === '||') return isTruthy(l) || isTruthy(r);
            throw new ScriptError('不支持的运算符: ' + expr.op);
        case 'unary':
            var arg = evalExpr(expr.arg, env, globalEnv);
            if (expr.op === '-') return -(typeof arg === 'number' ? arg : 0);
            if (expr.op === '+') return typeof arg === 'number' ? arg : 0;
            if (expr.op === '!') return !isTruthy(arg);
            throw new ScriptError('不支持的一元运算符: ' + expr.op);
        case 'postInc':
            var old = env[expr.name];
            if (old === undefined && globalEnv) old = globalEnv[expr.name];
            if (old === undefined) throw new ScriptError('未定义的变量 "' + expr.name + '"');
            if (expr.name in env) env[expr.name] = old + 1;
            else if (globalEnv && expr.name in globalEnv) globalEnv[expr.name] = old + 1;
            return old;
        case 'postDec':
            var old = env[expr.name];
            if (old === undefined && globalEnv) old = globalEnv[expr.name];
            if (old === undefined) throw new ScriptError('未定义的变量 "' + expr.name + '"');
            if (expr.name in env) env[expr.name] = old - 1;
            else if (globalEnv && expr.name in globalEnv) globalEnv[expr.name] = old - 1;
            return old;
        case 'call':
            // 内置函数
            if (expr.name === 'parseInt') {
                var v = evalExpr(expr.args[0], env, globalEnv);
                return typeof v === 'number' ? (v >= 0 ? Math.floor(v) : Math.ceil(v)) : 0;
            }
            if (expr.name === '_gcd') {
                var a = evalExpr(expr.args[0], env, globalEnv);
                var b = evalExpr(expr.args[1], env, globalEnv);
                if (typeof a !== 'number') a = 0;
                if (typeof b !== 'number') b = 0;
                a = Math.abs(a); b = Math.abs(b);
                while (b) { var t = b; b = a % b; a = t; }
                return a;
            }
            if (expr.name === 'sizeof') {
                // sizeof(var) — 数组返回长度，其他返回类型大小
                if (expr.args.length < 1) throw new ScriptError('sizeof 需要参数');
                var sv = evalExpr(expr.args[0], env, globalEnv);
                if (Array.isArray(sv)) return sv.length;
                if (typeof sv === 'string') return sv.length;
                if (typeof sv === 'number') return 8;
                if (typeof sv === 'boolean') return 1;
                return 0;
            }
            if (expr.name === 'size') {
                // size(var) — 调用 STL 容器的 .size() 或返回数组长度
                if (expr.args.length < 1) throw new ScriptError('size 需要参数');
                var sv2 = evalExpr(expr.args[0], env, globalEnv);
                if (sv2 && typeof sv2.size === 'function') return sv2.size();
                if (Array.isArray(sv2)) return sv2.length;
                if (typeof sv2 === 'string') return sv2.length;
                return 0;
            }
            if (expr.name === 'strlen') {
                // strlen(str) — char 数组或字符串长度
                if (expr.args.length < 1) throw new ScriptError('strlen 需要参数');
                var sl = evalExpr(expr.args[0], env, globalEnv);
                if (typeof sl === 'string') return sl.length;
                if (Array.isArray(sl)) {
                    // char 数组，遇到 \0 停止
                    var len = 0;
                    while (len < sl.length && sl[len] !== '\0') len++;
                    return len;
                }
                return 0;
            }
            if (expr.name === 'strcmp') {
                if (expr.args.length < 2) throw new ScriptError('strcmp 需要两个参数');
                var sa = String(evalExpr(expr.args[0], env, globalEnv));
                var sb = String(evalExpr(expr.args[1], env, globalEnv));
                if (sa < sb) return -1;
                if (sa > sb) return 1;
                return 0;
            }
            if (expr.name === 'strcpy') {
                if (expr.args.length < 2) throw new ScriptError('strcpy 需要两个参数');
                var dstName = expr.args[0];
                if (dstName.type !== 'variable') throw new ScriptError('strcpy 第一个参数必须是变量');
                var srcStr = String(evalExpr(expr.args[1], env, globalEnv));
                var dstArr = env[dstName.name];
                if (!Array.isArray(dstArr)) throw new ScriptError('strcpy 目标必须是数组');
                for (var sci = 0; sci < srcStr.length && sci < dstArr.length; sci++) {
                    dstArr[sci] = srcStr[sci];
                }
                if (sci < dstArr.length) dstArr[sci] = '\0';
                return dstArr;
            }
            // 自定义函数调用
            if (globalEnv && globalEnv['__ast__'] && globalEnv['__ast__'].functions && globalEnv['__ast__'].functions[expr.name]) {
                var funcArgs = [];
                for (var ai = 0; ai < expr.args.length; ai++) {
                    funcArgs.push(evalExpr(expr.args[ai], env, globalEnv));
                }
                return callFunction(
                    globalEnv['__ast__'].functions[expr.name],
                    funcArgs,
                    globalEnv,
                    globalEnv['__outputs__'],
                    globalEnv['__startTime__'],
                    (globalEnv['__depth__'] || 0) + 1
                );
            }
            throw new ScriptError('不认识的函数 "' + expr.name + '"');
        case 'methodCall':
            // 对象方法调用 obj.method(args)
            var objVal = null;
            if (expr.obj in env) objVal = env[expr.obj];
            else if (globalEnv && expr.obj in globalEnv) objVal = globalEnv[expr.obj];
            if (objVal === null || objVal === undefined) throw new ScriptError('未定义的变量 "' + expr.obj + '"');
            var method = objVal[expr.method];
            if (typeof method !== 'function') throw new ScriptError('对象 "' + expr.obj + '" 没有方法 "' + expr.method + '"');
            var methodArgs = [];
            for (var mai = 0; mai < expr.args.length; mai++) {
                methodArgs.push(evalExpr(expr.args[mai], env, globalEnv));
            }
            return method.apply(objVal, methodArgs);
        default:
            throw new ScriptError('不支持的表达式类型: ' + expr.type);
    }
}

function isTruthy(v) {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    return !!v;
}

function stringify(v) {
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    return String(v);
}

function defaultValue(type) {
    switch (type) {
        case 'int': return 0;
        case 'float':
        case 'double': return 0.0;
        case 'char':
        case 'string': return '';
        case 'bool': return false;
        case 'stack':
        case 'queue':
        case 'vector':
        case 'priority_queue':
            return createSTLObject(type);
        case 'pair':
            return { __stl_type: 'pair', first: 0, second: 0 };
        default: return 0;
    }
}

function createSTLObject(type) {
    switch (type) {
        case 'stack':
            var arr = [];
            return {
                __stl_type: 'stack',
                _data: arr,
                push: function(v) { if (arr.length >= 1000) throw new ScriptError('stack overflow (max 1000)'); arr.push(v); },
                pop: function() { if (arr.length === 0) throw new ScriptError('stack empty'); arr.pop(); },
                top: function() { if (arr.length === 0) throw new ScriptError('stack empty'); return arr[arr.length - 1]; },
                size: function() { return arr.length; },
                empty: function() { return arr.length === 0; }
            };
        case 'queue':
            var arr = [];
            return {
                __stl_type: 'queue',
                _data: arr,
                push: function(v) { if (arr.length >= 1000) throw new ScriptError('queue overflow (max 1000)'); arr.push(v); },
                pop: function() { if (arr.length === 0) throw new ScriptError('queue empty'); arr.shift(); },
                front: function() { if (arr.length === 0) throw new ScriptError('queue empty'); return arr[0]; },
                back: function() { if (arr.length === 0) throw new ScriptError('queue empty'); return arr[arr.length - 1]; },
                size: function() { return arr.length; },
                empty: function() { return arr.length === 0; }
            };
        case 'vector':
            var arr = [];
            return {
                __stl_type: 'vector',
                _data: arr,
                push_back: function(v) { arr.push(v); },
                pop_back: function() { if (arr.length === 0) throw new ScriptError('vector empty'); arr.pop(); },
                get: function(i) { if (i < 0 || i >= arr.length) throw new ScriptError('vector index out of range'); return arr[i]; },
                set: function(i, v) { if (i < 0 || i >= arr.length) throw new ScriptError('vector index out of range'); arr[i] = v; },
                size: function() { return arr.length; },
                empty: function() { return arr.length === 0; },
                clear: function() { arr.length = 0; }
            };
        case 'priority_queue':
            var arr = [];
            return {
                __stl_type: 'priority_queue',
                _data: arr,
                push: function(v) {
                    if (arr.length >= 1000) throw new ScriptError('priority_queue overflow (max 1000)');
                    arr.push(v);
                    // 大顶堆上浮
                    var i = arr.length - 1;
                    while (i > 0) {
                        var p = Math.floor((i - 1) / 2);
                        if (arr[p] >= arr[i]) break;
                        var t = arr[p]; arr[p] = arr[i]; arr[i] = t;
                        i = p;
                    }
                },
                pop: function() {
                    if (arr.length === 0) throw new ScriptError('priority_queue empty');
                    arr[0] = arr[arr.length - 1];
                    arr.pop();
                    // 大顶堆下沉
                    var i = 0;
                    var n = arr.length;
                    while (true) {
                        var largest = i;
                        var l = 2 * i + 1;
                        var r = 2 * i + 2;
                        if (l < n && arr[l] > arr[largest]) largest = l;
                        if (r < n && arr[r] > arr[largest]) largest = r;
                        if (largest === i) break;
                        var t = arr[i]; arr[i] = arr[largest]; arr[largest] = t;
                        i = largest;
                    }
                },
                top: function() { if (arr.length === 0) throw new ScriptError('priority_queue empty'); return arr[0]; },
                size: function() { return arr.length; },
                empty: function() { return arr.length === 0; }
            };
        default:
            return {};
    }
}

// 主入口
export function executeQLang(resultCodeStr, answers, otherInputs, qs) {
    try {
        var ast = parse(resultCodeStr);
        var outputs = execute(ast, answers, otherInputs, qs);
        if (outputs.length > 0) {
            return '\n\n── 结果 ──\n' + outputs.join('\n');
        }
        return '';
    } catch (e) {
        if (e instanceof ScriptError) {
            throw e;
        }
        throw new ScriptError(String(e.message || e));
    }
}
