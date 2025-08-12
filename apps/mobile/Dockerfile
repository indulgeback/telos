# 移动应用构建 Dockerfile
FROM node:20-alpine AS base

# 安装必要的系统依赖
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    openjdk11-jre

# 安装 pnpm
RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

# 复制 pnpm 配置文件
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# 依赖安装阶段
FROM base AS deps
# 复制 package.json 文件
COPY package.json ./
COPY apps/mobile/package.json ./apps/mobile/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 构建阶段
FROM base AS builder
WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/mobile/node_modules ./apps/mobile/node_modules

# 复制源代码
COPY apps/mobile ./apps/mobile

# 设置工作目录到移动应用
WORKDIR /app/apps/mobile

# 设置环境变量
ENV NODE_ENV production

# Metro 服务器阶段
FROM builder AS metro
WORKDIR /app/apps/mobile

# 暴露 Metro 端口
EXPOSE 8081

# 启动 Metro 服务器
CMD ["pnpm", "start"]

# Android 构建阶段
FROM builder AS android-builder

# 安装 Android SDK
ENV ANDROID_HOME /opt/android-sdk
ENV PATH ${PATH}:${ANDROID_HOME}/tools:${ANDROID_HOME}/platform-tools

RUN mkdir -p ${ANDROID_HOME} && \
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-8512546_latest.zip -O android-tools.zip && \
    unzip android-tools.zip -d ${ANDROID_HOME} && \
    rm android-tools.zip

# 构建 Android APK
WORKDIR /app/apps/mobile
RUN cd android && ./gradlew assembleRelease

# 最终镜像 - Metro 服务器
FROM metro AS final