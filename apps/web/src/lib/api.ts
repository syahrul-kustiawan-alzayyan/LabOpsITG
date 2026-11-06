export const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  payload: any;
  constructor(message: string, status: number, payload?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include" })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        setTimeout(() => {
          refreshInFlight = null;
        }, 0);
      });
  }
  return refreshInFlight;
}

type Options = Omit<RequestInit, "body"> & { body?: any };

export async function api<T = any>(path: string, options: Options = {}, retry = true): Promise<T> {
  const { body, headers, ...rest } = options;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        ...(body !== undefined && !isForm ? { "Content-Type": "application/json" } : {}),
        ...(headers || {}),
      },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Tidak dapat menghubungi server. Periksa koneksi Anda.", 0);
  }

  if (res.status === 401 && retry && !path.startsWith("/auth/")) {
    if (await tryRefresh()) return api<T>(path, options, false);
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    }
    throw new ApiError("Sesi berakhir, silakan masuk kembali.", 401);
  }

  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && (Array.isArray(data.message) ? data.message.join(", ") : data.message)) ||
      "Permintaan gagal diproses.";
    throw new ApiError(message, res.status, data);
  }
  return data as T;
}

export async function uploadFile(file: File) {
  const form = new FormData();
  form.append("file", file);
  return api<{ url: string; filename: string; size: number }>("/files/upload", { method: "POST", body: form });
}

/** Unggah berkas lamaran publik (tanpa sesi masuk). */
export async function uploadPublicFile(file: File) {
  const form = new FormData();
  form.append("file", file);
  return api<{ url: string; filename: string; size: number }>("/public/files/upload", { method: "POST", body: form }, false);
}

export function fileUrl(path?: string | null) {
  if (!path) return "";
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

/** Mengembalikan ID periode yang dipilih pengguna dari localStorage. */
export function getSelectedPeriodeId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("labops.selectedPeriodeId") || null;
  } catch {
    return null;
  }
}

/** Menambahkan parameter periodeId ke URL query jika ada periode yang dipilih. */
export function withPeriode(params: Record<string, string | undefined>): Record<string, string | undefined> {
  const periodeId = getSelectedPeriodeId();
  if (periodeId) params.periodeId = periodeId;
  return params;
}
