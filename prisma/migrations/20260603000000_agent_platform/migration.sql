-- CreateEnum
CREATE TYPE "AgentLoopMode" AS ENUM ('auto', 'single_turn');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('active', 'archived', 'disabled');

-- CreateEnum
CREATE TYPE "ToolType" AS ENUM ('invokable', 'streamable');

-- CreateEnum
CREATE TYPE "McpTransport" AS ENUM ('stdio', 'streamable_http', 'sse');

-- CreateEnum
CREATE TYPE "McpApprovalPolicy" AS ENUM ('none', 'all', 'sensitive');

-- CreateEnum
CREATE TYPE "AgentRelationMode" AS ENUM ('as_tool', 'handoff');

-- CreateEnum
CREATE TYPE "AgentRunStatus" AS ENUM ('running', 'completed', 'failed', 'cancelled');

-- AlterEnum
ALTER TYPE "ChatModelProvider" ADD VALUE 'openai';
ALTER TYPE "ChatModelProvider" ADD VALUE 'shortapi';

-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "instructions" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "loop_mode" "AgentLoopMode" NOT NULL DEFAULT 'auto',
ADD COLUMN     "max_turns" INTEGER NOT NULL DEFAULT 8,
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "model_key" TEXT NOT NULL DEFAULT 'deepseek-v4-flash',
ADD COLUMN     "status" "AgentStatus" NOT NULL DEFAULT 'active',
ADD COLUMN     "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7;

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_skills" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ToolType" NOT NULL DEFAULT 'invokable',
    "display_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "endpoint" JSONB NOT NULL,
    "parameters" JSONB NOT NULL,
    "response_transform" JSONB NOT NULL DEFAULT '{}',
    "rate_limit" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "tags" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_tools" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_servers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "transport" "McpTransport" NOT NULL,
    "command" TEXT,
    "args" JSONB NOT NULL DEFAULT '[]',
    "url" TEXT,
    "env" JSONB NOT NULL DEFAULT '{}',
    "allowed_tools" JSONB NOT NULL DEFAULT '[]',
    "approval_policy" "McpApprovalPolicy" NOT NULL DEFAULT 'none',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "last_tools_snapshot" JSONB NOT NULL DEFAULT '[]',
    "last_connected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcp_servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_mcp_servers" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "mcp_server_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "allowed_tools" JSONB NOT NULL DEFAULT '[]',
    "config" JSONB NOT NULL DEFAULT '{}',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_mcp_servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_relations" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "subagent_id" TEXT NOT NULL,
    "mode" "AgentRelationMode" NOT NULL DEFAULT 'as_tool',
    "name" TEXT,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_runs" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "thread_id" TEXT,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'running',
    "input" JSONB NOT NULL,
    "final_output" TEXT,
    "last_agent_name" TEXT,
    "last_response_id" TEXT,
    "error" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_run_steps" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "agent_name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_run_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_run_events" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "agent_name" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_run_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE UNIQUE INDEX "agent_skills_agent_id_skill_id_key" ON "agent_skills"("agent_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "tools_name_key" ON "tools"("name");

-- CreateIndex
CREATE UNIQUE INDEX "agent_tools_agent_id_tool_id_key" ON "agent_tools"("agent_id", "tool_id");

-- CreateIndex
CREATE UNIQUE INDEX "mcp_servers_name_key" ON "mcp_servers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "agent_mcp_servers_agent_id_mcp_server_id_key" ON "agent_mcp_servers"("agent_id", "mcp_server_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_relations_parent_id_subagent_id_mode_key" ON "agent_relations"("parent_id", "subagent_id", "mode");

-- CreateIndex
CREATE INDEX "agent_runs_agent_id_created_at_idx" ON "agent_runs"("agent_id", "created_at");

-- CreateIndex
CREATE INDEX "agent_runs_thread_id_idx" ON "agent_runs"("thread_id");

-- CreateIndex
CREATE INDEX "agent_run_steps_run_id_index_idx" ON "agent_run_steps"("run_id", "index");

-- CreateIndex
CREATE INDEX "agent_run_events_run_id_sequence_idx" ON "agent_run_events"("run_id", "sequence");

-- AddForeignKey
ALTER TABLE "agent_skills" ADD CONSTRAINT "agent_skills_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_skills" ADD CONSTRAINT "agent_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tools" ADD CONSTRAINT "agent_tools_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tools" ADD CONSTRAINT "agent_tools_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_mcp_servers" ADD CONSTRAINT "agent_mcp_servers_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_mcp_servers" ADD CONSTRAINT "agent_mcp_servers_mcp_server_id_fkey" FOREIGN KEY ("mcp_server_id") REFERENCES "mcp_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_relations" ADD CONSTRAINT "agent_relations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_relations" ADD CONSTRAINT "agent_relations_subagent_id_fkey" FOREIGN KEY ("subagent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_run_steps" ADD CONSTRAINT "agent_run_steps_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_run_events" ADD CONSTRAINT "agent_run_events_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "AgentThreadStatus" AS ENUM ('active', 'archived', 'deleted');

-- CreateEnum
CREATE TYPE "AgentMessageRole" AS ENUM ('user', 'assistant', 'tool', 'system');

-- CreateTable
CREATE TABLE "agent_threads" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "owner_id" TEXT,
    "title" TEXT NOT NULL,
    "status" "AgentThreadStatus" NOT NULL DEFAULT 'active',
    "summary" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "last_message_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_messages" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "run_id" TEXT,
    "role" "AgentMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "parts" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "sequence" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_memories" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "facts" JSONB NOT NULL DEFAULT '[]',
    "preferences" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_memories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_threads_agent_id_owner_id_status_last_message_at_idx" ON "agent_threads"("agent_id", "owner_id", "status", "last_message_at");

-- CreateIndex
CREATE UNIQUE INDEX "agent_messages_thread_id_sequence_key" ON "agent_messages"("thread_id", "sequence");

-- CreateIndex
CREATE INDEX "agent_messages_thread_id_created_at_idx" ON "agent_messages"("thread_id", "created_at");

-- CreateIndex
CREATE INDEX "agent_messages_run_id_idx" ON "agent_messages"("run_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_memories_owner_id_agent_id_key" ON "agent_memories"("owner_id", "agent_id");

-- AddForeignKey
ALTER TABLE "agent_threads" ADD CONSTRAINT "agent_threads_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "agent_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "agent_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_memories" ADD CONSTRAINT "agent_memories_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "agent_threads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
