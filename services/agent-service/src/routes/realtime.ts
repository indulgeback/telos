import { Hono } from 'hono'
import { ok } from '../http/response.js'
import { getVolcRealtimePublicConfig } from '../services/realtime/volc-realtime.js'

export const realtimeRouter = new Hono()

// 语音模式的文字输入走常规 agent 对话流（/api/agent），不再有单独的
// realtime text 通道：全双工语音 API 是纯语音协议，没有文字提问事件。

realtimeRouter.get('/config', c => {
  return ok(c, getVolcRealtimePublicConfig())
})
