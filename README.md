# Questionnaire | 问卷提问（fix）
<p align="center">
  <img src="http://visitor.serveryyswys.top/cnt/questionnaire"></img><br><br><br>
</p>
该项目是源自Operit AI平台上我的一个小项目，包是基于liu-baia的原作[com.com.operit.questionnaire](https://github.com/liu-baia/OperitForge/releases/tag/package-com-operit-questionnaire-v0.1.0-396c8ead)进行二次开发   
该仓库的包在Operit AI中的包名是com.operit.questionnaire.fix（项目簇：com-operit-questionnaire-fix），代码由AI完成，项目方向就不是AI了用的是person（   
开源仓库中的包的版本：v1.6.0

## 介绍
基于原作，不断更新完善，随之加入些新的功能   
~~不过现在似乎已经沉浸在自己的艺术当中了（~~

## 功能一览（当前版本）
这个版本增了很多东西，蛮丰富的

### 新增特性
1. 丰富了数据类型，一次性添加了一堆新的数据类型
2. 加入了标签语法

> 至于VSCode插件，不会为1.6.1适配（因为1.6.1还没能从Operit AI里发出来，还有个恶性Bug我修不了）    
> 此外1.7.0中的内存系统会被再次重构，以抛弃JavaScript Number那一坨

## 外部库上传
你可以提个issue，上传你的外部库

## 反馈
如果你发现了BUG或是AI容易混淆语法，或是你有什么好点子，你可以在这个项目提个issue

# 外部库开发指南

有关外部库的编写，你可以从 项目[yyswys-yjyj/questionnaire-vscode_extension](https://github.com/yyswys-yjyj/questionnaire-vscode_extension) 中下载到QLang Extension for Microsoft Visual Studio Code（QLang扩展程序）

```
// example.qlg
#defNS example
using namespace qlgstd;

void echo_hello(){
  printf("hello QLang!\n")
}

string hello(){
  return "hello QLang!";
}
```
QLang 是问卷插件的内置脚本语言，用于在问卷提交后执行结果计算。语法类似 C++，弱缩进，分号分隔。本文档面向外部库开发者。

---

## 1. 快速开始

### 1.1 最简单的脚本

> 这里实际上是给AI看的

```
int main(int qid) {
    printf("Hello QLang!\n");
    return 0;
}
```

### 1.2 使用外部库

**步骤 1：编写库文件**（保存为 `math.qlg`）

```
#defNS math
using namespace qlgstd; //部分保留字是qlgstd下的函数

int add(int a, int b) {
    return a + b;
}

int fact(int n) {
    if (n <= 1) return 1;
    return n * fact(n - 1);
}
```

**步骤 2：导入库文件**

需要让ai通过 `questionnaire:importqlg` 工具导入：

```
questionnaire:importqlg(path="/sdcard/Download/Operit/questionnaire/QLangRuntime/library/math.qlg")
```

**步骤 3：在脚本中使用**

```
#include <math>

int main(int qid) {
    printf("%d\n", math::add(3, 4));
    printf("%d\n", math::fact(5));
    return 0;
}
```

---

## 2. 基础语法

### 2.1 注释

```
// 单行注释

/*
多行注释
*/
```

### 2.2 分号

每条语句必须以分号 `;` 结束。缩进不影响语义。

```
int a = 1; int b = 2;  // 正确
int c = 3               // 错误：缺少分号
```

### 2.3 变量声明

```
int a = 10;
string name = "Alice";
bool flag = true;
char c = 'A';
float pi = 3.14;
double d = 2.718;

const int MAX = 100;        // 只读变量
```

### 2.4 数组

```
int arr[5];                 // 一维数组
int arr2[3] = {1, 2, 3};    // 初始化
int matrix[2][3];           // 二维数组
```

### 2.5 PHP 风格变量

```
$var = 42;                  // 自动推断类型
$name = "hello";
```

---

## 3. 数据类型

| 类型 | 说明 | 默认值 |
|------|------|--------|
| `int` | 整数 | 0 |
| `float` | 单精度浮点 | 0.0 |
| `double` | 双精度浮点 | 0.0 |
| `string` | 字符串 | "" |
| `char` | 字符 | '' |
| `bool` | 布尔 | false |
| `void` | 无返回值 | - |

---

## 4. 运算符

### 4.1 算术运算符

```
+  -  *  /  %  (加 减 乘 除 取模)
```

### 4.2 比较运算符

```
==  !=  >  <  >=  <=
```

### 4.3 逻辑运算符

```
&&  ||  !   (and  or  not)
```

### 4.4 自增自减

```
i++  i--  ++i  --i
i += 5  i -= 3
```

### 4.5 字符串拼接

```
string msg = "Hello, " + "World!";
```

---

## 5. 控制流

### 5.1 if-else

```
if (a > 0) {
    printf("正数");
} else if (a == 0) {
    printf("零");
} else {
    printf("负数");
}
```

### 5.2 while

```
int i = 0;
while (i < 10) {
    printf("%d\n", i);
    i++;
}
```

### 5.3 for

```
for (int i = 0; i < 10; i++) {
    printf("%d\n", i);
}
```

### 5.4 break / continue

```
for (int i = 0; i < 10; i++) {
    if (i == 3) continue;   // 跳过第3次
    if (i == 8) break;      // 提前退出
}
```

---

## 6. 函数

### 6.1 函数声明

```
返回类型 函数名(参数列表) {
    函数体
    return 返回值;
}
```

示例：

```
int add(int a, int b) {
    return a + b;
}

void greet(string name) {
    printf("Hello, %s!\n", name);
}
```

### 6.2 递归

```
int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}
```

---

## 7. 命名空间

### 7.1 库文件命名空间

库文件使用 `#defNS` 声明所属命名空间：

```
#defNS math

int add(int a, int b) {
    return a + b;
}
```

如果你不想声明命名空间，你可以声明命名空间为qlgstd   
主代码无需（也不允许）使用 `#defNS`。

### 7.2 使用命名空间

```
// 方式一：使用 using namespace
using namespace math;

int main(int qid) {
    printf("%d", add(3, 4));    // 直接调用
    return 0;
}

// 方式二：使用 :: 操作符
int main(int qid) {
    printf("%d", math::add(3, 4));
    return 0;
}
```

---

## 8. 输出

### 8.1 printf

```
printf("Hello\n");
printf("数字: %d, 字符串: %s\n", num, str);
```

支持的格式化符：`%d`（整数）、`%s`（字符串）、`%x`（十六进制）、`%o`（八进制）、`%p`（指针）

### 8.2 cout

```
cout << "Hello" << "\n";
cout << "数字: " << num << "\n";
```

### 8.3 print

```
print("Hello", "World", 123);   // 逗号多参数，自动拼接
```

> 注意：使用print会使字符串之间自动加上一个空格

---

## 9. 结构体

### 9.1 定义结构体

```
struct Node {
    int val;
    int next;
};
```

### 9.2 创建与访问

```
Node* p = new Node;
p->val = 1;
p->next = 0;
printf("%d", p->val);

// 链表遍历
while (p != 0) {
    p = p->next;
}
```

- 空指针访问会报错
- `new` 返回指针（地址值），存储在地址表中

---

## 10. 指针

```
int x = 42;
int* p = &x;        // 取地址
printf("%d", *p);   // 解引用
```

---

## 11. 异常处理

### 11.1 try-catch

```
try {
    int x = 1 / 0;          // 触发运行时错误
} catch (e) {
    printf("捕获: %s\n", e);
}
```

### 11.2 throw

```
if (error) {
    throw "自定义错误";
}
```

### 11.3 abort

```
if (fatal) {
    abort("致命错误，立即终止");
}
```
`abort` 不会被 `catch` 捕获，直接终止脚本并抛出运行时错误。

---

## 12. 内置函数

| 函数 | 说明 |
|------|------|
| `_gcd(a, b)` | 最大公约数 |
| `parseInt(str)` | 字符串转整数（暂时无效，1.5.3更新中丢失了该保留字后续补） |

---

## 13. STL 容器

所有容器容量上限为 1000。

### 13.1 stack（栈）

```
stack s;
s.push(10);
s.push(20);
int top = s.top();      // 20
s.pop();
int size = s.size();    // 1
bool empty = s.empty(); // false
```

### 13.2 queue（队列）

```
queue q;
q.push(10);
q.push(20);
int front = q.front();  // 10
int back = q.back();    // 20
q.pop();
```

### 13.3 vector（动态数组）

```
vector v;
v.push_back(10);
v.push_back(20);
int val = v.get(0);     // 10
v.set(0, 100);
int size = v.size();    // 2
v.pop_back();
v.clear();
```

### 13.4 priority_queue（优先队列/大顶堆）

```
priority_queue pq;
pq.push(10);
pq.push(30);
pq.push(20);
int top = pq.top();     // 30（最大值）
pq.pop();
```

### 13.5 pair（键值对）

```
pair p;
p.first = 1;
p.second = 2;
```

---

## 14. 字符串函数

| 函数 | 说明 |
|------|------|
| `sizeof(arr)` | 数组大小 |
| `size(arr)` | 数组长度 |
| `strlen(s)` | 字符串长度 |
| `strcmp(a, b)` | 字符串比较 |
| `strcpy(dst, src)` | 字符串复制 |

---

## 15. 问卷数据访问：qid 指针

问卷答案通过 `main` 函数的参数传入，类型为指针。

### 15.1 函数签名

```
int main(int qid)
```

### 15.2 访问方式

通过箭头操作符 `->` 访问每个题目的数据：

```
int main(int qid) {
    printf("姓名: %s\n", qid->q1_text);
    printf("编号: %d\n", qid->q1_num);
    return 0;
}
```

### 15.3 字段命名规则

每个题目 id 对应两个字段：`{id}_text`（字符串值）和 `{id}_num`（数值）。

例如题目 id 为 `q1`，则：
- `qid->q1_text` — 文本值
- `qid->q1_num` — 数值

### 15.4 各题型映射

| 题型 | `_num` | `_text` |
|------|--------|---------|
| `text` | -1 | 原文 |
| `textarea` | -1 | 原文（换行符转 `\n`） |
| `single` | 1 | 选项文本 |
| `multiple` | 选择数量 | 选项文本（空格隔开） |
| `rating` | 评分值（1-5） | 评分值字符串 |
| `likert` | 按钮编号（1-5） | 编号字符串 |
| `nps` | 评分值（0-10） | 评分值字符串 |
| `time` | 时间戳（秒） | HH:MM:SS |

---

## 16. 主代码限制

主代码（非库文件）有以下限制：

- **不允许**使用 `#defNS` 指令
- 必须包含 `int main()` 或 `int main(int qid)` 入口函数（你也可以通过外部库加载隶属qlgstd命名空间下的main函数）
- 必须 `return 0;`

---

## 17. 库文件规范

### 17.1 文件格式

```
#defNS 命名空间名

// 函数定义
返回类型 函数名(参数列表) {
    函数体
}
```

### 17.2 规范要求

1. 库文件必须使用 `#defNS` 开头声明命名空间
2. 库文件不能包含 `main` 函数
3. 库文件后缀名为 `.qlg`
4. 库文件存放在 `QLangRuntime/library/` 目录

### 17.3 完整示例

**文件：`utils.qlg`**

```
#defNS utils

int twice(int a) {
    return a * 2;
}

int half(int a) {
    return a / 2;
}

int square(int a) {
    return a * a;
}
```

**主代码使用：**

```c
#include <utils>

int main(int qid) {
    printf("%d\n", utils::twice(21));
    printf("%d\n", utils::half(99));
    printf("%d\n", utils::square(5));
    return 0;
}
```

---

## 18. 约束与限制

| 项目 | 限制 |
|------|------|
| 地址表空间 | 256MB |
| 总执行时限 | 10 秒 |
| 最大调用栈深度 | 有限制（防栈溢出） |
| STL 容器容量 | 1000 |
| 数组最大大小 | 有限制 |

---

## 19. 保留字

```
int      float    double   char     string   bool
void     true     false
if       else     while    for      return
const    break    continue
struct   new
stack    queue    vector   pair     priority_queue
try      catch    throw
using    namespace
#include #defNS
printf   cout     print
sizeof   size     strlen   strcmp   strcpy
_gcd     parseInt
abort
```

---

## 20. 完整示例

### 全链路测试脚本

```
#include <math>
#include <utils>

int main(int qid) {
    // 命名空间函数
    printf("add: %d\n", math::add(3, 4));
    printf("twice: %d\n", utils::twice(20));

    // 问卷数据
    printf("姓名: %s\n", qid->q1_text);
    printf("评分: %d\n", qid->q2_num);

    // STL 容器
    stack s;
    s.push(10);
    s.push(20);
    printf("stack top: %d\n", s.top());

    // 结构体
    struct Node { int v; };
    Node* n = new Node;
    n->v = 99;
    printf("node: %d\n", n->v);

    // 指针
    int x = 42;
    int* p = &x;
    printf("ptr: %d\n", *p);

    // 异常
    try {
        throw "test";
    } catch (e) {
        printf("catch: %s\n", e);
    }

    return 0;
}
```
