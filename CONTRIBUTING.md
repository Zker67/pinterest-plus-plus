# Contributing

感谢你改进 Pinterest++。

## 本地检查

提交前请至少运行：

```powershell
node --check ".\pinterest++.user.js"
```

## 修改原则

- 保持脚本单文件可安装，不引入构建步骤。
- 不破坏已经稳定的瀑布流悬停下载链路。
- 详情页和悬停卡片可以有不同回退策略，但主链路应优先使用 Pinterest `PinResource/get`。
- 保存状态只跟随 Pinterest 官方按钮文案，不维护独立保存状态。
- 更新功能时同步提升 `@version` 并更新 `CHANGELOG.md`。

## 派生和授权

本项目基于原 Pinterest Plus 用户脚本改造。提交贡献前请阅读 [NOTICE.md](NOTICE.md)。
