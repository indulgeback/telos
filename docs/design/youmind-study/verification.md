# Landing v5 验证记录

日期：2026-10-28。

## 已完成

- 最终源码执行 `pnpm --filter ./apps/web exec next build --webpack` 通过，包括 TypeScript、页面数据收集和 6/6 静态页面生成。
- LandingPage、LandingNav 与 useLandingMotion 的 ESLint 通过。
- `landing-utils.test.ts` 的 3 项跳转测试通过。
- `git diff --check` 通过。
- Finesse 检测器的 P0 数量为 0。浅色纸面和白色输入框保留用户指定参考的视觉方向。
- 7 种语言各有 63 个 v5 文案键，预览名称占位符完整。
- 8 份创作示例素材哈希互不重复，5 份 T WebP 素材和视频/封面/字幕均存在。
- 运行时代码中不再引用 t-v2、t-v3、skills-hero-t、agents-hero-t；Web 与 Admin 的旧头像入口继续指向已替换的 B 版素材。
- 独立静态审查后修复视频按钮焦点裁切、播放后焦点、移动菜单 Escape 焦点恢复、手机语言切换、触摸目标及长语言导航布局。

## 验证边界

默认 Turbopack 构建长时间停留在 compile 阶段，手动停止；替代的 Webpack 生产构建通过。

浏览器安全入口拒绝了 YouTube 独立页面及 localhost 的访问。本次没有完成原片完整脚本分析、落地页新版浏览器布局和网页内播放复核，也没有通过其他工具绕过限制。`docs/design/t-v4` 中的旧截图属于上一版，不能证明 v5 已完成浏览器验收。

视频本身的完整解码、抽帧、字幕和格式验证见 [视频交付记录](../telos-demo/README.md)。
