// QLang v2.1 — 地址表 + 作用域链 + 指针
// @ts-nocheck

var QLANG_MAX_STACK_DEPTH = 5000;
var QLANG_TIMEOUT_MS = 10000;
var QLANG_TOTAL_TIMEOUT_MS = 10000;
var QLANG_MAX_ARRAY_SIZE = 5000000;
var QLANG_MAX_VARS = 500;
var QLANG_MAX_2D_ARRAY = 1000000;
var QLANG_MEMORY_SIZE = 268435456;

// 内存表
var QLANG_MEMORY = new Array(QLANG_MEMORY_SIZE);
var QLANG_NEXT_ADDR = 1;
var QLANG_SCOPE_ID = 0;

function allocAddr() {
    if (QLANG_NEXT_ADDR >= QLANG_MEMORY_SIZE) throw new ScriptError("内存空间超限");
    return QLANG_NEXT_ADDR++;
}

// 作用域节点
function createScope(parent) {
    return { id: QLANG_SCOPE_ID++, parent: parent, vars: {} };
}

function declareVar(scope, name, value, type, isConst) {
    var addr = allocAddr();
    QLANG_MEMORY[addr] = value;
    scope.vars[name] = { addr: addr, type: type, isConst: !!isConst };
    return addr;
}

function declareArray(scope, name, size, type, initFn) {
    var addr = allocAddr();
    var arr = new Array(size);
    var dv = defaultValue(type);
    for (var _i = 0; _i < size; _i++) arr[_i] = initFn ? initFn(_i) : dv;
    QLANG_MEMORY[addr] = arr;
    scope.vars[name] = { addr: addr, type: type + "[]", isConst: false };
    return addr;
}

function findVar(scope, name) {
    var s = scope;
    while (s) {
        if (s.vars[name] !== undefined) return { info: s.vars[name], scope: s };
        s = s.parent;
    }
    return null;
}

function getVar(scope, name) {
    var found = findVar(scope, name);
    if (!found) throw new ScriptError("未定义: " + name);
    return QLANG_MEMORY[found.info.addr];
}

function setVar(scope, name, value) {
    var found = findVar(scope, name);
    if (!found) { declareVar(scope, name, value, "auto", false); return; }
    if (found.info.isConst) throw new ScriptError("不能修改 const: " + name);
    QLANG_MEMORY[found.info.addr] = value;
}

function addrOf(scope, name) {
    var found = findVar(scope, name);
    if (!found) throw new ScriptError("未定义: " + name);
    return found.info.addr;
}

function ScriptError(msg) {
    this.name = "ScriptError";
    this.message = msg;
}
ScriptError.prototype = new Error();

// ===== Tokenizer + Parser =====
// @ts-nocheck

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
            var keywords = { 'int': true, 'float': true, 'double': true, 'char': true, 'string': true, 'bool': true, 'true': true, 'false': true, 'if': true, 'else': true, 'while': true, 'for': true, 'return': true, 'void': true, 'const': true, 'break': true, 'continue': true, 'stack': true, 'queue': true, 'vector': true, 'pair': true, 'priority_queue': true, 'struct': true, 'new': true };
            tokens.push({ type: keywords[word] ? 'keyword' : 'identifier', value: word, line: line });
            continue;
        }
        // 多字符操作符
        var twoChar = code.substring(i, i + 2);
        var twoOps = { '++': true, '--': true, '<<': true, '>>': true, '>=': true, '<=': true, '==': true, '!=': true, '&&': true, '||': true, '+=': true, '-=': true, '*=': true, '/=': true, '%=': true, '->': true };
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
    var structTypeNames = {}; // 已注册的结构体类型名
    
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
    
    // 解析结构体定义 struct Name { type field; ... }
    function parseStructDef() {
        consume(); // struct
        var name = expect('identifier').value;
        structTypeNames[name] = true; // 注册结构体类型名
        expect('symbol', '{');
        var fields = [];
        while (peek().value !== '}') {
            var ft = consume().value; // field type
            var fn = expect('identifier').value;
            expect('symbol', ';');
            fields.push({ type: ft, name: fn });
        }
        expect('symbol', '}');
        expect('symbol', ';');
        return { type: 'structDef', structName: name, fields: fields };
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
        // 变量声明或函数定义（函数定义优先检测）
        var typeKeywords = { 'int': true, 'float': true, 'double': true, 'char': true, 'string': true, 'bool': true, 'stack': true, 'queue': true, 'vector': true, 'pair': true, 'priority_queue': true };
        // 检测函数定义：类型/vod + 标识符 + ( 或 类型/vod + 标识符 + 类型 + 标识符 + (
        var isFuncDef = false;
        // 辅助：查找从 p 开始第一个 ( 的位置，且中间只有合法的参数声明（类型+名称，逗号分隔）
        function looksLikeFunc(p) {
            var i = p;
            if (peek().value === 'void') { i += 1; } else { i += 2; } // 跳过返回类型+函数名，或者 void+函数名
            // 现在应该遇到 ( 或者参数类型
            if (i < tokens.length && tokens[i].value === '(') return true;
            // 如果遇到 = 或 ; 则不是函数定义
            while (i < tokens.length && tokens[i].value !== '(' && tokens[i].value !== '{' && tokens[i].value !== ';' && tokens[i].value !== '=') {
                i++;
            }
            return i < tokens.length && tokens[i].value === '(';
        }
        if (peek().value === 'void' || typeKeywords[peek().value]) {
            if (tokens[pos + 1] && tokens[pos + 1].type === 'identifier' && looksLikeFunc(pos)) {
                isFuncDef = true;
            }
        }
        if (isFuncDef) {
            return parseFunction();
        }
        if (typeKeywords[peek().value] || (peek().value === 'const' && tokens[pos + 1] && typeKeywords[tokens[pos + 1].value])) {
            return parseVarDecl();
        }
        // 结构体指针变量声明 Node* name
        if (peek().type === 'identifier' && tokens[pos + 1] && tokens[pos + 1].value === '*' && tokens[pos + 2] && tokens[pos + 2].type === 'identifier') {
            return parseStructPtrDecl();
        }
        // 结构体变量声明 Node name（不带指针）
        if (peek().type === 'identifier' && tokens[pos + 1] && tokens[pos + 1].type === 'identifier' && structTypeNames[peek().value]) {
            return parseStructPtrDecl(false);
        }
        // 结构体定义 struct Name { ... }
        if (peek().value === 'struct') {
            return parseStructDef();
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
    
    // 结构体变量声明 Node* name 或 Node name（isPtr参数）
    function parseStructPtrDecl(isPtr) {
        if (isPtr === undefined) isPtr = true;
        var typeName = consume().value; // Node
        if (isPtr) consume(); // 消耗 *
        var name = expect('identifier').value;
        var init = null;
        if (peek().value === '=') { consume(); init = parseExpression(); }
        expect('symbol', ';');
        return { type: 'varDecl', varType: typeName + (isPtr ? '*' : ''), name: name, init: init, isConst: false };
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
            // 箭头成员赋值 ptr->member = expr
            if (tokens[pos + 1] && tokens[pos + 1].type === 'operator' && tokens[pos + 1].value === '->' && tokens[pos + 2] && tokens[pos + 3] && tokens[pos + 3].value === '=') {
                var ptrName = consume().value;
                consume(); // ->
                var arrowMember = expect('identifier').value;
                consume(); // =
                var value = parseExpression();
                expect('symbol', ';');
                return { type: 'arrowAssign', ptr: ptrName, member: arrowMember, value: value };
            }
        }
        // 括号表达式赋值 (*ptr).member = expr
        if (peek().value === '(') {
            var savedPos = pos;
            consume();
            if (peek().value === '*') {
                consume();
                if (peek().type === 'identifier') {
                    var derefName = consume().value;
                    if (peek().value === ')') {
                        consume();
                        if (peek().value === '.' && tokens[pos + 1] && tokens[pos + 2] && tokens[pos + 2].value === '=') {
                            consume(); // .
                            var memberName = expect('identifier').value;
                            consume(); // =
                            var value = parseExpression();
                            expect('symbol', ';');
                            return { type: 'derefAssign', ptrName: derefName, member: memberName, value: value };
                        }
                    }
                }
            }
            // 不匹配则回退
            pos = savedPos;
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
        while (peek().value === '&&' || peek().value === '||' || peek().value === 'and' || peek().value === 'or') {
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
        // 前缀 ++/--
        if (peek().value === '++') {
            consume();
            var id = expect('identifier').value;
            return { type: 'unary', op: '++', arg: { type: 'variable', name: id } };
        }
        if (peek().value === '--') {
            consume();
            var id2 = expect('identifier').value;
            return { type: 'unary', op: '--', arg: { type: 'variable', name: id2 } };
        }
        // 取地址 &var
        if (peek().value === '&') {
            consume();
            var id = expect('identifier').value;
            return { type: 'addrOf', name: id };
        }
        // 解引用 *ptr
        if (peek().value === '*') {
            consume();
            return { type: 'deref', expr: parseUnary() };
        }
        return parsePrimary();
    }
    
    function parsePrimary() {
        var t = peek();
        // new 表达式: new Type 或 new Type(args...)
        if (t.value === 'new') {
            consume();
            var typeName = consume().value;
            var cArgs = [];
            if (peek().value === '(') {
                consume();
                while (peek().value !== ')') {
                    cArgs.push(parseExpression());
                    if (peek().value === ',') consume();
                }
                expect('symbol', ')');
            }
            return { type: 'newExpr', structType: typeName, args: cArgs };
        }
        // 数值
        if (t.type === 'number') {
            consume();
            return { type: 'number', value: t.value };
        }
        // 字符串
        if (t.type === 'string') {
            consume();
            var raw = t.value;
            var s = raw.substring(1, raw.length - 1);
            // 转义
            s = s.replace(/\\n/g, '\n');
            s = s.replace(/\\t/g, '\t');
            s = s.replace(/\\\\\\\\/g, '\\\\');
            s = s.replace(/\\\\\"/g, '\"');
            s = s.replace(/\\'/g, "'");
            return { type: 'string', value: s };
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
            // 箭头成员访问 ptr->field
            if (peek().value === '->') {
                consume();
                var arrowMember = expect('identifier').value;
                if (peek().value === '(') {
                    consume();
                    var aArgs = [];
                    while (peek().value !== ')') {
                        aArgs.push(parseExpression());
                        if (peek().value === ',') consume();
                    }
                    expect('symbol', ')');
                    return { type: 'arrowCall', ptr: name, method: arrowMember, args: aArgs };
                }
                return { type: 'arrowAccess', ptr: name, member: arrowMember };
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
            // 括号表达式后的后缀 .member 或 ->member 或 [index]
            if (peek().value === '.') {
                consume();
                var dotMember = expect('identifier').value;
                if (peek().value === '(') {
                    consume(); var dArgs = [];
                    while (peek().value !== ')') { dArgs.push(parseExpression()); if (peek().value === ',') consume(); }
                    expect('symbol', ')');
                    return { type: 'methodCall', obj: null, method: dotMember, args: dArgs, base: expr };
                }
                return { type: 'memberAccess', obj: null, member: dotMember, base: expr };
            }
            if (peek().value === '->') {
                consume();
                var arrMember = expect('identifier').value;
                if (peek().value === '(') {
                    consume(); var aArgs2 = [];
                    while (peek().value !== ')') { aArgs2.push(parseExpression()); if (peek().value === ',') consume(); }
                    expect('symbol', ')');
                    return { type: 'arrowCall', ptr: null, method: arrMember, args: aArgs2, base: expr };
                }
                var ptrVal = expr;
                return { type: 'arrowAccess2', base: expr, member: arrMember };
            }
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
        } else if (peek().value === 'struct') {
            // 结构体定义
            var sd = parseStructDef();
            globalStmts.push(sd);
        } else if (peek().value === 'void' && tokens[pos + 1] && tokens[pos + 1].type === 'identifier' && tokens[pos + 2] && tokens[pos + 2].value === '(') {
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

// ===== 执行器 v2 (基于地址表+作用域链) =====

function defaultValue(type) {
    var map = { 'int': 0, 'float': 0.0, 'double': 0.0, 'char': '', 'string': '', 'bool': false, 'void': 0 };
    return map[type] !== undefined ? map[type] : 0;
}

function isTruthy(v) {
    return v !== false && v !== 0 && v !== '' && v !== null && v !== undefined;
}

function stringify(v) {
    if (v === true) return '1';
    if (v === false) return '0';
    if (v === undefined || v === null) return '';
    return String(v);
}

// printf 格式化：支持 %d %s %c %x %o %p
function printfFormat(fmt, args) {
    var ai = 0;
    var result = '';
    var i = 0;
    while (i < fmt.length) {
        if (fmt[i] === '%' && i + 1 < fmt.length) {
            i++;
            var spec = fmt[i];
            if (spec === '%') { result += '%'; i++; continue; }
            var v = args[ai++];
            switch (spec) {
                case 'd': result += parseInt(v) || 0; break;
                case 's': result += String(v); break;
                case 'c': result += typeof v === 'number' ? String.fromCharCode(v) : String(v).charAt(0) || ''; break;
                case 'x': result += (parseInt(v)||0).toString(16); break;
                case 'o': result += (parseInt(v)||0).toString(8); break;
                case 'p': result += '0x' + (v >>> 0).toString(16).padStart(8, '0'); break;
                default: result += '%' + spec;
            }
        } else {
            result += fmt[i];
        }
        i++;
    }
    return result;
}

function callFunction(func, args, callScope, outputs, startTime, depth) {
    if (depth === undefined) depth = 0;
    if (depth > QLANG_MAX_STACK_DEPTH) throw new ScriptError("栈溢出");
    // 创建新作用域，链到调用者的作用域
    var funcScope = createScope(callScope);
    // 绑定参数
    for (var pi = 0; pi < func.params.length; pi++) {
        var pv = pi < args.length ? args[pi] : 0;
        declareVar(funcScope, func.params[pi].name, pv, func.params[pi].type, false);
    }
    // 执行函数体
    for (var si = 0; si < func.body.length; si++) {
        var r = execStmt(func.body[si], funcScope, outputs, startTime, depth, null);
        if (r && r.type === 'return') return r.value;
    }
    return 0;
}

function execStmt(stmt, scope, outputs, startTime, depth, loopEnv) {
    if (Date.now() - startTime > QLANG_TOTAL_TIMEOUT_MS) throw new ScriptError("执行超时");
    if (!stmt) return;

    switch (stmt.type) {
        case 'empty': return;
        case 'block': {
            var blockScope = createScope(scope);
            for (var bi = 0; bi < stmt.body.length; bi++) {
                var rb = execStmt(stmt.body[bi], blockScope, outputs, startTime, depth, loopEnv);
                if (rb && (rb.type === 'return' || rb.type === 'break' || rb.type === 'continue')) return rb;
            }
            return;
        }
        case 'varDecl': {
            var val = stmt.init !== null ? evalExpr(stmt.init, scope, startTime, depth) : defaultValue(stmt.varType);
            declareVar(scope, stmt.name, val, stmt.varType, stmt.isConst);
            return;
        }
        case 'arrayDecl': {
            var size = stmt.size ? evalExpr(stmt.size, scope, startTime, depth) : (stmt.init ? stmt.init.length : 1);
            if (typeof size !== 'number' || size <= 0 || size > QLANG_MAX_ARRAY_SIZE) throw new ScriptError("数组大小无效");
            var arr = new Array(size);
            var dv = defaultValue(stmt.varType);
            for (var ai = 0; ai < size; ai++) {
                arr[ai] = (stmt.init && ai < stmt.init.length)
                    ? evalExpr(stmt.init[ai], scope, startTime, depth)
                    : dv;
            }
            QLANG_MEMORY[allocAddr()] = arr;
            scope.vars[stmt.name] = { addr: QLANG_NEXT_ADDR - 1, type: stmt.varType + '[]', isConst: !!stmt.isConst };
            return;
        }
        case 'assign': {
            setVar(scope, stmt.name, evalExpr(stmt.value, scope, startTime, depth));
            return;
        }
        case 'derefAssign': {
            var derefAddr = getVar(scope, stmt.ptrName);
            if (typeof derefAddr !== 'number') throw new ScriptError("解引用赋值需要指针");
            var derefObj = QLANG_MEMORY[derefAddr];
            if (!derefObj || typeof derefObj !== 'object') throw new ScriptError("无效的指针");
            derefObj[stmt.member] = evalExpr(stmt.value, scope, startTime, depth);
            return;
        }
        case 'arrowAssign': {
            var aPtr = getVar(scope, stmt.ptr);
            if (aPtr === 0) throw new ScriptError("空指针");
            if (typeof aPtr !== 'number') throw new ScriptError("箭头赋值需要指针");
            var aObj = QLANG_MEMORY[aPtr];
            if (!aObj || typeof aObj !== 'object') throw new ScriptError("无效的指针");
            aObj[stmt.member] = evalExpr(stmt.value, scope, startTime, depth);
            return;
        }
        case 'arrAssign': {
            var arr = getVar(scope, stmt.name);
            if (!Array.isArray(arr)) throw new ScriptError("数组 " + stmt.name + " 未定义");
            var idx = evalExpr(stmt.index, scope, startTime, depth);
            var val = evalExpr(stmt.value, scope, startTime, depth);
            if (stmt.op === '=') arr[idx] = val;
            else if (stmt.op === '+=') arr[idx] = (arr[idx]||0) + val;
            else if (stmt.op === '-=') arr[idx] = (arr[idx]||0) - val;
            return;
        }
        case 'compAssign': {
            var old = getVar(scope, stmt.name);
            var dv2 = evalExpr(stmt.value, scope, startTime, depth);
            if (stmt.op === '+=') setVar(scope, stmt.name, old + dv2);
            else if (stmt.op === '-=') setVar(scope, stmt.name, old - dv2);
            return;
        }
        case 'memberAssign': {
            var obj = getVar(scope, stmt.obj);
            obj[stmt.member] = evalExpr(stmt.value, scope, startTime, depth);
            return;
        }
        case 'if': {
            var condVal = evalExpr(stmt.cond, scope, startTime, depth);
            if (isTruthy(condVal)) return execStmt(stmt.then, scope, outputs, startTime, depth, loopEnv);
            else if (stmt.else) return execStmt(stmt.else, scope, outputs, startTime, depth, loopEnv);
            return;
        }
        case 'while': {
            var maxIter = 100000;
            var iter = 0;
            var wStart = Date.now();
            while (isTruthy(evalExpr(stmt.cond, scope, startTime, depth))) {
                if (Date.now() - wStart > 10000) throw new ScriptError("while 超时");
                if (++iter > maxIter) throw new ScriptError("循环超限");
                var rw = execStmt(stmt.body, scope, outputs, startTime, depth, loopEnv);
                if (rw && rw.type === 'return') return rw;
                if (rw && rw.type === 'break') break;
            }
            return;
        }
        case 'for': {
            var forScope = createScope(scope);
            if (stmt.init) execStmt(stmt.init, forScope, outputs, startTime, depth, null);
            var maxIterF = 100000;
            var iterF = 0;
            var fStart = Date.now();
            while (!stmt.cond || isTruthy(evalExpr(stmt.cond, forScope, startTime, depth))) {
                if (Date.now() - fStart > 10000) throw new ScriptError("for 超时");
                if (++iterF > maxIterF) throw new ScriptError("循环超限");
                var rf = execStmt(stmt.body, forScope, outputs, startTime, depth, null);
                if (rf && rf.type === 'return') return rf;
                if (rf && rf.type === 'break') break;
                if (stmt.inc) {
                    if (stmt.inc.type === 'forInc') {
                        var oldF = getVar(forScope, stmt.inc.name);
                        var d = evalExpr(stmt.inc.value, forScope, startTime, depth);
                        if (stmt.inc.op === '=') setVar(forScope, stmt.inc.name, d);
                        else if (stmt.inc.op === '+=') setVar(forScope, stmt.inc.name, oldF + d);
                        else if (stmt.inc.op === '-=') setVar(forScope, stmt.inc.name, oldF - d);
                    } else {
                        evalExpr(stmt.inc, forScope, startTime, depth);
                    }
                }
            }
            return;
        }
        case 'function': {
            // 注册函数定义，捕获当前作用域
            stmt.parentScope = scope;
            if (globalEnv && globalEnv['__ast__'] && globalEnv['__ast__'].functions) {
                globalEnv['__ast__'].functions[stmt.name] = stmt;
            }
            return;
        }
        case 'return': {
            var retVal = stmt.value !== null ? evalExpr(stmt.value, scope, startTime, depth) : 0;
            return { type: 'return', value: retVal };
        }
        case 'break': return { type: 'break' };
        case 'continue': return { type: 'continue' };
        case 'print': {
            var parts = [];
            for (var pri = 0; pri < stmt.args.length; pri++) {
                parts.push(stringify(evalExpr(stmt.args[pri], scope, startTime, depth)));
            }
            outputs.push(parts.join(' '));
            return;
        }
        case 'cout': {
            var result = '';
            for (var ci = 0; ci < stmt.parts.length; ci++) {
                var part = stmt.parts[ci];
                if (part.type === 'endl') { result += '\n'; continue; }
                result += stringify(evalExpr(part, scope, startTime, depth));
            }
            outputs.push(result);
            return;
        }
        case 'expr': {
            evalExpr(stmt.expr, scope, startTime, depth);
            return;
        }
        case 'phpVarDecl': {
            setVar(scope, stmt.name, evalExpr(stmt.init, scope, startTime, depth));
            return;
        }
        case 'structDef': {
            // 注册结构体类型到全局
            if (!globalEnv['__structs__']) globalEnv['__structs__'] = {};
            globalEnv['__structs__'][stmt.structName] = stmt;
            return;
        }
        default:
            throw new ScriptError("不支持的语句: " + stmt.type);
    }
}

function evalExpr(expr, scope, startTime, depth) {
    if (!expr || typeof expr !== 'object') return expr;

    switch (expr.type) {
        case 'literal': return expr.value;
        case 'number': return parseFloat(expr.value);
        case 'string': return expr.value;
        case 'variable': return getVar(scope, expr.name);
        case 'phpVar': return getVar(scope, expr.value);
        case 'unary': {
            var v = evalExpr(expr.arg || expr.expr, scope, startTime, depth);
            if (expr.op === '-') return -v;
            if (expr.op === '!') return !isTruthy(v);
            if (expr.op === '++') { setVar(scope, expr.arg.name, v + 1); return v; }
            if (expr.op === '--') { setVar(scope, expr.arg.name, v - 1); return v; }
            return v;
        }
        case 'postInc': {
            var ov = getVar(scope, expr.name);
            setVar(scope, expr.name, ov + 1);
            return ov;
        }
        case 'postDec': {
            var ov2 = getVar(scope, expr.name);
            setVar(scope, expr.name, ov2 - 1);
            return ov2;
        }
        case 'binary': {
            var l = evalExpr(expr.left, scope, startTime, depth);
            var r = evalExpr(expr.right, scope, startTime, depth);
            switch (expr.op) {
                case '+': return (typeof l === 'string' || typeof r === 'string') ? String(l) + String(r) : (l||0) + (r||0);
                case '-': return (l||0) - (r||0);
                case '*': return (l||0) * (r||0);
                case '/': if (r === 0) throw new ScriptError("除零"); return Math.floor(l / r);
                case '%': return l % r;
                case '==': return l == r;
                case '!=': return l != r;
                case '<': return l < r;
                case '>': return l > r;
                case '<=': return l <= r;
                case '>=': return l >= r;
                case '&&': case 'and': return isTruthy(l) && isTruthy(r);
                case '||': case 'or': return isTruthy(l) || isTruthy(r);
                default: return 0;
            }
        }
        case 'call': return handleCall(expr, scope, startTime, depth);
        case 'methodCall': {
            var objV = getVar(scope, expr.obj);
            var method = objV[expr.method];
            if (typeof method !== 'function') throw new ScriptError("方法 " + expr.method + " 不存在");
            var mArgs = [];
            for (var mi = 0; mi < expr.args.length; mi++) mArgs.push(evalExpr(expr.args[mi], scope, startTime, depth));
            return method.apply(objV, mArgs);
        }
        case 'memberAccess': {
            var o = expr.base ? evalExpr(expr.base, scope, startTime, depth) : getVar(scope, expr.obj);
            if (o === null || o === undefined) throw new ScriptError("对象 " + (expr.obj || 'expr') + " 未定义");
            return o[expr.member];
        }
        case 'arrayAccess': {
            var arr = getVar(scope, expr.name);
            var idx = evalExpr(expr.index, scope, startTime, depth);
            if (expr.index2) {
                var idx2 = evalExpr(expr.index2, scope, startTime, depth);
                return arr[idx][idx2];
            }
            return arr[idx];
        }
        case 'newExpr': {
            return handleNewExpr(expr, scope, startTime, depth);
        }
        case 'arrowAccess2': {
            var baseVal = evalExpr(expr.base, scope, startTime, depth);
            if (baseVal === 0) throw new ScriptError("空指针");
            if (typeof baseVal !== 'number') throw new ScriptError("箭头访问需要指针");
            var obj3 = QLANG_MEMORY[baseVal];
            if (!obj3 || typeof obj3 !== 'object') throw new ScriptError("无效的指针");
            return obj3[expr.member];
        }
        case 'addrOf': {
            return addrOf(scope, expr.name);
        }
        case 'deref': {
            var ptrAddr = evalExpr(expr.expr, scope, startTime, depth);
            if (ptrAddr === 0 || ptrAddr === null || ptrAddr === undefined) throw new ScriptError("空指针");
            if (typeof ptrAddr !== 'number' || ptrAddr < 0 || ptrAddr >= QLANG_MEMORY_SIZE) throw new ScriptError("无效的指针地址");
            return QLANG_MEMORY[ptrAddr];
        }
        case 'arrowAccess': {
            var ptrAddr = getVar(scope, expr.ptr);
            if (ptrAddr === 0) throw new ScriptError("空指针");
            if (typeof ptrAddr !== 'number') throw new ScriptError("箭头访问需要指针");
            var obj = QLANG_MEMORY[ptrAddr];
            if (!obj || typeof obj !== 'object') throw new ScriptError("无效的指针");
            return obj[expr.member];
        }
        case 'arrowCall': {
            var ptrAddr2 = getVar(scope, expr.ptr);
            if (typeof ptrAddr2 !== 'number') throw new ScriptError("箭头方法调用需要指针");
            var obj2 = QLANG_MEMORY[ptrAddr2];
            if (!obj2 || typeof obj2 !== 'object') throw new ScriptError("无效的指针");
            var method = obj2[expr.method];
            if (typeof method !== 'function') throw new ScriptError("方法 " + expr.method + " 不存在");
            var aArgs = [];
            for (var ami = 0; ami < expr.args.length; ami++) aArgs.push(evalExpr(expr.args[ami], scope, startTime, depth));
            return method.apply(obj2, aArgs);
        }
        default:
            throw new ScriptError("不支持的表达式: " + expr.type);
    }
}

function handleCall(expr, scope, startTime, depth) {
    // 内置函数
    if (expr.name === '_gcd') {
        var a = Math.abs(evalExpr(expr.args[0], scope, startTime, depth));
        var b = Math.abs(evalExpr(expr.args[1], scope, startTime, depth));
        while (b) { var t = b; b = a % b; a = t; }
        return a;
    }
    if (expr.name === 'parseInt') {
        return parseInt(String(evalExpr(expr.args[0], scope, startTime, depth))) || 0;
    }
    if (expr.name === 'sizeof') {
        var sv = evalExpr(expr.args[0], scope, startTime, depth);
        return Array.isArray(sv) ? sv.length : (typeof sv === 'string' ? sv.length : 0);
    }
    if (expr.name === 'size') {
        var sv2 = evalExpr(expr.args[0], scope, startTime, depth);
        if (sv2 && typeof sv2.size === 'function') return sv2.size();
        if (Array.isArray(sv2)) return sv2.length;
        return 0;
    }
    if (expr.name === 'strlen') {
        var sl = evalExpr(expr.args[0], scope, startTime, depth);
        return typeof sl === 'string' ? sl.length : (Array.isArray(sl) ? sl.indexOf('\0') >= 0 ? sl.indexOf('\0') : sl.length : 0);
    }
    // printf 格式化输出
    if (expr.name === 'printf') {
        var fmt = String(evalExpr(expr.args[0], scope, startTime, depth));
        var pArgs = [];
        for (var pa = 1; pa < expr.args.length; pa++) pArgs.push(evalExpr(expr.args[pa], scope, startTime, depth));
        var out = printfFormat(fmt, pArgs);
        globalEnv['__outputs__'].push(out);
        return pArgs.length; // 返回参数个数
    }
    // 自定义函数
    if (globalEnv['__ast__'] && globalEnv['__ast__'].functions[expr.name]) {
        var func = globalEnv['__ast__'].functions[expr.name];
        var funcArgs = [];
        for (var ai = 0; ai < expr.args.length; ai++) {
            funcArgs.push(evalExpr(expr.args[ai], scope, startTime, depth));
        }
        // 调用时传入当前作用域，函数内部创建子作用域
        return callFunction(func, funcArgs, scope, globalEnv['__outputs__'], startTime, depth + 1);
    }
    throw new ScriptError("未定义函数: " + expr.name);
}

// new 表达式处理：分配内存 + 初始化结构体
function handleNewExpr(expr, scope, startTime, depth) {
    if (!globalEnv['__structs__'] || !globalEnv['__structs__'][expr.structType]) {
        throw new ScriptError("未定义的结构体: " + expr.structType);
    }
    var structDef = globalEnv['__structs__'][expr.structType];
    // 计算参数
    var initArgs = [];
    for (var ni = 0; ni < expr.args.length; ni++) {
        initArgs.push(evalExpr(expr.args[ni], scope, startTime, depth));
    }
    // 分配地址并创建对象
    var addr = allocAddr();
    var obj = {};
    for (var fi = 0; fi < structDef.fields.length; fi++) {
        var f = structDef.fields[fi];
        obj[f.name] = fi < initArgs.length ? initArgs[fi] : 0;
    }
    // 存入指针表：addr -> obj
    // 支持 -> 操作通过 obj.field 访问
    obj.__addr = addr;
    QLANG_MEMORY[addr] = obj;
    return addr; // 返回指针
}

// ===== 主入口 =====

function execute(ast, answers, otherInputs, qs) {
    // 重置全局状态
    QLANG_MEMORY = new Array(QLANG_MEMORY_SIZE);
    QLANG_NEXT_ADDR = 1;
    QLANG_SCOPE_ID = 0;

    if (!ast.functions['main']) throw new ScriptError("未找到 main()");

    var rootScope = createScope(null);
    var outputs = [];
    var startTime = Date.now();

    // 注入问卷答案
    if (answers) {
        for (var qid in answers) {
            var ans = answers[qid];
            declareVar(rootScope, qid, ans, 'auto', false);
            var nv = parseInt(ans, 10);
            if (!isNaN(nv)) declareVar(rootScope, qid + '.num', nv, 'int', false);
            declareVar(rootScope, qid + '.text', String(ans), 'string', false);
        }
    }

    globalEnv.__ast__ = ast;
    globalEnv.__outputs__ = outputs;
    globalEnv.__startTime__ = startTime;

    // 执行全局语句
    for (var gi = 0; gi < ast.globalStmts.length; gi++) {
        execStmt(ast.globalStmts[gi], rootScope, outputs, startTime, 0, null);
    }

    // 调用 main
    callFunction(ast.functions['main'], [], rootScope, outputs, startTime, 0);

    if (outputs.length > 0) return '\n\n── 结果 ──\n' + outputs.join('\n');
    return '';
}

var globalEnv = {};

export function executeQLang(resultCodeStr, answers, otherInputs, qs) {
    try {
        var ast = parse(resultCodeStr);
        return execute(ast, answers, otherInputs, qs);
    } catch (e) {
        if (e instanceof ScriptError) throw e;
        throw new ScriptError(String(e.message || e));
    }
}