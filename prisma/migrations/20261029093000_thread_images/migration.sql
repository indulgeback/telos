-- 图片画布：线程关联的生成图清单（generate_image 成功时追加）
ALTER TABLE "agent_threads" ADD COLUMN IF NOT EXISTS "images" JSONB;
