import test from 'node:test'

// 这是一个诊断脚本 (集成测试), 需要真实数据库
// CI 环境 (无 DATABASE_URL) 自动跳过
// 用动态 import 避免 import prisma 时的连接副作用
const hasDatabase = Boolean(process.env.DATABASE_URL)

test('Diagnose all agents tools', { skip: !hasDatabase ? '需要 DATABASE_URL (集成测试, CI 跳过)' : undefined }, async t => {
  const { prisma } = await import('../dist/services/db.js')
  const agents = await prisma.agent.findMany({
    where: { status: { not: 'archived' } },
  })

  console.log(`Found ${agents.length} active agents:`)
  for (const agent of agents) {
    const at = await prisma.agentTool.findMany({
      where: { agentId: agent.id },
      include: { tool: true },
    })
    console.log(`- Agent "${agent.name}" (ID: ${agent.id}) has ${at.length} tools:`)
    console.log(at.map(x => x.toolId))
  }
})
