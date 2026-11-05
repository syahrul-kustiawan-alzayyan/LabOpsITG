import { expect, test } from "@playwright/test";
import { futureDate, unique } from "./helpers";

/**
 * Alur untuk pengunjung umum: peminjaman dan pelaporan kendala tidak memerlukan akun.
 */
test.describe("Layanan publik tanpa login", () => {
  test("pengunjung dapat mengajukan peminjaman dan memeriksa status", async ({ page }) => {
    const keperluan = unique("E2E publik pinjam");
    const email = `publik-${Date.now()}@example.com`;
    const tanggal = futureDate(260);

    await page.goto("/informasi/peminjaman");
    await page.locator("#p-lab").selectOption({ index: 1 });
    await page.locator("#p-tanggal").fill(tanggal);
    await page.locator("#p-mulai").fill("16:00");
    await page.locator("#p-selesai").fill("17:30");
    await page.locator("#p-keperluan").fill(keperluan);
    await page.locator("#p-peserta").fill("12");
    await page.locator("#p-nama").fill("Pemohon Publik");
    await page.locator("#p-nim").fill("20269901");
    await page.locator("#p-email").fill(email);
    await page.locator("#p-wa").fill("081200000001");

    await expect(page.getByText(/slot tersedia/i).first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /kirim pengajuan/i }).click();

    const kode = page.locator(".code-value").first();
    await expect(kode).toHaveText(/^PJM-/);
    const kodePengajuan = (await kode.innerText()).trim();

    await page.getByRole("button", { name: /cek status/i }).click();
    const status = page.locator(".status-result");
    await expect(status).toContainText(kodePengajuan);
    await expect(status).toContainText(/menunggu peninjauan/i);
    await expect(status).toContainText(keperluan);
  });

  test("pengunjung dapat melaporkan kendala dan memeriksa tiket", async ({ page }) => {
    const deskripsi = unique("E2E publik kendala");
    const email = `publik-${Date.now()}@example.com`;

    await page.goto("/informasi/kendala");
    await page.locator("#k-lab").selectOption({ index: 1 });
    await page.locator("#k-kategori").selectOption("JARINGAN");
    await page.locator("#k-urgensi").selectOption("TINGGI");
    await page.locator("#k-deskripsi").fill(deskripsi);
    await page.locator("#k-nama").fill("Pelapor Publik");
    await page.locator("#k-nim").fill("20269902");
    await page.locator("#k-email").fill(email);
    await page.locator("#k-wa").fill("081200000002");

    await page.getByRole("button", { name: /kirim laporan/i }).click();

    const tiket = page.locator(".code-value").first();
    await expect(tiket).toHaveText(/^KDL-/);
    const nomorTiket = (await tiket.innerText()).trim();

    await page.getByRole("button", { name: /cek status/i }).click();
    const status = page.locator(".status-result");
    await expect(status).toContainText(nomorTiket);
    await expect(status).toContainText(/baru/i);
    await expect(status).toContainText(deskripsi);
  });
});
