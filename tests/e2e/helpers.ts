import { Page } from '@playwright/test';

export async function login(page: Page, username: string = 'user', password: string = 'user') {
    await page.goto('/');
    await page.fill('input[placeholder="user"]', username);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]:has-text("Войти в систему")');
    await page.waitForSelector('h1:has-text("Список фильмов")');
}

export async function searchMovies(page: Page, query: string) {
    const searchInput = page.locator('input[placeholder*="Поиск по названию"]');
    await searchInput.fill(query);
    await searchInput.press('Enter');
    await page.waitForTimeout(500);
}