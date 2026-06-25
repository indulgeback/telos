import test from 'node:test'
import assert from 'node:assert'
import { prisma } from '../dist/services/db.js'

test('Diagnose all agents tools', async () => {
  const agents = await prisma.agent.findMany({
    where: { status: { not: 'archived' } }
  })
  
  console.log(`Found ${agents.length} active agents:`)
  for (const agent of agents) {
    const at = await prisma.agentTool.findMany({
      where: { agentId: agent.id },
      include: { tool: true }
    })
    console.log(`- Agent "${agent.name}" (ID: ${agent.id}) has ${at.length} tools:`)
    console.log(at.map(x => x.toolId))
  }
})
