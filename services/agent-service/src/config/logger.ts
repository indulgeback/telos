// Package config 提供 Pino 日志配置
//
// 使用 Pino + pino-pretty 实现专业的日志系统：
//   - 开发环境：彩色格式化输出
//   - 生产环境：JSON 结构化日志
//   - 支持多级别日志（debug, info, warn, error）
//   - 自动时间戳和错误序列化
import pino from 'pino';
import pinoPretty from 'pino-pretty';

export interface LoggerConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  pretty: boolean;
  colorize: boolean;
  translateTime: boolean;
}

// 开发环境配置：彩色 + 格式化输出
const developmentConfig: LoggerConfig = {
  level: 'debug',
  pretty: true,
  colorize: true,
  translateTime: true,
};

// 生产环境配置：JSON 输出
const productionConfig: LoggerConfig = {
  level: 'info',
  pretty: false,
  colorize: false,
  translateTime: true,
};

function createLogger(config: LoggerConfig) {
  const isDevelopment = config.pretty;

  // 基础配置
  const baseOptions: pino.LoggerOptions = {
    level: config.level,
    timestamp: pino.stdTimeFunctions.isoTime,
    serializers: {
      err: pino.stdSerializers.err,
    },
  };

  // 开发环境：使用 pino-pretty 美化输出（单行格式）
  if (isDevelopment) {
    const prettyStream = pinoPretty({
      colorize: config.colorize,
      levelFirst: true,
      translateTime: config.translateTime ? 'SYS:standard' : false,
      ignore: 'pid,hostname',
      singleLine: true,  // 改为 true，单行输出
      messageFormat: (log, messageKey) => {
        const msg = log[messageKey];
        if (typeof msg === 'object') {
          return JSON.stringify(msg);  // 移除格式化，单行输出
        }
        return msg as string;
      },
    });

    return pino(baseOptions, prettyStream);
  }

  // 生产环境：纯 JSON 输出
  return pino(baseOptions);
}

// 导出 logger 实例
export const logger = createLogger(
  process.env.NODE_ENV === 'production'
    ? productionConfig
    : developmentConfig
);

// 子 logger（可用于特定模块）
export function createModuleLogger(moduleName: string) {
  return logger.child({ module: moduleName });
}
