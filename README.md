<div align="center">

![造化元钥 · 五术一览，纸上青山](docs/media/banner.svg)

# 造化元钥 · 命理排盘 APP

**八字 · 紫微斗数 · 奇门遁甲 · 六爻纳甲 · 梅花易数**

一份时间信息，切换五种命盘；把排盘、古籍阅读与断事笔记放在一起。

[![Android](https://img.shields.io/badge/Android-安卓应用-23483B?style=flat-square&logo=android&logoColor=white)](https://github.com/kyirejson/mingli-paipan/releases/latest)
[![Release](https://img.shields.io/github/v/release/kyirejson/mingli-paipan?style=flat-square&color=23483B&label=最新版本)](https://github.com/kyirejson/mingli-paipan/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/kyirejson/mingli-paipan/total?style=flat-square&color=B66E58&label=下载)](https://github.com/kyirejson/mingli-paipan/releases)

[**下载安卓 APK**](https://github.com/kyirejson/mingli-paipan/releases/latest) · [功能介绍](#五种排盘一个入口) · [安装与更新](#安装与更新) · [反馈问题](https://github.com/kyirejson/mingli-paipan/issues)

简体中文 / Chinese · Android · Bazi / Zi Wei Dou Shu / Qimen Dunjia / Liuyao / Meihua Yishu

</div>

## 五种排盘，一个入口

造化元钥（命理排盘 / `mingli-paipan`）是一款面向传统术数学习与命例整理的安卓排盘工具。首页填写时间、性别等信息，排盘后可切换八字、紫微、奇门、六爻和梅花，支持设置默认盘面和切换顺序。

| 盘式 | 可以查看和使用的内容 |
| --- | --- |
| **八字四柱** | 出生信息、四柱排盘、专业细盘、五行与旺衰参考、古籍阅读、断事笔记 |
| **紫微斗数** | 三合、钦天、飞星盘式，十二宫星曜、四化与运限；按当前盘面匹配已实现的详解规则 |
| **奇门遁甲** | 默认时家拆补法转盘；可在起局设置中选择其他已支持的起局方式 |
| **六爻纳甲** | 默认时间起卦，也可自定义；六神、纳甲、六亲、世应、动变、伏神及日月状态 |
| **梅花易数** | 默认时间起卦，也可自定义；本卦、互卦、变卦、综卦、错卦及体用关系 |

### 盘面与阅读

- **纸上青山**：米白纸色、青绿主色与五行配色，统一盘面、设置及阅读界面。
- **紧凑六爻盘**：本卦与变卦并列，六亲与动爻标记分列，日冲、月合等说明对应爻位显示。
- **三书对照**：《火珠林》《海底眼》《黄金策》先列全卦结构，再展开不同占事的规则解读，可回到具体原文。
- **古籍注解**：八字入口提供多本古籍的原文、原注与已收录白话；部分章节按需联网读取。
- **命例整理**：本地记录、统一断事笔记、备份与恢复、名人命例参考。
- **题库练习**：知识与习题入口，便于学习后回到盘面核对。

## 安装与更新

1. 打开 [最新正式版](https://github.com/kyirejson/mingli-paipan/releases/latest)，在 **Assets** 下载 `zaohua-v版本号.apk`。
2. 在安卓手机上打开 APK，按系统提示允许该下载来源安装。
3. 后续可在 APP 的 **设置 → 版本更新** 检查更新，下载后由系统确认安装。

**当前版本：v1.0.29。** 本版将六爻用神、元神、忌神、仇神、闲神移至六神下方的固定位置，完整名称对齐显示，用神突出标识。查看爻位与设置用神仍分别操作。详见 [本版更新说明](docs/releases/v1.0.29.md)。

同签名的 v1.0.13 及后续版本可直接覆盖升级，不必依次安装中间版本。**保留旧版直接安装新版，不要先卸载或清除数据。** 从 v1.0.14 及更早版本首次升级前，先导出资料；仍存在的旧缓存可通过“设置 → 数据备份与恢复 → 找回旧记录”尝试合并。

v1.0.7 及更早版本采用旧签名，需要单独迁移。应用私有备份不能替代卸载前的外部备份。发布页同时提供 `update.json` 和 `SHA256SUMS.txt`，便于检查更新与校验文件。

### 常见问题

**苹果手机可以直接安装吗？** 目前正式分发的是 Android APK，不能直接安装到 iPhone；仓库尚未提供正式 iOS 安装包。

**全部功能都能离线使用吗？** 部分古籍章节、八字基础接口及可选助手依赖联网。不能将本项目视为完整离线应用。

**解读是否由大模型生成？** 当前紫微预编解读与六爻三书解读使用已实现的程序规则和资料条目；可选紫微助手是另一项功能，需要配置可用的模型服务。三书全部章法与所有流派技法尚未全部程序化。

**数据保存在哪里？** 命例与笔记主要保存在本机，沿用应用数据保护机制；不要通过卸载来更新。反馈问题时请隐去姓名、出生信息等个人资料。

## 开发与资料

本仓库包含从早期安装包恢复并持续维护的 Web 资源、安卓运行外壳、资料构建和测试脚本。原始开发工程曾丢失，恢复范围与依赖在开发文档中说明。

```powershell
python scripts/dev-server.py
```

本地预览地址为 `http://127.0.0.1:9988`。Node.js 22 或更高版本可运行 `npm test`；安卓构建命令、外部工具、签名与数据保留要求见下方文档。

| 文档 | 内容 |
| --- | --- |
| [开发与资料来源](docs/DEVELOPMENT.md) | 项目恢复范围、调试、构建、助手配置、古籍与上游来源 |
| [独立构建与更新](docs/build-and-retention.md) | 构建输入、发布步骤、数据保留及历史附件边界 |
| [六爻三书解读审核](docs/2026-11-04_六爻三书实盘解读重做与交付审核.md) | 三书差异、规则范围与验证证据 |
| [全部八字古籍修复](docs/2026-11-04_全部八字古籍注解修复与验收.md) | 原文、注解和阅读入口的处理范围 |
| [历史版本](https://github.com/kyirejson/mingli-paipan/releases) | APK、版本说明及校验附件 |

古籍底本、转录与第三方代码各有来源和许可；编辑白话与程序规则不冒充古籍原文。学习传统术数时，可通过原文对照核实取法。

## English overview

**Zaohua Yuanyao** is a Chinese-language Android app for **Bazi (Four Pillars), Zi Wei Dou Shu, Qimen Dunjia, Liuyao / Na Jia, and Meihua Yishu**. It combines chart switching, classical-text reading, rule-based chart explanations, local case records and notes. Download the Android APK from [GitHub Releases](https://github.com/kyirejson/mingli-paipan/releases/latest). Some content and optional services require a network connection; no official iOS build is currently distributed.

---

同一作者的另一款应用：[Uncover · 自重训练 APP](https://github.com/kyirejson/calisthenics-app) — 自重健身、训练记录、跑步与 AI 助手。
