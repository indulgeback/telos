-- Phase 2 durable execution kernel.
-- This migration is intentionally generated only; do not apply it from a
-- worker/container startup. Apply through the normal database runbook after
-- reviewing the target schema.

ALTER TYPE "AgentRunStatus" ADD VALUE IF NOT EXISTS 'awaiting_approval';
ALTER TABLE "agent_runs" ADD COLUMN "sdk_state" TEXT;
ALTER TABLE "agent_runs" ADD COLUMN "sdk_state_hash" TEXT;
ALTER TABLE "agent_runs" ADD COLUMN "state_version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "agent_runs" ADD COLUMN "partial_output" TEXT;
ALTER TABLE "agent_runs" ADD COLUMN "partial_parts" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "mcp_servers" ADD COLUMN "sensitive_tools" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "agent_run_steps" ADD COLUMN "attempt_id" TEXT;
CREATE INDEX "agent_run_steps_attempt_id_idx" ON "agent_run_steps"("attempt_id");

CREATE TABLE "agent_run_attempts" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "worker_id" TEXT NOT NULL,
    "lease_token" TEXT NOT NULL,
    "fence_token" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "lease_expires_at" TIMESTAMP(3) NOT NULL,
    "heartbeat_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_run_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_tool_calls" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "call_id" TEXT NOT NULL,
    "tool_name" TEXT NOT NULL,
    "arguments_hash" TEXT NOT NULL,
    "arguments" JSONB NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'prepared',
    "side_effect" BOOLEAN NOT NULL DEFAULT false,
    "result" JSONB,
    "error" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_tool_calls_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_tool_approvals" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "tool_call_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "tool_name" TEXT NOT NULL,
    "arguments_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_tool_approvals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_outbox_events" (
    "id" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMP(3),
    "lock_token" TEXT,
    "published_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_outbox_events_pkey" PRIMARY KEY ("id")
);

-- Legacy Phase 1 workers had no durable attempt/fence record. A process that
-- was running while this migration is applied cannot be resumed safely, so
-- fail those rows closed and create their terminal projection transactionally.
WITH interrupted AS (
  UPDATE "agent_runs"
     SET "status" = 'failed',
         "error" = 'Agent execution was interrupted by the durable-kernel migration',
         "completed_at" = CURRENT_TIMESTAMP,
         "updated_at" = CURRENT_TIMESTAMP
   WHERE "status" = 'running'
  RETURNING "id"
)
INSERT INTO "agent_outbox_events" (
  "id", "aggregate_type", "aggregate_id", "event_type", "dedupe_key",
  "payload", "status", "attempts", "available_at", "created_at", "updated_at"
)
SELECT
  'migration-failed-' || "id",
  'agent_run',
  "id",
  'agent_run.failed',
  'agent-run:' || "id" || ':durable-kernel-migration',
  jsonb_build_object(
    'runId', "id",
    'error', 'Agent execution was interrupted by the durable-kernel migration'
  ),
  'pending',
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM interrupted;

CREATE UNIQUE INDEX "agent_run_attempts_lease_token_key" ON "agent_run_attempts"("lease_token");
CREATE UNIQUE INDEX "agent_run_attempts_run_id_attempt_key" ON "agent_run_attempts"("run_id", "attempt");
CREATE INDEX "agent_run_attempts_run_id_status_idx" ON "agent_run_attempts"("run_id", "status");
CREATE INDEX "agent_run_attempts_status_lease_expires_at_idx" ON "agent_run_attempts"("status", "lease_expires_at");

CREATE UNIQUE INDEX "agent_tool_calls_idempotency_key_key" ON "agent_tool_calls"("idempotency_key");
CREATE UNIQUE INDEX "agent_tool_calls_run_id_call_id_key" ON "agent_tool_calls"("run_id", "call_id");
CREATE INDEX "agent_tool_calls_run_id_status_idx" ON "agent_tool_calls"("run_id", "status");
CREATE INDEX "agent_tool_calls_attempt_id_status_idx" ON "agent_tool_calls"("attempt_id", "status");

CREATE UNIQUE INDEX "agent_tool_approvals_tool_call_id_key" ON "agent_tool_approvals"("tool_call_id");
CREATE INDEX "agent_tool_approvals_owner_id_status_idx" ON "agent_tool_approvals"("owner_id", "status");
CREATE INDEX "agent_tool_approvals_run_id_status_idx" ON "agent_tool_approvals"("run_id", "status");
CREATE INDEX "agent_tool_approvals_status_expires_at_idx" ON "agent_tool_approvals"("status", "expires_at");

CREATE UNIQUE INDEX "agent_outbox_events_dedupe_key_key" ON "agent_outbox_events"("dedupe_key");
CREATE INDEX "agent_outbox_events_status_available_at_created_at_idx" ON "agent_outbox_events"("status", "available_at", "created_at");
CREATE INDEX "agent_outbox_events_aggregate_type_aggregate_id_created_at_idx" ON "agent_outbox_events"("aggregate_type", "aggregate_id", "created_at");

ALTER TABLE "agent_run_attempts" ADD CONSTRAINT "agent_run_attempts_run_id_fkey"
  FOREIGN KEY ("run_id") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_run_steps" ADD CONSTRAINT "agent_run_steps_attempt_id_fkey"
  FOREIGN KEY ("attempt_id") REFERENCES "agent_run_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agent_tool_calls" ADD CONSTRAINT "agent_tool_calls_run_id_fkey"
  FOREIGN KEY ("run_id") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_tool_calls" ADD CONSTRAINT "agent_tool_calls_attempt_id_fkey"
  FOREIGN KEY ("attempt_id") REFERENCES "agent_run_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_tool_approvals" ADD CONSTRAINT "agent_tool_approvals_run_id_fkey"
  FOREIGN KEY ("run_id") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_tool_approvals" ADD CONSTRAINT "agent_tool_approvals_tool_call_id_fkey"
  FOREIGN KEY ("tool_call_id") REFERENCES "agent_tool_calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
