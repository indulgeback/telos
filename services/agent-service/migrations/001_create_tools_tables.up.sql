-- 001_create_tools_tables.up.sql
-- 创建工具插件系统的数据库表
--
-- 包含：
--   - tools: 工具定义表
--   - agent_tools: Agent 工具关联表
--   - tool_executions: 工具执行日志表

-- 工具表 (存储工具定义)
CREATE TABLE IF NOT EXISTS tools (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'invokable',
    display_name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'custom',
    endpoint JSONB NOT NULL,
    parameters JSONB NOT NULL,
    response_transform JSONB,
    rate_limit JSONB,
    enabled BOOLEAN DEFAULT TRUE,
    version VARCHAR(20) DEFAULT '1.0.0',
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Agent 工具关联表
CREATE TABLE IF NOT EXISTS agent_tools (
    id VARCHAR(36) PRIMARY KEY,
    agent_id VARCHAR(36) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    tool_id VARCHAR(100) NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT TRUE,
    config JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(agent_id, tool_id)
);

-- 工具执行日志
CREATE TABLE IF NOT EXISTS tool_executions (
    id VARCHAR(36) PRIMARY KEY,
    agent_id VARCHAR(36) REFERENCES agents(id) ON DELETE SET NULL,
    user_id VARCHAR(36),
    tool_id VARCHAR(100) REFERENCES tools(id) ON DELETE SET NULL,
    input_params JSONB,
    result JSONB,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    duration_ms INTEGER,
    tokens_used INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_tools_enabled ON tools(enabled);
CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category);
CREATE INDEX IF NOT EXISTS idx_agent_tools_agent ON agent_tools(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tools_tool ON agent_tools(tool_id);
CREATE INDEX IF NOT EXISTS idx_executions_agent ON tool_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_executions_user ON tool_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_executions_tool ON tool_executions(tool_id);
CREATE INDEX IF NOT EXISTS idx_executions_created ON tool_executions(created_at DESC);

-- 预置工具定义：Jina Reader
INSERT INTO tools (
    id, name, type, display_name, description, category, endpoint, parameters, response_transform, enabled
) VALUES (
    'jina-reader',
    'web_reader',
    'invokable',
    'Jina 网页阅读器',
    '从任意 URL 读取并提取 LLM 友好的内容，自动处理分页、广告等干扰内容',
    'web',
    '{
        "url_template": "https://r.jina.ai/{url}",
        "method": "GET",
        "headers": {
            "X-With-Generated-Alt": "true",
            "X-With-Links-Summary": "true",
            "X-With-Images-Summary": "true"
        },
        "auth": {
            "type": "bearer",
            "token_env": "JINA_READER_API_TOKEN"
        },
        "timeout": 30
    }'::jsonb,
    '{
        "type": "object",
        "properties": {
            "url": {
                "type": "string",
                "description": "要读取的网页 URL",
                "required": true
            }
        },
        "required": ["url"]
    }'::jsonb,
    '{
        "extract": "$",
        "format": "text"
    }'::jsonb,
    true
) ON CONFLICT (name) DO NOTHING;

-- 预置工具定义：Jina Search
INSERT INTO tools (
    id, name, type, display_name, description, category, endpoint, parameters, response_transform, enabled
) VALUES (
    'jina-search',
    'web_search',
    'invokable',
    'Jina 网页搜索',
    '搜索互联网并获取结果的内容摘要，返回相关的网页链接和内容预览',
    'web',
    '{
        "url_template": "https://s.jina.ai/?q={query}",
        "method": "GET",
        "headers": {
            "Accept": "application/json"
        },
        "auth": {
            "type": "bearer",
            "token_env": "JINA_SEARCH_API_TOKEN"
        },
        "timeout": 30
    }'::jsonb,
    '{
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "搜索查询内容",
                "required": true
            }
        },
        "required": ["query"]
    }'::jsonb,
    '{
        "extract": "$",
        "format": "json"
    }'::jsonb,
    true
) ON CONFLICT (name) DO NOTHING;
