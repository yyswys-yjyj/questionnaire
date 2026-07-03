/* METADATA
{
  "name": "questionnaire",
  "display_name": {
    "zh": "问卷提问",
    "en": "Questionnaire"
  },
"description": {
        "zh": "问卷提问：在你需要向用户提问或收集用户信息时可使用，此工具可向用户发送一份表单，支持多题型。需要注意的是，你需要在先使用该工具包编译可运行的表单，随后把 xml 发出来，这将会自动渲染为可填表单。",
        "en": "Survey tool: You can use this when you need to ask users questions or collect information from them. It allows you to send users a form with multiple question types. Note that you'll first need to compile the form into a runnable version using this toolkit, and then send out the XML file - it will automatically render into a fillable form."
      },
  "category": "Utility",
  "env": [
    {
      "name": "QUESTIONNAIRE_THEME",
      "description": {
        "zh": "问卷主题：classic（圆润模式）/ compact（方正模式），默认 classic",
        "en": "Questionnaire theme: classic (rounded) or compact (square), default classic"
      },
      "required": false
    },
    {
      "name": "QUESTIONNAIRE_BUTTON_LAYOUT",
      "description": {
        "zh": "按钮布局：row（一行一个，醒目）/ scroll（LazyRow滑动，经典），默认 scroll",
        "en": "Button layout: row (one per row, prominent) or scroll (LazyRow sliding, classic), default scroll"
      },
      "required": false
    },
    {
      "name": "QUESTIONNAIRE_TIME_INPUT_MODE",
      "description": {
        "zh": "时间输入模式：picker（按钮选择器）/ input（手动输入 hh:mm:ss），默认 picker",
        "en": "Time input mode: picker (button selector) or input (manual hh:mm:ss), default picker"
      },
      "required": false
    },
    {
      "name": "QUESTIONNAIRE_DISPLAY_MODE",
      "description": {
        "zh": "显示模式：hidden（显示源码，不渲染问卷）/ blocked（拦截，显示警告页）/ normal（正常显示），默认 normal",
        "en": "Display mode: hidden (show source code) / blocked (show warning page) / normal (show normally), default normal"
      },
      "required": false
    },
    {
      "name": "QUESTIONNAIRE_STRICT_MODE",
      "description": {
        "zh": "语法检查模式：true（严谨，检查全部语法）/ false（宽松，放行部分非致命错误），默认 true",
        "en": "Syntax check mode: true (strict, check all) / false (loose, skip non-critical errors), default true"
      },
      "required": false
    },
    {
      "name": "QUESTIONNAIRE_LAYOUT",
      "description": {
        "zh": "问卷布局：continuous（所有题目连续显示）/ compact（分页，一页5题 + 提交页），默认 continuous",
        "en": "Questionnaire layout: continuous (all questions shown) / compact (paginated, 5 per page + submit page), default continuous"
      },
      "required": false
    }
  ],
  "tools": [
    {
      "name": "ask",
      "description": {
            "zh": "编译一份结构化问卷的 XML 标签。重要：必须先调用本工具（questionnaire:ask）生成 XML，不要在你不了解语法的情况下手写 questionnaire 标签。本包还提供 questionnaire:importqlg 工具用于导入外部 .qlg 库文件。调用工具后，AI 需在回复中输出返回的 xml 内容（<questionnaire>...</questionnaire>），会自动渲染为可填表单（注意 xml 起始于闭合的 questionnaire 别打错了）。支持题型：single单选(含\"其他\"输入)、multiple多选、text单行文本、textarea多行文本、rating评分(1-5星)、likert李克特量表(1-5程度)、nps净推荐值(0-10)、time时间选择(HH:MM)。支持功能：分区(section)含subtitle子标题、required必答题标识。id 由工具自动生成，无需手动填写。注意：<questionnaire> 必须是最顶层的 XML 标签，不要嵌套在 <html>、<div> 或其他标签内部。注意：所有题型（section/text/textarea/single/rating/likert/nps/multiple/time）都支持 subtitle 字段，建议为每道题添加 subtitle 作为填写提示或说明文字。新增 check_level 参数：将AI调用ask生成问卷视为编译过程，支持'0'（严格）/ 正整数N（允许N个警告）/ 'inf'（不检查）。关于渲染检查：如果编译的问卷xml 存在问题，渲染给用户的将会是错误页面，用户点击“提醒”按钮后，你将会收到格式如下的错误信息：⚠️ [错误类型]：[错误信息]。关于“一次问卷”：问卷在用户提交后会被整理成一份格式化的消息文本发送给你，注意，在发送问卷后，除非重新加载，否则不支持对问卷进行修改或追加操作。脚本式使用外部库：先调用 questionnaire:importqlg 导入 .qlg 库文件，然后在 resultcode 中用 #include <库名> 展开库内容。详情见 resultcode 参数说明。",
            \"en\": \"Generate questionnaire XML. AI outputs <questionnaire>...</questionnaire> tag. This package also provides questionnaire:importqlg for importing .qlg library files. Types: single(with other input), multiple, text, textarea, rating(1-5 star), likert(Likert scale 1-5), nps(0-10), time(HH:MM). Features: section with subtitle, required flag. ID is auto-generated. NOTE: <questionnaire> must be the top-level XML tag, do NOT nest it inside <html>, <div> or any other tag. New param check_level: treat generation as compilation. '0' (strict) / positive N (allow N warnings) / 'inf' (skip checks). v1.6.0-Alpha: Use questionnaire:importqlg to import .qlg library, then use #include <libname> in resultcode. See resultcode param for details.\"
      },
      "parameters": [
        {
          "name": "title",
          "description": {
            "zh": "问卷标题，简短概括收集目的",
            "en": "Questionnaire title, briefly describe the purpose"
          },
          "type": "string",
          "required": true
        },
        {
          "name": "questions",
          "description": {
            "zh": "问题列表 JSON 数组字符串。每道题是一个对象，支持的字段：\n- type（必填）：题型，可选值：section（分区标题）/ single（单选）/ multiple（多选）/ text（文本）/ textarea（多行文本）/ rating（评分1-5星）/ likert（李克特量表1-5级）/ nps（净推荐值0-10）/ time（时间选择HH:MM）\n- question（必填）：题目文字，string\n- options（single/multiple/likert 必填）：选项数组，例如 [\"是\",\"否\"]\n- required（可选）：是否必答，boolean，默认 false\n- subtitle（可选，所有题型都支持）：副标题/说明文字，string。section 的分区说明、text/single/rating/likert/nps/multiple/time 等题目均可使用\n- enableOther（可选，仅 single）：是否启用\"其他\"自定义输入，boolean\n- id（可选，建议不传）：题目唯一标识，string，不传时由工具自动生成\n- result（可选，问卷顶层字段，放第一题中即可）：结果表达式。用途：根据用户填写的答案自动计算并输出结论，提交时追加到消息末尾。格式：二维数组，外层每组用逗号拼接输出，内层每条独立判断。单条格式：(条件)?成立时:不成立时\n  语法（同 C++ 三目运算符 ?: 语法）：\n  · 变量引用：q1（文本值）、q1.num（数字值）、q1.text（标签文本，自动映射）\n  · .text映射：rating→很差/较差/一般/满意/非常满意；likert→选项文本；nps→推荐者/被动者/贬损者\n  · 比较：== != > < >= <=\n  · 正则：q1===/正则表达式/（例如 (q1===/^张/)?张姓:非张姓 表示开头是张则输出张姓；或 (q1===/[0-9]+/)?含数字:无数字）\n  · 逻辑：|| && ! 和圆括号嵌套\n  · 算术：+ -\n  · 三目：(条件)?成立时:不成立时（输出结果直接写文字，不需要引号）\n  · 链式：(条件1)?结果1:(条件2)?结果2:默认（输出结果直接写文字，不需要引号）\n  · 条件中的字符串才需要双引号，如 (q2==\"男\")?先生:女士\n  · 同组多条用逗号分隔，独立判断\n  示例：[[\"(q2==\"男\")?先生:女士\"],[\"(q3.num>=4)?高分:低分\"],[\"(q4.text==\"满意\")?满意\",\"(q4.text==\"非常满意\")?非常满意\"]]\n- count（可选，问卷顶层字段）：boolean，必须为 true 才启用 result\n- output_raw（可选，问卷顶层字段）：boolean，选填，默认 true。设为 false 时聊天只显示结果不显示原始答案，UI 仍然正常显示。注意：普通问卷（不使用 result 表达式）不需要设置 count/output_raw/result 这些字段，只传 title 和 questions 即可\n\n⚠️ JSON 转义说明（重要）：\n- questions 参数的值必须是字符串，不要传 JS 对象\n- 正确写法：questions='[{\"type\":\"text\",\"question\":\"姓名\"}]'\n- 整个 questions 内容外层用单引号包裹\n- 里面每道题的 key 用双引号包裹\n- 如果问题文字中包含双引号，用 \" 转义\n- 常见错误：直接传 [{type:...}]（对象而非字符串）、用了单引号在里面\n\n示例：[\n  {\"type\":\"text\",\"question\":\"姓名\",\"required\":true},\n  {\"type\":\"single\",\"question\":\"性别\",\"options\":[\"男\",\"女\"]},\n  {\"type\":\"section\",\"question\":\"评价\",\"subtitle\":\"请打分\"},\n  {\"type\":\"rating\",\"question\":\"满意度\",\"required\":true}\n]",
            "en": "JSON array string of questions. Each question object supports: type (required: section/single/multiple/text/textarea/rating/likert/nps), question (required, string), options (required for single/multiple/likert, array), required (optional, boolean), subtitle (optional, string), enableOther (optional, boolean, single only), id (optional, auto-generated). Example: [{\"type\":\"text\",\"question\":\"Name\",\"required\":true},{\"type\":\"single\",\"question\":\"Gender\",\"options\":[\"Male\",\"Female\"]}]"
          },
          "type": "string",
          "required": true
        },
        {
          "name": "is_count_mode",
          "description": {
            "zh": "是否启用计数模式（提交后仅输出统计结果，不输出原始答案）。默认为 false，不启用。",
            "en": "Enable count mode. When true, only aggregated result is output, raw answers are hidden. Default false."
          },
          "type": "boolean",
          "required": false
        },
        {
          "name": "use_expression",
          "description": {
            "zh": "是否启用结果表达式。设为 true 时，AI 必须在问卷 JSON 中提供 'result' 字段（表达式数组）和 'count': true。若 use_expression 为 false 但 is_count_mode 为 true，参数冲突，ask 将拒绝生成并返回错误。",
            "en": "Enable result expression. When true, AI must include 'result' and 'count':true in questionnaire JSON. If use_expression is false while is_count_mode is true, this is a parameter conflict and ask will reject."
          },
          "type": "boolean",
          "required": false
        },
        {
          "name": "result",
          "description": {
            "zh": "结果表达式（可选），JSON 字符串格式，直接作为参数传入即可，不用塞进 questions 里。根据用户填写的答案自动计算并输出结论。格式：二维数组的 JSON 字符串，例如 '[[\"(q1.num>=4)?高分:低分\"]]'。详见 questions 字段中的 result 说明。字符串比较支持单引号和双引号两种写法，例如 (q2=='男')?先生:女士 或 (q2==\"男\")?先生:女士。注意：result 和 resultcode 不能同时使用。",
            "en": "Result expression (optional). JSON string format. 2D array JSON string, e.g. '[[\"(q1.num>=4)?high:low\"]]'. See result field in questions for details. NOTE: result and resultcode cannot be used together."
          },
          "type": "string",
          "required": false
        },
        {
          "name": "use_result",
          "description": {
            "zh": "是否启用结果计算（可选）。当传了 result 时，此字段必须设为 true。工具会将此值写入问卷 JSON 的 count 字段。",
            "en": "Enable result calculation (optional). Must be true when result is provided. Written as 'count' in the questionnaire JSON."
          },
          "type": "boolean",
          "required": false
        },
        {
          "name": "count",
          "description": {
            "zh": "是否启用结果模式（与 use_result 等效）。设为 true 时启用结果计算。注意：普通问卷不需要此字段。",
            "en": "Enable result mode (equivalent to use_result). Set to true to enable result calculation. Not needed for normal questionnaires."
          },
          "type": "boolean",
          "required": false
        },
        {
          "name": "output_raw",
          "description": {
            "zh": "仅结果模式（可选，默认 true）。设为 false 时聊天只显示结果不显示原始答案，UI 仍然正常显示。",
            "en": "Result-only mode (optional, default true). Set to false to hide raw answers in chat."
          },
          "type": "boolean",
          "required": false
        },
        {
          "name": "resultcode",
          "description": {
            "zh": "结果脚本(可选)，与result互斥。QLang v2：问卷XML内用<resultcode>子标签包裹代码。类C++弱缩进脚本，必须写int main()入口并return 0;。分号分隔，无需缩进。\n类型：int/int32(±2.1B)、short(±32K)、long(±2.1B)、longlong/int64(±9e15，此外 longlong 是连在一起的不加空格)、unsigned/uint(0~4.29B)、float/double、bool、string、char。所有整型赋值时自动截断到边界，不会回绕。类型转换函数：_short(v)、_int(v)、_long(v)、_longlong(v)、_int64(v)、_uint(v)、_unsigned(v)、_int32(v)。\n基础：一维二维数组、for/while(嵌套break continue)、if-else(含and or not)、四则运算含取模、比较、字符串拼接、print(逗号多参)/cout输出、i++/--/+=、const只读变量、1e9、注释。\n标签跳转（锚点，仅同一函数内生效，不重置变量）：setap 标签名; gotoap 标签名; 标签名支持数字/字母/十六进制组合（如 1、A、1A）\n示例：int i=0; setap 1; printf(\"%d\",i); i++; if(i<3) gotoap 1;\n问卷数据通过参数传入：int main(int qid)，通过指针访问 qid->q1_num(int) 和 qid->q1_text(string)。各题型映射：text/textarea→num=-1 text=原文(textarea换行符转\n)；single→num=1 text=选项文本；multiple→num=选择数 text=选项空格隔开；rating/likert/nps→num=按钮编号 text=编号；time→num=时间戳秒数 text=HH:MM:SS。\n内置函数：_gcd parseInt。自定义函数。PHP变量：$var=value。\nSTL容器(容量1000)：stack push/pop/top/size/empty；queue push/pop/front/back/size；vector push_back/pop_back/get/set/size/clear；pair first/second；priority_queue大顶堆 push/pop/top/size/empty。\ncstring：sizeof size strlen strcmp strcpy。printf格式化(%d/%s/%x/%o/%p)。\n指针(&取地址/*解引用)。链式作用域(块/函数)。地址表空间256MB，超限报错。总时限10秒。\n结构体：struct定义，Node* p=new Node; p->val=1; p->next=0; while(p!=0) p=p->next。空指针报错。\n异常处理：try{...}catch(e){...}捕获运行时错误，throw expr抛出错误，abort(\"msg\")立即终止脚本并报错。\n外部库：1. 使用 questionnaire:importqlg(path) 导入 .qlg 库文件到 /sdcard/Download/Operit/questionnaire/QLangRuntime/library/；2. 在 resultcode 中用 #include <库名>（不含 .qlg 后缀）展开库内容；3. 库文件格式：以 #defNS 命名空间名 开头声明所属命名空间，默认 qlgstd；4. using namespace qlgstd 切换当前代码使用的命名空间（不写则默认 qlgstd）；5. 主代码中不允许使用 #defNS，该指令仅用于外部库文件：6. 库文件可提供 main 函数，主代码只需 #include <库名> 即可运行；7. 示例库文件（保存为 math.qlg 后用 importqlg 导入）：   #defNS qlgstd\n   using namespace qlgstd;\n   int add(int a, int b) { return a + b; }\n   int fact(int n) { if(n<=1) return 1; return n*fact(n-1); }\n   然后在 resultcode 中使用：#include <math>\n   int main(){ printf(\"%d\",add(3,4)); return 0; }\n示例：struct Node{int v;int next;}; int main(){Node* h=0; Node* n=new Node; n->v=1; n->next=h; h=n; printf(\"%d\",h->v); return 0; }",
            "en": "Result script, use <resultcode> sub-XML tag. C++-like, must have int main()+return 0;. Semicolons, no indent.\nTypes: int/int32(±2.1B), short(±32K), long(±2.1B), longlong/int64(±9e15), unsigned/uint(0~4.29B), float/double, bool, string, char. Auto clamp on overflow, no wrap-around. Type cast: _short(v), _int(v), _long(v), _longlong(v), _int64(v), _uint(v), _unsigned(v), _int32(v).\n1D/2D arrays, for/while(nested break continue), if-else(and or not), arithmetic(including modulo), comparisons, string concat, print(comma multi-arg)/cout, ++/--/+=, const, 1e9, comments.\nLabel jump (anchor, function-scoped only, no var reset): setap name; gotoap name; name supports numbers/letters/hex (e.g. 1, A, 1A)\nExample: int i=0; setap 1; printf(\"%d\",i); i++; if(i<3) gotoap 1;\nQID via param: int main(int qid), access via qid->q1_num(int) and qid->q1_text(string). Mappings: text/textarea→num=-1 text=raw(textarea \n escaped); single→num=1 text=option; multiple→num=count text=options space-separated; rating/likert/nps→num=value text=value; time→num=timestamp(sec) text=HH:MM:SS.\nBuilt-in: _gcd, parseInt. Custom functions. PHP-style: $var=value;.\nSTL(cap 1000): stack/queue/vector/pair/priority_queue. cstring: sizeof/size/strlen/strcmp/strcpy. printf(%d/%s/%x/%o/%p).\nPointers(&address/*deref). Scope chain(block/function). 256MB address space, overflow error. Total timeout 10s.\nStruct: struct+new, Node* p=new Node; p->val=1; p->next=0; while(p!=0) p=p->next. null pointer error.\nException: try{...}catch(e){...} catch runtime errors, throw expr, abort(\"msg\") terminate script with error.\nexample: struct Node{int v;int next;}; int main(){Node* h=0; Node* n=new Node; n->v=1; n->next=h; h=n; printf(\"%d\",h->v); return 0; }"
          },
          "type": "string",
          "required": false
        },
        {
          "name": "check_level",
          "description": {
            "zh": "编译检查等级。将AI调用ask生成问卷视为编译过程，此参数控制编译时的检查严格程度。可选值：'0'或留空（严格模式，所有错误直接拒绝）；正整数N（最多允许N个非致命错误，收集警告但仍生成XML）；'inf'（不检查语法，放行所有内容）。默认'0'。关于 Json：Json 格式是要求100%正确，该错误不可被忽略。",
            "en": "Compile check level. Treats questionnaire generation as a compilation. Values: '0'/empty (strict, reject on any error); positive integer N (allow up to N non-fatal errors, emit warnings but still generate XML); 'inf' (skip all checks, pass everything). Default '0'.Regarding JSON: The JSON format must be 100% correct; this error cannot be ignored."
          },
          "type": "string",
          "required": true
        },
        {
          "name": "roll_spec",
          "description": {
            "zh": "是否启用卷谱。卷谱是一个紧凑的统计编码字符串，该功能能帮助你了解问卷的填写情况，适合抽查问卷填写情况、分析数据使用，推荐开启，格式为组=连续拼接的节，节=qid(纯数字)+必填/选填(r/s)+已填/未填(t/-)。例如 1rt2s- 表示第1题必填已填、第2题选填未填。启用后会在问卷提交时生成卷谱并注入到消息中。默认不启用。",
            "en": "Enable roll spec. A compact stats string: group = concatenated sections, section = qid(digit)+required/optional(r/s)+filled/not_filled(t/-). E.g. 1rt2s- means Q1 required+filled, Q2 optional+not_filled. Generated on submit and injected into message. Default disabled."
          },
          "type": "boolean",
          "required": false
        }
      ]
    },
      {
        "name": "importqlg",
        "description": {
          "zh": "从外部导入 qlg 文件到外部库中，供后续 resultcode 脚本通过 #include 引用。库目录在首次使用时自动创建。",
          "en": "Copy a .qlg file to QLang runtime library directory for later #include usage in resultcode scripts."
        },
        "parameters": [
          {
            "name": "path",
            "description": {
              "zh": "要导入的 .qlg 文件路径（Android 本地路径）。文件必须以 .qlg 结尾。",
              "en": "Path to the .qlg file to import. File must end with .qlg."
            },
            "type": "string",
            "required": true
          }
        ]
      }
  ]
}
*/
var askPackage = (function () {
    var _counter = Date.now();
        function syncReadFile(p){
        try{
            var r = NativeInterface.callTool("","read_file",JSON.stringify({path:p}));
            var o = JSON.parse(r);
            if(o && o.data && o.data.content){var raw=o.data.content;raw=raw.replace(/^\d+\|\s*\d+\|\s*/gm,"");return raw;}
            if(o && o.content) return o.content;
            return String(o || "");
        }catch(e){return "";}
    }
    function syncWriteFile(p,content){
        NativeInterface.callTool("","write_file",JSON.stringify({path:p,content:content}));
    }
    function syncMkdir(p){
        NativeInterface.callTool("","make_directory",JSON.stringify({path:p,create_parents:true}));
    }
    function parseResultString(s) {
        if (typeof s !== 'string' || s[0] !== '[') return null;
        try {
            // 先试试标准 JSON.parse
            var r = JSON.parse(s);
            if (Array.isArray(r)) return r;
        } catch (e) {}
        // 手动解析：只按 [] 嵌套和 , 分割，不依赖引号
        var result = [];
        var currentGroup = [];
        var buf = '';
        var depth = 0;
        var inStr = false;
        for (var i = 0; i < s.length; i++) {
            var c = s[i];
            if (c === '\\' && inStr) {
                buf += c;
                i++;
                if (i < s.length) buf += s[i];
                continue;
            }
            if (c === '"') { inStr = !inStr; continue; }
            if (inStr) { buf += c; continue; }
            if (c === '[') {
                depth++;
                if (depth === 2) buf = '';
                continue;
            }
            if (c === ']') {
                depth--;
                if (depth === 1 && buf.trim()) {
                    var expr = buf.trim();
                    // 去掉首尾引号，并把双引号替换为单引号
                    if (expr.length >= 2 && ((expr[0] === '"' && expr[expr.length-1] === '"') || (expr[0] === "'" && expr[expr.length-1] === "'")))
                        expr = expr.substring(1, expr.length - 1);
                    expr = expr.replace(/"/g, "'");
                    currentGroup.push(expr);
                    buf = '';
                }
                if (depth === 0 && currentGroup.length > 0) {
                    result.push(currentGroup);
                    currentGroup = [];
                }
                continue;
            }
            if (c === ',' && depth === 2 && buf.trim()) {
                var expr2 = buf.trim();
                if (expr2.length >= 2 && ((expr2[0] === '"' && expr2[expr2.length-1] === '"') || (expr2[0] === "'" && expr2[expr2.length-1] === "'")))
                    expr2 = expr2.substring(1, expr2.length - 1);
                expr2 = expr2.replace(/"/g, "'");
                currentGroup.push(expr2);
                buf = '';
                continue;
            }
            buf += c;
        }
        return result.length > 0 ? result : null;
    }
    async function ask(params) {
        var title = params.title || "问卷";
        // 读取编译检查等级
        var checkLevel = params.check_level;
        var checkInf = checkLevel === "inf";
        var checkMaxErrors = -1;
        if (!checkInf && checkLevel !== undefined && checkLevel !== "" && checkLevel !== "0") {
            var n = parseInt(checkLevel);
            if (!isNaN(n) && n > 0) checkMaxErrors = n;
        }
        var errors = [];
        function addError(msg) { errors.push(msg); }
        var questions = [];
        if (params.questions && typeof params.questions === "object" && typeof params.questions !== "string") {
            params.questions = JSON.stringify(params.questions);
        }
        try {
            questions = JSON.parse(params.questions);
            if (!Array.isArray(questions)) questions = [];
        } catch (e) { questions = []; }
        if (!checkInf) {
        // 常见参数错误检测：AI 用了错误的字段名
        if (params.questionnaire) {
            addError("参数错误：你使用了 'questionnaire' 字段，正确字段名是 'questions'（JSON 数组字符串）。请重新调用 questionnaire:ask，参数名是 title 和 questions，不要用其他名字。");
        }
        if (questions.length === 0) {
            addError("问题列表不能为空");
        }
        // 校验每道题的必要字段
        var validTypes = { section: true, single: true, multiple: true, text: true, textarea: true, rating: true, likert: true, nps: true, time: true };
        var needsOptions = { single: true, multiple: true, likert: true };
        for (var vi = 0; vi < questions.length; vi++) {
            var vq = questions[vi];
            // 跳过纯配置题（只有 result/count/output_raw 没有 type）
            if (!vq.type && (vq.result || vq.count !== undefined || vq.output_raw !== undefined))
                continue;
            if (!vq.type || typeof vq.type !== "string") {
                addError("第" + (vi + 1) + "题缺少 type 字段");
            }
            if (!validTypes[vq.type]) {
                addError("第" + (vi + 1) + "题 type 不合法: " + vq.type + "，合法值: section/single/multiple/text/textarea/rating/likert/nps");
            }
            if (!vq.question || typeof vq.question !== "string" || vq.question.trim() === "") {
                addError("第" + (vi + 1) + "题缺少 question 字段（注意字段名是 question 不是 title）");
            }
            // 检测 options 格式错误：AI 可能传了 [{label:...}] 而不是 ["选项1","选项2"]
            if (vq.options && Array.isArray(vq.options) && vq.options.length > 0) {
                if (typeof vq.options[0] === "object") {
                    addError("第" + (vi + 1) + "题 options 格式错误：应该是字符串数组 [\"选项1\",\"选项2\"]，不是对象数组 [{label:...}]");
                }
            }
            if (needsOptions[vq.type] && (!vq.options || !Array.isArray(vq.options) || vq.options.length < 2)) {
                addError("第" + (vi + 1) + "题（" + vq.type + "）至少需要2个选项");
            }
            // 检测不支持的字段名
            var allowedFields = { type: true, question: true, options: true, required: true, subtitle: true, enableOther: true, id: true, result: true, count: true, output_raw: true };
            for (var fk in vq) {
                if (!allowedFields[fk]) {
                    addError("第" + (vi + 1) + "题存在不支持的字段 '" + fk + "'，正确字段名：type/question/options/required/subtitle/enableOther/id");
                }
            }
        }
        // 参数冲突检测
        var isCountMode = params.is_count_mode === true;
        var useExpr = params.use_expression === true;
        if (isCountMode === true && useExpr === false) {
            addError("参数冲突：is_count_mode=true 要求 use_expression=true，但 use_expression=false");
        }
        // 检查错误数量是否超标
        if (errors.length > 0) {
            if (checkMaxErrors < 0 || errors.length > checkMaxErrors) {
                return { success: false, error: "编译错误（共" + errors.length + "个）：" + errors.join("；"), message: "编译错误（共" + errors.length + "个）：\n" + errors.join("\n") };
            }
        }
        } // end if (!checkInf)
        // 自动为每个问题生成唯一 id（q1, q2, ... 兼容原作格式）
        var qIdx = 1, secIdx = 1;
        for (var qi = 0; qi < questions.length; qi++) {
            var q = questions[qi];
            if (q.type === "section") {
                q.id = "sec" + (secIdx++);
            }
            else {
                q.id = "q" + (qIdx++);
            }
        }
        // 构建问卷 XML：提取 result/count/output_raw 作为顶层字段
        // 注意：这些不是题目字段，是问卷级别的配置，必须放在 JSON 顶层
        // 构建问卷 XML：从 params 或 questions 中提取 result/count/output_raw 作为顶层字段
        var topLevelResult = null;
        if (params.result) {
            if (typeof params.result === "string") {
                topLevelResult = parseResultString(params.result);
                if (topLevelResult === null) {
                    try {
                        topLevelResult = JSON.parse(params.result);
                    }
                    catch (e) {
                        topLevelResult = params.result;
                    }
                }
            }
            else {
                topLevelResult = params.result;
            }
        }
        var topLevelUseResult = params.use_result !== undefined ? params.use_result : (params.count !== undefined ? params.count : null);
        // 当 use_expression 为 true 时自动启用 count 模式
        if (topLevelUseResult === null && params.use_expression === true) {
            topLevelUseResult = true;
        }
        var topLevelResultCode = null;
        if (params.resultcode) {
            if (typeof params.resultcode === "string") {
                try { topLevelResultCode = JSON.parse(params.resultcode); } catch (e) { topLevelResultCode = params.resultcode; }
            } else {
                topLevelResultCode = params.resultcode;
            }
        }
        var topLevelOutputRaw = params.output_raw !== undefined ? params.output_raw : null;
        var cleanedQuestions = [];
        for (var xi = 0; xi < questions.length; xi++) {
            var xq = questions[xi];
            // 从 questions 中提取（兼容旧用法）
            if (!topLevelResult && xq.result)
                topLevelResult = xq.result;
            if (topLevelUseResult === null && xq.count !== undefined)
                topLevelUseResult = xq.count;
            if (topLevelOutputRaw === null && xq.output_raw !== undefined)
                topLevelOutputRaw = xq.output_raw;
            // 跳过纯配置题
            if (xq.type || xq.question)
                cleanedQuestions.push(xq);
        }
        var xmlObj = { title: title, questions: cleanedQuestions };
        // resultcode 自动启用 count
        if (topLevelResultCode !== null) {
            topLevelUseResult = true;
        }
        
        if (topLevelUseResult !== null)
            xmlObj.count = topLevelUseResult;
        if (topLevelResult !== null)
            xmlObj.result = topLevelResult;
        if (topLevelOutputRaw !== null)
            xmlObj.output_raw = topLevelOutputRaw;
        if (params.roll_spec === true || params.roll_spec === 'true')
            xmlObj.roll_spec = true;
        var xmlContent = "<questionnaire>" +
            JSON.stringify(xmlObj);
        if (topLevelResultCode !== null) {
            xmlContent += "<resultcode>" + topLevelResultCode + "</resultcode>";
        }
        xmlContent += "</questionnaire>";
        return {
            success: true,
            count: questions.length,
            xml: xmlContent,
            message: errors.length > 0 ? "问卷已生成（编译警告" + errors.length + "个）：\n" + errors.join("\n") + "\n\n" + xmlContent : "问卷已生成，请在回复中输出以下 XML 标签：\n" + xmlContent,
            warnings: errors.length > 0 ? errors : undefined
        };
    }
        function importqlg(params) {
        var path = params.path;
        if (!path || typeof path !== "string") {
            return { success: false, error: "缺少参数 path" };
        }
        if (!path.endsWith(".qlg")) {
            return { success: false, error: "文件必须以 .qlg 结尾: " + path };
        }
        var libDir = "/sdcard/Download/Operit/questionnaire/QLangRuntime/library";
        try { syncMkdir(libDir, true); } catch(e) {}
        try {
            var fileName = path.split("/").pop();
            var destPath = libDir + "/" + fileName;
            var content = syncReadFile(path);
            if (typeof content === "object" && content && content.content) content = content.content;
            syncWriteFile(destPath, String(content));
            return { success: true, message: "已导入库文件: " + fileName, path: destPath };
        } catch(e) {
            return { success: false, error: "导入失败: " + e.message, path: path };
        }
    }
    return { ask: ask, importqlg: importqlg };
})();
exports.ask = askPackage.ask;
exports.importqlg = askPackage.importqlg;
