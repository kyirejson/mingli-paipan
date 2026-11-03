# 独立构建与历史安装包清理

旧 APK 是发布产物，不再是构建输入。源码、`native/runtime/`、构建工具和独立保存的签名足以生成完整新包。手机直接下载完整新版，不需要依次安装中间版本。

## 构建

PowerShell 在项目根目录执行，临时文件默认放在 D 盘：

```powershell
./scripts/build-release.ps1 -Version 1.0.16 -VersionCode 17
```

工具路径可通过脚本参数指定，来源与摘要见 `build-inputs.json`。`native/runtime/android-runtime.zip` 为固定工程依赖，约 3.1 MB；不是供安装的旧版 APK，不应作为“历史安装包”清理。原始 Gradle 工程仍未恢复，归档中的原生框架代码为已恢复的二进制。

每次构建先核对归档及 585 个文件的摘要，再向全新 `assets/public/` 写入当前 `dist/`，编译数据保护插件，更新原生和网页版本，签名验签。包名 `com.wzbz.bazi`、证书和 `https://localhost` 存储地址应保持一致。

## 发布和清理

先提交源码并推送与版本一致的 Git 标签。以下命令默认只校验本地包，不发布、不清理：

```powershell
python scripts/publish-release.py --version 1.0.16 --version-code 17
```

带发布及清理选项时，工具先上传完整包、摘要与 `update.json`，将其设为正式 latest 并验证公开清单，随后移除更早版本的安装附件：

```powershell
python scripts/publish-release.py --version 1.0.16 --version-code 17 --publish --prune-old-apks
```

也可单独检查清理计划。默认只读，加 `--apply` 才执行：

```powershell
python scripts/prune-release-apks.py --keep-tag v1.0.16
python scripts/prune-release-apks.py --keep-tag v1.0.16 --apply
```

清理对象为 GitHub 更早非草稿版本的 APK、APK 签名旁文件、`update.json` 和 `SHA256SUMS.txt`，以及本机 `release/android/` 和 `D:/zaohua-release-work/` 内符合条件的旧安装文件。保留历史发布说明、源码标签及其他附件。当前版本、未来版本、草稿与当前/未来构建目录均不删除。清理前及逐次远端删除前核对 latest 和完整包；最新包缺失、摘要不符或 latest 改变则停止。清理结果位于忽略提交的 `release/android/cleanup-v1.0.16.json`。

不要删除 `dist/`、`native/runtime/`、`private-signing/`，也不要卸载 APP 或清除手机应用数据。这些不是历史安装包。命盘与笔记使用稳定存储键和原生保护副本，与电脑/服务器的旧 APK 无关。

## 验证

```powershell
npm test
python -m unittest discover -s tests -p test_release_contract.py -v
python -m unittest discover -s tests -p test_build_lifecycle.py -v
```

安卓覆盖检查使用人工构造的模拟器资料，绝不执行卸载或清除数据。通过 `ZAOHUA_UPGRADE_FIXTURE` 指定已有测试资料，通过 `ZAOHUA_EXPECTED_VERSION` 指定目标版本，再执行 `tests/android-upgrade-retention.mjs check`。这些结果不表示已经读取或恢复用户手机的旧记录。
