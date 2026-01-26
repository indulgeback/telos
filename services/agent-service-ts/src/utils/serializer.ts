/**
 * 序列化工具：将 camelCase 转换为 snake_case
 * 用于保持与 Go 版本 API 的响应格式一致
 */

/**
 * 将 camelCase 转换为 snake_case
 * @example createdAt -> created_at
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * 将对象的键从 camelCase 转换为 snake_case（递归）
 */
export function toSnakeCase<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // 处理数组
  if (Array.isArray(obj)) {
    return obj.map((item) => toSnakeCase(item)) as any;
  }

  // 处理日期对象
  if (obj instanceof Date) {
    return obj.toISOString() as any;
  }

  // 处理基本类型
  if (typeof obj !== 'object') {
    return obj;
  }

  // 处理普通对象
  const result: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = camelToSnake(key);
      result[snakeKey] = toSnakeCase(obj[key]);
    }
  }
  return result as T;
}

/**
 * Agent 序列化器（特定字段转换）
 */
export function serializeAgent(agent: any) {
  if (!agent) return null;
  return toSnakeCase(agent);
}

/**
 * Agent 列表序列化器
 */
export function serializeAgents(agents: any[]) {
  return agents.map(serializeAgent);
}

/**
 * Tool 序列化器
 */
export function serializeTool(tool: any) {
  if (!tool) return null;
  return toSnakeCase(tool);
}

/**
 * Tool 列表序列化器
 */
export function serializeTools(tools: any[]) {
  return tools.map(serializeTool);
}
