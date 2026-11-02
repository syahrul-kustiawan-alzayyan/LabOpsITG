import { expect, test } from "@playwright/test";
import { futureDate, login, logout, unique } from "./helpers";

test.describe("Alur peminjaman lab", () => {
  test("mahasiswa mengajukan, koordinator menyetujui", async ({ page }) => {
    const keperluan = unique("E2E praktikum tamu");
    const tanggal = futureDate(240);

    await login(page, "mahasiswa");
    await page.goto("/bookings");

    await page.locator("#b-lab").selectOption({ index: 1 });
    await page.locator("#b-tanggal").fill(tanggal);
    await page.locator("#b-mulai").fill("16:00");
    await page.locator("#b-selesai").fill("17:30");
    await page.locator("#b-keperluan").fill(keperluan);
    await page.locator("#b-peserta").fill("12");

    await expect(page.getByText("Slot tersedia.").first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /kirim pengajuan/i }).click();
    await expect(page.locator('.alert-success[role="status"]')).toContainText(/pengajuan terkirim/i);

    await expect(page.locator("table tbody tr", { hasText: keperluan }).first()).toBeVisible();
    await expect(page.locator("table tbody tr", { hasText: keperluan }).first()).toContainText("Menunggu");

    await logout(page);
    await login(page, "koordinator");
    await page.goto("/bookings");

    page.once("dialog", (dialog) => dialog.accept());
    const row = page.locator("table tbody tr", { hasText: keperluan }).first();
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Setujui" }).click();

    await expect(page.locator('.alert-success[role="status"]')).toContainText(/disetujui/i);
    await expect(page.locator("table tbody tr", { hasText: keperluan }).first()).toContainText("Disetujui");
  });

  test("slot yang bentrok dengan jadwal ditolak sebelum dikirim", async ({ page }) => {
    await login(page, "mahasiswa");
    await page.goto("/bookings");

    await page.locator("#b-lab").selectOption({ index: 1 });
    await page.locator("#b-tanggal").fill(futureDate(245));
    await page.locator("#b-mulai").fill("09:00");
    await page.locator("#b-selesai").fill("08:00");
    await page.locator("#b-keperluan").fill(unique("E2E slot tidak valid"));

    const submit = page.getByRole("button", { name: /kirim pengajuan/i });
    await expect(page.getByText(/tidak tersedia|tidak valid|jam selesai/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(submit).toBeDisabled();
  });
});
