# Telos 产品演示

40 秒的原创流程演示，用一个「安静的建筑作品集网站」串起完整工作过程。成片持续标注「示例演示 · 非实时录屏」，使用示例内容和简化后的 Telos UI，不代表真实任务执行记录。

## 分镜与脚本逻辑

| 时间 | 画面与动作 | 叙事作用 |
| --- | --- | --- |
| 0–4.5 秒 | 建筑参考图、笔记、海报组成灵感拼贴 | 让用户从已有的材料和模糊念头开始 |
| 4.5–10 秒 | 在 T 的输入框中输入作品集需求 | 把开始工作的门槛降低到一句话 |
| 10–16.5 秒 | T 提出三步计划，用户确认 | 展示方向如何被明确，以及用户如何参与决策 |
| 16.5–23 秒 | 参考整理、文件生成、布局检查依次完成 | 展示过程可见，而不是只有一个等待状态 |
| 23–29.5 秒 | 打开 portfolio.html 与作品预览 | 给出一个具体的交付物 |
| 29.5–35 秒 | 用户要求缩短标题，预览更新为 Room to breathe. | 展示如何通过继续对话修改成果 |
| 35–40 秒 | B 版 T 与开始对话的邀请 | 收回到品牌形象和下一步操作 |

YouMind 原页已核验的视频位置、首幕拼贴与 Input 概念用于结构参考；完整原片脚本未获取。详细证据和访问限制见 [参考分析](../youmind-study/reference-analysis.md)。

## 文件

- `apps/web/public/demo/telos-workflow.mp4`：H.264 / yuv420p，1440×810，24 fps，40.000 秒，3,289,085 字节。
- `apps/web/public/demo/telos-workflow-poster.webp`：从最终 MP4 的第 3 秒提取，1440×810，73,766 字节。
- `apps/web/public/demo/telos-workflow-{zh,en}.vtt`：中英文各 7 个连续字幕段，覆盖 0–40 秒。
- `build.py`：生成 HTML/GSAP 动画源。
- `composition/`：可重渲染的合成工程及本地素材。
- `frames/`：设计阶段关键帧；最终 MP4 另外经过抽帧复核。

视频采用无音轨的字幕叙事，适合落地页静音浏览。网页点击封面后加载视频，使用原生播放控件，并按语言选择默认字幕。

## 复现

在仓库根目录执行：

```bash
python3 docs/design/telos-demo/build.py
npx --yes hyperframes@0.8.210 render docs/design/telos-demo/composition \
  --output "$PWD/apps/web/public/demo/telos-workflow.mp4" \
  --fps 24 --quality standard --workers 1
ffmpeg -v error -ss 3 -i apps/web/public/demo/telos-workflow.mp4 \
  -frames:v 1 -c:v libwebp -quality 88 -y \
  apps/web/public/demo/telos-workflow-poster.webp
```

需要 HyperFrames 的 Chrome 运行时与 FFmpeg。源工程使用 macOS 本地 PingFang SC / Songti SC；在其他系统重渲染时，应先配置相应中文字体，否则字形和换行可能不同。

## 验证

- `ffprobe` 确认上述容器、编码、尺寸、帧率和时长。
- FFmpeg 完整解码 960 帧，无解码错误；未检测到持续至少 0.2 秒的黑场。
- 人工查看设计阶段全部 8 张关键帧，以及最终成片第 27 秒和封面，中文与布局正常。
- 两份字幕的时间段连续，无缺口和越界。
- HyperFrames lint 没有错误，但存在重复素材和内联场景结构提示；没有把工具检查描述为零告警。

本次浏览器未获准访问 localhost，因此网页内实际播放和新版页面的浏览器布局仍未复核。视频文件检查和网页代码检查分别记录，互不替代。
