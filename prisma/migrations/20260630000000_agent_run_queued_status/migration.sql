ALTER TYPE "AgentRunStatus" ADD VALUE IF NOT EXISTS 'queued';
ALTER TABLE "agent_runs" ALTER COLUMN "status" SET DEFAULT 'queued';
