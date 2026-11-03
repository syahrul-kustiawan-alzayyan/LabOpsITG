import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, login } from "./helpers";

test.describe("Sidebar admin", () => {
  test("menyempit tanpa scroll samping dan tidak ikut tergulir", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, "admin");

    // Halaman panjang agar sidebar benar-benar teruji saat konten digulir.
    await page.goto("/users");
    await expect(page.locator("h1.page-title")).toBeVisible();

    const rail = page.locator(".rail");
    await expect(rail).toBeVisible();

    // Kondisi awal adalah menyempit.
    if (await rail.evaluate((el) => el.classList.contains("is-open"))) {
      await rail.locator(".rail-toggle").click();
      await expect(rail).not.toHaveClass(/is-open/);
    }

    const collapsed = await rail.evaluate((el) => ({
      width: el.getBoundingClientRect().width,
      overflow: el.scrollWidth - el.clientWidth,
    }));
    expect(collapsed.width, "sidebar menyempit harus cukup lebar").toBeGreaterThanOrEqual(96);
    expect(collapsed.overflow, "sidebar menyempit tidak boleh punya scroll samping").toBeLessThanOrEqual(1);
    await expect(rail.locator(".rail-label").first()).toBeHidden();
    await assertNoHorizontalOverflow(page);

    await page.evaluate(() => window.scrollTo(0, 1200));
    await expect.poll(async () => Math.round((await rail.boundingBox())!.y)).toBeLessThanOrEqual(1);

    // Saat dilebarkan, label muncul kembali dan tetap menempel di viewport.
    await rail.locator(".rail-toggle").click();
    await expect(rail).toHaveClass(/is-open/);
    await expect(rail.locator(".rail-label").first()).toBeVisible();

    const expanded = await rail.evaluate((el) => ({
      width: el.getBoundingClientRect().width,
      overflow: el.scrollWidth - el.clientWidth,
    }));
    expect(expanded.width, "sidebar lebar harus lebih besar dari kondisi menyempit").toBeGreaterThan(
      collapsed.width,
    );
    expect(expanded.overflow).toBeLessThanOrEqual(1);
    await expect.poll(async () => Math.round((await rail.boundingBox())!.y)).toBeLessThanOrEqual(1);
    await assertNoHorizontalOverflow(page);
  });

  test("pilihan menyempit tetap tersimpan setelah halaman dimuat ulang", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, "admin");

    const rail = page.locator(".rail");
    await expect(rail).toBeVisible();
    if (await rail.evaluate((el) => el.classList.contains("is-open"))) {
      await rail.locator(".rail-toggle").click();
    }

    await page.reload();
    await expect(rail).not.toHaveClass(/is-open/);
    const overflow = await rail.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
