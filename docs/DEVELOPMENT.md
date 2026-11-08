# 开发、构建与资料来源

[返回项目首页](../README.md)

## 开发目录与恢复范围

本目录的 `dist/` 是从 GitHub 发布的 v1.0.7 APK 中恢复的网页资源，再在其上开发紫微助手。原始开发目录已由用户删除，安卓原生工程、原始签名文件和部分构建脚本尚未恢复；不能把这个目录当作完整的原始工程。

v1.0.8 基于 v1.0.7 安装包的安卓外壳重新打包，并使用新的签名发布为预发布重装版，无法覆盖安装旧签名版本。新的签名密钥和密码保存在本目录 `private-signing/`，请分别妥善备份，切勿上传；丢失后将再次无法覆盖升级。打包工作目录位于 D 盘 `D:\zaohua-release-work`。

## 本机调试

本轮审计整改与验证范围见 [整改进展](2026-10-29_整改进展.md)。当前提供备份恢复入口和可执行构建脚本；安卓外壳已独立纳入 `native/runtime/`，不再读取旧 APK。八字基础排盘接口等依赖仍存在，不代表原始安卓工程已恢复。

在 Windows PowerShell 运行：

```powershell
python scripts/dev-server.py
```

它只监听本机 127.0.0.1:9988。模拟器的现有调试包通过 `adb reverse tcp:9988 tcp:9988` 连接该服务。修改网页资源后需刷新或重启调试包。

`npm test` 运行无需外部依赖的 Node 回归。`scripts/build-release.ps1` 执行 D 盘构建，所需外部输入的来源和摘要在 `build-inputs.json` 中；详细命令见整改进展。

发布前运行 `python -m unittest discover -s tests -p test_release_contract.py -v` 和 `python -m unittest discover -s tests -p test_build_lifecycle.py -v`。使用 `python scripts/publish-release.py --version 1.0.32 --version-code 33` 可校验本地 APK；增加 `--publish` 才会发布；`--prune-old-apks` 是核验新版后清理历史安装附件的可选参数。先将源码与同名版本标签推送到仓库。详细步骤与清理边界见 [独立构建说明](build-and-retention.md)。

紫微助手代理使用本机现有的盲派八字 Agent 设置文件读取 DeepSeek 配置；密钥不写入本目录或手机安装包。此前真实请求出现过鉴权或账户不可用问题；使用前需在本机配置有效凭证并确保账户可用，方能完成真实回答验收。通过模拟接口的测试不代表真实模型已连接成功。

## 资料来源

六爻《火珠林》采用维基文库文本；《海底眼》增加怡然斋藏版64节、203段古文转录，正文与《易隐》《断易天机》引文分别标识；《黄金策》采用随包正文及注释。海底眼独发、多动依所据版本分开取法，其他书的条文作为旁参明确列出处。当前自动解读覆盖六类占事及已实现结构规则，三书全部章法尚未全部程序化。

v1.0.24修复八字入口全部11本古籍的原文、原注和白话显示，使用独立公开底本的真实篇目，保留来源标注。章节按需联网读取；天元巫咸目前提供随文旧注，未提供独立现代译文。详情见[全部古籍修复与验收](2026-11-04_全部八字古籍注解修复与验收.md)。

`references/ziwei-doushu` 是 Renhuai123/ziwei-doushu 的独立上游参考仓库。v1.0.23本地验收版在 `vendor/ziwei-doushu` 固定了上游 `a600484a49255039d0725f1ba9e11ca81a948f97` 的MIT格局识别代码，适配当前盘面。上游原文件保持不变，本地会照中心等修正通过构建脚本明确应用；明珠出海与马头带箭采用单列取法，许可随包保留。其核心断语库并未开源，本项目没有接入该私有库。

紫微盘面详解按本宫、三方夹拱、四化飞星、星系格局、命身运限组织，正文源在 `content/ziwei-*.tsv`、`content/ziwei-techniques.json` 和 `content/ziwei-reviewed-details.json`。白话是编辑整理，不冒充古籍逐字原文或专家审核结果。原文按独立星曜归属，逐条出处保留编辑审校状态。构建内容使用 `python scripts/build-ziwei-reading-data.py --source-dir D:/zaohua-release-work/ziwei-knowledge-research`，格局脚本用 `node scripts/build-ziwei-patterns.mjs` 生成。进阶河洛数理、法象归藏与完整应期规则尚未实现；相关整改随v1.0.24发布，详见[整改与验收](2026-11-04_紫微解读整改实现与验收.md)。

完整生产开发仍需要恢复或重新创建安卓工程、建设安全的远程助手服务，并在真实设备重新验证。现有本机调试代理不能直接供外部用户访问。
