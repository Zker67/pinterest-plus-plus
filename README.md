# Pinterest++

Pinterest++ 是一个 Pinterest 用户脚本，为图片卡片和 Pin 详情页补充更直接的原图下载入口。

它基于 TiLied 的 Greasy Fork 脚本 Pinterest Plus 改造，移除了旧的 `Full Size` 展示逻辑，改为贴近 Pinterest 原生界面的悬停图标按钮。

## 功能

- 在 Pinterest 瀑布流卡片右上角显示两个紧凑图标：
  - 下载：下载当前 Pin 的原图。
  - 星标：代理点击 Pinterest 官方保存按钮，并按官方 `保存` / `已收藏` 状态点亮。
- 在 Pin 详情页的官方保存按钮旁增加同款下载按钮。
- 下载优先使用 Pinterest `PinResource/get` 的 `detailed` 数据，读取官方 `images.orig.url`。
- 详情页下载失败时会回退到当前页面实际显示的图片 URL，避免打开 `AccessDenied` 页面。

## 安装

### 从 GitHub Raw 安装

安装 Tampermonkey、Violentmonkey 或其他用户脚本管理器后，打开：

https://raw.githubusercontent.com/zker67/pinterest-plus-plus/main/pinterest++.user.js

用户脚本管理器会弹出安装页面。

### 从 Greasy Fork 安装

发布到 Greasy Fork 后，可以直接从 Greasy Fork 的安装按钮安装。

发布步骤见 [docs/greasyfork-publish.md](docs/greasyfork-publish.md)。

## 使用

- 在 Pinterest 瀑布流页面，将鼠标悬停到图片卡片上。
- 点击右上角下载图标下载图片。
- 点击星标图标触发 Pinterest 官方保存。
- 在 Pin 详情页，点击保存按钮旁边的下载图标下载当前 Pin。

## 技术说明

主要下载链路：

1. 从卡片链接或详情页 URL 解析 Pin ID。
2. 请求 Pinterest `PinResource/get`，使用 `field_set_key: detailed`。
3. 优先下载 `images.orig.url`。
4. 使用 `GM_download` 下载。
5. `GM_download` 失败或超时时，使用 `GM_xmlhttpRequest` 拉取 blob 后触发浏览器下载。
6. 详情页仍失败时，回退到当前实际显示图。

## 权限

- `GM_download` / `GM.download`：触发用户脚本管理器下载。
- `GM_xmlhttpRequest` / `GM.xmlHttpRequest`：下载失败时拉取图片 blob。
- `@connect i.pinimg.com` / `@connect *.pinimg.com`：允许请求 Pinterest 图片 CDN。

## 开发

本仓库没有构建步骤。修改后至少执行：

```powershell
node --check ".\pinterest++.user.js"
```

## 来源与授权边界

本项目基于 TiLied 的 Pinterest Plus 脚本改造。原 Greasy Fork 页面显示 License 为 `N/A`，因此本仓库暂不声明 MIT/GPL 等开源许可证。详见 [NOTICE.md](NOTICE.md)。
