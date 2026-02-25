import { test, expect } from '@playwright/test';

test.describe('VenCap — Full Fund Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Clear game state
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('vencap-game-state'));
    await page.reload();
  });

  test('can complete fund setup wizard', async ({ page }) => {
    await page.goto('/');

    // Step 1: Fund name
    await expect(page.getByText('Fund Setup')).toBeVisible();
    await page.getByPlaceholder(/fund name/i).fill('Test Fund I');
    await page.getByRole('button', { name: /next/i }).click();

    // Step 2: Strategy — select fund type and stage
    await expect(page.getByText(/strategy/i)).toBeVisible();
    await page.getByRole('button', { name: /next/i }).click();

    // Step 3: Fundraising
    await expect(page.getByText(/fundrais/i)).toBeVisible();
    await page.getByRole('button', { name: /start fundraising/i }).click();

    // Step 4: Scenario selection
    await expect(page.getByText(/scenario/i)).toBeVisible();
    await page.getByRole('button', { name: /launch fund/i }).click();

    // Should land on dashboard
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText('Test Fund I')).toBeVisible();
  });

  test('can navigate to deals and see pipeline', async ({ page }) => {
    // Set up a fund first via localStorage
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('vencap-game-state'));
    await page.reload();

    // Quick setup
    await page.getByPlaceholder(/fund name/i).fill('Nav Test Fund');
    await page.getByRole('button', { name: /next/i }).click();
    await page.getByRole('button', { name: /next/i }).click();
    await page.getByRole('button', { name: /start fundraising/i }).click();
    await page.getByRole('button', { name: /launch fund/i }).click();

    // Navigate to deals
    await page.getByRole('link', { name: /deals/i }).first().click();
    await expect(page).toHaveURL(/deals/);

    // Should see deal cards
    await expect(page.getByText(/invest/i).first()).toBeVisible();
  });

  test('can advance time from dashboard', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('vencap-game-state'));
    await page.reload();

    // Quick setup
    await page.getByPlaceholder(/fund name/i).fill('Time Test Fund');
    await page.getByRole('button', { name: /next/i }).click();
    await page.getByRole('button', { name: /next/i }).click();
    await page.getByRole('button', { name: /start fundraising/i }).click();
    await page.getByRole('button', { name: /launch fund/i }).click();

    // Advance time
    await page.getByRole('button', { name: /advance/i }).click();

    // Verify month advanced (should show month 2 or similar indicator)
    await expect(page.getByText(/month 2|Feb/i)).toBeVisible();
  });

  test('portfolio page shows empty state with CTA', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('vencap-game-state'));
    await page.reload();

    // Quick setup
    await page.getByPlaceholder(/fund name/i).fill('Portfolio Test');
    await page.getByRole('button', { name: /next/i }).click();
    await page.getByRole('button', { name: /next/i }).click();
    await page.getByRole('button', { name: /start fundraising/i }).click();
    await page.getByRole('button', { name: /launch fund/i }).click();

    // Navigate to portfolio
    await page.getByRole('link', { name: /portfolio/i }).first().click();
    await expect(page).toHaveURL(/portfolio/);

    // Should see empty state
    await expect(page.getByText(/no investments yet/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /browse deals/i })).toBeVisible();
  });
});
