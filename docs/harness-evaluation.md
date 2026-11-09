# Harness 评估框架

> Telos Agent 执行层（harness）的可观测指标定义、目标值与聚合方式。
> 数据来源：`agent_runs` 审计列（`input_tokens` / `output_tokens` / `cached_tokens` / `ttft_ms` / `duration_ms`，3dfa656+ 写入）与 worker 结构化日志（`LLM prompt cache coverage`）。

## 指标定义与目标

| 维度 | 指标 | 定义 | 目标 |
|---|---|---|---|
| 性能 | 首 token 延迟 (TTFT) | run 开始 → 首个 reasoning/text delta | p50 < 2s，p95 < 6s |
| 性能 | 输出速度 | output_tokens ÷ ((duration − ttft) 秒) | ≥ 25 tok/s |
| 成本 | 缓存命中率 | cached_tokens ÷ input_tokens | ≥ 90%（多轮会话） |
| 成本 | 每 run 输入成本 | 未命中 tokens × 单价 | 随 DeepSeek 调价观察 |
| 可靠性 | run 成功率 | status=completed ÷ 全部终态 run | ≥ 99% |
| 可靠性 | 生图 fallback 触发率 | 非 Vertex 主通道完成 ÷ 生图总数 | < 10%（越低说明主通道越稳） |
| 质量 | 工具调用成功率 | tool_end 成功 ÷ tool_start | ≥ 98% |
| 质量 | 计划/审批转化 | create_plan → approved → execute 完成 | 观察值 |

## 缓存命中率的结构性说明

DeepSeek 前缀缓存按 64-token 块精确匹配。组装顺序（runtime.ts）：

```
system-0:  人设 + 技能索引 + 子代理（静态层，跨请求长期命中）
system-1:  记忆 + 会话摘要 + 计划模式 + 分享规则 + 强制技能（易变层，位置固定在 1）
user/assistant 历史轮次
最新 user 轮次
```

- 易变层位置固定后，历史轮次全部落在稳定前缀内 → 每轮只有新增内容未命中
- 每轮必然未命中：上一轮的 assistant 回复（生成于上次请求之后）+ 新 user 轮次
- 已知重置点：后台记忆提取更新记忆列表 / 会话压缩更新摘要 / 进出计划模式 / 强制技能变化——任一变化会使该位置之后一次性重缓存，之后恢复命中

## 聚合查询（pgvector 库）

```sql
-- 按 日×模型 的平均 TTFT / 输出速度 / 缓存命中率
SELECT date_trunc('day', started_at) AS day,
       count(*) AS runs,
       percentile_disc(0.5) WITHIN GROUP (ORDER BY ttft_ms) AS ttft_p50,
       percentile_disc(0.95) WITHIN GROUP (ORDER BY ttft_ms) AS ttft_p95,
       round(avg(duration_ms)) AS avg_duration_ms,
       round(sum(cached_tokens)::numeric / NULLIF(sum(input_tokens), 0) * 100, 1) AS cache_hit_pct,
       round(sum(output_tokens)::numeric / NULLIF(sum(extract(epoch FROM (completed_at - started_at))), 0), 1) AS avg_tok_s
FROM agent_runs
WHERE status = 'completed' AND ttft_ms IS NOT NULL
GROUP BY 1 ORDER BY 1 DESC;
```

## 已知边界

- 上一轮 assistant 回复在下一轮 prompt 中必然未缓存（物理上限，约占总 token 的 5-10%）
- plan 模式切换 / 强制技能 / 记忆更新会导致一次性前缀重置——频率可控，命中率的"锯齿"属预期形态
- 非 DeepSeek 渠道（豆包/Gemini 等）的缓存字段格式不同，当前审计列以 DeepSeek 口径为主；其他渠道写入 0/NULL
