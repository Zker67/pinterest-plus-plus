# Greasy Fork 发布指南

目标：把 `pinterest++.user.js` 发布到你自己的 Greasy Fork 账号下。

## 发布前检查

1. 确认脚本文件语法通过：

```powershell
node --check ".\pinterest++.user.js"
```

2. 确认脚本头部至少包含：

```js
// @name         Pinterest++
// @name:en      Pinterest++
// @name:zh-CN   Pinterest++
// @namespace    https://github.com/zker67/pinterest-plus-plus
// @description  为 Pinterest 增加原图下载与保存状态按钮。
// @description:zh-CN 为 Pinterest 增加原图下载与保存状态按钮。
// @description:en Add compact buttons for original image download and save state.
// @version      0.8.16
// @downloadURL  https://raw.githubusercontent.com/zker67/pinterest-plus-plus/main/pinterest++.user.js
// @updateURL    https://raw.githubusercontent.com/zker67/pinterest-plus-plus/main/pinterest++.user.js
```

3. 如果你在 GitHub 改了版本号，Greasy Fork 也需要同步更新脚本内容。

## 新建脚本

1. 登录 Greasy Fork。
2. 打开“发布你编写的脚本”。
3. 选择“输入代码”。
4. 粘贴 `pinterest++.user.js` 的完整内容。
5. 标题使用 `Pinterest++`。
6. 描述会从脚本头读取：

```text
为 Pinterest 图片卡片和 Pin 详情页增加精致的原图下载按钮，并按官方保存状态显示星标。
```

中文页面会使用 `@description:zh-CN`，英文页面会使用 `@description:en`。

7. 附加信息可以按语言分别填写：

- 中文附加信息：复制 [greasyfork-additional-info.zh-CN.md](greasyfork-additional-info.zh-CN.md)
- 英文附加信息：复制 [greasyfork-additional-info.en.md](greasyfork-additional-info.en.md)

8. 许可证选择 `MIT`。

仓库已包含 MIT `LICENSE`，脚本头也包含 `// @license      MIT`。

## 推荐标签

```text
pinterest
download
image
userscript
tampermonkey
```

## 更新发布

每次更新建议按这个顺序：

1. 修改 `pinterest++.user.js`。
2. 提升 `@version`。
3. 更新 `CHANGELOG.md`。
4. 执行语法检查。
5. 提交并推送 GitHub。
6. 在 Greasy Fork 编辑脚本，粘贴新版本代码。

## 注意

- Greasy Fork 对重复脚本、派生脚本和授权说明比较敏感。发布说明里建议明确写明基于 TiLied 的 Pinterest Plus 改造。
- 不要把 `@downloadURL` 指向 Greasy Fork 自动生成的旧脚本地址；本仓库版本使用 GitHub raw 地址作为源。
- GitHub 不接受 `+` 作为仓库名字符，仓库使用 `pinterest-plus-plus`，脚本显示名仍为 `Pinterest++`。
