const ROOM_CODE = /(?:^|\s)([A-Z])-(I|II|III|IV|V)-(0?\d+)(?:\s|$)/;

/** Kode ruang ringkas, mis. "C-I-01", dari nama/lokasi lab yang panjang. */
export function labRoom(nama?: string | null, lokasi?: string | null) {
  const source = `${lokasi || ""} ${nama || ""}`.trim();
  const match = source.match(ROOM_CODE);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : lokasi || "-";
}

/** Nama lab yang enak dibaca tanpa awalan deskriptif dari data impor. */
export function labDisplayName(nama?: string | null, kode?: string | null) {
  if (!nama) return kode || "Laboratorium";

  let text = nama.replace(/^JADWAL\s+PENGGUNAAN\s+/i, "").trim();
  const room = text.match(ROOM_CODE);
  if (room) text = text.slice(0, room.index).trim();
  text = text.replace(/\s+/g, " ").trim();

  if (!text) return kode || "Laboratorium";

  return text
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\b(Ii|Iii|Iv)\b/g, (roman) => roman.toUpperCase());
}
