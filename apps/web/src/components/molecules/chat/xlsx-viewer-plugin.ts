/**
 * 自定义 xlsx 预览插件（for @open-file-viewer/core）
 *
 * 用 SheetJS 解析 xlsx/xls/csv，渲染成套用 telos youmind 设计规范的 HTML 表格，
 * 替代 officePlugin 默认的微软 Office Online 渲染（深蓝工具栏、不可定制）。
 *
 * 设计要点：
 * - 表头墨色（--foreground）、隔行纸色（--muted）、边框纯灰（--border）
 * - 多 sheet 时顶部 tab 切换
 * - 复用宿主 ctx.host 作为容器，destroy 时清理
 */
import * as XLSX from 'xlsx'
import type {
  PreviewContext,
  PreviewFile,
  PreviewInstance,
  PreviewPlugin,
} from '@open-file-viewer/core'

const XLSX_EXTENSIONS = new Set(['xlsx', 'xls', 'xlsm', 'csv'])

interface ParsedSheet {
  name: string
  html: string
}

async function fileToArrayBuffer(file: PreviewFile): Promise<ArrayBuffer> {
  if (file.blob) return await file.blob.arrayBuffer()
  if (file.url) {
    const res = await fetch(file.url)
    return await res.arrayBuffer()
  }
  if (file.source instanceof ArrayBuffer) return file.source
  if (file.source instanceof Blob) return await file.source.arrayBuffer()
  throw new Error('xlsx: 无法读取文件内容')
}

function parseWorkbook(data: ArrayBuffer): ParsedSheet[] {
  const wb = XLSX.read(data, { type: 'array' })
  return wb.SheetNames.map(name => {
    const ws = wb.Sheets[name]
    // id 给 <table> 加唯一前缀，避免多 sheet 重复；editable:false 关掉 contenteditable
    const html = XLSX.utils.sheet_to_html(ws, {
      id: `xlsx-${name}`,
      editable: false,
    })
    return { name, html }
  }).filter(s => s.html)
}

/**
 * 渲染单个 sheet 的表格为带 youmind 主题样式的 DOM。
 * 返回一个容器元素，供切换时替换。
 */
function renderSheetContainer(sheet: ParsedSheet): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.className = 'telos-xlsx-table'
  wrapper.innerHTML = sheet.html
  return wrapper
}

export function xlsxViewerPlugin(): PreviewPlugin {
  return {
    name: 'telos-xlsx-viewer',
    match(file: PreviewFile) {
      const ext = (file.extension || '').toLowerCase()
      return XLSX_EXTENSIONS.has(ext)
    },
    async render(ctx: PreviewContext): Promise<PreviewInstance> {
      const { host } = ctx
      host.classList.add('telos-xlsx-host')

      ctx.setLoading(true)
      let sheets: ParsedSheet[] = []
      try {
        const buffer = await fileToArrayBuffer(ctx.file)
        sheets = parseWorkbook(buffer)
      } catch (err) {
        ctx.setLoading(false)
        ctx.setError(err instanceof Error ? err : new Error(String(err)))
        return { destroy() {} }
      }
      ctx.setLoading(false)

      if (sheets.length === 0) {
        host.innerHTML =
          '<div class="telos-xlsx-empty">该表格为空或无法解析</div>'
        return { destroy() {} }
      }

      // 容器骨架：[tab 栏] + [表格区]
      const frame = document.createElement('div')
      frame.className = 'telos-xlsx-frame'

      const tabBar = document.createElement('div')
      tabBar.className = 'telos-xlsx-tabs'

      const tableArea = document.createElement('div')
      tableArea.className = 'telos-xlsx-table-area'

      let activeIndex = 0
      const tableEls = sheets.map(renderSheetContainer)

      const activate = (index: number) => {
        activeIndex = index
        // tab 高亮
        Array.from(tabBar.children).forEach((tab, i) => {
          tab.classList.toggle('is-active', i === index)
        })
        // 表格替换
        tableArea.innerHTML = ''
        tableArea.appendChild(tableEls[index])
      }

      sheets.forEach((sheet, i) => {
        const tab = document.createElement('button')
        tab.type = 'button'
        tab.className = 'telos-xlsx-tab'
        tab.textContent = sheet.name
        tab.addEventListener('click', () => activate(i))
        tabBar.appendChild(tab)
      })

      // 单 sheet 也保留 tab 栏（一致体验），多 sheet 才显示切换
      frame.appendChild(tabBar)
      frame.appendChild(tableArea)
      host.appendChild(frame)
      activate(activeIndex)

      return {
        destroy() {
          frame.remove()
          host.classList.remove('telos-xlsx-host')
        },
      }
    },
  }
}
