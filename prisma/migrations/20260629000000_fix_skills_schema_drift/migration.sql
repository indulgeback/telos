-- 1. 添加 owner_id 字段
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "owner_id" TEXT;

-- 2. 移除旧的全局 name 唯一索引（如果存在）
DROP INDEX IF EXISTS "skills_name_key";

-- 3. 创建 owner_id 和 name 的复合唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS "skills_owner_id_name_key" ON "skills"("owner_id", "name");

-- 4. 创建对 owner_id 的普通索引以加速可见性查询
CREATE INDEX IF NOT EXISTS "skills_owner_id_idx" ON "skills"("owner_id");
