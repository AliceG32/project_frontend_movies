import { test, expect } from '@playwright/test';

test.describe('Movie Catalog E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('Пользователь может войти в систему', async ({ page }) => {
        
        await expect(page.locator('h2')).toHaveText('Вход в систему');
        await page.fill('input[placeholder="user"]', 'user');
        await page.fill('input[type="password"]', 'user');
        await page.click('button[type="submit"]:has-text("Войти в систему")');
        await expect(page.locator('h1')).toHaveText('Список фильмов 🎬');
        await expect(page.locator('text=Вы вошли как:')).toBeVisible();
    });

    test('Пользователь может просматривать список фильмов с пагинацией', async ({ page }) => {
        
        await page.fill('input[placeholder="user"]', 'user');
        await page.fill('input[type="password"]', 'user');
        await page.click('button[type="submit"]:has-text("Войти в систему")');
        await page.waitForSelector('table');
        const movieRows = page.locator('table tbody tr');
        await expect(movieRows).not.toHaveCount(0);
        await expect(page.locator('th:has-text("Название")')).toBeVisible();
        await expect(page.locator('th:has-text("Год")')).toBeVisible();
        await expect(page.locator('th:has-text("Рейтинг")')).toBeVisible();
        const pagination = page.locator('.pagination');
        if (await pagination.isVisible()) {
            
            await expect(page.locator('.pagination .page-item')).toHaveCount(4);

            
            const nextButton = page.locator('.pagination .page-item:has-text("Next")');
            if (await nextButton.isVisible()) {
                await nextButton.click();
                
                await page.waitForTimeout(1000);
            }
        }
    });

    test('Пользователь может сортировать фильмы', async ({ page }) => {
        
        await page.fill('input[placeholder="user"]', 'user');
        await page.fill('input[type="password"]', 'user');
        await page.click('button[type="submit"]:has-text("Войти в систему")');

        await page.waitForSelector('table');
        const titleHeader = page.locator('th:has-text("Название")');
        await titleHeader.click();
        await expect(page.locator('th:has-text("Название ⬆️")')).toBeVisible();
        const sortDropdown = page.locator('button:has-text("Названию ↑")');
        await sortDropdown.click();
        await page.click('text=По Году');
        await expect(page.locator('button:has-text("Году ↑")')).toBeVisible();
    });

    test('Пользователь может выйти из системы', async ({ page }) => {
        
        await page.fill('input[placeholder="user"]', 'user');
        await page.fill('input[type="password"]', 'user');
        await page.click('button[type="submit"]:has-text("Войти в систему")');
        await page.waitForSelector('h1:has-text("Список фильмов")');
        const button = page.locator('button[aria-label="Toggle navigation"]');
        if (await button.isVisible()) {
            await button.click();
        }

        await page.locator('a:has-text("user")').click();
        await page.click('text=/Выйти/i');
        await expect(page.locator('h2:has-text("Вход в систему")')).toBeVisible();
    });

    test('Интеграционный тест: полный сценарий работы пользователя', async ({ page }) => {
        
        await page.fill('input[placeholder="user"]', 'user');
        await page.fill('input[type="password"]', 'user');
        await page.click('button[type="submit"]:has-text("Войти в систему")');
        await expect(page.locator('h1:has-text("Список фильмов")')).toBeVisible();
        await page.fill('input[placeholder*="Поиск по названию"]', 'тест');
        await page.click('button:has-text("🔍 Поиск")');
        await expect(page.locator('text=Поиск по запросу:')).toBeVisible();
        const clearSearchButton = page.locator('button:has-text("❌ Очистить поиск")');
        if (await clearSearchButton.isVisible()) {
            await clearSearchButton.click();
        }

        const sortButton = page.locator('button:has-text("Дате обновления ↓")');
        await sortButton.click();
        await page.click('text=По Рейтингу ↕️');
        await expect(page.locator('text=/по: рейтингу/i')).toBeVisible();
        await page.click('a:has-text("➕ Добавить фильм")');
        await expect(page).toHaveURL(/.*\/add/);
        await page.goBack();
        await expect(page.locator('h1:has-text("Список фильмов")')).toBeVisible();

        const button = page.locator('button[aria-label="Toggle navigation"]');
        if (await button.isVisible()) {
            await button.click();
        }

        
        await page.locator('a:has-text("user")').click();
        await page.click('text=/Выйти/i');
        await expect(page.locator('h2:has-text("Вход в систему")')).toBeVisible();
    });
});