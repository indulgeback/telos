/**
 * 视频录制器工具函数
 */

/**
 * 将秒数格式化为 "HH:MM:SS" 格式
 * 每个部分都补零到 2 位数字
 *
 * @param seconds - 表示时长的非负整数（秒）
 * @returns 格式化后的 "HH:MM:SS" 字符串
 *
 * @example
 * formatDuration(0) // "00:00:00"
 * formatDuration(61) // "00:01:01"
 * formatDuration(3661) // "01:01:01"
 */
export function formatDuration(seconds: number): string {
  // 确保使用非负整数
  const totalSeconds = Math.max(0, Math.floor(seconds))

  const hrs = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
