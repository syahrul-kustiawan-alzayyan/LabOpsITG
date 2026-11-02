import json, re, pandas as pd

FILE = r"D:\LabOpsITG\jadwal penggunaan lab 2026-2027 ganjil - Copy - Copy.xlsx"
DAY_MAP = {"Senin":1,"Selasa":2,"Rabu":3,"Kamis":4,"Jumat":5,"Sabtu":6,"Minggu":0}

def clean(v):
    if isinstance(v, float) and v != v:
        return None
    if v is None:
        return None
    s = str(v).strip()
    if s == "" or s.lower() == "nan":
        return None
    return s

def parse_time(s):
    # "08.00-10.30" -> ("08:00","10:30")
    s = s.replace(" ", "")
    parts = s.split("-")
    if len(parts) != 2:
        return None, None
    def fmt(t):
        t = t.strip().replace(".", ":")
        # ensure HH:MM
        if ":" not in t:
            return None
        h, m = t.split(":")
        return f"{int(h):02d}:{int(m):02d}"
    return fmt(parts[0]), fmt(parts[1])

xl = pd.ExcelFile(FILE)
labs = []
dosens = set()
schedules = []

for sheet in xl.sheet_names:
    df = xl.parse(sheet, header=None)
    # find header row
    header_idx = None
    for i, row in df.iterrows():
        vals = [str(x) for x in row.tolist()]
        if any("Hari" in v for v in vals):
            header_idx = i
            break
    if header_idx is None:
        continue
    header = [clean(x) for x in df.iloc[header_idx].tolist()]
    # map columns
    col = {}
    for idx, h in enumerate(header):
        if h is None: continue
        hl = h.lower()
        if hl == "hari": col["hari"] = idx
        elif hl == "jam": col["jam"] = idx
        elif hl in ("kode mata kuliah","kode mk"): col["kode"] = idx
        elif hl == "mata kuliah": col["mk"] = idx
        elif hl == "dosen": col["dosen"] = idx
        elif hl == "smt": col["smt"] = idx
        elif hl == "kelas": col["kelas"] = idx
        elif hl == "prodi": col["prodi"] = idx
    # lab title from rows 0..header_idx-1
    title = None
    for i in range(0, header_idx):
        for x in df.iloc[i].tolist():
            c = clean(x)
            if c and ("JADWAL" in c.upper() or "LABORATORIUM" in c.upper() or "CLASSROOM" in c.upper() or "INTERACTIVE" in c.upper()):
                title = c
                break
        if title: break
    if not title:
        title = sheet
    labs.append({"kode": sheet, "nama": title, "kapasitas": 40, "lokasi": title})

    for i in range(header_idx+1, len(df)):
        row = df.iloc[i].tolist()
        hari = clean(row[col.get("hari",0)]) if "hari" in col else None
        jam = clean(row[col.get("jam",1)]) if "jam" in col else None
        mk = clean(row[col.get("mk",3)]) if "mk" in col else None
        if not hari or not jam or not mk:
            continue
        if hari not in DAY_MAP:
            continue
        jm, js = parse_time(jam)
        if not jm or not js:
            continue
        dosen = clean(row[col["dosen"]]) if "dosen" in col else None
        smt = clean(row[col.get("smt")]) if "smt" in col else None
        kelas = clean(row[col.get("kelas")]) if "kelas" in col else None
        prodi = clean(row[col.get("prodi")]) if "prodi" in col else None
        if dosen:
            dosens.add(dosen)
        if not kelas:
            kelas = "-"
        if not prodi:
            prodi = "UMUM"
        schedules.append({
            "labKode": sheet,
            "mataKuliah": mk,
            "kelas": kelas,
            "dosen": dosen,
            "hari": DAY_MAP[hari],
            "jamMulai": jm,
            "jamSelesai": js,
            "smt": smt,
            "prodi": prodi,
        })

out = {"labs": labs, "dosens": sorted(dosens), "schedules": schedules}
with open(r"D:\LabOpsITG\prisma\seed_data.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print("labs:", len(labs))
print("dosens:", len(dosens))
print("schedules:", len(schedules))
print("sample dosens:", list(dosens)[:5])
