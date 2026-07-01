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
    if (!found) {
        throw new ScriptError("未定义: " + name);
    }
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

function stripLineNumbers(s){
    if(typeof s !== "string") return "";
    // 去掉所有行号前缀格式（单行号或双行号）： "1| code"、" 1| 2| code"
    return s.replace(/^\s*(?:\d+\|\s*)+/gm, "");
}
// 异步读取库文件内容
function readLibraryFile(libName) {
    return new Promise(async function(resolve, reject) {
        try {
            var dir = "/sdcard/Download/Operit/questionnaire/QLangRuntime/library";
            var res = await Tools.Files.read({path: dir + "/" + libName + ".qlg"});
            // Tools.Files.read 返回 {content: "..."}，content 是干净文本不带行号
            var raw = (typeof res === "object" && res && res.content) ? String(res.content) : String(res || "");
            raw = stripLineNumbers(raw);
            resolve(raw);
        } catch(e) {
            reject(e);
        }
    });
}

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
            var keywords = { 'int': true, 'float': true, 'double': true, 'char': true, 'string': true, 'bool': true, 'true': true, 'false': true, 'if': true, 'else': true, 'while': true, 'for': true, 'return': true, 'void': true, 'const': true, 'break': true, 'continue': true, 'stack': true, 'queue': true, 'vector': true, 'pair': true, 'priority_queue': true, 'struct': true, 'new': true, 'try': true, 'catch': true, 'throw': true };
            tokens.push({ type: keywords[word] ? 'keyword' : 'identifier', value: word, line: line });
            continue;
        }
        // 多字符操作符
        var twoChar = code.substring(i, i + 2);
        var twoOps = { '++': true, '--': true, '<<': true, '>>': true, '>=': true, '<=': true, '==': true, '!=': true, '&&': true, '||': true, '+=': true, '-=': true, '*=': true, '/=': true, '%=': true, '->': true, '::': true };
        if (twoOps[twoChar]) {
            tokens.push({ type: 'operator', value: twoChar, line: line });
            i += 2;
            continue;
        }
        // 单字符
        // #include 指令预处理器
        if (c === '#' && code.substring(i, i + 8) === '#include') {
            var incStart = i;
            i += 8;
            while (i < code.length && code[i] !== '\n' && code[i] !== '\r') i++;
            var incLine = code.substring(incStart, i).trim();
            tokens.push({ type: 'include', value: incLine, line: line });
            continue;
        }
        tokens.push({ type: 'symbol', value: c, line: line });
        i++;
    }
    return tokens;
}

// 解析器：从 Token 流构建 AST
// 顶层：查找函数定义
function parse(code, extraAsts) {
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
        if (peek().value === 'try') return parseTryCatch();
        if (peek().value === 'throw') return parseThrow();
        // 表达式语句
        return parseExpressionStmt();
    }

    function parseTryCatch() {
        consume(); // try
        expect('symbol', '{');
        var tryBody = parseBlock();
        // catch 可能是 keyword 或 identifier（取决于 tokenizer 是否识别为关键字）
        var cToken = consume();
        if (cToken.value !== 'catch') throw new ScriptError('期望 catch');
        expect('symbol', '(');
        var catchVar = expect('identifier').value;
        expect('symbol', ')');
        expect('symbol', '{');
        var catchBody = parseBlock();
        return { type: 'tryCatch', tryBody: tryBody, catchVar: catchVar, catchBody: catchBody };
    }

    function parseThrow() {
        consume(); // throw
        var val = parseExpression();
        expect('symbol', ';');
        return { type: 'throw', value: val };
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
        // 检测指针类型：int* name 或 int *name
        var isPtr = false;
        if (peek().value === '*') { isPtr = true; consume(); }
        else if (peek().type === 'operator' && peek().value === '*') { isPtr = true; consume(); }
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
            // 命名空间限定调用: ns::func(...)
            if (peek().type === 'operator' && peek().value === '::') {
                consume(); // 吃掉 ::
                var nsName = name;
                if (peek().type !== 'identifier') throw new ScriptError("命名空间限定符后需要函数名");
                var funcName = consume().value;
                if (peek().value === '(') {
                    consume();
                    var nsArgs = [];
                    while (peek().value !== ')') {
                        nsArgs.push(parseExpression());
                        if (peek().value === ',') consume();
                    }
                    expect('symbol', ')');
                    return { type: 'call', namespace: nsName, name: funcName, args: nsArgs, line: t.line };
                }
                throw new ScriptError("命名空间限定符后需要函数调用");
            }
            if (peek().value === '(') {
                // 函数调用
                consume();
                var args = [];
                while (peek().value !== ')') {
                    args.push(parseExpression());
                    if (peek().value === ',') consume();
                }
                expect('symbol', ')');
                return { type: 'call', name: name, args: args, line: t.line };
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
    var namespaces = { 'qlgstd': { functions: {} } };
    // 合并外部库的命名空间（路径记录法）
    if (extraAsts) {
        for (var ea_lib in extraAsts) {
            var ea_sub = extraAsts[ea_lib];
            if (ea_sub && ea_sub.namespaces) {
                for (var ea_nsk in ea_sub.namespaces) {
                    if (!namespaces[ea_nsk]) namespaces[ea_nsk] = { functions: {} };
                    for (var ea_fnk in ea_sub.namespaces[ea_nsk].functions) {
                        namespaces[ea_nsk].functions[ea_fnk] = ea_sub.namespaces[ea_nsk].functions[ea_fnk];
                    }
                }
            }
        }
    }
    var currentNs = 'qlgstd';
    var globalStmts = [];
    while (peek().type !== 'eof') {
        // #include 指令：从外部库读取函数，不展开代码文本
        if (peek().type === 'include') {
            var incTok = consume();
            var incMatch = incTok.value.match(/^#include\s*<([^>]+)>/);
            if (incMatch) {
                var libName = incMatch[1];
                var libPath = "/sdcard/Download/Operit/questionnaire/QLangRuntime/library/" + libName + ".qlg";
                try {
                    var r = NativeInterface.callTool("", "read_file", JSON.stringify({path: libPath}));
                    var o = JSON.parse(r);
                    var libCode = "";
                    if (o && o.data && o.data.content) libCode = o.data.content;
                    else if (o && o.content) libCode = o.content;
                    else libCode = String(o || "");
                    libCode = libCode.replace(/^\\d+\\|\\s*/gm, "").replace(/^#defNS\s+\w+;?\s*$/gm, "").replace(/^using\s+namespace\s+\w+;?\s*$/gm, "").trim();
                    if (!libCode) throw new ScriptError("[库: " + libName + ".qlg] 内容为空");
                    // 解析库代码提取函数，注册到当前命名空间
                    var subAst = parse(libCode);
                    for (var fk in subAst.namespaces) {
                        if (!namespaces[fk]) namespaces[fk] = { functions: {} };
                        for (var fnk in subAst.namespaces[fk].functions) {
                            namespaces[fk].functions[fnk] = subAst.namespaces[fk].functions[fnk];
                        }
                    }
                } catch(e) {
                    if (e instanceof ScriptError) throw e;
                    throw new ScriptError("[库: " + libName + ".qlg] " + (e.message || "读取失败"));
                }
            }
            continue;
        }
        if (peek().value === 'using') {
            consume(); consume(); // using namespace
            var nsName = expect('identifier').value;
            if (peek().value === ';') consume();
            if (!namespaces[nsName]) namespaces[nsName] = { functions: {} };
            // using namespace 不改变注册目标，只是确保该命名空间存在以便查找
            continue;
        }
        // #defNS 指令：切换当前命名空间（仅外部库文件使用）
        if (peek().type === 'symbol' && peek().value === '#' && tokens[pos + 1] && tokens[pos + 1].value === 'defNS') {
            consume(); // #
            consume(); // defNS
            var defNsName = expect('identifier').value;
            if (!namespaces[defNsName]) namespaces[defNsName] = { functions: {} };
            currentNs = defNsName;
            continue;
        }
        var typeKw = { 'int': true, 'float': true, 'double': true, 'char': true, 'string': true, 'bool': true, 'void': true, 'stack': true, 'queue': true, 'vector': true, 'pair': true, 'priority_queue': true };
        if (typeKw[peek().value]) {
            var typeName = consume().value;
            var funcName = peek();
            if (funcName.type === 'identifier' && tokens[pos + 1] && tokens[pos + 1].value === '(') {
                pos--;
                var func = parseFunction();
                namespaces[currentNs].functions[func.name] = func;
            } else {
                pos--;
                var stmt = parseStatement();
                globalStmts.push(stmt);
            }
        } else if (peek().value === 'struct') {
            var sd = parseStructDef();
            globalStmts.push(sd);
        } else if (peek().value === 'void' && tokens[pos + 1] && tokens[pos + 1].type === 'identifier' && tokens[pos + 2] && tokens[pos + 2].value === '(') {
            globalStmts.push(parseStatement());
        } else {
            consume();
        }
    }
    
    return { namespaces: namespaces, globalStmts: globalStmts };
}

// 脚本错误
function ScriptError(msg) {
    this.message = '脚本错误: ' + msg;
}
ScriptError.prototype = Object.create(Error.prototype);
ScriptError.prototype.constructor = ScriptError;

// ===== 执行器 v2 (基于地址表+作用域链) =====

function createSTLObject(type) {
    switch (type) {
        case 'stack': {
            var stkArr = [];
            return {
                __stl_type: 'stack', _data: stkArr,
                push: function(v) { if (stkArr.length >= 1000) throw new ScriptError('stack overflow (max 1000)'); stkArr.push(v); },
                pop: function() { if (stkArr.length === 0) throw new ScriptError('stack empty'); stkArr.pop(); },
                top: function() { if (stkArr.length === 0) throw new ScriptError('stack empty'); return stkArr[stkArr.length - 1]; },
                size: function() { return stkArr.length; },
                empty: function() { return stkArr.length === 0; }
            };
        }
        case 'queue': {
            var quArr = [];
            return {
                __stl_type: 'queue', _data: quArr,
                push: function(v) { if (quArr.length >= 1000) throw new ScriptError('queue overflow (max 1000)'); quArr.push(v); },
                pop: function() { if (quArr.length === 0) throw new ScriptError('queue empty'); quArr.shift(); },
                front: function() { if (quArr.length === 0) throw new ScriptError('queue empty'); return quArr[0]; },
                back: function() { if (quArr.length === 0) throw new ScriptError('queue empty'); return quArr[quArr.length - 1]; },
                size: function() { return quArr.length; },
                empty: function() { return quArr.length === 0; }
            };
        }
        case 'vector': {
            var vecArr = [];
            return {
                __stl_type: 'vector', _data: vecArr,
                push_back: function(v) { vecArr.push(v); },
                pop_back: function() { if (vecArr.length === 0) throw new ScriptError('vector empty'); vecArr.pop(); },
                get: function(i) { if (i < 0 || i >= vecArr.length) throw new ScriptError('vector index out of range'); return vecArr[i]; },
                set: function(i, v) { if (i < 0 || i >= vecArr.length) throw new ScriptError('vector index out of range'); vecArr[i] = v; },
                size: function() { return vecArr.length; },
                empty: function() { return vecArr.length === 0; },
                clear: function() { vecArr.length = 0; }
            };
        }
        case 'priority_queue': {
            var pqArr = [];
            function pqSiftUp(idx) {
                while (idx > 0) {
                    var p = Math.floor((idx - 1) / 2);
                    if (pqArr[p] >= pqArr[idx]) break;
                    var tmp = pqArr[p]; pqArr[p] = pqArr[idx]; pqArr[idx] = tmp;
                    idx = p;
                }
            }
            function pqSiftDown(idx) {
                var n = pqArr.length;
                while (true) {
                    var largest = idx;
                    var l = 2 * idx + 1, r = 2 * idx + 2;
                    if (l < n && pqArr[l] > pqArr[largest]) largest = l;
                    if (r < n && pqArr[r] > pqArr[largest]) largest = r;
                    if (largest === idx) break;
                    var tmp = pqArr[idx]; pqArr[idx] = pqArr[largest]; pqArr[largest] = tmp;
                    idx = largest;
                }
            }
            return {
                __stl_type: 'priority_queue', _data: pqArr,
                push: function(v) {
                    if (pqArr.length >= 1000) throw new ScriptError('priority_queue overflow (max 1000)');
                    pqArr.push(v); pqSiftUp(pqArr.length - 1);
                },
                pop: function() {
                    if (pqArr.length === 0) throw new ScriptError('priority_queue empty');
                    pqArr[0] = pqArr[pqArr.length - 1]; pqArr.pop();
                    if (pqArr.length > 0) pqSiftDown(0);
                },
                top: function() { if (pqArr.length === 0) throw new ScriptError('priority_queue empty'); return pqArr[0]; },
                size: function() { return pqArr.length; },
                empty: function() { return pqArr.length === 0; }
            };
        }
        default: return 0;
    }
}

function defaultValue(type) {
    if (type === 'stack' || type === 'queue' || type === 'vector' || type === 'priority_queue') {
        return createSTLObject(type);
    }
    if (type === 'pair') return { first: 0, second: 0 };
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
            if (globalEnv && globalEnv['__ast__']) {
                var ns4 = globalEnv['__namespace__'] || 'qlgstd';
                if (!globalEnv['__ast__'].namespaces) globalEnv['__ast__'].namespaces = {};
                if (!globalEnv['__ast__'].namespaces[ns4]) globalEnv['__ast__'].namespaces[ns4] = { functions: {} };
                globalEnv['__ast__'].namespaces[ns4].functions[stmt.name] = stmt;
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
        case 'tryCatch': {
            try {
                for (var tsi = 0; tsi < stmt.tryBody.length; tsi++) {
                    var tr = execStmt(stmt.tryBody[tsi], scope, outputs, startTime, depth, null);
                    if (tr && (tr.type === 'return' || tr.type === 'break' || tr.type === 'continue')) return tr;
                }
            } catch (e) {
                // 捕获异常，声明 catch 变量
                var errMsg = e instanceof ScriptError ? e.message : String(e.message || e);
                var catchScope = createScope(scope);
                declareVar(catchScope, stmt.catchVar, errMsg, 'string', false);
                for (var csi = 0; csi < stmt.catchBody.length; csi++) {
                    var cr = execStmt(stmt.catchBody[csi], catchScope, outputs, startTime, depth, null);
                    if (cr && (cr.type === 'return' || cr.type === 'break' || cr.type === 'continue')) return cr;
                }
            }
            return;
        }
        case 'throw': {
            var throwVal = evalExpr(stmt.value, scope, startTime, depth);
            throw new ScriptError(String(throwVal));
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
            if (expr.op === '++') { var nv = v + 1; setVar(scope, expr.arg.name, nv); return nv; }
            if (expr.op === '--') { var nv2 = v - 1; setVar(scope, expr.arg.name, nv2); return nv2; }
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
    // abort：立即终止脚本并抛出错误
    if (expr.name === 'abort') {
        var abortMsg = expr.args.length > 0 ? String(evalExpr(expr.args[0], scope, startTime, depth)) : 'abort';
        throw new ScriptError("abort: " + abortMsg);
    }
    // 自定义函数
    if (globalEnv['__ast__']) {
        var ns3 = expr.namespace || (globalEnv['__namespace__'] || 'qlgstd');
        var funcs = globalEnv['__ast__'].namespaces && globalEnv['__ast__'].namespaces[ns3] && globalEnv['__ast__'].namespaces[ns3].functions;
        if (funcs && funcs[expr.name]) {
            var func = funcs[expr.name];
            var funcArgs = [];
            for (var ai = 0; ai < expr.args.length; ai++) {
                funcArgs.push(evalExpr(expr.args[ai], scope, startTime, depth));
            }
            return callFunction(func, funcArgs, scope, globalEnv['__outputs__'], startTime, depth + 1);
        }
    }
    throw new ScriptError((expr.line ? '第' + expr.line + '行: ' : '') + "未定义函数: " + expr.name + " (可用命名空间: " + Object.keys(globalEnv['__ast__'].namespaces).join(',') + ")");
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
    QLANG_MEMORY = new Array(QLANG_MEMORY_SIZE);
    QLANG_NEXT_ADDR = 1;
    QLANG_SCOPE_ID = 0;
    var ns2 = 'qlgstd';
    if (!ast.namespaces || !ast.namespaces[ns2] || !ast.namespaces[ns2].functions['main'])
        throw new ScriptError("未找到 main()");
    var rootScope = createScope(null);
    var outputs = [];
    var startTime = Date.now();

    // 注入 qid 数据：构造一个大对象，注册为全局指针变量 qid
    // 脚本中通过 qid->q1_num, qid->q1_text 访问
    if (answers && qs) {
        var qidTypeMap = {};
        for (var _qmi = 0; _qmi < qs.length; _qmi++) {
            var _q = qs[_qmi];
            if (_q.type !== 'section' && _q.id) {
                qidTypeMap[_q.id] = _q.type;
            }
        }
        var qidObj = {};
        for (var qid in answers) {
            var ans = answers[qid];
            var qtype = qidTypeMap[qid] || 'text';
            var textVal = '';
            var numVal = -1;
            if (qtype === 'text' || qtype === 'textarea') {
                textVal = String(ans);
                if (qtype === 'textarea') {
                    textVal = textVal.replace(/\n/g, '\\n');
                }
                numVal = -1;
            }
            else if (qtype === 'single') {
                textVal = String(ans);
                numVal = 1;
            }
            else if (qtype === 'multiple') {
                if (Array.isArray(ans)) {
                    textVal = ans.join(' ');
                    numVal = ans.length;
                } else {
                    textVal = String(ans);
                    numVal = 1;
                }
            }
            else if (qtype === 'rating' || qtype === 'likert' || qtype === 'nps') {
                numVal = parseInt(ans);
                if (isNaN(numVal)) numVal = -1;
                textVal = String(numVal);
            }
            else if (qtype === 'time') {
                textVal = String(ans);
                var tp = String(ans).split(':');
                if (tp.length >= 3) {
                    var hh = parseInt(tp[0]) || 0;
                    var mm = parseInt(tp[1]) || 0;
                    var ss = parseInt(tp[2]) || 0;
                    numVal = hh * 3600 + mm * 60 + ss;
                } else if (tp.length === 2) {
                    var hh2 = parseInt(tp[0]) || 0;
                    var mm2 = parseInt(tp[1]) || 0;
                    numVal = hh2 * 3600 + mm2 * 60;
                } else {
                    numVal = -1;
                }
            }
            else {
                textVal = String(ans);
                numVal = -1;
            }
            qidObj[qid + '_num'] = numVal;
            qidObj[qid + '_text'] = textVal;
        }
        var qidAddr = allocAddr();
        qidObj.__addr = qidAddr;
        QLANG_MEMORY[qidAddr] = qidObj;
    }

    globalEnv.__ast__ = ast;
    globalEnv.__outputs__ = outputs;
    globalEnv.__ast__ = ast;
    globalEnv.__outputs__ = outputs;
    globalEnv.__startTime__ = startTime;
    globalEnv.__namespace__ = ns2;
    for (var gi = 0; gi < ast.globalStmts.length; gi++) {
        execStmt(ast.globalStmts[gi], rootScope, outputs, startTime, 0, null);
    }
    var mainArgs = (typeof qidAddr !== 'undefined') ? [qidAddr] : [];
    callFunction(ast.namespaces[ns2].functions['main'], mainArgs, rootScope, outputs, startTime, 0);

    if (outputs.length > 0) return '\n\n── 结果 ──\n' + outputs.join('\n');
    return '';
}

var globalEnv = {};

export async function executeQLang(resultCodeStr, answers, otherInputs, qs) {
    try {
        // 预处理：处理 #include 指令
        var includes = [];
        var incIdx = 0;
        // 收集所有 #include 指令
        resultCodeStr = resultCodeStr.replace(/^#include\s*<([^>]+)>/gm, function(m, libName) {
            var ph = "___QLIB_" + (incIdx++) + "___";
            includes.push({ name: libName, ph: ph });
            return ph;
        });
        // 异步读取并解析库文件
        var libAsts = {};
        for (var ii = 0; ii < includes.length; ii++) {
            try {
                var libCode = await readLibraryFile(includes[ii].name);
                if (!libCode || !libCode.trim()) throw new Error("空内容");
                libCode = stripLineNumbers(libCode);
                // 单独解析库代码，注册到独立命名空间
                var subAst = parse(libCode);
                libAsts[includes[ii].name] = subAst;
            } catch(e) {
                var libErr = e.message || "读取失败";
                // 尝试从库解析错误中提取行号，附上库代码行内容
                var libLineMatch = String(libErr).match(/第(\d+)行:/);
                if (libLineMatch) {
                    var libLn = parseInt(libLineMatch[1]);
                    var libSrcLines = libCode.split('\n');
                    var libLineContent = (libLn >= 1 && libLn <= libSrcLines.length) ? libSrcLines[libLn - 1].trim() : '';
                    libErr += '\n  → ' + libLineContent;
                }
                throw new ScriptError("[库: " + includes[ii].name + ".qlg] " + libErr);
            }
            // 替换占位符为空行（库函数不嵌入主代码文本）
            resultCodeStr = resultCodeStr.replace(includes[ii].ph, "");
        }
        
        // 将库的命名空间合并到主 AST（路径记录法）
        var ast = parse(resultCodeStr, libAsts);
        if (!ast.namespaces) ast.namespaces = {};
        
        // 预处理：提取 #defNS 和 using namespace 声明
        var defNSMatch = resultCodeStr.match(/^#defNS\s+(\w+)/m);
        var usingNSMatches = resultCodeStr.match(/^using\s+namespace\s+(\w+)/gm);
        
        // #defNS 只能出现在外部库文件中，主代码中使用即报错
        if (defNSMatch) {
            throw new ScriptError("主代码中不允许使用 #defNS，该指令仅用于外部 .qlg 库文件");
        }
        
        // 设置当前命名空间
        var currentNs = 'qlgstd';
        if (usingNSMatches) {
            for (var umi = 0; umi < usingNSMatches.length; umi++) {
                var um = usingNSMatches[umi];
                var umName = um.match(/^using\s+namespace\s+(\w+)/)[1];
                resultCodeStr = resultCodeStr.replace(um, "");
                // 将 using 的命名空间函数合并到 qlgstd，使直接调用生效
                if (ast.namespaces && ast.namespaces[umName]) {
                    var targetNs = ast.namespaces['qlgstd'];
                    var srcNs = ast.namespaces[umName];
                    for (var fn in srcNs.functions) {
                        if (!targetNs.functions[fn]) {
                            targetNs.functions[fn] = srcNs.functions[fn];
                        }
                    }
                }
            }
            currentNs = 'qlgstd'; // 执行时仍在 qlgstd 命名空间
        }
        
        ast.namespace = currentNs;
        return execute(ast, answers, otherInputs, qs);
    } catch (e) {
        var errMsg = e instanceof ScriptError ? e.message : String(e.message || e);
        // 如果已经是库错误（包含 [库:），不再重复包装文件信息
        if (errMsg.indexOf('[库:') >= 0) {
            throw new ScriptError(errMsg);
        }
        // 尝试提取行号
        var lineMatch = String(errMsg).match(/第(\d+)行:/);
        if (lineMatch) {
            var ln = parseInt(lineMatch[1]);
            var srcLines = resultCodeStr.split('\n');
            var lineContent = (ln >= 1 && ln <= srcLines.length) ? srcLines[ln - 1].trim() : '';
            errMsg = '[文件: 入口程序] ' + errMsg + '\n  → ' + lineContent;
        } else {
            // 没有行号时，添加上下文标识
            errMsg = '[文件: 入口程序] ' + errMsg;
        }
        throw new ScriptError(errMsg);
    }
}