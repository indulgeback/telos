import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_TIME_ZONE,
  formatCurrentTime,
} from '../dist/services/current-time.js'

const utcTime = new Date('2026-08-21T03:22:16.000Z')

describe('formatCurrentTime', () => {
  it('空输入默认返回北京时间，而不是容器 UTC 时间', () => {
    const output = formatCurrentTime({}, utcTime)

    assert.match(output, /北京时间，Asia\/Shanghai/)
    assert.match(output, /2026年8月21日星期五 11:22:16/)
    assert.doesNotMatch(output, / 03:22:16/)
  })

  it('兼容旧 DynamicTool 传入的空 JSON 字符串', () => {
    const output = formatCurrentTime('{}', utcTime)

    assert.match(output, /11:22:16/)
    assert.strictEqual(DEFAULT_TIME_ZONE, 'Asia/Shanghai')
  })

  it('支持显式 IANA 时区', () => {
    const output = formatCurrentTime({ timezone: 'America/New_York' }, utcTime)

    assert.match(output, /America\/New_York/)
    assert.match(output, /2026年8月20日星期四 23:22:16/)
  })

  it('拒绝无效时区并给出正确参数示例', () => {
    const output = formatCurrentTime({ timezone: 'Mars/Base' }, utcTime)

    assert.match(output, /时区无效：Mars\/Base/)
    assert.match(output, /Asia\/Shanghai/)
  })
})
