// QA_TOOLS_DIR points to an external Playwright installation.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require(require.resolve('playwright-core', { paths: [process.env.QA_TOOLS_DIR || process.cwd()] }))
const base = process.env.QA_URL || 'http://localhost:4174/medic_corp/'
const output = process.env.QA_OUTPUT_DIR
const browser = await chromium.launch()

try {
  for (const width of [320, 390, 430]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'reduce',
    })
    const page = await context.newPage()
    const session = await context.newCDPSession(page)
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(base + '#directions')
    const stage = page.locator('.fan-stage')
    await stage.scrollIntoViewIfNeeded()
    const picker = page.locator('.direction-picker select')
    const selected = () => picker.evaluate(select => select.selectedIndex)
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))

    async function swipe(dx, dy) {
      const button = page.locator('.is-current .direction-hitarea')
      const rect = await button.boundingBox()
      const x = Math.round(rect.x + rect.width / 2)
      const y = Math.round(rect.y + 130)
      const touch = (type, touchPoints) => session.send('Input.dispatchTouchEvent', { type, touchPoints })
      await touch('touchStart', [{ x, y }])
      for (let step = 1; step <= 4; step++) {
        await touch('touchMove', [{ x: Math.round(x + dx * step / 4), y: Math.round(y + dy * step / 4) }])
      }
      await touch('touchEnd', [])
      await settle()
      assert.equal(await stage.evaluate(element => element.classList.contains('is-dragging')), false)
    }

    await swipe(-65, 0)
    assert.equal(await selected(), 1, `${width}px: short horizontal swipe advances once`)
    await swipe(65, 0)
    assert.equal(await selected(), 0, `${width}px: reverse swipe advances once`)
    await swipe(-20, 0)
    assert.equal(await selected(), 0, `${width}px: tiny drag neither selects nor clicks`)
    await page.getByRole('button', { name: 'Следующее направление', exact: true }).tap()
    assert.equal(await selected(), 1)
    await page.getByRole('button', { name: 'Предыдущее направление', exact: true }).tap()
    assert.equal(await selected(), 0)
    await picker.selectOption({ index: 3 })
    assert.equal(await selected(), 3)
    if (output && width === 390) {
      await mkdir(output, { recursive: true })
      await stage.screenshot({ path: join(output, 'ksm-carousel-390.png') })
    }

    const scrollBefore = await page.evaluate(() => scrollY)
    await swipe(0, -115)
    assert.ok(await page.evaluate(() => scrollY) > scrollBefore, `${width}px: vertical swipe scrolls page`)
    assert.equal(await selected(), 3, `${width}px: vertical swipe does not select`)

    await page.locator('.all-specialists').click()
    await page.getByRole('heading', { name: 'Специалисты клиники' }).waitFor()
    const edges = await page.locator('.team-header,.team-breadcrumbs,.team-intro,.team-toolbar,.team-grid').evaluateAll(elements =>
      elements.map(element => {
        const { left, right } = element.getBoundingClientRect()
        return [Math.round(left), Math.round(document.documentElement.clientWidth - right)]
      }),
    )
    assert.deepEqual(edges, Array.from({ length: 5 }, () => [16, 16]), `${width}px: equal outer margins`)
    if (output && width === 390) await page.screenshot({ path: join(output, 'ksm-specialists-390.png') })
    await page.getByRole('link', { name: 'Профиль: Соловьев Анатолий Аркадьевич' }).tap()
    await page.getByRole('heading', { name: /Соловьев/ }).waitFor()
    await page.getByRole('link', { name: 'Запись к специалисту' }).tap()
    assert.equal(new URL(page.url()).hash, '#appointment')
    assert.match(await page.locator('.team-call').getAttribute('href'), /^tel:/)
    assert.deepEqual(errors, [])
    console.log(`${width}px: swipe, scrolling, arrows, margins and specialist flow passed`)
    await context.close()
  }
} finally {
  await browser.close()
}
