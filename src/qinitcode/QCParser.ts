// QCParser — QinitCode 语法分析 → AST
// @ts-nocheck

import { tokenize } from './QCTokenizer';
import { QCError } from './QCError';

export function parse(code) {
    var tokens = tokenize(code);
    var pos = 0;
    
    function peek() { return pos < tokens.length ? tokens[pos] : { type: 'eof', value: '' }; }
    function consume() { return pos < tokens.length ? tokens[pos++] : { type: 'eof', value: '' }; }
    function expect(type, value) {
        var t = consume();
        if (t.type !== type || (value !== undefined && t.value !== value)) {
            throw new QCError('期望 ' + (value || type) + '，得到 ' + t.value, t.line);
        }
        return t;
    }
    
    // === 表达式解析 ===
    function parseExpr() {
        return parseTernary();
    }
    
    function parseTernary() {
        var left = parseLogic();
        if (peek().value === '?') {
            consume();
            var trueExpr = parseExpr();
            expect('symbol', ':');
            var falseExpr = parseExpr();
            return { type: 'ternary', cond: left, trueExpr: trueExpr, falseExpr: falseExpr };
        }
        return left;
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
        if (cmpOps[op]) {
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
        if (peek().value === '!' || peek().value === '-') {
            var op = consume().value;
            return { type: 'unary', op: op, arg: parseUnary() };
        }
        return parsePrimary();
    }
    
    function parsePrimary() {
        var t = peek();
        
        // 字面量
        if (t.type === 'number') { consume(); return { type: 'number', value: t.value }; }
        if (t.type === 'string') { consume(); return { type: 'string', value: t.value }; }
        if (t.type === 'char') { consume(); return { type: 'char', value: t.value }; }
        if (t.value === 'true') { consume(); return { type: 'bool', value: true }; }
        if (t.value === 'false') { consume(); return { type: 'bool', value: false }; }
        if (t.value === 'null') { consume(); return { type: 'null' }; }
        
        // $ 变量
        if (t.type === 'variable') {
            consume();
            if (peek().value === '.') {
                consume();
                var member = expect('identifier').value;
                return { type: 'memberAccess', obj: t.value, member: member };
            }
            return { type: 'variable', name: t.value };
        }
        
        // arr(...) 数组构造
        if (t.value === 'arr' && peek().value === '(') {
            consume();
            expect('symbol', '(');
            var arrExpr = parseExpr();
            expect('symbol', ')');
            return { type: 'arrExpr', expr: arrExpr };
        }
        
        // @ 事件指令调用
        if (t.type === 'atDirective') {
            consume();
            return parseAtCall(t.value, t.line);
        }
        
        // ( 表达式 )
        if (t.value === '(') {
            consume();
            var expr = parseExpr();
            expect('symbol', ')');
            return expr;
        }
        
        // JSON 对象 {}
        if (t.value === '{') {
            return parseJSONObject();
        }
        
        // JSON 数组 []
        if (t.value === '[') {
            return parseJSONArray();
        }
        
        // 标识符（函数名、JSON键等）
        if (t.type === 'identifier') {
            consume();
            if (peek().value === '(') {
                // 普通函数调用
                consume();
                var args = [];
                while (peek().value !== ')') {
                    args.push(parseExpr());
                    if (peek().value === ',') consume();
                }
                expect('symbol', ')');
                return { type: 'call', name: t.value, args: args };
            }
            return { type: 'identifier', value: t.value };
        }
        
        if (t.type === 'keyword') {
            consume();
            return { type: 'identifier', value: t.value };
        }
        
        throw new QCError('意外的 token: ' + t.value + ' (类型: ' + t.type + ')', t.line);
    }
    
    // 解析 @ 指令调用：@指令名(参数...)
    function parseAtCall(name, line) {
        var args = [];
        var namedArgs = {};
        
        if (peek().value === '(') {
            consume();
            while (peek().value !== ')' && peek().type !== 'eof') {
                // 检查是否是命名参数（标识符:）
                if (peek().type === 'identifier' && peek().value.indexOf('->') < 0 &&
                    tokens[pos + 1] && tokens[pos + 1].value === ':') {
                    // 键值对：key: value 或 key:{...}
                    var key = consume().value;
                    expect('symbol', ':');
                    
                    // 检查是否是 Send:{} 或 Return:$var 这种形式
                    if (name === 'RunQLangCode' && (key === 'Send' || key === 'Return' || key === 'CollectFunc')) {
                        if (key === 'Send') {
                            // Send:{int a}=>1,{string b}=>"a"
                            namedArgs[key] = parseSendParams();
                        } else if (key === 'Return') {
                            // Return:$var
                            expect('symbol', '$');
                            var retVar = expect('identifier').value;
                            namedArgs[key] = '$' + retVar;
                        } else if (key === 'CollectFunc') {
                            // CollectFunc:main
                            namedArgs[key] = expect('identifier').value;
                        }
                    } else if (peek().value === '{' && key !== 'Send') {
                        // JSON 对象
                        namedArgs[key] = parseJSONObject();
                    } else {
                        // 普通值
                        namedArgs[key] = parseExpr();
                    }
                } else {
                    // 检测 RECEIVER 通配符 *&
                    if (peek().value === '*') {
                        consume();
                        expect('symbol', '&');
                        args.push({ type: 'receiver', format: 'any' });
                    } else {
                        args.push(parseExpr());
                    }
                }
                if (peek().value === ',') consume();
            }
            expect('symbol', ')');
        }
        
        // 如果指令名后有 {} 块
        var block = null;
        if (peek().value === '{') {
            block = parseBlock();
        }
        
        return { type: 'atCall', name: name, args: args, namedArgs: namedArgs, block: block, line: line };
    }
    
    // 解析 Send 参数：{int a}=>1,{string b}=>"a"
    function parseSendParams() {
        var params = {};
        while (peek().value === '{') {
            consume(); // {
            var typeName = expect('identifier').value;
            var paramName = expect('identifier').value;
            expect('symbol', '}');
            expect('symbol', '=');
            expect('symbol', '>');
            var val = parseExpr();
            params[paramName] = { type: typeName, value: val };
            if (peek().value === ',') consume();
        }
        return params;
    }
    
    // 解析 JSON 对象：{...}
    function parseJSONObject() {
        expect('symbol', '{');
        var obj = {};
        while (peek().value !== '}') {
            var key = expect('string').value;
            // 去掉引号
            key = key.substring(1, key.length - 1);
            expect('symbol', ':');
            var val = parseJSONValue();
            obj[key] = val;
            if (peek().value === ',') consume();
        }
        expect('symbol', '}');
        return obj;
    }
    
    function parseJSONValue() {
        var t = peek();
        if (t.value === 'true') { consume(); return true; }
        if (t.value === 'false') { consume(); return false; }
        if (t.type === 'number') { consume(); return parseFloat(t.value); }
        if (t.type === 'string') { consume(); return t.value.substring(1, t.value.length - 1); }
        if (t.value === '{') return parseJSONObject();
        if (t.value === '[') {
            consume();
            var arr = [];
            while (peek().value !== ']') {
                arr.push(parseJSONValue());
                if (peek().value === ',') consume();
            }
            expect('symbol', ']');
            return arr;
        }
        throw new QCError('期望 JSON 值，得到 ' + t.value, t.line);
    }
    
    // 解析 RECEIVER 格式：RECEIVER:["*",...]& 或 RECEIVER:"*"& 或 *&
    function parseReceiverSpec() {
        if (peek().value === '*') {
            consume();
            expect('symbol', '&');
            return { type: 'receiver', format: 'any' };
        }
        if (peek().value === 'RECEIVER' || peek().value === 'receiver') {
            consume();
            expect('symbol', ':');
            var spec = parseReceiverValue();
            expect('symbol', '&');
            return { type: 'receiver', format: spec };
        }
        return null;
    }
    
    function parseReceiverValue() {
        var t = peek();
        if (t.type === 'string') {
            consume();
            return { type: 'string', value: t.value.substring(1, t.value.length - 1) };
        }
        if (t.value === '[') return parseJSONArray();
        if (t.value === '{') return parseJSONObject();
        if (t.type === 'number') { consume(); return parseFloat(t.value); }
        throw new QCError('无效的 RECEIVER 格式', t.line);
    }
    
    function parseJSONArray() {
        consume();
        var arr = [];
        while (peek().value !== ']') {
            arr.push(parseReceiverValue());
            if (peek().value === ',') consume();
        }
        expect('symbol', ']');
        return arr;
    }
    
    // === 语句解析 ===
    function parseStatement() {
        // 分号空语句
        if (peek().value === ';') { consume(); return { type: 'empty' }; }
        
        // 块 {}
        if (peek().value === '{') return { type: 'block', body: parseBlock() };
        
        // 变量赋值 $a = expr;
        if (peek().type === 'variable' && tokens[pos + 1] && tokens[pos + 1].value === '=') {
            var varName = consume().value;
            consume(); // =
            var expr = parseExpr();
            expect('symbol', ';');
            return { type: 'assign', name: varName, value: expr };
        }
        
        // arr(...) = @GetEventInfo(...); 数组赋值
        if (peek().value === 'arr' && tokens[pos + 1] && tokens[pos + 1].value === '(') {
            consume();
            expect('symbol', '(');
            var srcExpr = parseExpr();
            expect('symbol', ')');
            expect('symbol', '=');
            var val = parseExpr();
            expect('symbol', ';');
            return { type: 'arrAssign', expr: srcExpr, value: val };
        }
        
        // 复合赋值 += / -=
        if (peek().type === 'variable' && tokens[pos + 1] && (tokens[pos + 1].value === '+=' || tokens[pos + 1].value === '-=')) {
            var varName2 = consume().value;
            var op = consume().value;
            var val2 = parseExpr();
            expect('symbol', ';');
            return { type: 'compAssign', name: varName2, op: op, value: val2 };
        }
        
        // @Qinit / @RegQuestion / @Regfunc 只出现在顶层，语句级不处理
        // @ 指令语句
        if (peek().type === 'atDirective') {
            var atName = consume().value;
            var atCall = parseAtCall(atName, peek().line);
            // @ 指令后是否需要分号取决于指令类型
            if (peek().value === ';') consume();
            return atCall;
        }
        
        // 关键字语句
        if (peek().value === 'if') return parseIf();
        if (peek().value === 'while') return parseWhile();
        if (peek().value === 'for') return parseFor();
        if (peek().value === 'break') { consume(); expect('symbol', ';'); return { type: 'break' }; }
        if (peek().value === 'continue') { consume(); expect('symbol', ';'); return { type: 'continue' }; }
        
        // 表达式语句
        var expr = parseExpr();
        if (peek().value === ';') consume();
        return { type: 'expr', expr: expr };
    }
    
    function parseBlock() {
        expect('symbol', '{');
        var stmts = [];
        while (peek().value !== '}' && peek().type !== 'eof') {
            stmts.push(parseStatement());
        }
        expect('symbol', '}');
        return stmts;
    }
    
    function parseIf() {
        consume();
        expect('symbol', '(');
        var cond = parseExpr();
        expect('symbol', ')');
        var then = parseStatement();
        var elseStmt = null;
        if (peek().value === 'else') { consume(); elseStmt = parseStatement(); }
        return { type: 'if', cond: cond, then: then, else: elseStmt };
    }
    
    function parseWhile() {
        consume();
        expect('symbol', '(');
        var cond = parseExpr();
        expect('symbol', ')');
        var body = parseStatement();
        return { type: 'while', cond: cond, body: body };
    }
    
    function parseFor() {
        consume();
        expect('symbol', '(');
        
        // for(init; cond; inc)
        if (peek().value !== ')' && tokens[pos + 1] && tokens[pos + 1].value === ':') {
            // for(1:10) 范围循环
            var start = parseExpr();
            expect('symbol', ':');
            var end = parseExpr();
            expect('symbol', ')');
            var body = parseStatement();
            return { type: 'forRange', start: start, end: end, body: body };
        }
        
        var init = null;
        if (peek().value !== ';') init = parseStatementPart();
        expect('symbol', ';');
        var cond = null;
        if (peek().value !== ';') cond = parseExpr();
        expect('symbol', ';');
        var inc = null;
        if (peek().value !== ')') inc = parseExpr();
        expect('symbol', ')');
        var body = parseStatement();
        return { type: 'for', init: init, cond: cond, inc: inc, body: body };
    }
    
    function parseStatementPart() {
        return parseExpr();
    }
    
    // 解析函数参数: $a,$b&
    function parseFuncParams() {
        var params = [];
        while (peek().value !== '{') {
            if (peek().value === ',' || peek().value === '&') {
                consume();
                continue;
            }
            if (peek().value === ')') break;
            if (peek().type === 'variable') {
                var name = consume().value;
                var isRef = false;
                if (peek().value === '&') {
                    isRef = true;
                    consume();
                }
                params.push({ name: name, isRef: isRef });
            } else {
                consume();
            }
        }
        return params;
    }
    
    // === 顶层 ===
    var topLevel = [];
    
    while (peek().type !== 'eof') {
        // @Regfunc<ret>Param:$a,$b&{...}
        if (peek().type === 'atDirective' && peek().value === '@Regfunc') {
            consume();
            var retType = 'auto';
            if (peek().value === '<') {
                consume();
                retType = expect('identifier').value;
                expect('symbol', '>');
            }
            expect('identifier', 'Param');
            expect('symbol', ':');
            var params = parseFuncParams();
            var body = parseBlock();
            topLevel.push({ type: 'regfunc', returnType: retType, params: params, body: body });
            continue;
        }
        
        // @RegQuestion{...}
        if (peek().type === 'atDirective' && peek().value === '@RegQuestion') {
            consume();
            var qBody = parseBlock();
            topLevel.push({ type: 'regQuestion', body: qBody });
            continue;
        }
        
        // @Qinit{...}
        if (peek().type === 'atDirective' && peek().value === '@Qinit') {
            consume();
            var qinitBody = parseBlock();
            topLevel.push({ type: 'qinit', body: qinitBody });
            continue;
        }
        
        // 其他语句
        topLevel.push(parseStatement());
    }
    
    return { body: topLevel };
}

// 解析函数参数: $a,$b&
// 必须在 parse 函数内部调用，使用闭包中的 peek/consume/expect

