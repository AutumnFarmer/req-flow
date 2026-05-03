import { expect, test } from '@playwright/test';

test('core website workflow creates and accepts requirement and acceptance proposals', async ({ page }) => {
  test.setTimeout(300_000);

  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('http://localhost:5173');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.getByText('把模糊想法压成可开发规格')).toBeVisible();
  await page.getByPlaceholder(/例如：做一个团队周报系统/).fill(
    '做一个企业级 AI 原生需求分析工具，帮助非专业用户把模糊想法拆成可开发、可验收、可追溯的规格包',
  );
  await page.getByRole('button', { name: '开始澄清' }).click();

  await expect(page.getByText('流程教练')).toBeVisible({ timeout: 150_000 });
  await expect(page.getByRole('button', { name: /应用草案|接受提案/ }).first()).toBeVisible({ timeout: 150_000 });
  await page.getByRole('button', { name: /应用草案|接受提案/ }).first().click();

  const chatInput = page.getByPlaceholder(/输入反馈或命令/);
  await expect(chatInput).toBeEnabled({ timeout: 60_000 });
  await chatInput.fill('/generate-acceptance');
  await page.getByRole('button', { name: '发送' }).click();

  await expect(page.getByRole('button', { name: /应用草案|接受提案/ }).first()).toBeVisible({ timeout: 150_000 });
  await page.getByRole('button', { name: /应用草案|接受提案/ }).first().click();

  await page.waitForFunction(() => document.body.innerText.includes('验收标准'), null, { timeout: 60_000 });
  await page.waitForFunction(() => document.body.innerText.includes('任务拆解'), null, { timeout: 60_000 });
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出规格包' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.md$/);
  await expect(page.getByText(/AI 服务异常|连接失败/)).toHaveCount(0);
  expect(errors).toEqual([]);
});
