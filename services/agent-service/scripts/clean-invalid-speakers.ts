import { prisma } from '../src/services/db.js'

async function clean() {
  console.log('开始清洗数据库中所有 Agent 的实时语音音色参数...')
  const agents = await prisma.agent.findMany()
  console.log(`共找到 ${agents.length} 个 Agent。`)

  let updatedCount = 0

  for (const agent of agents) {
    const metadata = (agent.metadata || {}) as Record<string, any>
    if (!metadata || !metadata.voice) {
      console.log(`- Agent "${agent.name}" 无语音配置，跳过。`)
      continue
    }

    const voice = metadata.voice as Record<string, any>
    const currentSpeaker = voice.speaker

    if (!currentSpeaker) {
      console.log(`- Agent "${agent.name}" 未设置音色，跳过。`)
      continue
    }

    // 根据 Agent 的名称做精确性别分配，保证音色与角色完全契合
    let newSpeaker = 'zh_female_vv_jupiter_bigtts' // 默认女声
    if (
      agent.name.includes('女') ||
      agent.name.includes('秘书') ||
      agent.name.includes('女巫')
    ) {
      newSpeaker = 'zh_female_vv_jupiter_bigtts' // 美艳女秘书 / 魅惑女巫
    } else if (
      agent.name.includes('小当家') ||
      agent.name.includes('厨神') ||
      agent.name.includes('男')
    ) {
      newSpeaker = 'zh_male_yunzhou_jupiter_bigtts' // 厨神小当家
    }

    if (currentSpeaker === newSpeaker) {
      console.log(`- Agent "${agent.name}" 音色已经是正确的 "${currentSpeaker}"，跳过。`)
      continue
    }

    console.log(`- Agent "${agent.name}" 音色校准: "${currentSpeaker}" -> "${newSpeaker}"`)

    const updatedMetadata = {
      ...metadata,
      voice: {
        ...voice,
        speaker: newSpeaker
      }
    }

    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        metadata: updatedMetadata
      }
    })

    updatedCount++
  }

  console.log(`数据清洗完毕！共校准了 ${updatedCount} 个 Agent 的音色参数。`)
}

clean()
  .catch(err => {
    console.error('清洗数据库音色数据失败：', err)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
