-- 测试工具：计算器（不需要 API 密钥）
INSERT INTO tools (
    id, name, type, display_name, description, category, endpoint, parameters, response_transform, enabled
) VALUES (
    'test-calculator',
    'calculator',
    'invokable',
    '简单计算器',
    '执行基本的数学运算（加、减、乘、除），用于测试工具调用功能',
    'test',
    '{
        "url_template": "internal://calculator",
        "method": "POST",
        "auth": {
            "type": "none"
        },
        "timeout": 5
    }'::jsonb,
    '{
        "type": "object",
        "properties": {
            "operation": {
                "type": "string",
                "description": "运算类型：add（加）、subtract（减）、multiply（乘）、divide（除）",
                "enum": ["add", "subtract", "multiply", "divide"]
            },
            "a": {
                "type": "number",
                "description": "第一个数字"
            },
            "b": {
                "type": "number",
                "description": "第二个数字"
            }
        },
        "required": ["operation", "a", "b"]
    }'::jsonb,
    '{
        "extract": "$",
        "format": "text"
    }'::jsonb,
    true
) ON CONFLICT (name) DO NOTHING;

-- 测试工具：获取当前时间
INSERT INTO tools (
    id, name, type, display_name, description, category, endpoint, parameters, response_transform, enabled
) VALUES (
    'test-time',
    'get_current_time',
    'invokable',
    '获取当前时间',
    '返回当前的日期和时间，用于测试工具调用功能',
    'test',
    '{
        "url_template": "internal://time",
        "method": "POST",
        "auth": {
            "type": "none"
        },
        "timeout": 5
    }'::jsonb,
    '{
        "type": "object",
        "properties": {
            "timezone": {
                "type": "string",
                "description": "时区，例如 Asia/Shanghai",
                "default": "Asia/Shanghai"
            }
        },
        "required": []
    }'::jsonb,
    '{
        "extract": "$",
        "format": "text"
    }'::jsonb,
    true
) ON CONFLICT (name) DO NOTHING;
