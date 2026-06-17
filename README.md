# Questionnaire | 问卷提问（fix）
该项目是源自Operit AI平台上我的一个小项目，包是基于liu-baia的原作[questionnaire v0.1.0 | com.com.operit.questionnaire](https://github.com/liu-baia/OperitForge/releases/tag/package-com-operit-questionnaire-v0.1.0-396c8ead)进行二次开发   
该仓库的包在Operit AI中的包名是com.operit.questionnaire.fix（项目簇：com-operit-questionnaire-fix），代码由AI完成，项目方向就不是AI了用的是person（   
开源仓库中的包的版本：v1.5.2

## 介绍
基于原作，不断更新完善，随之加入些新的功能   
~~不过现在似乎已经沉浸在自己的艺术当中了（~~

## 功能一览（当前版本）
<p style="color: red;">该版本截止到2026/06/17还没提交上架1.5.1还没审核完毕需要再等</p>
这个版本加入了特别多的功能   
因为是开源仓库的readme我就不简述了：

### 增
1. 结果脚本式正式命名为QLang，并且推出QLang V2，基本上重写了运行时，现在将由一个子标签去包裹脚本式
2. 新增V1中空缺的逻辑运算符
3. 新增循环控制（break/continue），目前还有些小问题
4. 新增静态变量的声明
5. 延长代码运行时限从5s至10s
6. 构建了函数概念，参考cpp，将主要逻辑包裹在main函数内，以及新增自定义函数的声明，和返回值（return）的使用
7. 新增几个STL容器，语法要简单些，支持栈、队列、pair、堆以及最典型的容器（vector）
8. 新增PHP的变量写法（$var = value）
9. 新增了写字符串的函数

### 删与改
1. 修复定义变量时无法赋值
2. 修改了ask工具使其支持V2写法

### 成果展示
QLang V2在完成即测试，其成绩：
- [x] 冒泡排序
- [x] 递归斐波那契
- [x] 线性筛（例题取自https://www.luogu.com.cn/problem/P4626）

其他的没测试了，倒是可以大可一试   

## 反馈
如果你发现了BUG或是AI容易混淆语法，或是你有什么好点子，你可以在这个项目提个issue
