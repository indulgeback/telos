import { prisma } from '../src/services/db.js'
import { generateAgentInstructions } from '../src/services/chat.js'

async function migrate() {
  console.log('Starting voice config migration for existing agents...')
  const agents = await prisma.agent.findMany()
  console.log(`Found ${agents.length} agents in database.`)

  for (const agent of agents) {
    const metadata = (agent.metadata || {}) as Record<string, any>
    if (metadata && metadata.voice) {
      console.log(`- Agent "${agent.name}" already has voice config, skipping.`)
      continue
    }

    console.log(`- Generating voice config for Agent "${agent.name}" based on its description...`)
    try {
      const result = await generateAgentInstructions(agent.description, agent.modelKey || undefined)
      
      const updatedMetadata = {
        ...metadata,
        voice: {
          enabled: true,
          ...result.voice,
        }
      }

      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          instructions: result.instructions,
          metadata: updatedMetadata
        }
      })
      console.log(`  Successfully updated Agent "${agent.name}" with AI generated voice config.`)
    } catch (error) {
      console.error(`  Failed to generate voice config for "${agent.name}" using LLM, applying default settings.`)
      const defaultVoice = {
        enabled: true,
        speakingStyle: '自然、清晰、可靠',
        characterDetails: '扮演一个自然、专业的语音助手，回答简洁明了，适合语音播报。',
        webSearchEnabled: false,
        singingEnabled: false,
        speaker: 'zh_female_vv_jupiter_bigtts'
      }
      const updatedMetadata = {
        ...metadata,
        voice: defaultVoice
      }
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          metadata: updatedMetadata
        }
      })
    }
  }
  console.log('Voice config migration finished successfully!')
}

migrate()
  .catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
