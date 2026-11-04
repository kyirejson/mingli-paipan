# 造化元钥（命理排盘）

## 下载与更新

[下载 v1.0.28 安卓完整安装包](https://github.com/kyirejson/mingli-paipan/releases/download/v1.0.28/zaohua-v1.0.28.apk) · [本版发布说明](https://github.com/kyirejson/mingli-paipan/releases/tag/v1.0.28) · [最新版本](https://github.com/kyirejson/mingli-paipan/releases/latest)

v1.0.28 约36.36 MB。六爻新增本卦／变卦选中爻位标记，查看爻位与指定用神分别操作。三本古籍解读先显示全卦要点，再展开求财、求职、婚约、文书、出行、失物六类占事，原文依据可定位与跨书查看。正文与摘要左对齐，窄屏及深色阅读检查通过。同签名覆盖安装后，命例、笔记、草稿及五术记录原值和原生备份核对通过。详见[六爻三书解读与交付审核](docs/2026-11-04_六爻三书实盘解读重做与交付审核.md)。

同签名的 v1.0.13 至 v1.0.27 可直接覆盖升级，无需依次安装中间版本。从 v1.0.14 及更早版本首次升级前，请先导出一次现有资料。旧盘可在“设置 → 数据备份与恢复 → 找回旧记录”尝试合并仍存在的缓存。应用私有保护副本不代替卸载前的外部备份。

构建不依赖历史 APK，每次从空目录装入当前资源。历史安装附件可在新版核验后按需清理，源码标签和历史说明保留。v1.0.7 及更早旧签名版不能直接覆盖新签名版，需要单独迁移；卸载会删除本地应用数据。APP 通过“设置 → 版本更新”检查正式 latest，安装需安卓系统确认。

APK SHA-256：`c0d0fc595c8b08284c5a4ab7589045df7088530478d0f11b43f0edb0becbd2b1`。

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

发布前运行 `python -m unittest discover -s tests -p test_release_contract.py -v` 和 `python -m unittest discover -s tests -p test_build_lifecycle.py -v`。使用 `python scripts/publish-release.py --version 1.0.26 --version-code 29` 可校验本地 APK；增加 `--publish --prune-old-apks` 才会发布并在核验新版后清理历史安装附件。先将源码与同名版本标签推送到仓库。详细步骤与清理边界见 [独立构建说明](docs/build-and-retention.md)。

紫微助手代理使用本机现有的盲派八字 Agent 设置文件读取 DeepSeek 配置；密钥不写入本目录或手机安装包。当前真实请求返回 401，需在本机配置中更新有效凭证并确保账户可用，方能完成真实回答验收。通过模拟接口的测试不代表真实模型已连接成功。

## 资料来源

六爻《火珠林》采用维基文库文本；《海底眼》增加怡然斋藏版64节、203段古文转录，正文与《易隐》《断易天机》引文分别标识；《黄金策》采用随包正文及注释。海底眼独发、多动依所据版本分开取法，其他书的条文作为旁参明确列出处。当前自动解读覆盖六类占事及已实现结构规则，三书全部章法尚未全部程序化。

v1.0.24修复八字入口全部11本古籍的原文、原注和白话显示，使用独立公开底本的真实篇目，保留来源标注。章节按需联网读取；天元巫咸目前提供随文旧注，未提供独立现代译文。详情见[全部古籍修复与验收](docs/2026-11-04_全部八字古籍注解修复与验收.md)。

`references/ziwei-doushu` 是 Renhuai123/ziwei-doushu 的独立上游参考仓库。v1.0.23本地验收版在 `vendor/ziwei-doushu` 固定了上游 `a600484a49255039d0725f1ba9e11ca81a948f97` 的MIT格局识别代码，适配当前盘面。上游原文件保持不变，本地会照中心等修正通过构建脚本明确应用；明珠出海与马头带箭采用单列取法，许可随包保留。其核心断语库并未开源，本项目没有接入该私有库。

紫微盘面详解按本宫、三方夹拱、四化飞星、星系格局、命身运限组织，正文源在 `content/ziwei-*.tsv`、`content/ziwei-techniques.json` 和 `content/ziwei-reviewed-details.json`。白话是编辑整理，不冒充古籍逐字原文或专家审核结果。原文按独立星曜归属，逐条出处保留编辑审校状态。构建内容使用 `python scripts/build-ziwei-reading-data.py --source-dir D:/zaohua-release-work/ziwei-knowledge-research`，格局脚本用 `node scripts/build-ziwei-patterns.mjs` 生成。进阶河洛数理、法象归藏与完整应期规则尚未实现；相关整改随v1.0.24发布，详见[整改与验收](docs/2026-11-04_紫微解读整改实现与验收.md)。

完整生产开发仍需要恢复或重新创建安卓工程、建设安全的远程助手服务，并在真实设备重新验证。现有本机调试代理不能直接供外部用户访问。
