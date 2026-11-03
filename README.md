# 造化元钥（命理排盘）

## 下载与更新

[下载 v1.0.15 安卓安装包](https://github.com/kyirejson/mingli-paipan/releases/download/v1.0.15/zaohua-v1.0.15.apk) · [本版发布说明](https://github.com/kyirejson/mingli-paipan/releases/tag/v1.0.15) · [全部版本](https://github.com/kyirejson/mingli-paipan/releases)

v1.0.15 为新签名正式版，约 36.2 MB。新增原生数据保护副本与升级前写入检查，合并恢复已有命盘；恢复 58 条名人及古籍命例；修复古籍 CSS 加载和排版、紫微三种盘面的比例与文字重叠。90 项 Node 回归、10 项发布协议测试以及安卓模拟器覆盖、立即退出和页面检查通过。详见 [本版更新说明](docs/releases/v1.0.15.md) 与 [修复记录](docs/2026-11-03_数据保护与界面修复记录.md)。

同签名的 v1.0.13/v1.0.14 可直接覆盖升级，不需要卸载或清除数据。原生独立保护从本版生效，首次升级前请导出一次现有资料；若旧盘仍未显示，可在“设置 → 数据备份与恢复 → 找回旧记录”尝试合并历史缓存。恢复取决于缓存或备份是否仍在。应用私有保护副本不代替卸载前的外部备份。

v1.0.7 及更早旧签名版不能直接覆盖新签名版，需要单独迁移；卸载会删除本地应用数据。发布附件包含 update.json，现有版本通过“设置 → 版本更新”检查正式 latest，安装需安卓系统确认。仅推送源码不会更新手机 APK。

APK SHA-256：`8cf6802cbabe62c6534443dc861f463c2bc05704fb902acd6cc467f9f03c9607`。

## 开发目录与恢复范围

本目录的 `dist/` 是从 GitHub 发布的 v1.0.7 APK 中恢复的网页资源，再在其上开发紫微助手。原始开发目录已由用户删除，安卓原生工程、原始签名文件和部分构建脚本尚未恢复；不能把这个目录当作完整的原始工程。

v1.0.8 基于 v1.0.7 安装包的安卓外壳重新打包，并使用新的签名发布为预发布重装版，无法覆盖安装旧签名版本。新的签名密钥和密码保存在本目录 `private-signing/`，请分别妥善备份，切勿上传；丢失后将再次无法覆盖升级。打包工作目录位于 D 盘 `D:\zaohua-release-work`。

## 本机调试

本轮审计整改与验证范围见 [整改进展](docs/2026-10-29_整改进展.md)。当前新增备份恢复入口和可执行构建脚本；仍依赖旧 APK 外壳及八字基础排盘接口，不代表原始安卓工程已恢复。

在 Windows PowerShell 运行：

```powershell
python scripts/dev-server.py
```

它只监听本机 127.0.0.1:9988。模拟器的现有调试包通过 `adb reverse tcp:9988 tcp:9988` 连接该服务。修改网页资源后需刷新或重启调试包。

`npm test` 运行无需外部依赖的 Node 回归。`scripts/build-release.ps1` 执行 D 盘构建，所需外部输入的来源和摘要在 `build-inputs.json` 中；详细命令见整改进展。

发布前运行 `python -m unittest discover -s tests -p test_release_contract.py -v`。使用 `python scripts/publish-release.py --version 1.0.15 --version-code 16` 可校验 APK 原生版本、签名、对齐及包内版本信息，生成更新清单；增加 `--publish` 才会连接 GitHub、上传附件并正式发布。先将源码与同名版本标签推送到仓库。工具先校验 APK 和清单、检查公开清单可读，再设置正式 latest，最后复核已安装客户端所使用的接口。已有但不一致的附件会阻止发布，不删除或覆盖原 APK。

紫微助手代理使用本机现有的盲派八字 Agent 设置文件读取 DeepSeek 配置；密钥不写入本目录或手机安装包。当前真实请求返回 401，需在本机配置中更新有效凭证并确保账户可用，方能完成真实回答验收。通过模拟接口的测试不代表真实模型已连接成功。

## 资料来源

`references/ziwei-doushu` 是 Renhuai123/ziwei-doushu 的独立上游仓库，当前检出 ff9a1470ebe652e57b9d690f5d01db9a04f47aae。助手服务只读取 `lib/seo/knowledge.ts` 中命宫主星的简短说明；该仓库 MIT 许可证及版权声明保存在上游目录的 `LICENSE`。开源断语库是占位内容，格局引擎尚未完成适配对盘，不当作已经验证的规则提供。

完整生产开发仍需要恢复或重新创建安卓工程、建设安全的远程助手服务，并在真实设备重新验证。现有本机调试代理不能直接供外部用户访问。
