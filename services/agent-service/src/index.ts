import express, { type Request, type Response } from "express";
import { config, validateConfig, logger } from "./config/index.js";
import { chatRouter } from "./routes/chat.js";
import { agentsRouter } from "./routes/agents.js";
import { db } from "./services/db.js";
import { performRegistration } from "./services/registry.js";

// ========== 验证配置 ==========
validateConfig();

// ========== 创建 Express 应用 ==========
const app = express();

// ========== 中间件 ==========

// JSON 解析
app.use(express.json());

// 请求日志
app.use((req: Request, _res: Response, next) => {
  logger.info({
    msg: `${req.method} ${req.path}`,
    requestId: req.header("X-Request-ID"),
    agentId: req.header("X-Agent-ID"),
  });
  next();
});

// ========== 健康检查 ==========

app.get("/health", async (_req: Request, res: Response) => {
  const isHealthy = await db.healthCheck();
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "healthy" : "unhealthy",
    time: new Date().toISOString(),
    service: "agent-service",
  });
});

app.get("/ready", async (_req: Request, res: Response) => {
  res.json({ status: "ready" });
});

app.get("/info", (_req: Request, res: Response) => {
  res.json({
    service: "agent-service",
    version: "1.0.0",
    framework: "langchain.js",
    model: "deepseek",
  });
});

// ========== API 路由 ==========

// 聊天接口
app.use("/api/agent", chatRouter);

// Agent 管理
app.use("/api/agents", agentsRouter);

// ========== 404 处理 ==========

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    code: 404,
    message: "Not Found",
  });
});

// ========== 错误处理 ==========

app.use((err: Error, _req: Request, res: Response, _next: any) => {
  logger.error({
    msg: "Unhandled error",
    err,
  });
  res.status(500).json({
    code: 500,
    message: config.nodeEnv === "development" ? err.message : "Internal Server Error",
  });
});

// ========== 启动服务 ==========

const server = app.listen(config.port, async () => {
  logger.info({
    msg: "Agent Service started",
    port: config.port,
    environment: config.nodeEnv,
    model: config.aiModel,
  });

  // 注册到服务注册中心
  performRegistration();
});

// ========== 优雅关闭 ==========

const shutdown = async () => {
  logger.info({
    msg: "Shutting down gracefully...",
  });

  server.close(async () => {
    logger.info({
      msg: "HTTP server closed",
    });

    try {
      await db.disconnect();
      logger.info({
        msg: "Database disconnected",
      });
      process.exit(0);
    } catch (error) {
      logger.error({
        msg: "Error during shutdown",
        err: error,
      });
      process.exit(1);
    }
  });

  // 强制关闭超时
  setTimeout(() => {
    logger.error({
      msg: "Forced shutdown after timeout",
    });
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// ========== 未捕获的异常 ==========

process.on("unhandledRejection", (reason, promise) => {
  logger.error({
    msg: "Unhandled Rejection",
    promise,
    reason,
  });
});

process.on("uncaughtException", (error) => {
  logger.error({
    msg: "Uncaught Exception",
    err: error,
  });
  shutdown();
});
