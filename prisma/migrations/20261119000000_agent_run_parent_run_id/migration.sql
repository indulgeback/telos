-- 异步子任务派生：run 父子关联（spawn_run + settlement）
ALTER TABLE "agent_runs" ADD COLUMN IF NOT EXISTS "parent_run_id" TEXT;

CREATE INDEX IF NOT EXISTS "agent_runs_parent_run_id_idx" ON "agent_runs"("parent_run_id");

ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_parent_run_id_fkey" FOREIGN KEY ("parent_run_id") REFERENCES "agent_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
