# 造化元钥恢复资源

这里保存从 v1.0.7 安装包恢复的网页资源及其后的开发修改，用于开发备份和本地调试；这些是构建产物，不是完整的原始开发工程。

原安卓工程及 v1.0.7 的签名密钥已丢失。此目录不能直接生成可覆盖安装旧版的 APK，也不代表发布了新的安装包。紫微助手在本地调试时需要另行部署的服务；该服务和密钥未包含在这里。

## 核验六爻和梅花

在本目录执行：

```sh
node --test tests/divination-regression.cjs tests/divination-exhaustive.cjs tests/divination-extended.cjs
```

参考资料、已修复问题和未覆盖项见 [六爻梅花排盘校验](docs/六爻梅花排盘校验-2026-10-29.md)。
