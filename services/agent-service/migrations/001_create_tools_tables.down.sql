-- 001_create_tools_tables.down.sql
-- 回滚工具插件系统的数据库表

DROP TABLE IF EXISTS tool_executions CASCADE;
DROP TABLE IF EXISTS agent_tools CASCADE;
DROP TABLE IF EXISTS tools CASCADE;
