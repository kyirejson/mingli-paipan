# 造化元钥（命理排盘）

## 下载与更新

[下载 v1.0.18 安卓完整安装包](https://github.com/kyirejson/mingli-paipan/releases/download/v1.0.18/zaohua-v1.0.18.apk) · [本版发布说明](https://github.com/kyirejson/mingli-paipan/releases/tag/v1.0.18) · [最新版本](https://github.com/kyirejson/mingli-paipan/releases/latest)

v1.0.18 约 36.2 MB。修复日期滚轮过淡、八字表格字小、六爻窄屏爻线错位、夜间文字与开关不清楚等问题；紫微新增“宫位详读”，并避免箭头穿过中央文字。98 项回归通过，模拟器核对日夜主题、三种屏宽及覆盖安装后的命例和笔记保留。详见 [界面整改记录](docs/2026-11-03_界面可读性整改.md)。上版的两本公开古籍原文仍可按命盘定位阅读。

同签名的 v1.0.13 至 v1.0.17 可直接覆盖升级，无需依次安装中间版本。从 v1.0.14 及更早版本首次升级前，请先导出一次现有资料。旧盘可在“设置 → 数据备份与恢复 → 找回旧记录”尝试合并仍存在的缓存。应用私有保护副本不代替卸载前的外部备份。

构建不依赖历史 APK，每次从空目录装入当前资源。历史安装附件在新版核验后清理，源码标签和历史说明保留。v1.0.7 及更早旧签名版不能直接覆盖新签名版，需要单独迁移；卸载会删除本地应用数据。APP 通过“设置 → 版本更新”检查正式 latest，安装需安卓系统确认。

APK SHA-256：`27ccc7d5a4062cb418809f8c8cf72f4a009c361a591d1e5151027d13d10b6ae1`。

## 开发目录与恢复范围

本目录的 `dist/` 是从 GitHub 发布的 v1.0.7 APK 中恢复的网页资源，再在其上开发紫微助手。原始开发目录已由用户删除，安卓原生工程、原始签名文件和部分构建脚本尚未恢复；不能把这个目录当作完整的原始工程。

v1.0.8 基于 v1.0.7 安装包的安卓外壳重新打包，并使用新的签名发布为预发布重装版，无法覆盖安装旧签名版本。新的签名密钥和密码保存在本目录 `private-signing/`，请分别妥善备份，切勿上传；丢失后将再次无法覆盖升级。打包工作目录位于 D 盘 `D:\zaohua-release-work`。

## 本机调试

本轮审计整改与验证范围见 [整改进展](docs/2026-10-29_整改进展.md)。当前提供备份恢复入口和可执行构建脚本；安卓外壳已独立纳入 `native/runtime/`，不再读取旧 APK。八字基础排盘接口等依赖仍存在，不代表原始安卓工程已恢复。

在 Windows PowerShell 运行：

```powershell
python scripts/dev-server.py
```

它只监听本机 127.0.0.1:9988。模拟器的现有调试包通过 `adb reverse tcp:9988 tcp:9988` 连接该服务。修改网页资源后需刷新或重启调试包。

`npm test` 运行无需外部依赖的 Node 回归。`scripts/build-release.ps1` 执行 D 盘构建，所需外部输入的来源和摘要在 `build-inputs.json` 中；详细命令见整改进展。

发布前运行 `python -m unittest discover -s tests -p test_release_contract.py -v` 和 `python -m unittest discover -s tests -p test_build_lifecycle.py -v`。使用 `python scripts/publish-release.py --version 1.0.18 --version-code 19` 可校验本地 APK；增加 `--publish --prune-old-apks` 才会发布并在核验新版后清理历史安装附件。先将源码与同名版本标签推送到仓库。详细步骤与清理边界见 [独立构建说明](docs/build-and-retention.md)。

紫微助手代理使用本机现有的盲派八字 Agent 设置文件读取 DeepSeek 配置；密钥不写入本目录或手机安装包。当前真实请求返回 401，需在本机配置中更新有效凭证并确保账户可用，方能完成真实回答验收。通过模拟接口的测试不代表真实模型已连接成功。

## 资料来源

`references/ziwei-doushu` 是 Renhuai123/ziwei-doushu 的独立上游仓库，当前检出 ff9a1470ebe652e57b9d690f5d01db9a04f47aae。助手服务只读取 `lib/seo/knowledge.ts` 中命宫主星的简短说明；该仓库 MIT 许可证及版权声明保存在上游目录的 `LICENSE`。开源断语库是占位内容，格局引擎尚未完成适配对盘，不当作已经验证的规则提供。

完整生产开发仍需要恢复或重新创建安卓工程、建设安全的远程助手服务，并在真实设备重新验证。现有本机调试代理不能直接供外部用户访问。
