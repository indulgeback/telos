-- AgentRun 热查询索引:worker 轮询按 status 扫描,会话历史按 threadId+createdAt 排序
DROP INDEX IF EXISTS "AgentRun_threadId_idx";
CREATE INDEX "AgentRun_threadId_createdAt_idx" ON "agent_runs"("thread_id", "created_at");
CREATE INDEX "AgentRun_status_createdAt_idx" ON "agent_runs"("status", "created_at");
