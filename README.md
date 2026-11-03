# 造化元钥（命理排盘）

## 下载与更新

[下载 v1.0.19 安卓完整安装包](https://github.com/kyirejson/mingli-paipan/releases/download/v1.0.19/zaohua-v1.0.19.apk) · [本版发布说明](https://github.com/kyirejson/mingli-paipan/releases/tag/v1.0.19) · [最新版本](https://github.com/kyirejson/mingli-paipan/releases/latest)

v1.0.19 约 36.2 MB。修复题库晋级门槛、重做后最佳成绩保留、练习目录空转、答案恢复、提交失败与收藏并发等问题；35 组练习复用真实本地题。保留 1,763 条原记录，隔离 2 道四柱不成立题，活动题目 1,761 道。117 项回归通过，实测成绩、重开恢复及覆盖升级资料保留。详见 [题库审核记录](docs/2026-11-03_题库审核与整改.md)。实战案例出处仍待逐条补齐，知识百科原文仍需联网。

同签名的 v1.0.13 至 v1.0.18 可直接覆盖升级，无需依次安装中间版本。从 v1.0.14 及更早版本首次升级前，请先导出一次现有资料。旧盘可在“设置 → 数据备份与恢复 → 找回旧记录”尝试合并仍存在的缓存。应用私有保护副本不代替卸载前的外部备份。

构建不依赖历史 APK，每次从空目录装入当前资源。历史安装附件在新版核验后清理，源码标签和历史说明保留。v1.0.7 及更早旧签名版不能直接覆盖新签名版，需要单独迁移；卸载会删除本地应用数据。APP 通过“设置 → 版本更新”检查正式 latest，安装需安卓系统确认。

APK SHA-256：`35bd26f1fd99f015d012966abb8fd5d5e6dd256f2b31a12ca4e135f6e21a5b49`。

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

发布前运行 `python -m unittest discover -s tests -p test_release_contract.py -v` 和 `python -m unittest discover -s tests -p test_build_lifecycle.py -v`。使用 `python scripts/publish-release.py --version 1.0.19 --version-code 20` 可校验本地 APK；增加 `--publish --prune-old-apks` 才会发布并在核验新版后清理历史安装附件。先将源码与同名版本标签推送到仓库。详细步骤与清理边界见 [独立构建说明](docs/build-and-retention.md)。

紫微助手代理使用本机现有的盲派八字 Agent 设置文件读取 DeepSeek 配置；密钥不写入本目录或手机安装包。当前真实请求返回 401，需在本机配置中更新有效凭证并确保账户可用，方能完成真实回答验收。通过模拟接口的测试不代表真实模型已连接成功。

## 资料来源

`references/ziwei-doushu` 是 Renhuai123/ziwei-doushu 的独立上游仓库，当前检出 ff9a1470ebe652e57b9d690f5d01db9a04f47aae。助手服务只读取 `lib/seo/knowledge.ts` 中命宫主星的简短说明；该仓库 MIT 许可证及版权声明保存在上游目录的 `LICENSE`。开源断语库是占位内容，格局引擎尚未完成适配对盘，不当作已经验证的规则提供。

完整生产开发仍需要恢复或重新创建安卓工程、建设安全的远程助手服务，并在真实设备重新验证。现有本机调试代理不能直接供外部用户访问。
