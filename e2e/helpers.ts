import { expect, type Page } from "@playwright/test";

export const ACCOUNTS = {
  admin: { email: "admin@labops.local", password: "admin123" },
  koordinator: { email: "koordinator@labops.local", password: "koord123" },
  dosen: { email: "drdedekurniadimkom@labops.local", password: "dosen123" },
  mahasiswa: { email: "mhs01@labops.local", password: "mhs123" },
} as const;

export type Role = keyof typeof ACCOUNTS;

/** Login lewat formulir UI dan tunggu sampai dasbor termuat. */
export async function login(page: Page, role: Role) {
  const account = ACCOUNTS[role];
  await page.goto("/login");
  await page.fill("#email", account.email);
  await page.fill("#password", account.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
  await expect(page.locator("h1.page-title")).toBeVisible();
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
}

/** Nilai unik agar data uji mudah dikenali tanpa mengganggu data demo. */
export function unique(prefix: string) {
  return `${prefix} ${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
}

/** Tanggal jauh di masa depan agar tidak bentrok dengan jadwal semester berjalan. */
export function futureDate(daysAhead = 240) {
  const d = new Date();
  // Sebar tanggal per proses agar pengujian berulang tidak memakai slot yang
  // sama dengan peminjaman yang sudah disetujui pada run sebelumnya.
  d.setDate(d.getDate() + daysAhead + (Date.now() % 365));
  return d.toISOString().slice(0, 10);
}

export async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - window.innerWidth;
  });
  expect(overflow, "halaman tidak boleh melebar melewati viewport").toBeLessThanOrEqual(2);
}
