import axios, { AxiosError } from "axios";
import type {
  EndpointConfig,
  AuthConfig,
  ToolExecuteRequest,
  ToolExecuteResult,
} from "../types/index.js";

// ========== 内部工具处理 ==========

// 内部工具：计算器
function handleCalculator(params: Record<string, any>): string {
  const { operation, a, b } = params;
  const numA = Number(a);
  const numB = Number(b);

  let result: number;
  switch (operation) {
    case "add":
      result = numA + numB;
      break;
    case "subtract":
      result = numA - numB;
      break;
    case "multiply":
      result = numA * numB;
      break;
    case "divide":
      if (numB === 0) {
        throw new Error("Division by zero");
      }
      result = numA / numB;
      break;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  return String(result);
}

// 内部工具：获取当前时间
function handleGetCurrentTime(params: Record<string, any>): string {
  const timezone = params.timezone || "Asia/Shanghai";
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };
  return now.toLocaleString("zh-CN", options);
}

// ========== 通用工具执行器 ==========

export class ToolExecutor {
  private timeout: number;

  constructor(timeout = 30000) {
    this.timeout = timeout;
  }

  /**
   * 执行工具
   */
  async execute(request: ToolExecuteRequest): Promise<ToolExecuteResult> {
    const startTime = Date.now();
    const { tool, parameters } = request;

    try {
      let result: any;

      // 处理内部工具
      if (tool.endpoint.urlTemplate.startsWith("internal://")) {
        result = this.executeInternalTool(tool, parameters);
      }
      // 处理 HTTP 工具
      else {
        result = await this.executeHttpTool(tool, parameters);
      }

      // 应用响应转换
      if (tool.responseTransform) {
        result = this.transformResponse(result, tool.responseTransform);
      }

      const durationMs = Date.now() - startTime;
      return {
        success: true,
        data: result,
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        errorMessage,
        durationMs,
      };
    }
  }

  /**
   * 执行内部工具
   */
  private executeInternalTool(
    tool: any,
    params: Record<string, any>
  ): any {
    const internalType = tool.endpoint.urlTemplate.replace("internal://", "");

    switch (internalType) {
      case "calculator":
        return handleCalculator(params);
      case "time":
        return handleGetCurrentTime(params);
      default:
        throw new Error(`Unknown internal tool: ${internalType}`);
    }
  }

  /**
   * 执行 HTTP 工具
   */
  private async executeHttpTool(
    tool: any,
    params: Record<string, any>
  ): Promise<any> {
    const { endpoint } = tool;

    // 构建 URL
    const url = this.buildUrl(endpoint.urlTemplate, params);

    // 构建请求头
    const headers: Record<string, string> = { ...endpoint.headers };

    // 设置认证
    this.setAuthHeaders(headers, endpoint.auth);

    // 构建请求体
    let body: any = undefined;
    if (endpoint.bodyTemplate) {
      body = this.renderTemplate(endpoint.bodyTemplate, params);
      headers["Content-Type"] = "application/json";
    }

    // 执行 HTTP 请求
    const timeout = endpoint.timeout || this.timeout;
    const response = await axios({
      method: endpoint.method,
      url,
      headers,
      data: body,
      timeout,
    });

    return response.data;
  }

  /**
   * 构建 URL，支持参数替换
   */
  private buildUrl(template: string, params: Record<string, any>): string {
    let url = template;

    // 替换路径参数 {param}
    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{${key}}`;
      if (url.includes(placeholder)) {
        url = url.replace(new RegExp(placeholder, "g"), String(value));
      }
    }

    return url;
  }

  /**
   * 渲染模板
   */
  private renderTemplate(
    template: string,
    params: Record<string, any>
  ): string {
    let result = template;
    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{${key}}`;
      if (result.includes(placeholder)) {
        result = result.replace(new RegExp(placeholder, "g"), String(value));
      }
    }
    return result;
  }

  /**
   * 设置认证头
   */
  private setAuthHeaders(
    headers: Record<string, string>,
    auth?: AuthConfig
  ): void {
    if (!auth) return;

    switch (auth.type) {
      case "bearer":
        if (auth.tokenEnv) {
          const token = process.env[auth.tokenEnv];
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }
        }
        break;
      case "api_key":
        if (auth.apiKey) {
          headers["X-API-Key"] = auth.apiKey;
        }
        break;
      case "basic":
        if (auth.username && auth.password) {
          const credentials = Buffer.from(
            `${auth.username}:${auth.password}`
          ).toString("base64");
          headers["Authorization"] = `Basic ${credentials}`;
        }
        break;
      case "none":
      default:
        break;
    }
  }

  /**
   * 应用响应转换
   */
  private transformResponse(
    data: any,
    transform: any
  ): any {
    if (!transform) return data;

    // JSONPath 提取（简化实现）
    if (transform.extract && transform.extract !== "$") {
      data = this.extractJSONPath(data, transform.extract);
    }

    // 格式转换
    if (transform.format) {
      switch (transform.format) {
        case "text":
          if (typeof data === "object") {
            data = JSON.stringify(data, null, 2);
          }
          break;
        case "markdown":
          if (typeof data === "object") {
            data = this.toMarkdown(data);
          }
          break;
      }
    }

    // 包装文本
    if (transform.wrapperText && typeof data === "string") {
      data = transform.wrapperText.replace("{content}", data);
    }

    return data;
  }

  /**
   * 简化版 JSONPath 提取
   */
  private extractJSONPath(data: any, path: string): any {
    if (path === "$" || !path) return data;

    // 移除前缀 $.
    const cleanPath = path.replace(/^\$\./, "");
    const parts = cleanPath.split(".");

    let current = data;
    for (const part of parts) {
      if (typeof current === "object" && current !== null) {
        current = current[part];
      } else {
        return data; // 路径无效，返回原始数据
      }
    }

    return current;
  }

  /**
   * 转换为 Markdown 格式
   */
  private toMarkdown(data: any): string {
    if (typeof data !== "object" || data === null) {
      return String(data);
    }

    if (Array.isArray(data)) {
      return data.map((item) => `- ${this.toMarkdown(item)}`).join("\n");
    }

    return Object.entries(data)
      .map(([key, value]) => `**${key}**: ${this.toMarkdown(value)}`)
      .join("\n");
  }
}

// 导出单例
export const toolExecutor = new ToolExecutor();
