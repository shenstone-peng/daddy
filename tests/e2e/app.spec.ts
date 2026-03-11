import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

async function onboard(page: import('@playwright/test').Page) {
  const dueDate = toDateInputValue(addDays(new Date(), 112));

  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByPlaceholder('伴侣昵称，例如：小柚').fill('小柚');
  await page.locator('input[type="date"]').fill(dueDate);
  await page.getByPlaceholder('所在城市，例如：上海').fill('上海');
  await page.getByPlaceholder('常去医院，例如：市妇幼保健院').fill('市妇幼保健院');
  await page.getByRole('button', { name: '保存并生成计划' }).click();
}

async function finishCatchUpWithButtons(page: import('@playwright/test').Page) {
  const deckTitle = page.getByRole('heading', { level: 2, name: '先把之前的事项过一遍' });

  while (await deckTitle.isVisible()) {
    await page.getByRole('button', { name: '算已完成' }).click();
    await page.waitForTimeout(300);
  }
}

async function swipeCatchUpCard(
  page: import('@playwright/test').Page,
  direction: 'left' | 'right',
) {
  const card = page.locator('.swipe-card');
  const box = await card.boundingBox();
  if (!box) {
    throw new Error('Swipe card is not visible.');
  }

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  const endX = direction === 'left' ? startX - 180 : startX + 180;
  const pointerPayload = {
    pointerId: 1,
    pointerType: 'touch',
    isPrimary: true,
    buttons: 1,
  };

  await card.dispatchEvent('pointerdown', { ...pointerPayload, clientX: startX, clientY: startY });
  await page.waitForTimeout(60);
  await card.dispatchEvent('pointermove', { ...pointerPayload, clientX: endX, clientY: startY + 10 });
  await page.waitForTimeout(60);
  await card.dispatchEvent('pointerup', { ...pointerPayload, clientX: endX, clientY: startY + 10 });
  await page.waitForTimeout(350);
}

async function onboardToDashboard(page: import('@playwright/test').Page) {
  await onboard(page);
  await finishCatchUpWithButtons(page);
  await expect(page.getByRole('heading', { level: 1, name: '准爸爸领航员' })).toBeVisible();
}

test.describe('Pregnancy companion regression', () => {
  test('TC-001 first-run onboarding shows catch-up review before entering the dashboard', async ({ page }) => {
    await onboard(page);

    await expect(page.getByRole('heading', { level: 2, name: '先把之前的事项过一遍' })).toBeVisible();
    await finishCatchUpWithButtons(page);
    await expect(page.getByRole('heading', { level: 1, name: '准爸爸领航员' })).toBeVisible();

    await expect(page.locator('main')).toContainText(/第 \d+ 周/);
    await expect(page.locator('main')).toContainText('今天只盯这一件');
    await expect(page.locator('main')).toContainText('本周推进');
    await expect(page.locator('main')).toContainText('下阶段准备');
    await expect(page.locator('main')).toContainText('提醒并陪同做糖耐检查');
    await expect(page.locator('main')).not.toContainText('逾期');
  });

  test('TC-002 swipe gestures can route historical tasks into the rescue bucket', async ({ page }) => {
    await onboard(page);

    await expect(page.locator('.swipe-card')).toContainText('陪伴侣去医院建档');
    await swipeCatchUpCard(page, 'left');
    await expect(page.locator('.swipe-card')).toContainText('预约四维彩超');
    await swipeCatchUpCard(page, 'right');

    await expect(page.getByRole('heading', { level: 1, name: '准爸爸领航员' })).toBeVisible();
    await page.getByRole('button', { name: '清单', exact: true }).click();
    await page.getByRole('button', { name: '需补救' }).click();
    await expect(page.locator('main')).toContainText('预约四维彩超');
  });

  test('TC-003 bottom navigation routes between dashboard, tasks, and reminders', async ({ page }) => {
    await onboardToDashboard(page);

    const navDock = page.locator('.bottom-nav-frame');
    const navBeforeScroll = await navDock.boundingBox();
    if (!navBeforeScroll) {
      throw new Error('Bottom navigation dock is not visible.');
    }

    await page.locator('.app-main').evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });
    await page.waitForTimeout(120);

    const navAfterScroll = await navDock.boundingBox();
    if (!navAfterScroll) {
      throw new Error('Bottom navigation dock disappeared after scrolling.');
    }

    expect(Math.abs(navAfterScroll.y - navBeforeScroll.y)).toBeLessThan(2);

    await page.getByRole('button', { name: '清单', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: '陪伴清单' })).toBeVisible();

    await page.getByRole('button', { name: '提醒', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: '提醒日历' })).toBeVisible();

    await page.getByRole('button', { name: '仪表盘', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: '准爸爸领航员' })).toBeVisible();
  });

  test('TC-004 custom task can be added, persisted after reload, and deleted', async ({ page }) => {
    await onboardToDashboard(page);
    await page.getByRole('button', { name: '清单', exact: true }).click();

    await page.getByPlaceholder('例如：提前确认住院停车位置').fill('确认住院停车路线');
    await page.getByPlaceholder('给自己留一句提醒，例如要带什么、提前多久出门。').fill('提前确认夜间入口和停车收费。');
    await page.locator('select').nth(0).selectOption('admin');
    await page.locator('select').nth(1).selectOption('high');
    await page.getByRole('button', { name: '加入清单' }).click();

    await expect(page.locator('main')).toContainText('确认住院停车路线');

    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('button', { name: '清单', exact: true }).click();
    await expect(page.locator('main')).toContainText('确认住院停车路线');

    const customTaskRow = page.locator('.task-row').filter({ hasText: '确认住院停车路线' });
    await customTaskRow.getByRole('button').last().click();
    await expect(page.locator('main')).not.toContainText('确认住院停车路线');
  });

  test('TC-005 a current task can be moved into the later bucket', async ({ page }) => {
    await onboardToDashboard(page);
    await page.getByRole('button', { name: '清单', exact: true }).click();

    await page.getByPlaceholder('例如：提前确认住院停车位置').fill('跟进住院停车路线');
    await page.getByPlaceholder('给自己留一句提醒，例如要带什么、提前多久出门。').fill('确认夜间入口和陪护动线。');
    await page.getByRole('button', { name: '加入清单' }).click();
    await expect(page.locator('main')).toContainText('跟进住院停车路线');

    const customTaskRow = page.locator('.task-row').filter({ hasText: '跟进住院停车路线' });
    await customTaskRow.getByRole('button', { name: '移到以后' }).click();

    await page.getByRole('button', { name: '以后再说' }).click();
    await expect(page.locator('main')).toContainText('跟进住院停车路线');
  });

  test('TC-006 task completion appears in the completed filter', async ({ page }) => {
    await onboardToDashboard(page);
    await page.getByRole('button', { name: '清单', exact: true }).click();

    const activeTaskRow = page.locator('.task-row').filter({ hasText: '提醒并陪同做糖耐检查' });
    await activeTaskRow.getByRole('button', { name: '切换任务状态' }).click();
    await page.getByRole('button', { name: '已完成' }).click();

    await expect(page.locator('main')).toContainText('提醒并陪同做糖耐检查');
  });

  test('TC-007 reminder export downloads a valid ICS calendar file', async ({ page }, testInfo) => {
    await onboardToDashboard(page);
    await page.getByRole('button', { name: '提醒', exact: true }).click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出全部' }).click();
    const download = await downloadPromise;

    const targetPath = testInfo.outputPath(download.suggestedFilename());
    await download.saveAs(targetPath);

    const calendarText = await fs.readFile(targetPath, 'utf8');
    expect(calendarText).toContain('BEGIN:VCALENDAR');
    expect(calendarText).toContain('市妇幼保健院');
    expect(calendarText).toContain('SUMMARY:待办：提醒并陪同做糖耐检查');
  });

  test('TC-008 profile editing updates reminder locations', async ({ page }) => {
    await onboardToDashboard(page);
    await page.getByRole('button', { name: '编辑资料' }).click();
    await page.getByPlaceholder('常去医院，例如：市妇幼保健院').fill('浦东妇幼保健院');
    await page.getByRole('button', { name: '保存并生成计划' }).click();

    await page.getByRole('button', { name: '提醒', exact: true }).click();
    await expect(page.locator('main')).toContainText('浦东妇幼保健院');
  });
});
