# Remotion JSON 数据适配完成

## 适配概述

已成功适配新的复杂 JSON 数据结构，支持场景（scene）嵌套和更丰富的元素类型。

## 主要改动

### 1. 类型定义扩展 (`types.ts`)

**新增元素类型：**

- `voiceover` - 语音旁白
- `scene` - 场景（容器类型）
- `text` - 文本元素
- `shape` - 形状元素

**新增字段：**

- `TimelineElement`:
  - `parent` - 所属场景 ID
  - `specialType` - 特殊类型标记
  - `hidden` - 是否隐藏
  - `tracks` - 场景的轨道
  - `templateId`, `sceneName` - 场景相关字段
  - `script`, `accent`, `voiceSync` - 语音旁白字段
  - `shape`, `fill`, `blur` - 形状字段
  - `style`, `animation`, `ctaName` - 其他字段

- `Asset`:
  - `srcset` - 多分辨率资源数组
  - `faceAspectRatio` - 数字人宽高比
  - 其他扩展字段

- `ProjectData`:
  - `output` - 输出配置（包含 fps, size, format）
  - 更多顶级字段支持

### 2. 数据解析工具更新 (`data-parser.ts`)

**核心改动：**

#### `getElements()` 函数

- **场景展开**：自动识别 scene 类型元素
- **时间转换**：将场景内元素的相对时间转换为绝对时间
  ```
  绝对时间 = 场景开始时间 + 元素相对时间
  ```
- **过滤处理**：
  - 分离 scene 和非 scene 元素
  - 提取 parent 匹配的子元素
  - 合并为扁平的元素列表

#### `getVideoDimensions()` 函数

- **优先级**：优先使用 `output.size`，其次使用宽高比计算
- **新增参数**：`output?: ProjectData['output']`

#### `getFps()` 函数

- **优先级**：`output.fps` > `data.fps` > 30（默认值）

#### 类型安全

- 所有涉及 `elem.start` 的地方使用 `elem.start ?? 0`
- 处理可能为 `undefined` 的情况

### 3. MainVideo 组件更新 (`MainVideo.tsx`)

**元素类型处理：**

- `voiceover` - 映射到 AudioElement 渲染
- `text`, `shape`, `scene` - 暂时不渲染（scene 已被展开）
- 支持没有 `assetId` 的元素

### 4. 预览页面更新 (`page.tsx`)

**配置传递：**

- 传递 `projectData.output` 给 `getVideoDimensions()`
- 自动使用 JSON 中的尺寸配置

## 数据结构示例

### 旧格式（简单结构）

```json
{
  "timeline": {
    "elements": {
      "elem-1": {
        "id": "elem-1",
        "type": "video",
        "start": 0,
        "length": 10,
        ...
      }
    }
  }
}
```

### 新格式（场景嵌套）

```json
{
  "output": {
    "fps": 30,
    "size": { "width": 1080, "height": 1920 }
  },
  "timeline": {
    "elements": {
      "scene-1": {
        "id": "scene-1",
        "type": "scene",
        "start": 0,
        "length": 10,
        "tracks": [...]
      },
      "elem-1": {
        "id": "elem-1",
        "type": "video",
        "parent": "scene-1",
        "start": 0,  // 相对于场景的时间
        "length": 5,
        ...
      }
    }
  }
}
```

## 处理流程

1. **数据加载** → 验证 JSON 格式
2. **场景识别** → 分离 scene 和非 scene 元素
3. **时间转换** → 将相对时间转换为绝对时间
4. **元素过滤** → 过滤隐藏和不支持的元素
5. **渲染** → 根据元素类型渲染对应组件

## 支持的元素类型

| 元素类型    | 渲染组件       | 说明                     |
| ----------- | -------------- | ------------------------ |
| `video`     | VideoElement   | 视频片段                 |
| `image`     | ImageElement   | 图片                     |
| `avatar`    | AvatarElement  | 数字人                   |
| `caption`   | CaptionElement | 字幕（支持逐字）         |
| `audio`     | AudioElement   | 音频                     |
| `voiceover` | AudioElement   | 语音旁白                 |
| `scene`     | -              | 场景容器（展开后不渲染） |
| `text`      | -              | 文本（暂不支持）         |
| `shape`     | -              | 形状（暂不支持）         |

## 兼容性

✅ 完全兼容旧的简单 JSON 格式  
✅ 支持新的场景嵌套格式  
✅ 自动识别并处理两种格式

## 测试

### 测试步骤

1. 启动开发服务器：`pnpm dev`
2. 访问：`http://localhost:8800/remotion-preview`
3. 点击"加载示例"按钮
4. 查看视频预览效果

### 预期结果

- ✅ 成功解析 JSON
- ✅ 正确展开场景结构
- ✅ 视频尺寸使用 output.size (1080x1920)
- ✅ 帧率使用 output.fps (30)
- ✅ 所有元素按绝对时间正确显示
- ✅ 字幕、音频、视频等正常渲染

## 注意事项

1. **场景必须有 start 字段**：用于计算子元素的绝对时间
2. **子元素必须有 parent 字段**：用于关联到场景
3. **output 配置优先级最高**：会覆盖其他配置
4. **未实现的元素类型**：text、shape 会被忽略
5. **音频标签限制**：如果有超过 5 个音频元素，需要设置 `numberOfSharedAudioTags` 参数（已设置为 10）

## 未来扩展

- [ ] 支持 `text` 元素渲染
- [ ] 支持 `shape` 元素渲染
- [ ] 支持转场效果 (transitions)
- [ ] 支持动画配置 (animation)
- [ ] 支持更多 CTA 元素

## 相关文件

- `/src/components/remotion/types.ts` - 类型定义
- `/src/lib/remotion/data-parser.ts` - 数据解析
- `/src/components/remotion/MainVideo.tsx` - 主渲染组件
- `/src/app/[locale]/(no-layout)/remotion-preview/page.tsx` - 预览页面
- `/public/project_data.json` - 示例数据

---

**适配完成时间**：2024-11-13  
**适配版本**：Remotion 4.0.374  
**状态**：✅ 可用
