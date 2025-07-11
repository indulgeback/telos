import { MetadataRoute } from 'next'
import path from 'path'
import fs from 'fs'

const urls: string[] = []
const excludeStr = ['[', ']']
const noIncludesStr = ['(', ')']

const isHasDynamicStr = (name: string) => {
  return excludeStr.every(str => name.includes(str))
}

const isHasGroupStr = (name: string) => {
  return noIncludesStr.every(str => name.includes(str))
}
async function getUrlByDir(dir: string, lastname: string) {
  const files = fs.readdirSync(dir)
  files.forEach(file => {
    if (file === 'page.tsx' || file === 'page.jsx') {
      if (lastname === '') urls.push('/')
      else urls.push(lastname)
    }
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    if (stat.isDirectory() && !isHasDynamicStr(file)) {
      if (isHasGroupStr(file)) {
        getUrlByDir(filePath, `${lastname}`)
      } else {
        getUrlByDir(filePath, `${lastname}/${file}`)
      }
    }
  })
}

getUrlByDir(path.join(process.cwd(), 'src/app/[locale]'), '')

const sitemap: () => MetadataRoute.Sitemap = () => {
  const isProd = process.env.NEXT_PUBLIC_NODE_ENV === 'pro'
  if (isProd) {
    const mapArr: MetadataRoute.Sitemap = urls.map(url => {
      return {
        url: `${process.env.NEXT_PUBLIC_DOMAIN}${url}`,
        lastModified: new Date().toISOString().split('T')[0], // 转换为 YYYY-MM-DD 格式
        changeFrequency: 'daily',
      }
    })
    return mapArr
  } else {
    return []
  }
}

export default sitemap
