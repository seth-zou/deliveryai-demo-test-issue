import { test, expect } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** 文档在仓库根目录，按测试文件相对位置解析，避免依赖执行目录。 */
const docPath = (name: string) => fileURLToPath(new URL(`../${name}`, import.meta.url))
const readDoc = (name: string) => readFileSync(docPath(name), 'utf8')

const ZH = readDoc('README.md')
const EN = readDoc('README.en.md')

/** 按文档顺序提取二级标题（章节名）。 */
const sections = (md: string) => Array.from(md.matchAll(/^##\s+(.+?)\s*$/gm), (m) => m[1])

/** 提取围栏代码块内容，去掉结尾空白。 */
const codeBlocks = (md: string) =>
  Array.from(md.matchAll(/```[^\n]*\n([\s\S]*?)```/g), (m) => m[1].replace(/\s+$/, ''))

/** 提取代码块中的可执行内容：去掉行内注释、整行注释与空行，用于命令/结构一致性核对。 */
const executableLines = (block: string) =>
  block
    .split('\n')
    .map((line) => line.replace(/\s+#.*$/, '').trimEnd())
    .filter((line) => line.trim() !== '' && !line.trimStart().startsWith('#'))

const executableLinesOfAllBlocks = (md: string) => codeBlocks(md).flatMap(executableLines)

/** 取文档开头若干行，用于确认语言切换链接位于首屏顶部。 */
const headLines = (md: string, count = 6) => md.split('\n').slice(0, count)

/** 按标题取章节正文（到下一个二级标题为止）。 */
const sectionBody = (md: string, heading: string) => {
  const lines = md.split('\n')
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`)
  if (start < 0) return ''
  const end = lines.findIndex((line, index) => index > start && /^##\s+/.test(line))
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n')
}

const bullets = (body: string) => body.split('\n').filter((line) => line.trimStart().startsWith('- '))

test.describe('README 双语文档 - E2E 验收测试', () => {
  test('REQ-001: README.md 保持中文默认版且保留既有章节', async () => {
    expect(ZH.split('\n')[0].trim()).toBe('# 沸点火锅点单演示')
    expect(sections(ZH)).toEqual(['功能介绍', '技术栈', '环境要求', '本地开发', '常用命令', '项目结构', '预览模式'])
    // 中文默认版仍可独立支撑本地启动
    expect(ZH).toContain('npm install')
    expect(ZH).toContain('npm run dev')
    expect(ZH).toContain('http://localhost:5173')
    expect(ZH).toContain('?preview=menu')
  })

  test('REQ-002: README.en.md 为英文版且章节与中文版一一对应', async () => {
    expect(existsSync(docPath('README.en.md'))).toBe(true)
    expect(sections(EN)).toEqual([
      'Features',
      'Tech Stack',
      'Requirements',
      'Local Development',
      'Common Commands',
      'Project Structure',
      'Preview Mode',
    ])
    expect(sections(EN)).toHaveLength(sections(ZH).length)
    // 英文正文，无整段中文残留（品牌名/命令/路径除外；顶部「中文」切换入口按 REQ-003 保留）
    expect(EN.replace('[中文](README.md)', '')).not.toMatch(/[\u4e00-\u9fff]/)
  })

  test('REQ-002: 两版命令、端口、预览 URL、目录结构与技术栈一致', async () => {
    expect(executableLinesOfAllBlocks(EN)).toEqual(executableLinesOfAllBlocks(ZH))
    for (const keyword of ['npm install', 'npm run dev', 'npm run lint', 'npm run build', 'localhost:5173', '?preview=menu', 'dist/']) {
      expect(EN).toContain(keyword)
      expect(ZH).toContain(keyword)
    }
    // 目录树条目（忽略翻译后的注释）完全一致
    const tree = (md: string) => {
      const block = codeBlocks(md).find((item) => item.includes('├── e2e/'))
      expect(block).toBeTruthy()
      return block!.split('\n').map((line) => line.replace(/\s+#.*$/, '').trimEnd()).filter(Boolean)
    }
    expect(tree(EN)).toEqual(tree(ZH))
    // 技术栈条目一致
    const techStack = (md: string, heading: string) => bullets(sectionBody(md, heading)).map((line) => line.replace(/^-\s*/, '').trim())
    expect(techStack(EN, 'Tech Stack')).toEqual(techStack(ZH, '技术栈'))
    expect(techStack(ZH, '技术栈')).toEqual([
      'React 18',
      'TypeScript',
      'Vite',
      'Tailwind CSS',
      'Radix UI',
      'i18next',
      'Playwright',
    ])
  })

  test('REQ-003: 两版顶部语言切换链接双向可用且为相对路径', async () => {
    const zhHead = headLines(ZH)
    const enHead = headLines(EN)
    expect(zhHead.some((line) => line.trim() === '[English](README.en.md)')).toBe(true)
    expect(enHead.some((line) => line.trim() === '[中文](README.md)')).toBe(true)
    // 相对路径互链，GitHub 页面与本地 Markdown 预览均可用
    expect(zhHead.join('\n')).not.toMatch(/https?:\/\/[^\s)]*README\.en\.md/)
    expect(enHead.join('\n')).not.toMatch(/https?:\/\/[^\s)]*README\.md/)
    expect(existsSync(docPath('README.md'))).toBe(true)
    expect(existsSync(docPath('README.en.md'))).toBe(true)
  })

  test('REQ-004: 功能清单与环境要求条目数量、含义一致', async () => {
    const zhFeatures = bullets(sectionBody(ZH, '功能介绍'))
    const enFeatures = bullets(sectionBody(EN, 'Features'))
    expect(zhFeatures).toHaveLength(9)
    expect(enFeatures).toHaveLength(zhFeatures.length)
    expect(zhFeatures).toHaveLength(enFeatures.length)
    expect(bullets(sectionBody(ZH, '环境要求'))).toHaveLength(2)
    expect(bullets(sectionBody(EN, 'Requirements'))).toHaveLength(2)
    for (const keyword of ['Node.js 18', 'npm 9']) {
      expect(ZH).toContain(keyword)
      expect(EN).toContain(keyword)
    }
    // 中文版无整段英文残留：非代码块内不出现 6 个及以上英文单词组成的纯英文行
    const proseLines = ZH.replace(/```[\s\S]*?```/g, '').split('\n')
    const englishParagraphs = proseLines.filter((line) => {
      const trimmed = line.trim()
      if (!trimmed || /[\u4e00-\u9fff]/.test(trimmed)) return false
      const words = trimmed.match(/[A-Za-z][A-Za-z0-9'’-]*/g) ?? []
      return words.length >= 6
    })
    expect(englishParagraphs).toEqual([])
  })
})
