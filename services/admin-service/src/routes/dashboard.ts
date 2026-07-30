import { Hono } from 'hono'
import { prisma } from '../services/db.js'

export const dashboardRouter = new Hono()

// GET /api/admin/dashboard — 各项数据统计
dashboardRouter.get('/', async c => {
  const [
    userCount,
    agentCount,
    skillCount,
    modelCount,
    threadCount,
    runCount,
    recentRuns,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.agent.count(),
    prisma.skill.count(),
    prisma.chatModel.count(),
    prisma.agentThread.count(),
    prisma.agentRun.count(),
    // 近 14 天每天的 run 数 (趋势图)
    prisma.agentRun.groupBy({
      by: ['createdAt'],
      _count: true,
      where: { createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // 按天聚合 (groupBy 按完整时间戳, 需手动归并到天)
  const dailyMap = new Map<string, number>()
  for (const r of recentRuns) {
    const day = r.createdAt.toISOString().slice(0, 10)
    dailyMap.set(day, (dailyMap.get(day) || 0) + r._count)
  }
  const dailyTrend = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }))

  return c.json({
    code: 0,
    data: {
      counts: {
        users: userCount,
        agents: agentCount,
        skills: skillCount,
        models: modelCount,
        threads: threadCount,
        runs: runCount,
      },
      // 近 14 天会话趋势
      runsTrend: dailyTrend,
    },
  })
})
