# Questionnaire | 问卷提问（fix）
该项目是源自Operit AI平台上我的一个小项目，包是基于liu-baia的原作[com.com.operit.questionnaire](https://github.com/liu-baia/OperitForge/releases/tag/package-com-operit-questionnaire-v0.1.0-396c8ead)进行二次开发   
该仓库的包在Operit AI中的包名是com.operit.questionnaire.fix（项目簇：com-operit-questionnaire-fix），代码由AI完成，项目方向就不是AI了用的是person（   
开源仓库中的包的版本：v1.5.3

## 介绍
基于原作，不断更新完善，随之加入些新的功能   
~~不过现在似乎已经沉浸在自己的艺术当中了（~~

## 功能一览（当前版本）
这个版本没啥改动   
重点是修Bug给修力竭了

### 新增特性
1. 重构变量系统：
 - 本次重构实现了作用域，以防止变量冲突
 - 引入了“模拟内存”：
   - 由解释器管理一份能模拟 256MB 的内存表，每次变量创建都会申请一个地址，根据此特性，新增了 printf 格式化输出
2. 新增指针，它基于模拟内存，语法与 CPP 相似，它能够完成链表等一些算法，也有对于空指针的处理
3. 结构体：现在，你能够在结构体中写入函数成员、构造函数了
4. 容错优化：对空指针、内存超限做了报错处理

### 修复
1. 修复一个远古 Bug，在提交后的页面展现的题号不对
2. 上个版本遗留的循环控制流修了
3. 修复了必填提醒不能正常工作的问题
4. 修复了从老版本就开始的 ask 工具不显示错因


## 反馈
如果你发现了BUG或是AI容易混淆语法，或是你有什么好点子，你可以在这个项目提个issue
