# Changelog

## 0.8.11

- 增加视频 Pin 兼容，优先从 `videos.video_list` 选择可直接下载的 MP4。
- 悬停卡片识别从图片扩展到 `video` / `source` 媒体元素。
- 故事 Pin 的视频 block 也会参与下载候选解析。

## 0.8.10

- 将脚本描述改为中英双语，便于 Greasy Fork 中文和英文用户理解。
- 补充 MIT license 元信息并同步仓库许可证文件。

## 0.8.09

- 新增 Pin 详情页下载按钮。
- 详情页下载链路收敛为：`PinResource` 原图、`GM_download`、blob fallback、当前显示图。
- 避免详情页最终打开 `AccessDenied` 图片页面。

## 0.8.03 - 0.8.08

- 将保存状态改为完全跟随 Pinterest 官方 `保存` / `已收藏` 文案。
- 将瀑布流按钮定位到卡片右上角，不再依赖官方保存按钮布局。
- 为下载按钮增加工作态和成功态。
- 增加 `GM_xmlhttpRequest` blob 下载回退。

## 0.8.00 - 0.8.02

- 移除旧版 `Full Size` 详情页预览功能。
- 新增瀑布流悬停下载按钮。
- 新增星标保存按钮，代理 Pinterest 官方保存动作。

## 0.7.02

- 上游 Pinterest Plus 参考版本。
