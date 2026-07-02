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
1. 引入外部库
  - 是的，外部库，也就是include
  - 此外除了外部库的引入还加了命名空间（语法不是标准的CPP那种） 
2. 大改qid引入，从原来的结构体+变量的方式改成了指针的方式
3. 新增一种UI设计，能够解决Operit AI长标签无法被点击的问题
4. 新增“卷谱”，能帮助AI快速了解文件填写情况
5. QLang中新增了try-catch，能够直接捕捉ScriptError，能做到不走错误页，此外增加了abort()，能够直接抛出ScriptError，也能被try捕捉（catch不行）

### 修复
1. 1.5.3残缺的保留字**大概**是补上了
2. 想不出更多了反正零零星星的小问题应该是修了

## 外部库上传
你可以提个issue，上传你的外部库

## 反馈
如果你发现了BUG或是AI容易混淆语法，或是你有什么好点子，你可以在这个项目提个issue
