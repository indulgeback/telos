# Telos Mobile - React Native 移动应用

Telos 移动应用是基于 React Native 构建的跨平台移动客户端，为 Telos 智能工作流编排平台提供移动端访问能力。

## 技术栈

- **React Native 0.80.2**: 跨平台移动开发框架
- **React 19**: 最新的 React 并发特性
- **TypeScript**: 严格类型检查
- **React Navigation**: 导航管理
- **AsyncStorage**: 本地数据存储
- **Gesture Handler**: 手势处理
- **Safe Area Context**: 安全区域管理
- **Metro**: JavaScript 打包工具
- **Jest**: 测试框架
- **ESLint + Prettier**: 代码质量工具

## 功能特性

- 📱 **跨平台支持**: 同时支持 iOS 和 Android
- 🔐 **身份认证**: 与后端认证服务集成
- 📊 **工作流管理**: 移动端工作流查看和管理
- 🌐 **离线支持**: 离线优先架构，支持数据同步
- 🎨 **原生体验**: 平台特定的 UI 组件和导航

## 环境要求

### 系统要求

- **Node.js**: >= 18
- **React Native CLI**: 最新版本
- **Xcode**: 14+ (iOS 开发)
- **Android Studio**: 最新版本 (Android 开发)

### 开发环境设置

请确保已完成 [React Native 环境设置](https://reactnative.dev/docs/set-up-your-environment) 指南。

#### iOS 开发环境

1. 安装 Xcode 14+
2. 安装 CocoaPods: `sudo gem install cocoapods`
3. 安装 iOS 模拟器

#### Android 开发环境

1. 安装 Android Studio
2. 配置 Android SDK
3. 设置 Android 模拟器或连接真机

## 快速开始

### 1. 安装依赖

```bash
# 从项目根目录
cd apps/mobile
pnpm install

# iOS 依赖安装（仅首次或更新原生依赖后需要）
bundle install
bundle exec pod install
```

### 2. 启动开发服务器

```bash
# 启动 Metro 打包器
pnpm start
# 或者从根目录
pnpm mobile:start
```

### 3. 运行应用

在新的终端窗口中：

#### Android

```bash
# 确保 Android 模拟器已启动或设备已连接
pnpm android
# 或者从根目录
pnpm mobile:android
```

#### iOS

```bash
# 启动 iOS 模拟器
pnpm ios
# 或者从根目录
pnpm mobile:ios
```

## 开发命令

```bash
# 开发
pnpm start          # 启动 Metro 开发服务器
pnpm android        # 在 Android 上运行
pnpm ios            # 在 iOS 上运行

# 代码质量
pnpm lint           # ESLint 检查
pnpm test           # 运行测试

# 清理
npx react-native clean  # 清理构建缓存
```

## 项目结构

```
apps/mobile/
├── __tests__/              # 测试文件
├── android/                # Android 原生代码
├── ios/                    # iOS 原生代码
├── src/                    # 源代码
│   ├── components/         # React 组件
│   │   ├── atoms/         # 原子组件 (Button, Input, Card 等)
│   │   ├── molecules/     # 分子组件 (WorkflowCard, UserHeader 等)
│   │   └── organisms/     # 有机体组件
│   ├── screens/           # 页面组件
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── WorkflowsScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── navigation/        # 导航配置
│   │   ├── AppNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   └── MainNavigator.tsx
│   ├── services/          # API 服务
│   │   ├── api.ts         # API 客户端
│   │   ├── auth.ts        # 认证服务
│   │   └── workflow.ts    # 工作流服务
│   ├── utils/             # 工具函数
│   ├── types/             # TypeScript 类型定义
│   ├── hooks/             # 自定义 Hooks
│   └── assets/            # 静态资源
├── App.tsx                # 应用入口
├── index.js               # 注册入口
├── package.json           # 依赖配置
└── README.md              # 本文档
```

## 开发指南

### 代码规范

- 使用 TypeScript 进行类型检查
- 遵循 ESLint 配置的代码规范
- 使用 Prettier 进行代码格式化
- 组件使用 PascalCase 命名
- 文件使用 kebab-case 命名

### 状态管理

- 使用 React Context 进行全局状态管理
- 复杂状态可考虑集成 Zustand 或 Redux Toolkit

### API 集成

- 与后端 API 网关通信
- 支持 JWT 身份认证
- 实现请求拦截和错误处理

### 导航

- 使用 React Navigation 进行页面导航
- 支持 Tab 导航和 Stack 导航
- 深度链接支持

## 构建与发布

### 开发构建

```bash
# Android
npx react-native run-android --variant=debug

# iOS
npx react-native run-ios --configuration Debug
```

### 生产构建

```bash
# Android
cd android
./gradlew assembleRelease

# iOS
# 使用 Xcode 进行 Archive 和发布
```

## 调试

### 开发者菜单

- **Android**: 摇晃设备或按 `Ctrl + M` (Windows/Linux) / `Cmd + M` (macOS)
- **iOS**: 摇晃设备或按 `Cmd + D`

### 调试工具

- **Flipper**: 推荐的调试工具
- **React DevTools**: React 组件调试
- **Chrome DevTools**: JavaScript 调试

### 热重载

- **Fast Refresh**: 自动热重载，保持组件状态
- **强制重载**: 在开发者菜单中选择 "Reload"

## 常见问题

### Metro 打包器问题

```bash
# 清理 Metro 缓存
npx react-native start --reset-cache
```

### iOS 构建问题

```bash
# 清理 iOS 构建
cd ios
xcodebuild clean
rm -rf build/
pod install
```

### Android 构建问题

```bash
# 清理 Android 构建
cd android
./gradlew clean
```

### 依赖问题

```bash
# 重新安装依赖
rm -rf node_modules
pnpm install

# iOS 依赖重新安装
cd ios
rm -rf Pods
pod install
```

## 测试

### 单元测试

```bash
pnpm test                    # 运行所有测试
pnpm test -- --watch        # 监听模式
pnpm test -- --coverage     # 生成覆盖率报告
```

### 端到端测试

- 使用 Detox 进行 E2E 测试（待配置）
- 支持 iOS 和 Android 平台测试

## 性能优化

### 包大小优化

- 使用 Hermes JavaScript 引擎
- 启用代码分割和懒加载
- 优化图片资源

### 运行时性能

- 使用 React.memo 优化组件渲染
- 实现虚拟列表处理大数据
- 合理使用 useCallback 和 useMemo

## 部署

### 应用商店发布

- **iOS**: 通过 App Store Connect 发布
- **Android**: 通过 Google Play Console 发布

### 内部分发

- **iOS**: 使用 TestFlight 进行内测
- **Android**: 使用 Firebase App Distribution

## 贡献指南

1. 遵循项目的代码规范和提交规范
2. 确保所有测试通过
3. 更新相关文档
4. 提交 Pull Request 前进行代码审查

## 相关链接

- [React Native 官方文档](https://reactnative.dev/)
- [React Native 环境设置](https://reactnative.dev/docs/set-up-your-environment)
- [Metro 配置](https://metrobundler.dev/)
- [Telos 项目主页](../../README.md)

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](../../LICENSE) 文件了解详情。
