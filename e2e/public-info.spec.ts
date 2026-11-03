import { expect, test } from "@playwright/test";
import { futureDate, login, logout, unique } from "./helpers";

test.describe("Halaman informasi publik", () => {
  test("menampilkan jadwal, tautan layanan, dan menerima lamaran publik", async ({ page }) => {
    const mk = unique("Praktikum E2E");
    const nama = unique("Pelamar E2E");
    const email = `pelamar.${Date.now()}@example.com`;

    await page.goto("/");
    await expect(page.locator(".hero-title")).toContainText(/jadwal/i);
    await expect(page.locator("#jadwal")).toBeVisible();
    await expect(page.getByRole("link", { name: /halaman pengajuan/i })).toHaveAttribute("href", "/bookings");
    await expect(page.getByRole("link", { name: /halaman pelaporan/i })).toHaveAttribute("href", "/issues");
    await expect(page.getByRole("heading", { name: /rekrutmen instruktur/i })).toBeVisible();

    // Pakai periode yang sudah dibuka; buat baru hanya bila tidak ada lowongan.
    let hasPeriod = (await page.locator("#lamar-posisi option").count()) > 1;
    if (!hasPeriod) {
      await login(page, "koordinator");
      await page.goto("/recruitment");
      await page.getByRole("button", { name: "Kelola", exact: true }).click();
      await page.locator("#np-tipe").selectOption("ASISTEN_DOSEN");
      await page.locator("#np-mk").fill(mk);
      await page.locator("#np-kuota").fill("2");
      await page.locator("#np-tenggat").fill(futureDate(60));
      await page.getByRole("button", { name: /buka periode/i }).click();
      await expect(page.locator('.alert-success[role="status"]')).toContainText(/dibuka/i);
      await logout(page);
      await page.goto("/");
      hasPeriod = (await page.locator("#lamar-posisi option").count()) > 1;
    }
    expect(hasPeriod, "harus ada minimal satu lowongan untuk diuji").toBeTruthy();

    await page.locator("#lamar-posisi").selectOption({ index: 1 });
    const tipeLabel = await page.locator("#lamar-tipe").inputValue();
    await expect(page.locator("#lamar-mk")).not.toHaveValue("");
    await page.locator("#lamar-nama").fill(nama);
    await page.locator("#lamar-email").fill(email);
    if (tipeLabel === "Instruktur") {
      await page.locator("#lamar-gelar").fill("S.Kom.");
    } else {
      await page.locator("#lamar-nim").fill("22552001");
    }
    await page.locator("#lamar-wa").fill("081234567890");

    const pdf = { name: "berkas.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 uji") };
    await page.locator("#lamar-surat").setInputFiles(pdf);
    await page.locator("#lamar-cv").setInputFiles(pdf);
    await page.locator("#lamar-transkrip").setInputFiles(pdf);
    await expect(page.locator('a.field-hint', { hasText: "Berkas terunggah" })).toHaveCount(3, { timeout: 20_000 });

    await page.locator("#lamar-pernyataan").check();
    const submit = page.getByRole("button", { name: /kirim lamaran/i });
    await expect(submit).toBeEnabled({ timeout: 20_000 });
    await submit.click();
    await expect(page.locator('.alert-success[role="status"]')).toContainText(/berhasil dikirim/i);

    // Lamaran publik masuk ke antrean koordinator dengan data pelamar.
    await login(page, "koordinator");
    await page.goto("/recruitment");
    await page.getByRole("button", { name: "Kelola", exact: true }).click();
    const row = page.locator("table tbody tr", { hasText: nama }).first();
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row).toContainText(email);
    await expect(row).toContainText(tipeLabel);
    if (tipeLabel === "Instruktur") {
      await expect(row).toContainText("S.Kom.");
    } else {
      await expect(row).toContainText("22552001");
    }
    await expect(row).toContainText("081234567890");
  });
});
