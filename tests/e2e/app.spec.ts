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
  await expect(page.getByRole('heading', { level: 1, name: '准爸爸领航员' })).toBeVisible();
}

test.describe('Pregnancy companion regression', () => {
  test('TC-001 first-run onboarding creates a current, non-overdue dashboard', async ({ page }) => {
    await onboard(page);

    await expect(page.locator('main')).toContainText(/第 \d+ 周/);
    await expect(page.locator('main')).toContainText('提醒并陪同做糖耐检查');
    await expect(page.locator('main')).not.toContainText('逾期');
  });

  test('TC-002 bottom navigation routes between dashboard, tasks, and reminders', async ({ page }) => {
    await onboard(page);

    await page.getByRole('button', { name: '清单', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: '陪伴清单' })).toBeVisible();

    await page.getByRole('button', { name: '提醒', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: '提醒日历' })).toBeVisible();

    await page.getByRole('button', { name: '仪表盘', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: '准爸爸领航员' })).toBeVisible();
  });

  test('TC-003 custom task can be added, persisted after reload, and deleted', async ({ page }) => {
    await onboard(page);
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

  test('TC-004 task completion appears in the completed filter', async ({ page }) => {
    await onboard(page);
    await page.getByRole('button', { name: '清单', exact: true }).click();

    const activeTaskRow = page.locator('.task-row').filter({ hasText: '提醒并陪同做糖耐检查' });
    await activeTaskRow.getByRole('button', { name: '切换任务状态' }).click();
    await page.getByRole('button', { name: '已完成' }).click();

    await expect(page.locator('main')).toContainText('提醒并陪同做糖耐检查');
  });

  test('TC-005 reminder export downloads a valid ICS calendar file', async ({ page }, testInfo) => {
    await onboard(page);
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

  test('TC-006 profile editing updates reminder locations', async ({ page }) => {
    await onboard(page);
    await page.getByRole('button', { name: '编辑资料' }).click();
    await page.getByPlaceholder('常去医院，例如：市妇幼保健院').fill('浦东妇幼保健院');
    await page.getByRole('button', { name: '保存并生成计划' }).click();

    await page.getByRole('button', { name: '提醒', exact: true }).click();
    await expect(page.locator('main')).toContainText('浦东妇幼保健院');
  });
});
