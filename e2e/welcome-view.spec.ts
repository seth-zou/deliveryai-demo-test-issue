import { test, expect, type Locator, type Page } from '@playwright/test'

/**
 * 欢迎页（#/welcome）E2E 验收用例。
 *
 * 覆盖 docs/specs/004-welcome-view.md：
 * - REQ-001 保留并校准现有欢迎界面（核心元素、桌台信息、zh/en 文案、进入点餐）
 * - REQ-002 返回选桌（#/home、重新绑定、后退回落、可访问性）
 * - REQ-003 欢迎页语言与老人模式（切换、进入点餐后保持、320px 不重叠）
 * - REQ-004 深链 #/welcome 自动绑定示例桌台 A08
 *
 * 文案取自 src/i18n.ts 的 welcome.* / common.*（spec 5.4 约定新增 welcome.back 等 key），
 * 桌台区域取自 src/data/menu.ts 的 tableAreas。
 */
const TEXT = {
  zh: {
    store: '沸点 · 星河里店',
    badge: '欢迎光临',
    title: '欢迎光临沸点！',
    youAt: '您在',
    enter: '进入点餐',
    back: '返回选桌',
  },
  en: {
    store: 'Boiling Point · Galaxy Lane',
    badge: 'Welcome',
    title: 'Welcome to Boiling Point!',
    youAt: 'You are at',
    enter: 'Start Ordering',
    back: 'Change table',
  },
} as const

type Lang = keyof typeof TEXT

/** 桌台编号 → 区域名（与 src/data/menu.ts 的 tableAreas + i18n 保持一致）。 */
const TABLE_AREAS: Record<string, Record<Lang, string>> = {
  A08: { zh: '大厅', en: 'Hall' },
  B12: { zh: '卡座', en: 'Booth' },
  C06: { zh: '包间', en: 'Private Room' },
  D03: { zh: '窗边', en: 'Window Seat' },
}

const MENU_HEADING = { zh: '想吃什么，一起点。', en: 'What shall we order together?' } as const

const welcomeMain = (page: Page) => page.locator('main')

/** 欢迎页右上角语言控件；可访问名称随界面语言变化。 */
const langControl = (page: Page) => page.getByRole('button', { name: /切换语言|Switch language/ })

/** 欢迎页右上角老人模式控件；开启/关闭态的可访问名称不同。 */
const elderlyControl = (page: Page) =>
  page.getByRole('button', { name: /切换至老人模式|切换至常规模式|Turn on elderly mode|Turn off elderly mode/ })

const enterButton = (page: Page, lang: Lang = 'zh') => page.getByRole('button', { name: TEXT[lang].enter })
const backButton = (page: Page, lang: Lang = 'zh') => page.getByRole('button', { name: TEXT[lang].back })

/** 桌台信息段落 `您在 <桌台> · <区域>`；限定 p 并取 first，避免匹配到包含同文本的祖先节点。 */
const tableInfo = (page: Page, table: string, lang: Lang) =>
  page
    .locator('main p')
    .filter({ hasText: new RegExp(`${TEXT[lang].youAt}\\s*${table}\\s*·`) })
    .first()

/** 首页绑定指定桌台并等待进入欢迎页。 */
async function bindTable(page: Page, table: string) {
  await page.goto('/')
  await page.getByRole('button', { name: new RegExp(table) }).first().click()
  await expect(page).toHaveURL(/#\/welcome$/)
}

/** 预置界面语言：复用既有 `i18nextLng` 持久化 key，在应用脚本执行前写入。 */
async function useLanguage(page: Page, lang: Lang) {
  await page.addInitScript((value) => {
    try {
      localStorage.setItem('i18nextLng', value)
    } catch {
      // localStorage 不可用时保持默认语言，不阻塞用例
    }
  }, lang)
}

/** 断言欢迎页展示指定桌台的编号与区域名。 */
async function expectTableInfo(page: Page, table: string, lang: Lang) {
  const area = TABLE_AREAS[table][lang]
  await expect(welcomeMain(page)).toContainText(
    new RegExp(`${TEXT[lang].youAt}\\s*${table}\\s*·\\s*${area}`),
  )
}

/** 老人模式状态以 `html.elderly` 表达（src/hooks/useElderlyMode.ts）。 */
const isElderly = (page: Page) => page.evaluate(() => document.documentElement.classList.contains('elderly'))

/** 老人模式经全局 font-size 放大（.elderly { font-size: 125% }），用计算字号断言可读性结果。 */
const rootFontSize = (page: Page) => page.evaluate(() => getComputedStyle(document.documentElement).fontSize)

interface Box {
  x: number
  y: number
  width: number
  height: number
}

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox()
  expect(box, '元素应具备可测量的布局盒').not.toBeNull()
  return box as Box
}

function overlaps(a: Box, b: Box) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

test.describe('欢迎页 - 入口补齐与验收闭环', () => {
  for (const table of Object.keys(TABLE_AREAS)) {
    test(`REQ-001.1: 绑定 ${table} 桌台后欢迎页展示桌台编号与区域名`, async ({ page }) => {
      await bindTable(page, table)
      await expect(enterButton(page)).toBeVisible()
      await expectTableInfo(page, table, 'zh')
    })
  }

  test('REQ-001.2: 欢迎页展示门店图片、门店名、欢迎徽章、欢迎标题、桌台信息与进入点餐按钮', async ({ page }) => {
    await bindTable(page, 'A08')
    await expect(page.getByRole('img', { name: '热气腾腾的火锅' })).toBeVisible()
    await expect(page.getByRole('heading', { name: TEXT.zh.store })).toBeVisible()
    await expect(page.getByText(TEXT.zh.badge, { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: TEXT.zh.title })).toBeVisible()
    await expect(tableInfo(page, 'A08', 'zh')).toBeVisible()
    await expect(enterButton(page)).toBeVisible()
  })

  test('REQ-001.3: 欢迎页中文文案完整展示且无未翻译的 i18n key', async ({ page }) => {
    await bindTable(page, 'A08')
    const main = welcomeMain(page)
    for (const text of [TEXT.zh.store, TEXT.zh.badge, TEXT.zh.title, TEXT.zh.enter, TEXT.zh.back]) {
      await expect(main).toContainText(text)
    }
    await expect(page.getByRole('img', { name: '热气腾腾的火锅' })).toBeVisible()
    await expectTableInfo(page, 'A08', 'zh')
    await expect(main).not.toContainText('welcome.')
  })

  test('REQ-001.3: 欢迎页英文文案完整展示且无未翻译的 i18n key', async ({ page }) => {
    await useLanguage(page, 'en')
    await bindTable(page, 'A08')
    const main = welcomeMain(page)
    for (const text of [TEXT.en.store, TEXT.en.badge, TEXT.en.title, TEXT.en.enter, TEXT.en.back]) {
      await expect(main).toContainText(text)
    }
    await expect(page.getByRole('img', { name: 'Steaming hotpot' })).toBeVisible()
    await expectTableInfo(page, 'A08', 'en')
    await expect(main).not.toContainText('welcome.')
    await expect(main).not.toContainText(TEXT.zh.enter)
  })

  test('REQ-001.4: 点击进入点餐进入 #/menu 且桌台绑定保持', async ({ page }) => {
    await bindTable(page, 'A08')
    await enterButton(page).click()
    await expect(page).toHaveURL(/#\/menu$/)
    await expect(page.getByRole('heading', { name: MENU_HEADING.zh })).toBeVisible()
    await expect(page.locator('header')).toContainText('A08 · 大厅')
  })

  test('REQ-002.1: 点击返回选桌回到 #/home 并展示选桌卡片', async ({ page }) => {
    await bindTable(page, 'A08')
    await backButton(page).click()
    await expect(page).toHaveURL(/#\/home$/)
    await expect(page.getByRole('button', { name: /A08/ }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: TEXT.zh.title })).toHaveCount(0)
  })

  test('REQ-002.2: 返回后重新绑定新桌台，欢迎页只展示新桌台', async ({ page }) => {
    await bindTable(page, 'A08')
    await backButton(page).click()
    await expect(page).toHaveURL(/#\/home$/)
    await page.getByRole('button', { name: /B12/ }).click()
    await expect(page).toHaveURL(/#\/welcome$/)
    await expectTableInfo(page, 'B12', 'zh')
    await expect(welcomeMain(page)).not.toContainText('A08')
  })

  test('REQ-002.3: 返回选桌不产生订单，重新进入点餐后订单仍为空', async ({ page }) => {
    await bindTable(page, 'A08')
    await backButton(page).click()
    await expect(page).toHaveURL(/#\/home$/)
    await page.getByRole('button', { name: /A08/ }).first().click()
    await expect(page).toHaveURL(/#\/welcome$/)
    await enterButton(page).click()
    await expect(page).toHaveURL(/#\/menu$/)
    await page.getByRole('button', { name: /订单|Orders/ }).first().click()
    await expect(page).toHaveURL(/#\/order$/)
    await expect(page.getByRole('heading', { name: '还没有已提交订单' })).toBeVisible()
  })

  test('REQ-002.4: 返回选桌后浏览器后退请求 #/welcome 回落到 #/home', async ({ page }) => {
    await bindTable(page, 'A08')
    await backButton(page).click()
    await expect(page).toHaveURL(/#\/home$/)
    await page.goBack()
    await expect(page).toHaveURL(/#\/home$/)
    await expect(page.getByRole('button', { name: /A08/ }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: TEXT.zh.title })).toHaveCount(0)
  })

  test('REQ-002.5: 返回选桌入口可访问、可键盘操作且触控区域不小于 44×44', async ({ page }) => {
    await bindTable(page, 'A08')
    const back = backButton(page)
    await expect(back).toBeVisible()
    const box = await boxOf(back)
    // 浏览器布局盒可能返回 43.99999 之类的浮点值，四舍五入后再按 44px 下限断言
    expect(Math.round(box.width)).toBeGreaterThanOrEqual(44)
    expect(Math.round(box.height)).toBeGreaterThanOrEqual(44)
    await back.focus()
    await expect(back).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#\/home$/)
  })

  test('REQ-003.1: 欢迎页语言控件可在中英文之间切换并即时更新文案', async ({ page }) => {
    await bindTable(page, 'A08')
    await expect(page.getByRole('heading', { name: TEXT.zh.title })).toBeVisible()

    await langControl(page).click()
    await expect(page.getByRole('heading', { name: TEXT.en.title })).toBeVisible()
    await expect(page.getByRole('heading', { name: TEXT.zh.title })).toHaveCount(0)
    await expectTableInfo(page, 'A08', 'en')
    await expect(enterButton(page, 'en')).toBeVisible()

    // 再次点击切回中文：控件可访问名称随界面语言同步变化
    await langControl(page).click()
    await expect(page.getByRole('heading', { name: TEXT.zh.title })).toBeVisible()
    await expectTableInfo(page, 'A08', 'zh')
  })

  test('REQ-003.2: 欢迎页切换英文后进入点餐，菜单页保持英文', async ({ page }) => {
    await bindTable(page, 'A08')
    await langControl(page).click()
    await expect(page.getByRole('heading', { name: TEXT.en.title })).toBeVisible()

    await enterButton(page, 'en').click()
    await expect(page).toHaveURL(/#\/menu$/)
    await expect(page.getByRole('heading', { name: MENU_HEADING.en })).toBeVisible()
    await expect(page.locator('header')).toContainText('A08 · Hall')
  })

  test('REQ-003.3: 欢迎页开启老人模式后进入点餐保持，并可再次关闭', async ({ page }) => {
    await bindTable(page, 'A08')
    const baseFontSize = parseFloat(await rootFontSize(page))
    await expect.poll(() => isElderly(page)).toBe(false)

    await page.getByRole('button', { name: /切换至老人模式|Turn on elderly mode/ }).click()
    await expect.poll(() => isElderly(page)).toBe(true)
    await expect.poll(async () => parseFloat(await rootFontSize(page))).toBeGreaterThan(baseFontSize)
    await expect(page.getByRole('button', { name: /切换至常规模式|Turn off elderly mode/ })).toBeVisible()

    await enterButton(page).click()
    await expect(page).toHaveURL(/#\/menu$/)
    await expect.poll(() => isElderly(page)).toBe(true)
    await expect.poll(async () => parseFloat(await rootFontSize(page))).toBeGreaterThan(baseFontSize)

    await page.getByRole('button', { name: /切换至常规模式|Turn off elderly mode/ }).click()
    await expect.poll(() => isElderly(page)).toBe(false)
    await expect.poll(async () => parseFloat(await rootFontSize(page))).toBe(baseFontSize)
  })

  test('REQ-003.4: 320px 视口下偏好控件不与欢迎标题、桌台信息、主按钮重叠', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await bindTable(page, 'A08')

    const lang = langControl(page)
    const elderly = elderlyControl(page)
    const title = page.getByRole('heading', { name: TEXT.zh.title })
    const info = tableInfo(page, 'A08', 'zh')
    const enter = enterButton(page)

    for (const element of [lang, elderly, title, info, enter]) {
      await expect(element).toBeVisible()
    }

    const boxes = {
      lang: await boxOf(lang),
      elderly: await boxOf(elderly),
      title: await boxOf(title),
      info: await boxOf(info),
      enter: await boxOf(enter),
    }

    for (const control of ['lang', 'elderly'] as const) {
      // 控件需完整落在 320px 视口内，不被裁切
      expect(boxes[control].x).toBeGreaterThanOrEqual(0)
      expect(boxes[control].x + boxes[control].width).toBeLessThanOrEqual(320)
      for (const target of ['title', 'info', 'enter'] as const) {
        expect(overlaps(boxes[control], boxes[target]), `${control} 不应与 ${target} 重叠`).toBe(false)
      }
    }
    expect(overlaps(boxes.lang, boxes.elderly)).toBe(false)
    expect(overlaps(boxes.enter, boxes.title)).toBe(false)
  })

  test('REQ-003.5: 偏好控件具备可访问名称、键盘可操作且触控区域不小于 44×44', async ({ page }) => {
    await bindTable(page, 'A08')
    const lang = langControl(page)
    const elderly = elderlyControl(page)

    for (const control of [lang, elderly]) {
      await expect(control).toBeVisible()
      const box = await boxOf(control)
      // 浏览器布局盒可能返回 43.99999 之类的浮点值，四舍五入后再按 44px 下限断言
      expect(Math.round(box.width)).toBeGreaterThanOrEqual(44)
      expect(Math.round(box.height)).toBeGreaterThanOrEqual(44)
    }

    // 键盘聚焦 + Enter 触发语言切换
    await lang.focus()
    await expect(lang).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: TEXT.en.title })).toBeVisible()
  })

  test('REQ-004.4: 深链 #/welcome 自动绑定示例桌台 A08 并展示欢迎页', async ({ page }) => {
    await page.goto('/#/welcome')
    await expect(page).toHaveURL(/#\/welcome$/)
    await expect(page.getByRole('heading', { name: TEXT.zh.title })).toBeVisible()
    await expectTableInfo(page, 'A08', 'zh')
    await expect(enterButton(page)).toBeVisible()
  })
})
