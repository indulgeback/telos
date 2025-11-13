# Remotion 视频合成集成文档

## 概述

本项目已集成 Remotion 4.0，支持基于 JSON 数据驱动的视频合成和实时预览功能。

## 功能特性

- ✅ 支持视频、图片、音频、数字人、字幕等多种元素类型
- ✅ 基于 JSON 配置的声明式视频合成
- ✅ 实时预览视频效果
- ✅ 支持多种宽高比（9:16, 16:9, 1:1 等）
- ✅ 字幕逐字动画效果
- ✅ 数字人透明通道支持
- ✅ 跨域资源代理
- ✅ 使用最新 Remotion 4.0.319+ API

## 项目结构

```
apps/web/
├── src/
│   ├── components/remotion/          # Remotion 组件目录
│   │   ├── types.ts                  # 类型定义
│   │   ├── MainVideo.tsx             # 主视频合成组件
│   │   ├── RemotionRoot.tsx          # Remotion 根组件
│   │   └── elements/                 # 元素组件
│   │       ├── VideoElement.tsx      # 视频元素
│   │       ├── ImageElement.tsx      # 图片元素
│   │       ├── AvatarElement.tsx     # 数字人元素
│   │       ├── CaptionElement.tsx    # 字幕元素
│   │       └── AudioElement.tsx      # 音频元素
│   ├── lib/remotion/                 # 工具函数
│   │   └── data-parser.ts            # JSON 数据解析工具
│   └── app/
│       ├── remotion-preview/         # 预览页面
│       │   └── page.tsx
│       └── api/proxy/                # 代理 API
│           └── route.ts
└── public/
    └── project_data.json             # 示例 JSON 数据
```

## 快速开始

### 1. 启动开发服务器

```bash
cd apps/web
pnpm dev
```

### 2. 访问预览页面

打开浏览器访问：`http://localhost:8800/remotion-preview`

### 3. 上传或加载示例数据

- 点击"上传 JSON"按钮选择 `project_data.json` 文件
- 或点击"加载示例"按钮使用内置示例

### 4. 预览视频

上传成功后，页面会自动渲染视频预览，支持播放、暂停、调整进度等操作。

## JSON 数据结构

### 完整示例

```json
{
  "acceptAspectRatios": ["9x16", "16x9", "1x1"],
  "fps": 30,
  "backgroundColor": "#000000",
  "timeline": {
    "assets": {
      "asset-id-1": {
        "id": "asset-id-1",
        "type": "video",
        "src": "https://example.com/video.mp4",
        "originalWidth": 1920,
        "originalHeight": 1080,
        "duration": 10
      }
    },
    "elements": {
      "element-id-1": {
        "id": "element-id-1",
        "type": "video",
        "assetId": "asset-id-1",
        "start": 0,
        "length": 10,
        "x": 0,
        "y": 0,
        "width": 1080,
        "height": 1920,
        "scaleX": 1,
        "scaleY": 1,
        "rotate": 0,
        "opacity": 1,
        "volume": 0.5
      }
    }
  }
}
```

### 元素类型说明

#### 1. 视频元素 (video)

```json
{
  "type": "video",
  "assetId": "asset-id",
  "start": 0,
  "length": 10,
  "x": 0,
  "y": 0,
  "width": 1080,
  "height": 1920,
  "scaleX": 1,
  "scaleY": 1,
  "rotate": 0,
  "opacity": 1,
  "startFrom": 0,
  "volume": 0.5
}
```

#### 2. 图片元素 (image)

```json
{
  "type": "image",
  "assetId": "image-asset-id",
  "start": 1,
  "length": 3,
  "x": 100,
  "y": 100,
  "width": 300,
  "height": 300,
  "scaleX": 1,
  "scaleY": 1,
  "rotate": 0,
  "opacity": 1
}
```

#### 3. 数字人元素 (avatar)

```json
{
  "type": "avatar",
  "assetId": "avatar-asset-id",
  "start": 0,
  "length": 10,
  "x": 0,
  "y": 0,
  "width": 1080,
  "height": 1920,
  "scaleX": 1,
  "scaleY": 1,
  "rotate": 0,
  "opacity": 1,
  "volume": 1
}
```

**注意**：数字人资产需要设置 `transparent: true` 以支持透明通道。

#### 4. 字幕元素 (caption)

```json
{
  "type": "caption",
  "start": 2,
  "length": 3,
  "x": 100,
  "y": 1600,
  "width": 880,
  "height": 200,
  "text": "字幕文本",
  "fontSize": 48,
  "color": "#FFFFFF",
  "fontFamily": "Arial, sans-serif",
  "textAlign": "center",
  "fontWeight": "bold",
  "words": [
    { "text": "逐字", "start": 0, "end": 0.5 },
    { "text": "显示", "start": 0.5, "end": 1 }
  ]
}
```

**字幕动画**：通过 `words` 数组实现逐字显示效果。

#### 5. 音频元素 (audio)

```json
{
  "type": "audio",
  "assetId": "audio-asset-id",
  "start": 0,
  "length": 10,
  "volume": 0.3,
  "loop": false
}
```

## API 使用

### 数据解析工具

```typescript
import {
  getElements,
  getAssetsMap,
  getTotalDurationFrames,
  getVideoDimensions,
  getFps,
  validateProjectData,
} from '@/lib/remotion/data-parser'

// 验证 JSON 数据
if (validateProjectData(jsonData)) {
  const elements = getElements(jsonData)
  const assets = getAssetsMap(jsonData)
  const fps = getFps(jsonData)
  const dimensions = getVideoDimensions(jsonData.acceptAspectRatios[0])
}
```

### 在其他页面中使用

```typescript
import { Player } from '@remotion/player'
import { RemotionRoot } from '@/components/remotion/RemotionRoot'
import type { ProjectData } from '@/components/remotion/types'

function VideoPlayer({ data }: { data: ProjectData }) {
  return (
    <Player
      component={RemotionRoot}
      inputProps={{ data }}
      durationInFrames={300}
      fps={30}
      compositionWidth={1080}
      compositionHeight={1920}
      controls
    />
  )
}
```

## 跨域资源处理

如果视频/图片资源存在跨域问题，系统会自动通过 `/api/proxy` 代理访问。

### 添加允许的域名

编辑 `src/app/api/proxy/route.ts`：

```typescript
const allowedDomains = [
  'd35ghwdno3nak3.cloudfront.net',
  'commondatastorage.googleapis.com',
  'your-domain.com', // 添加你的域名
]
```

## 性能优化建议

1. **视频格式**：推荐使用 H.264 或 H.265 编码
2. **图片格式**：推荐使用 WebP 或 AVIF
3. **分辨率**：预览时可降低分辨率，渲染时使用原分辨率
4. **资产预加载**：大文件建议提前缓存
5. **透明视频**：使用 WebM VP8/VP9 编码

## 常见问题

### 1. 视频无法播放

- 检查视频格式是否支持（支持 H.264, H.265, VP8, VP9, AV1, ProRes）
- 检查资源 URL 是否可访问
- 检查跨域设置

### 2. 字幕不显示

- 确认 `start` 和 `length` 时间设置正确
- 检查字幕位置 `x`, `y` 是否在可视区域
- 确认字幕颜色与背景有对比度

### 3. 音频无声

- 检查 `volume` 参数（0-1 之间）
- 确认 `muted` 未设置为 `true`
- 检查浏览器音频权限

### 4. 数字人背景不透明

- 确保资产设置 `transparent: true`
- 使用支持透明通道的视频格式（WebM VP8/VP9）
- 在 `OffthreadVideo` 组件中设置 `transparent` prop

## 技术栈

- **Next.js 16.0**：React 框架
- **Remotion 4.0.374**：视频合成引擎
- **TypeScript**：类型安全
- **Tailwind CSS**：样式框架

## 更新日志

### v1.0.0 (2024-11-13)

- ✅ 完成 Remotion 4.0 集成
- ✅ 支持所有元素类型
- ✅ 实现预览页面
- ✅ 添加跨域代理
- ✅ 创建示例数据
- ✅ 完善类型定义
- ✅ 使用最新 API（trimBefore/trimAfter）

## 参考资料

- [Remotion 官方文档](https://www.remotion.dev/docs/)
- [Remotion 4.0 迁移指南](https://www.remotion.dev/docs/4-0-migration)
- [Next.js 文档](https://nextjs.org/docs)

## 支持与反馈

如遇问题或有建议，请联系开发团队。
