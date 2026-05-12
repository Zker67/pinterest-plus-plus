# 参考脚本分析

这份文档记录 Pinterest++ 从参考脚本中吸收的资源解析思路。目标是复用可靠链路，但不照搬参考脚本的界面和使用方式。

## 边界

Pinterest++ 的产品形态保持不变：

- 主页瀑布流使用右上角悬停小图标。
- 详情页在官方保存按钮旁增加同款下载按钮。
- 保存状态跟随 Pinterest 官方 `保存` / `已收藏`。
- 下载行为优先直接保存文件，不把用户带到图片或视频地址页面。

参考脚本只作为资源解析和降级策略的案例来源。

## 可吸收思路

### PinResource 是主链路

旧版 Pinterest Plus 的核心价值不是按钮，而是它没有只依赖 DOM 缩略图。它会从 Pin ID 请求 Pinterest 的 `PinResource/get`，并读取 `field_set_key: detailed` 返回的数据。

Pinterest++ 对应实现：

- `_GetPinIdFromCard(card)` 和 `_GetPinIdFromText(text)` 负责解析 Pin ID。
- `_FetchPinData(id)` 请求 `PinResource/get`。
- `_ExtractPinUrls(pin)` 从返回数据里提取图片、视频和 Story Pin 候选 URL。

维护原则：

- 有 Pin ID 时先走 `PinResource`。
- DOM 图片只作为补充和降级，不作为唯一真相。
- 不再把 `236x` / `736x` 简单替换成 `/originals/` 后直接打开。

### 候选 URL 要按顺序尝试

Pinterest 的 `/originals/` URL 有时存在于 `srcset`，但实际请求可能返回 AccessDenied。可靠做法是把所有可能 URL 作为候选，逐个尝试下载，失败后换下一个。

Pinterest++ 对应实现：

- `_ResolveCardOriginal(card)` 为主页卡片生成候选列表。
- `_ResolveDetailOriginal()` 为详情页生成候选列表。
- `_DownloadFirstAvailable(urls, filename)` 逐个尝试候选。
- `_DownloadUrlNoOpenFallback(url, filename)` 只负责下载，不打开失败 URL。

维护原则：

- 主页和详情页都应该走 `_DownloadFirstAvailable`。
- 失败的候选 URL 不应该触发 `window.open`。
- 页面当前可见图可以作为最后兜底，但不能排在真实原图数据前面。

### 视频不要把封面当视频

视频 Pin 的封面图片通常也会出现在 DOM 或 `image` 字段里，但那只是静态帧。参考同类脚本时要区分视频真实地址和封面地址。

Pinterest++ 对应实现：

- `_ExtractRecursiveVideoUrls(value)` 递归提取显式视频 URL。
- `_ExtractVideoUrls(videoData)` 处理 `videos.video_list` 等结构。
- `_GetVideoSnippetUrls(root)` 读取 `script[data-test-id='video-snippet']` 的 JSON-LD `contentUrl`。
- `_GetDisplayedVideoUrlCandidates(video)` 只处理页面里真实 `video` / `source` URL。

维护原则：

- `.mp4` / `.m4v` / `.webm` / `.mov` 优先于 HLS。
- `.m3u8` 可以作为候选，但下载体验取决于脚本管理器和浏览器能力。
- poster、cover、thumbnail 不应作为视频下载候选。

### Story Pin 要遍历 pages

Story Pin 可能包含多个 page，每个 page 或 block 里都有图片或视频资源。只取第一个图片会漏下载内容。

Pinterest++ 对应实现：

- `_ExtractPinUrls(pin)` 遍历 `story_pin_data.pages`。
- 每个 page 和 block 继续交给 `_ExtractStoryPageUrls(page)` 提取。

维护原则：

- Story Pin 的候选顺序应保持页面顺序。
- 详情页和主页复用同一套 Story Pin 提取逻辑。

## 不能照搬的部分

参考脚本中的这些做法不适合直接进入 Pinterest++：

- 把完整图片插入详情页正文。
- 添加旧式 `Full Size` 文本按钮。
- 下载失败后打开原始 URL 页面。
- 用大块浮层菜单替代 Pinterest 原生悬停操作层。
- 让保存状态脱离官方按钮状态自行维护。

这些能力即使技术上可行，也会破坏当前目标：轻量、贴近 Pinterest 原生界面、下载行为可预期。

## 回归检查清单

每次改资源解析或下载链路后，至少检查：

1. 主页悬停下载不调用 `window.open`。
2. 主页和详情页都调用 `_DownloadFirstAvailable`。
3. `PinResource` 候选排在 DOM 猜测 URL 前面。
4. `GM_download` 失败后会尝试 request/blob fallback。
5. 所有候选都失败时只报错，不打开 AccessDenied 页面。
6. 视频候选里没有 poster、cover、thumbnail。

可用命令：

```powershell
node --check ".\pinterest++.user.js"
git grep -n "window.open\|_DownloadUrlWithOpenFallback\|_DownloadFirstAvailable" -- pinterest++.user.js
```
