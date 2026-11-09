-- Harness 审计列：TTFT/时长/token 用量与缓存命中
ALTER TABLE "agent_runs" ADD COLUMN IF NOT EXISTS "input_tokens" INTEGER;
ALTER TABLE "agent_runs" ADD COLUMN IF NOT EXISTS "output_tokens" INTEGER;
ALTER TABLE "agent_runs" ADD COLUMN IF NOT EXISTS "cached_tokens" INTEGER;
ALTER TABLE "agent_runs" ADD COLUMN IF NOT EXISTS "ttft_ms" INTEGER;
ALTER TABLE "agent_runs" ADD COLUMN IF NOT EXISTS "duration_ms" INTEGER;
