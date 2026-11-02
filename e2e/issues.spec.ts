import { expect, test } from "@playwright/test";
import { login, logout, unique } from "./helpers";

test.describe("Alur tiket kendala", () => {
  test("mahasiswa melaporkan kendala dan mendapat nomor tiket", async ({ page }) => {
    const deskripsi = unique("E2E monit flicker di PC sudut");

    await login(page, "mahasiswa");
    await page.goto("/issues");

    await page.getByRole("button", { name: /lapor kendala/i }).click();
    await page.locator("#i-lab").selectOption({ index: 1 });
    await page.locator("#i-kategori").selectOption("PERANGKAT");
    await page.locator("#i-urgensi").selectOption("TINGGI");
    await page.locator("#i-deskripsi").fill(deskripsi);
    await page.getByRole("button", { name: /kirim laporan/i }).click();

    await expect(page.locator('.alert-success[role="status"]')).toContainText(/tiket .+ dibuat/i);
    await page.locator("#i-search").fill(deskripsi);

    const row = page.locator("table tbody tr", { hasText: deskripsi }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText(/baru/i);
    await expect(row).toContainText(/tinggi/i);
  });

  test("koordinator memverifikasi tiket dan menetapkan penanggung jawab", async ({ page }) => {
    const deskripsi = unique("E2E verifikasi tiket");

    await login(page, "mahasiswa");
    await page.goto("/issues");
    await page.getByRole("button", { name: /lapor kendala/i }).click();
    await page.locator("#i-lab").selectOption({ index: 1 });
    await page.locator("#i-deskripsi").fill(deskripsi);
    await page.getByRole("button", { name: /kirim laporan/i }).click();
    await expect(page.locator(".alert-success")).toBeVisible();

    await logout(page);
    await login(page, "koordinator");
    await page.goto("/issues");
    await page.locator("#i-search").fill(deskripsi);

    const row = page.locator("table tbody tr", { hasText: deskripsi }).first();
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Detail" }).click();

    const detail = page.locator(".panel").first();
    await expect(detail).toContainText(deskripsi);
    await detail.getByRole("button", { name: "Verifikasi", exact: true }).click();

    const verify = page.locator(".panel").filter({ hasText: "Verifikasi tiket" });
    await expect(verify).toBeVisible();
    await verify.locator("select").selectOption({ index: 1 });
    await verify.getByRole("button", { name: "Verifikasi", exact: true }).click();

    await expect(page.locator(".alert-success")).toContainText(/diverifikasi/i);
  });

  test("pencarian dan filter status bekerja", async ({ page }) => {
    await login(page, "koordinator");
    await page.goto("/issues");

    await expect(page.locator("table tbody tr").first()).toBeVisible();
    await page.getByRole("button", { name: "Selesai", exact: true }).click();

    const statuses = page.locator("table tbody tr td:nth-child(5)");
    const count = await statuses.count();
    for (let i = 0; i < count; i++) {
      await expect(statuses.nth(i)).toContainText(/selesai/i);
    }
  });
});
