# 命理排盘 mingli-paipan

安卓安装包发布与修复验收记录。

## 下载与安装

[下载 v1.0.1 安卓安装包](https://github.com/kyirejson/mingli-paipan/releases/download/v1.0.1/mingli-paipan-v1.0.1.apk) · [全部版本](https://github.com/kyirejson/mingli-paipan/releases)

支持 Android 7.0 及以上。下载 APK 后在安卓设备或模拟器中安装；已有旧版时可直接覆盖升级，保留应用数据。建议先备份重要记录。

应用内显示名称仍为“八字排盘”，包名为 `com.wzbz.bazi`。

## v1.0.1 修复

- 修复学堂、正文、听书脚本与音频浮窗的四处语法错误。
- 补齐原包缺失章节及相关插图，新增约 46 MiB 资源；两张失效原图显示明确缺图提示。
- 修复凌晨时间、命例复制与编辑、分组、批量删除和回收站永久删除。
- 保存失败明确反馈，保护已存记录；改进阅读器返回、月历、笔记搜索及本地题库保存。
- 不再为未实现的分析或远端报告返回虚构成功结果。

## 验证与范围

54 项 JavaScript 回归、6 项 Python 检查通过；最终 APK 的 132 个外部 JS 和 8,571 段内联 JS 语法检查通过。Android 15 独立模拟器验证了启动、学堂、正文、阅读器返回，以及命例和分组的重载、进程重启持久化。

云同步、远端报告及远程音频服务仍需独立验收；本版本不承诺完全离线，也不代表与问真官方全部规则和服务等价。两张缺失原图的提示位于基础知识的地理对应图和懒人表的干支对应表。

详见 [v1.0.1 发布说明](RELEASE_NOTES-v1.0.1.md)。Releases 同时提供 `SHA256SUMS.txt`，用于核对下载文件。

<!-- mingli-updates -->
## 应用内更新

最新安装包：[造化元钥 v1.0.5](https://github.com/kyirejson/mingli-paipan/releases/tag/v1.0.5)。

首次请安装带更新功能的版本。以后打开 APP 或回到前台会检查正式 Release；可在“版本更新”开启后台提醒，下载安装需要手机确认。

本地项目使用 `npm run release:android -- --version 下一版号 --notes-file 更新说明.md` 构建、签名并发布完整 Release。仅推送源码不会触发手机 APK 更新。
<!-- /mingli-updates -->
