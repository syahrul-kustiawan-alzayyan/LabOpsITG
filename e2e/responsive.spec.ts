import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, login } from "./helpers";

test.describe("Tampilan responsif", () => {
  test("landing page muat di layar ponsel", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Laboratorium yang tercatat/i })).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("formulir login tetap terbaca di layar ponsel", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("navigasi bawah tampil untuk pengguna masuk", async ({ page }) => {
    await login(page, "mahasiswa");
    const mobileNav = page.locator(".mobile-nav");
    await expect(mobileNav).toBeVisible();
    await expect(page.locator(".rail")).toBeHidden();
    await expect(mobileNav.locator(".mobile-link")).toHaveCount(5);
    await assertNoHorizontalOverflow(page);

    await mobileNav.getByRole("link", { name: "Jadwal" }).click();
    await expect(page).toHaveURL(/\/schedules/);
    await expect(page.locator("h1.page-title")).toBeVisible();
  });

  test("tabel data dapat digulir tanpa melebarkan halaman", async ({ page }) => {
    await login(page, "koordinator");
    await page.goto("/issues");
    await expect(page.locator("table tbody tr").first()).toBeVisible();
    await assertNoHorizontalOverflow(page);

    const wrap = page.locator(".table-wrap").first();
    await expect(wrap).toBeVisible();
    const overflowX = await wrap.evaluate((el) => getComputedStyle(el).overflowX);
    expect(["auto", "scroll"]).toContain(overflowX);
  });
});
