import { test, expect } from '@playwright/test'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 仓库根目录，按测试文件相对位置解析，避免依赖执行目录。 */
const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const read = (relativePath: string) => readFileSync(join(repoRoot, relativePath), 'utf8')
const AGENTS = read('AGENTS.md')

/** 按文档顺序提取二级标题（章节名）。 */
const sections = (md: string) => Array.from(md.matchAll(/^##\s+(.+?)\s*$/gm), (m) => m[1])

/** 按标题取章节正文（到下一个二级标题为止，包含其下的三级标题）。 */
const sectionBody = (md: string, heading: string) => {
  const lines = md.split('\n')
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`)
  if (start < 0) return ''
  const end = lines.findIndex((line, index) => index > start && /^##\s+/.test(line))
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n')
}

/** 提取目录结构代码块，用于与真实文件清单比对。 */
const directoryTree = () => {
  const block = Array.from(AGENTS.matchAll(/```[^\n]*\n([\s\S]*?)```/g), (m) => m[1]).find((item) => item.includes('src/components/'))
  expect(block, 'AGENTS.md 应包含 src/components/ 目录结构代码块').toBeTruthy()
  return block!
}

const treeLine = (fileName: string) => directoryTree().split('\n').find((line) => line.includes(fileName))

/** 组件目录下真实存在的顶层页面/业务组件（不含 ui/ 通用件）。 */
const componentFiles = () =>
  readdirSync(join(repoRoot, 'src/components'), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
    .map((entry) => entry.name)
    .sort()


test.describe('AGENTS.md 仓库事实校准 - E2E 验收测试', () => {
  test('REQ-001: 保留既有章节，且关键标识符可在代码或配置中追溯', async () => {
    for (const heading of ['项目概述', '技术栈', '目录结构', '样式约定', '编码约定', '验证命令', '不要做']) {
      expect(sections(AGENTS), `缺少既有章节：${heading}`).toContain(heading)
    }

    const routeSource = read('src/hooks/useViewRoute.ts')
    const appSource = read('src/App.tsx')
    const elderlySource = read('src/hooks/useElderlyMode.ts')
    const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string, string> }
    const playwrightConfig = read('playwright.config.ts')

    expect(routeSource).toContain('VIEWS')
    expect(AGENTS).toContain('VIEWS')
    expect(appSource).toContain('i18nextLng')
    expect(elderlySource).toContain('elderly-mode')
    expect(AGENTS).toContain('i18nextLng')
    expect(AGENTS).toContain('elderly-mode')
    expect(packageJson.scripts.build).toContain('vite build')
    expect(packageJson.scripts.lint).toContain('eslint')
    expect(playwrightConfig).toContain('defineConfig')
    expect(AGENTS).toContain('npm run build')
    expect(AGENTS).toContain('npm run lint')
    expect(AGENTS).toContain('npx playwright test')
  })

  test('REQ-002: 目录结构完整列出组件、E2E spec 与文档地图', async () => {
    const expectedComponents = [
      'CartPanel.tsx',
      'CheckoutView.tsx',
      'DemoConsole.tsx',
      'HomeView.tsx',
      'MenuView.tsx',
      'OrderView.tsx',
      'ServiceSheet.tsx',
      'TopBar.tsx',
      'WelcomeView.tsx',
    ]
    expect(componentFiles()).toEqual(expectedComponents)
    for (const component of expectedComponents) {
      expect(treeLine(component), `目录结构缺少组件：${component}`).toBeTruthy()
    }
    const uiLine = treeLine('ui/')
    expect(uiLine, '目录结构缺少 components/ui/').toBeTruthy()
    expect(uiLine).toContain('button')
    expect(uiLine).toContain('dialog')

    for (const spec of ['super-spicy.spec.ts', 'view-routing.spec.ts', 'readme-bilingual.spec.ts']) {
      expect(existsSync(join(repoRoot, 'e2e', spec)), `E2E 文件不存在：${spec}`).toBe(true)
      expect(directoryTree(), `目录结构缺少 E2E 文件：${spec}`).toContain(spec)
    }

    for (const entry of ['README.md', 'README.en.md', 'docs/agent-testing.md', 'docs/agent-release.md', '.github/workflows/deploy-pages.yml']) {
      expect(AGENTS, `文档地图缺少入口：${entry}`).toContain(entry)
    }
  })

  test('REQ-002: 补充组件的职责描述与真实组件行为一致', async () => {
    const descriptionOf = (component: string) => {
      const line = treeLine(`${component}.tsx`)
      expect(line, `目录结构缺少组件：${component}`).toBeTruthy()
      return line!.split('#').slice(1).join('#').trim()
    }

    expect(descriptionOf('TopBar')).toMatch(/桌台|导航/)
    expect(descriptionOf('TopBar')).toMatch(/语言|老人模式/)
    expect(descriptionOf('CartPanel')).toMatch(/购物车/)
    expect(descriptionOf('CartPanel')).toMatch(/compact|移动|弹窗/)
    expect(descriptionOf('ServiceSheet')).toMatch(/服务/)
    expect(descriptionOf('DemoConsole')).toMatch(/履约|售罄|重置/)
  })

  test('REQ-003: 文档记录预览态、预览优先级、深链接与可达性规则', async () => {
    const previewLine = AGENTS.split('\n').filter((line) => line.includes('preview=menu')).join('\n')
    expect(previewLine).toContain('A08')
    expect(previewLine).toMatch(/1 件|1 份/)
    expect(previewLine).toMatch(/琥珀嫩牛肉|p3/)
    expect(previewLine).toContain('menu.option.full')
    expect(previewLine).toContain('menu.option.original')
    expect(previewLine).toContain('姚乾')

    expect(AGENTS).toMatch(/预览态优先|preview=menu[^\n]{0,60}优先|优先于 hash/)
    expect(AGENTS).toContain('canView')
    expect(AGENTS).toContain('history.replaceState')
    expect(AGENTS).toMatch(/首次|直接打开/)
    expect(AGENTS).toMatch(/运行中|手动改 hash|前进\/后退/)
    expect(AGENTS).toContain('未绑定桌台')
    expect(AGENTS).toMatch(/回落到?\s*`?home/)
  })

  test('REQ-003: ?preview=menu 的初始态与文档一致，且预览态优先于 hash', async ({ page }) => {
    await page.goto('/?preview=menu#/order')
    await expect(page).toHaveURL(/#\/menu$/)
    await expect(page.getByRole('heading', { name: '想吃什么，一起点。' })).toBeVisible()
    await expect(page.getByText('琥珀嫩牛肉').first()).toBeVisible()
    await expect(page.getByText('整份 · 原味', { exact: true })).toBeVisible()
    await expect(page.getByText('姚乾 点了', { exact: true })).toBeVisible()
    await expect(page.getByText('共 1 份菜品', { exact: true })).toBeVisible()
  })

  test('REQ-003: 深链接自动绑桌、非法 hash 回落 home 的行为与文档一致', async ({ page }) => {
    await page.goto('/#/order')
    await expect(page).toHaveURL(/#\/order$/)
    await expect(page.getByText('这一锅，正在抵达', { exact: true })).toBeVisible()

    await page.goto('/#/not-a-view')
    await expect(page).toHaveURL(/#\/home$/)
    await expect(page.getByRole('button', { name: /A08/ }).first()).toBeVisible()
  })

  test('REQ-004: 工程、E2E 环境与发布工作流事实与配置一致', async () => {
    const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string, string> }
    const playwrightConfig = read('playwright.config.ts')
    const workflow = read('.github/workflows/deploy-pages.yml')
    const workspace = read('pnpm-workspace.yaml')

    for (const script of ['dev', 'build', 'lint']) {
      expect(packageJson.scripts[script], `package.json 缺少 script：${script}`).toBeTruthy()
    }
    expect(playwrightConfig).toContain('PLAYWRIGHT_CHROMIUM_PATH')
    expect(playwrightConfig).toContain("'/opt/chromium.org/chromium/chrome'")
    expect(playwrightConfig).toContain('PLAYWRIGHT_PORT')
    expect(workflow).toContain('workflow_dispatch')
    expect(workflow).toContain('npm ci')
    expect(workflow).toContain('npm run build')
    expect(workflow).not.toMatch(/playwright test/)
    expect(workspace).not.toMatch(/^packages:/m)

    expect(AGENTS).toContain('npm ci')
    expect(AGENTS).toContain('npm run dev')
    expect(AGENTS).toContain('package-lock.json')
    expect(AGENTS).toContain('pnpm-lock.yaml')
    expect(AGENTS).toContain('pnpm-workspace.yaml')
    expect(AGENTS).toMatch(/pnpm[\s\S]{0,80}(不是|不构成)[\s\S]{0,20}入口|不参与验证/)
    expect(AGENTS).toContain('PLAYWRIGHT_CHROMIUM_PATH')
    expect(AGENTS).toContain('/opt/chromium.org/chromium/chrome')
    expect(AGENTS).toContain('PLAYWRIGHT_PORT')
    expect(AGENTS).toContain('5173')
    expect(AGENTS).toMatch(/禁止执行\s*`?(npx )?playwright install/)
    expect(AGENTS).toContain('workflow_dispatch')
    expect(AGENTS).toContain('npm ci')
    expect(AGENTS).toContain('npm run build')
    expect(AGENTS).toMatch(/CI 不跑 E2E|不跑\s*E2E/)
    expect(AGENTS).toContain('/ping')
    expect(AGENTS).toContain('3001')
  })

  test('REQ-005: 同步维护规则覆盖视图、持久化与工程入口，并约束同 PR 更新', async () => {
    const conventions = sectionBody(AGENTS, '编码约定')
    expect(conventions).toContain('ViewName')
    expect(conventions).toContain('VIEWS')
    expect(conventions).toContain('src/App.tsx')
    expect(conventions).toContain('src/i18n.ts')
    expect(conventions).toMatch(/e2e\//)
    expect(conventions).toMatch(/try\/catch/)
    expect(conventions).toContain('i18nextLng')
    expect(conventions).toContain('elderly-mode')
    expect(conventions).toMatch(/同一个 PR|同一 PR|同一PR/)
    expect(conventions).not.toMatch(/视情况|尽量/)
  })

  test('REQ-006: 相对链接可解析，文档不含敏感凭据', async () => {
    const links = Array.from(AGENTS.matchAll(/\[[^\]]+\]\(([^)]+)\)/g), (match) => match[1])
      .filter((link) => !link.startsWith('http') && !link.startsWith('#'))
      .map((link) => link.split('#')[0])
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(existsSync(join(repoRoot, link)), `相对链接目标不存在：${link}`).toBe(true)
    }
    expect(AGENTS).not.toMatch(/ghp_[A-Za-z0-9]+|github_pat_[A-Za-z0-9_]+|AKIA[0-9A-Z]{16}|BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|password\s*[:=]|token\s*[:=]/i)
  })
})
