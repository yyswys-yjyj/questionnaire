// QCTokenizer — QinitCode 词法分析
// @ts-nocheck

// 关键字列表
var KEYWORDS = {
    'if': true, 'else': true, 'while': true, 'for': true,
    'break': true, 'continue': true, 'true': true, 'false': true,
    'arr': true, 'null': true,
};

// @ 指令名（仅用于 token 类型识别，不拦截标识符）
var AT_DIRECTIVES = {
    'Qinit': true, 'Regfunc': true, 'RegQuestion': true,
    'SetCallBackName': true, 'RunFunc': true, 'CallBackReturn': true,
    'EventRestart': true, 'RunQLangCode': true,
    'GetEventInfo': true, 'SearchQuestionID': true,
    'GetAllCustomComponentInUse': true,
    'QinitSet': true, 'SetQName': true, 'ComponentDef': true,
    'ComponentSet': true, 'RegAnserTool': true, 'AnserEventReturn': true,
    'StringFormat': true, 'join': true,
    'len': true, 'typeOf': true, 'toString': true, 'toInt': true, 'toBool': true,
    'throw': true, 'try': true, 'catch': true, 'log': true,
};

export function tokenize(code) {
    var tokens = [];
    var i = 0;
    var line = 1;
    
    while (i < code.length) {
        var c = code[i];
        
        // 空白
        if (/\s/.test(c)) {
            if (c === '\n') line++;
            i++;
            continue;
        }
        
        // 注释：// 或 /* */
        if (c === '/' && code[i + 1] === '/') {
            while (i < code.length && code[i] !== '\n') i++;
            continue;
        }
        if (c === '/' && code[i + 1] === '*') {
            i += 2;
            while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) {
                if (code[i] === '\n') line++;
                i++;
            }
            if (i < code.length) i += 2;
            continue;
        }
        
        // 字符串 "..."
        if (c === '"') {
            var start = i;
            i++;
            while (i < code.length && code[i] !== '"') {
                if (code[i] === '\\' && i + 1 < code.length) i += 2;
                else i++;
            }
            if (i < code.length) i++;
            tokens.push({ type: 'string', value: code.substring(start, i), line: line });
            continue;
        }
        
        // 字符 'x'
        if (c === "'") {
            var chStart = i;
            i++;
            if (i < code.length && code[i] === '\\') i += 2;
            else if (i < code.length) i++;
            if (i < code.length) i++;
            tokens.push({ type: 'char', value: code.substring(chStart, i), line: line });
            continue;
        }
        
        // 数字
        if (/[0-9]/.test(c)) {
            var numStart = i;
            while (i < code.length && /[0-9.]/.test(code[i])) i++;
            tokens.push({ type: 'number', value: code.substring(numStart, i), line: line });
            continue;
        }
        
        // $ 变量
        if (c === '$') {
            var varStart = i;
            i++;
            while (i < code.length && /[a-zA-Z0-9_]/.test(code[i])) i++;
            tokens.push({ type: 'variable', value: code.substring(varStart, i), line: line });
            continue;
        }
        
        // @ 事件指令
        if (c === '@') {
            var atStart = i;
            i++;
            while (i < code.length && /[a-zA-Z0-9_]/.test(code[i])) i++;
            var word = code.substring(atStart, i);
            tokens.push({ type: 'atDirective', value: word, line: line });
            continue;
        }
        
        // 标识符 / 关键字
        if (/[a-zA-Z_]/.test(c)) {
            var idStart = i;
            while (i < code.length && /[a-zA-Z0-9_]/.test(code[i])) i++;
            var word = code.substring(idStart, i);
            tokens.push({ type: KEYWORDS[word] ? 'keyword' : 'identifier', value: word, line: line });
            continue;
        }
        
        // 多字符操作符
        var twoChar = code.substring(i, i + 2);
        var twoOps = { '==': true, '!=': true, '<=': true, '>=': true,
                       '&&': true, '||': true, '+=': true, '-=': true,
                       '->': true };
        if (twoOps[twoChar]) {
            tokens.push({ type: 'operator', value: twoChar, line: line });
            i += 2;
            continue;
        }
        
        // 单字符符号
        tokens.push({ type: 'symbol', value: c, line: line });
        i++;
    }
    
    return tokens;
}
