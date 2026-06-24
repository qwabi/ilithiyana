#!/usr/bin/env python3
"""
build_claude_final.py
=====================
Produces:

  lib/seed/final/claude/concatenated/
    institutions.concatenated.json
    programmes.concatenated.json
    faculties.concatenated.json

  lib/seed/final/claude/merged/
    index.json
    index.programmes.json
    index.faculties.json
    institutions/
      institution-{id}-{slug}.rich.json   (one per real institution, fully merged)
"""

import json, re, sys
from pathlib import Path
from collections import defaultdict
import datetime

SEED   = Path(__file__).resolve().parent.parent
OUT_C  = SEED / "final" / "claude" / "concatenated"
OUT_M  = SEED / "final" / "claude" / "merged"
OUT_MI = OUT_M / "institutions"

OUT_C.mkdir(parents=True, exist_ok=True)
OUT_MI.mkdir(parents=True, exist_ok=True)

def log(msg): print(f"  {msg}", flush=True)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def load_json(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        log(f"WARN  {path}: {e}")
        return None

def slugify(name):
    s = re.sub(r"[^a-z0-9]+", "-", str(name).lower().strip())
    return s.strip("-")

def best(*values):
    for v in values:
        if v is not None and v != "" and v != [] and v != {}:
            return v
    return None

def safe_dict(item, src):
    """Ensure item is a dict; if string, wrap it; always add _src."""
    if isinstance(item, dict):
        return {**item, "_src": src}
    elif isinstance(item, str):
        return {"name": item, "_src": src}
    return {"_raw": str(item), "_src": src}

# ---------------------------------------------------------------------------
# Name -> numeric ID map
# ---------------------------------------------------------------------------
NAME_TO_ID = {
    "ikhala tvet college": "309", "ikhala": "309",
    "king hintsa tvet college": "310", "king-hintsa tvet college": "310",
    "lovedale tvet college": "312",
    "mnambithi tvet college": "314",
    "northern cape urban tvet college": "316",
    "northlink tvet college": "317",
    "orbit tvet college": "318",
    "south west gauteng tvet college": "319",
    "tshwane south tvet college": "320",
    "western college for tvet": "321", "westcol tvet": "321",
    "boland tvet college": "322",
    "buffalo city tvet college": "323",
    "cape peninsula university of technology": "324", "cput": "324",
    "capricorn tvet college": "325",
    "central university of technology free state": "326", "cut": "326",
    "coastal tvet college": "327",
    "college of cape town for tvet": "328",
    "durban university of technology": "329", "dut": "329",
    "ehlanzeni tvet college": "330",
    "ekurhuleni east tvet college": "331",
    "ekurhuleni west tvet college": "332",
    "elangeni tvet college": "333",
    "false bay tvet college": "334",
    "flavius mareka tvet college": "335",
    "gert sibande tvet college": "336",
    "goldfields tvet college": "337",
    "ingwe tvet college": "338",
    "king sabata dalindyebo tvet college": "339", "ksd tvet college": "339",
    "lephalale tvet college": "340",
    "majuba tvet college": "341",
    "mangosuthu university of technology": "342", "mut": "342",
    "mopani south tvet college": "343",
    "motheo tvet college": "344",
    "mthashana tvet college": "345",
    "nelson mandela university": "347", "nelson mandela metropolitan university": "347", "nmu": "347",
    "nkangala tvet college": "348",
    "north west university": "349", "nwu": "349",
    "northern cape rural tvet college": "350",
    "port elizabeth tvet college": "351", "pe tvet": "351",
    "rhodes university": "352", "ru": "352",
    "sedibeng tvet college": "353",
    "sekhukhune tvet college": "354",
    "south cape tvet college": "355",
    "taletso tvet college": "356",
    "thekwini tvet college": "357",
    "tshwane university of technology": "359", "tut": "359",
    "umfolozi tvet college": "360",
    "umgungundlovu tvet college": "361",
    "university of cape town": "362", "uct": "362",
    "university of fort hare": "363", "ufh": "363",
    "university of johannesburg": "364", "uj": "364",
    "university of kwazulu-natal": "365", "university of kwazulu natal": "365", "ukzn": "365",
    "university of limpopo": "366", "ul": "366",
    "university of pretoria": "367", "up": "367",
    "university of south africa": "368", "unisa": "368",
    "stellenbosch university": "369", "su": "369",
    "university of the free state": "370", "ufs": "370",
    "university of the western cape": "371", "uwc": "371",
    "university of the witwatersrand": "372", "wits": "372",
    "university of venda": "373", "univen": "373",
    "university of zululand": "374", "unizulu": "374",
    "vaal university of technology": "375", "vut": "375",
    "vhembe tvet college": "376",
    "vuselela tvet college": "377",
    "walter sisulu university": "378", "wsu": "378",
    "walter sisulu university of technology and science": "378",
    "waterberg tvet college": "379",
    "west coast tvet college": "380",
    "sol plaatje university": "411",
    "university of mpumalanga": "412",
    "sefako makgatho health sciences university": "413", "smu": "413",
    "central johannesburg tvet college": "306", "cjc tvet": "306",
    "eastcape midlands tvet college": "307", "em tvet": "307",
    "esayidi tvet college": "308",
    "letaba tvet college": "311",
    "maluti tvet college": "313",
    "agricultural sector education and training authority": "199", "agriseta": "199",
    "banking sector education and training authority": "201", "bankseta": "201",
    "chemical industries education and training authority": "206", "chieta": "206",
    "construction education and training authority": "209", "ceta": "209",
    "culture arts tourism hospitality and sport sector education and training authority": "215", "cathsseta": "215",
    "education training and development practices sector education and training authority": "221", "etdp seta": "221",
    "energy and water sector education and training authority": "222", "ewseta": "222",
    "fibre processing and manufacturing sector education and training authority": "224", "fp m seta": "224",
    "finance and accounting services sector education and training authority": "226", "fasset": "226",
    "food and beverage manufacturing industry sector education and training authority": "228", "foodbev seta": "228",
    "insurance sector education and training authority": "233", "inseta": "233",
    "local government sector education and training authority": "240", "lgseta": "240",
    "manufacturing engineering and related services sector education and training authority": "243", "merseta": "243",
    "media information and communication technologies sector education and training authority": "246", "mict seta": "246",
    "health and welfare sector education and training authority": "105", "hwseta": "105",
    "mining qualifications authority": "120", "mqa": "120",
    "safety and security sector education and training authority": "156", "sasseta": "156",
    "public service sector education and training authority": "271", "pseta": "271",
    "services sector education and training authority": "277", "sseta": "277",
    "transport education training authority": "291", "teta": "291",
    "wholesale and retail sector education and training authority": "299", "w rseta": "299",
}

def resolve_id(raw_id, name):
    if raw_id and re.match(r"^\d+$", str(raw_id)):
        return str(raw_id)
    key = slugify(str(name or ""))
    return NAME_TO_ID.get(key) or NAME_TO_ID.get(key.replace("-", " ")) or str(raw_id or "")

# ===========================================================================
# STEP 1 - Load source files
# ===========================================================================
print("\n  Loading source files ...")

def load_insts(path, label):
    d = load_json(path) or {}
    items = d.get("institutions") if isinstance(d, dict) else d
    if not isinstance(items, list): items = []
    log(f"{label}: {len(items)} records")
    return items

insts_base   = load_insts(SEED / "institutions.json", "institutions.json")
insts_result = load_insts(SEED / "result.json",       "result.json")

enriched_raw = load_json(SEED / "enriched_universities.json") or []
if isinstance(enriched_raw, dict):
    enriched_raw = enriched_raw.get("universities", [])
log(f"enriched_universities.json: {len(enriched_raw)}")

v3_enriched  = (load_json(SEED/"generated"/"v3"/"institutions.enriched.json") or {}).get("institutions", [])
log(f"v3/institutions.enriched.json: {len(v3_enriched)}")

ufs_raw      = load_json(SEED/"generated"/"v3"/"institution-370-ufs.json") or {}
log(f"v3/institution-370-ufs.json: loaded")

v3_progs     = (load_json(SEED/"generated"/"v3"/"programmes.json") or {}).get("programmes", [])
log(f"v3/programmes.json: {len(v3_progs)}")

v3_facs      = (load_json(SEED/"generated"/"v3"/"faculties.json") or {}).get("faculties", [])
log(f"v3/faculties.json: {len(v3_facs)}")

aps_rules    = (load_json(SEED/"generated"/"v3"/"aps-rules.json") or {}).get("aps_rules", [])
log(f"v3/aps-rules.json: {len(aps_rules)}")

adm_raw_data = load_json(SEED/"generated"/"v3"/"admission-requirements.json") or {}
adm_reqs     = adm_raw_data.get("admission_requirements") or adm_raw_data.get("requirements") or []
if isinstance(adm_reqs, dict):
    flat = []
    for v in adm_reqs.values():
        if isinstance(v, list): flat.extend(v)
        elif isinstance(v, dict): flat.append(v)
    adm_reqs = flat
log(f"v3/admission-requirements.json: {len(adm_reqs)}")

cursor_dir  = SEED / "workik" / "batch1" / "cursor"
cursor_recs = []
for fp in (sorted(cursor_dir.glob("*.json")) if cursor_dir.exists() else []):
    d = load_json(fp) or {}
    d["_source_path"] = str(fp.relative_to(SEED))
    cursor_recs.append(d)
log(f"workik/cursor: {len(cursor_recs)} files")

online_dir  = SEED / "workik" / "batch1" / "online"
online_recs = []
for fp in (sorted(online_dir.glob("*.json")) if online_dir.exists() else []):
    d = load_json(fp) or {}
    d["_source_path"] = str(fp.relative_to(SEED))
    online_recs.append(d)
log(f"workik/online: {len(online_recs)} files")

cat_progs = (load_json(SEED/"final"/"concatenated"/"programmes.concatenated.json") or {}).get("programmes", [])
cat_facs  = (load_json(SEED/"final"/"concatenated"/"faculties.concatenated.json")  or {}).get("faculties",  [])
log(f"existing cat/programmes: {len(cat_progs)}  cat/faculties: {len(cat_facs)}")

# ===========================================================================
# STEP 2 - Build registry
# ===========================================================================
print("\n  Building canonical registry ...")
registry = {}

def ensure(num_id, name=""):
    if num_id not in registry:
        registry[num_id] = {
            "_id": num_id, "_names": set(), "_types": set(),
            "meta": {}, "profile": {}, "contact": {},
            "campuses_raw": [], "faculties_raw": [], "programmes_raw": [],
            "admission_raw": {}, "sources": [],
        }
    if name:
        registry[num_id]["_names"].add(name)
    return registry[num_id]

def absorb_meta(rec, num_id, src):
    r = ensure(num_id, rec.get("official_name") or rec.get("name",""))
    m = r["meta"]
    for dst, keys in [
        ("name",             ["official_name","name"]),
        ("institution_type", ["institution_type","type"]),
        ("province",         ["province"]),
        ("city",             ["city"]),
        ("official_website", ["official_website","website"]),
        ("detail_source",    ["detail_source"]),
        ("application_url",  ["application_url"]),
        ("prospectus_url",   ["prospectus_url"]),
        ("nsfas_supported",  ["nsfas_supported"]),
        ("distance_learning",["distance_learning"]),
        ("accreditation",    ["accreditation"]),
        ("qualification_types",["qualification_types"]),
    ]:
        if not m.get(dst):
            for k in keys:
                v = rec.get(k)
                if v not in (None, "", [], {}):
                    m[dst] = v; break
    m["institution_id"] = m.get("institution_id") or num_id
    if rec.get("institution_type"):
        r["_types"].add(rec["institution_type"])
    if src not in r["sources"]:
        r["sources"].append(src)

def absorb_contact(rec, num_id):
    r = ensure(num_id)
    c = r["contact"]
    for dst, key in [("emails","contact_emails"),("phone_numbers","contact_phone_numbers"),
                     ("physical_address","physical_address"),("postal_address","postal_address"),
                     ("socials","socials")]:
        if not c.get(dst):
            v = rec.get(key)
            if v not in (None,"",[],()):
                c[dst] = v

def absorb_enriched(enr, num_id):
    r = ensure(num_id, enr.get("name",""))
    p = r["profile"]
    for dst, key in [("short_name","short_name"),("logo","logo"),("motto","motto"),
                     ("colors","colors"),("languages","languages"),("student_count","student_estimate"),
                     ("nickname","nickname"),("mascot","mascot"),("sports","sports_affiliations"),
                     ("established","established"),("overview","overview")]:
        if not p.get(dst):
            v = enr.get(key)
            if v not in (None,"",[]):
                p[dst] = v
    for camp in (enr.get("campuses") or []):
        r["campuses_raw"].append(safe_dict(camp, "enriched_universities.json"))
    if "enriched_universities.json" not in r["sources"]:
        r["sources"].append("enriched_universities.json")

# -- Base institutions -------------------------------------------------------
for item in insts_base + insts_result:
    nid = resolve_id(item.get("id") or item.get("institution_id",""),
                     item.get("official_name") or item.get("name",""))
    if not nid: continue
    absorb_meta(item, nid, "institutions.json")
    absorb_contact(item, nid)
    for c in (item.get("campuses") or []):
        ensure(nid)["campuses_raw"].append(safe_dict(c, "institutions.json"))
    for f in (item.get("faculties") or []):
        ensure(nid)["faculties_raw"].append(safe_dict(f, "institutions.json"))
log(f"After base: {len(registry)} institutions")

# -- Enriched universities ---------------------------------------------------
for e in enriched_raw:
    nid = resolve_id(None, e.get("name",""))
    if not nid: log(f"  WARN no ID for enriched: {e.get('name')}"); continue
    absorb_enriched(e, nid)
    absorb_meta({"name": e.get("name"), "institution_type": e.get("type")}, nid, "enriched_universities.json")
log(f"After enriched: {len(registry)}")

# -- v3 enriched ------------------------------------------------------------
for item in v3_enriched:
    nid = resolve_id(item.get("id") or item.get("institution_id",""),
                     item.get("official_name") or item.get("name",""))
    if not nid: continue
    absorb_meta(item, nid, "generated/v3/institutions.enriched.json")
log(f"After v3/enriched: {len(registry)}")

# -- UFS special ------------------------------------------------------------
ufs_id = str(ufs_raw.get("institution_id","370"))
ensure(ufs_id, ufs_raw.get("institution_name","University of the Free State"))
if "generated/v3/institution-370-ufs.json" not in registry[ufs_id]["sources"]:
    registry[ufs_id]["sources"].append("generated/v3/institution-370-ufs.json")
for f in (ufs_raw.get("faculties") or []):
    registry[ufs_id]["faculties_raw"].append(safe_dict(f, "generated/v3/institution-370-ufs.json"))
for p in (ufs_raw.get("programmes") or []):
    registry[ufs_id]["programmes_raw"].append(safe_dict(p, "generated/v3/institution-370-ufs.json"))
log(f"UFS: {len(ufs_raw.get('faculties',[]))} facs, {len(ufs_raw.get('programmes',[]))} progs")

# -- Workik cursor ----------------------------------------------------------
for doc in cursor_recs:
    nid = resolve_id(str(doc.get("institution_id","")), doc.get("institution_name",""))
    if not nid: continue
    src = doc.get("_source_path","workik/cursor")
    absorb_meta({"name": doc.get("institution_name"), "institution_type": doc.get("institution_type")}, nid, src)
    ap  = doc.get("admission_policy") or {}
    adm = ensure(nid)["admission_raw"]
    for k in ["aps_name","aps_calculation_notes","minimum_aps_for_bachelors",
               "minimum_aps_for_diplomas","minimum_entry_note","life_orientation_cap"]:
        if not adm.get(k) and ap.get(k):
            adm[k] = ap[k]
    for c in (doc.get("campuses") or []):
        ensure(nid)["campuses_raw"].append(safe_dict(c, src))
    for f in (doc.get("faculties") or []):
        ensure(nid)["faculties_raw"].append(safe_dict(f, src))
    for p in (doc.get("programmes") or []):
        ensure(nid)["programmes_raw"].append(safe_dict(p, src))
log(f"After workik/cursor: {len(registry)}")

# -- Workik online ----------------------------------------------------------
for doc in online_recs:
    inst   = doc.get("institution") or {}
    raw_id = str(inst.get("institution_id") or doc.get("institution_id",""))
    name   = inst.get("name") or inst.get("institution_name") or doc.get("institution_name","")
    nid    = resolve_id(raw_id, name) or resolve_id(None, Path(doc.get("_source_path","")).stem)
    if not nid: log(f"  WARN online no ID: {doc.get('_source_path')}"); continue
    src = doc.get("_source_path","workik/online")
    absorb_meta({"name": name, "institution_type": inst.get("institution_type"),
                 "province": inst.get("province"), "city": inst.get("city"),
                 "official_website": inst.get("official_website")}, nid, src)
    for c in (doc.get("campuses") or inst.get("campuses") or []):
        ensure(nid)["campuses_raw"].append(safe_dict(c, src))
    for f in (doc.get("faculties") or inst.get("faculties") or []):
        ensure(nid)["faculties_raw"].append(safe_dict(f, src))
    for p in (doc.get("programmes") or inst.get("programmes") or []):
        ensure(nid)["programmes_raw"].append(safe_dict(p, src))
    ap  = doc.get("admission_policy") or inst.get("admission_policy") or {}
    adm = ensure(nid)["admission_raw"]
    for k in ["aps_name","aps_calculation_notes","minimum_aps_for_bachelors",
               "minimum_aps_for_diplomas","minimum_entry_note","life_orientation_cap"]:
        if not adm.get(k) and ap.get(k):
            adm[k] = ap[k]
log(f"After workik/online: {len(registry)}")

# -- v3 faculties -----------------------------------------------------------
for fac in v3_facs:
    nid = resolve_id(str(fac.get("institution_id") or fac.get("institutionId","")),
                     fac.get("institution_name",""))
    if nid:
        ensure(nid)["faculties_raw"].append(safe_dict(fac, "generated/v3/faculties.json"))
for item in cat_facs:
    payload = item.get("payload") or item
    nid = resolve_id(str(payload.get("institution_id","")), payload.get("institution_name",""))
    if nid:
        ensure(nid)["faculties_raw"].append(safe_dict(payload, item.get("source_path","concatenated/faculties")))
log(f"Faculties attached")

# -- v3 programmes ----------------------------------------------------------
for prog in v3_progs:
    nid = resolve_id(str(prog.get("institution_id") or prog.get("institutionId","")),
                     prog.get("institution_name",""))
    if nid:
        ensure(nid)["programmes_raw"].append(safe_dict(prog, "generated/v3/programmes.json"))
for item in cat_progs:
    payload = item.get("payload") or item
    nid = resolve_id(str(payload.get("institution_id","")), payload.get("institution_name",""))
    if nid:
        ensure(nid)["programmes_raw"].append(safe_dict(payload, item.get("source_path","concatenated/programmes")))
log(f"Programmes attached")

# -- APS rules + admission requirements -------------------------------------
for rule in aps_rules:
    nid = resolve_id(str(rule.get("institution_id") or rule.get("institutionId","")),
                     rule.get("institution_name",""))
    if nid:
        ensure(nid)["admission_raw"].setdefault("aps_rules",[]).append({
            "id": rule.get("id"), "scope": rule.get("scope"),
            "min_aps": rule.get("min_aps") or rule.get("minAps"),
            "programme": rule.get("programme_name"),
            "excerpt": rule.get("source_excerpt"),
        })
for req in adm_reqs:
    nid = resolve_id(str(req.get("institution_id") or req.get("institutionId","")),
                     req.get("institution_name",""))
    if nid:
        ensure(nid)["admission_raw"].setdefault("programme_requirements",[]).append(req)
log(f"APS + admission attached")

# ===========================================================================
# STEP 3 - Write concatenated files
# ===========================================================================
print("\n  Writing concatenated files ...")

all_inst_flat = []
for item in insts_base:
    all_inst_flat.append({"source":"institutions.json","payload":item})
for item in v3_enriched:
    all_inst_flat.append({"source":"generated/v3/institutions.enriched.json","payload":item})
for e in enriched_raw:
    all_inst_flat.append({"source":"enriched_universities.json","payload":e})
for doc in cursor_recs:
    all_inst_flat.append({"source":doc.get("_source_path","workik/cursor"),"payload":doc})
for doc in online_recs:
    all_inst_flat.append({"source":doc.get("_source_path","workik/online"),"payload":doc})
all_inst_flat.append({"source":"generated/v3/institution-370-ufs.json","payload":ufs_raw})

with open(OUT_C/"institutions.concatenated.json","w",encoding="utf-8") as f:
    json.dump({"total":len(all_inst_flat),"sources":sorted({r["source"] for r in all_inst_flat}),
               "institutions":all_inst_flat},f,indent=2,ensure_ascii=False)
log(f"institutions.concatenated.json: {len(all_inst_flat)}")

all_prog_flat, seen_pk = [], set()
for prog in v3_progs:
    k = (str(prog.get("institution_id","")), str(prog.get("normalized_name") or prog.get("name","")))
    if k not in seen_pk:
        seen_pk.add(k)
        all_prog_flat.append({"source":"generated/v3/programmes.json","payload":prog})
for item in cat_progs:
    payload = item.get("payload") or item
    k = (str(payload.get("institution_id","")), str(payload.get("normalized_name") or payload.get("name","")))
    if k not in seen_pk:
        seen_pk.add(k)
        all_prog_flat.append({"source":item.get("source_path","concatenated"),"payload":payload})
with open(OUT_C/"programmes.concatenated.json","w",encoding="utf-8") as f:
    json.dump({"total":len(all_prog_flat),"programmes":all_prog_flat},f,indent=2,ensure_ascii=False)
log(f"programmes.concatenated.json: {len(all_prog_flat)}")

all_fac_flat, seen_fk = [], set()
for fac in v3_facs:
    k = (str(fac.get("institution_id","")), str(fac.get("name","")))
    if k not in seen_fk:
        seen_fk.add(k)
        all_fac_flat.append({"source":"generated/v3/faculties.json","payload":fac})
for item in cat_facs:
    payload = item.get("payload") or item
    k = (str(payload.get("institution_id","")), str(payload.get("name","")))
    if k not in seen_fk:
        seen_fk.add(k)
        all_fac_flat.append({"source":item.get("source_path","concatenated"),"payload":payload})
with open(OUT_C/"faculties.concatenated.json","w",encoding="utf-8") as f:
    json.dump({"total":len(all_fac_flat),"faculties":all_fac_flat},f,indent=2,ensure_ascii=False)
log(f"faculties.concatenated.json: {len(all_fac_flat)}")

# ===========================================================================
# STEP 4 - Build rich merged files
# ===========================================================================
print("\n  Building rich merged institution files ...")

def clean_campus(r):
    return {k:r.get(k) for k in ["name","city","province","is_main","type","address","coordinates","contact"]}

def clean_faculty(r):
    return {"id":r.get("id") or r.get("faculty_id"),
            "name":r.get("name") or r.get("faculty_name"),
            "overview":r.get("overview") or r.get("description") or r.get("source_excerpt"),
            "kind":r.get("kind")}

def clean_programme(r):
    name = r.get("name") or r.get("programme_name")
    if not name: return None
    return {
        "id":                 r.get("id") or r.get("programme_id"),
        "name":               name,
        "normalized_name":    r.get("normalized_name"),
        "qualification_type": r.get("qualification_type"),
        "qualification_level":r.get("qualification_level"),
        "nqf_level":          r.get("nqf_level"),
        "faculty_name":       r.get("faculty_name") or r.get("faculty"),
        "department":         r.get("department"),
        "duration":           r.get("duration"),
        "study_mode":         r.get("study_mode"),
        "campus":             r.get("campus"),
        "programme_code":     r.get("programme_code"),
        "saqa_code":          r.get("saqa_code"),
        "min_aps":            r.get("min_aps"),
        "subjects_compulsory":r.get("subjects_compulsory") or [],
        "subject_or_groups":  r.get("subject_or_groups") or [],
        "min_grade":          r.get("minimum_grade_requirement"),
        "selection_required": r.get("selection_required"),
        "overview":           r.get("programme_overview") or r.get("overview"),
        "career_outcomes":    r.get("career_outcomes") or [],
        "fees_per_year":      r.get("fees_per_year"),
    }

def dedup_camps(raws):
    seen, out = set(), []
    for raw in raws:
        n = (raw.get("name") or "").strip().lower()
        if n and n not in seen:
            seen.add(n); out.append(clean_campus(raw))
    return out

def dedup_facs(raws):
    seen, out = set(), []
    for raw in raws:
        n = (raw.get("name") or raw.get("faculty_name") or "").strip().lower()
        if n and n not in seen:
            seen.add(n); out.append(clean_faculty(raw))
    return out

def dedup_progs(raws):
    seen, out = set(), []
    for raw in raws:
        n  = (raw.get("normalized_name") or raw.get("name") or "").strip().lower()
        qt = (raw.get("qualification_type") or "").strip().lower()
        k  = f"{n}||{qt}"
        if n and k not in seen:
            seen.add(k)
            p = clean_programme(raw)
            if p: out.append(p)
    return out

index_rows = []
for num_id, r in sorted(registry.items(), key=lambda x: x[0].zfill(6)):
    m    = r["meta"]
    name = m.get("name") or next(iter(r["_names"]), f"institution-{num_id}")
    itype= m.get("institution_type") or next(iter(r["_types"]), None)
    slug = slugify(name)
    adm  = r["admission_raw"]

    campuses   = dedup_camps(r["campuses_raw"])
    faculties  = dedup_facs(r["faculties_raw"])
    programmes = dedup_progs(r["programmes_raw"])

    rich = {
        "meta": {
            "institution_id":     num_id,
            "slug":               slug,
            "name":               name,
            "institution_type":   itype,
            "province":           m.get("province"),
            "city":               m.get("city"),
            "official_website":   m.get("official_website"),
            "detail_source":      m.get("detail_source"),
            "application_url":    m.get("application_url"),
            "prospectus_url":     m.get("prospectus_url"),
            "nsfas_supported":    m.get("nsfas_supported"),
            "distance_learning":  m.get("distance_learning"),
            "accreditation":      m.get("accreditation"),
            "qualification_types":m.get("qualification_types"),
        },
        "profile":  r["profile"],
        "contact":  r["contact"],
        "campuses":   campuses,
        "faculties":  faculties,
        "programmes": programmes,
        "admission": {
            "aps_name":                  adm.get("aps_name"),
            "aps_calculation_notes":     adm.get("aps_calculation_notes"),
            "minimum_aps_for_bachelors": adm.get("minimum_aps_for_bachelors"),
            "minimum_aps_for_diplomas":  adm.get("minimum_aps_for_diplomas"),
            "minimum_entry_note":        adm.get("minimum_entry_note"),
            "life_orientation_cap":      adm.get("life_orientation_cap"),
            "aps_rules":                 adm.get("aps_rules",[]),
            "programme_requirements":    adm.get("programme_requirements",[]),
        },
        "sources": sorted(set(r["sources"])),
        "_stats": {
            "campuses_count":   len(campuses),
            "faculties_count":  len(faculties),
            "programmes_count": len(programmes),
            "aps_rules_count":  len(adm.get("aps_rules",[])),
            "adm_reqs_count":   len(adm.get("programme_requirements",[])),
        },
    }

    fname = f"institution-{num_id}-{slug}.rich.json"
    with open(OUT_MI/fname,"w",encoding="utf-8") as f:
        json.dump(rich,f,indent=2,ensure_ascii=False)

    index_rows.append({
        "institution_id":   num_id,
        "slug":             slug,
        "name":             name,
        "institution_type": itype,
        "province":         m.get("province"),
        "city":             m.get("city"),
        "official_website": m.get("official_website"),
        "programmes_count": len(programmes),
        "faculties_count":  len(faculties),
        "campuses_count":   len(campuses),
        "aps_rules_count":  len(adm.get("aps_rules",[])),
        "has_profile":      bool(r["profile"]),
        "rich_file":        f"final/claude/merged/institutions/{fname}",
    })

log(f"Written {len(index_rows)} rich institution files")

# ===========================================================================
# STEP 5 - Write indexes
# ===========================================================================
print("\n  Writing indexes ...")

TYPE_ORDER = {"university":0,"traditional university":0,"university-of-technology":1,
              "university of technology":1,"comprehensive university":2,
              "tvet-college":3,"tvet college":3,"private-college":4,"seta":5}
index_rows.sort(key=lambda r:(TYPE_ORDER.get((r.get("institution_type") or "").lower(),9),
                               r.get("province") or "zz", r.get("name") or ""))

by_type = defaultdict(int)
for r in index_rows:
    by_type[r.get("institution_type") or "unknown"] += 1

with open(OUT_M/"index.json","w",encoding="utf-8") as f:
    json.dump({
        "generated_at": datetime.datetime.utcnow().isoformat()+"Z",
        "total_institutions": len(index_rows),
        "by_type": dict(sorted(by_type.items())),
        "institutions": index_rows,
    }, f, indent=2, ensure_ascii=False)
log(f"index.json: {len(index_rows)} institutions")

prog_index, fac_index = [], []
for row in index_rows:
    rp = OUT_MI / Path(row["rich_file"]).name
    rd = load_json(rp) or {}
    for p in rd.get("programmes",[]):
        prog_index.append({
            "institution_id":   row["institution_id"],
            "institution_name": row["name"],
            "institution_type": row["institution_type"],
            "province":         row["province"],
            "city":             row["city"],
            **{k:p.get(k) for k in ["name","normalized_name","qualification_type",
                                     "nqf_level","faculty_name","min_aps","duration","career_outcomes"]},
            "rich_file": row["rich_file"],
        })
    for fa in rd.get("faculties",[]):
        fac_index.append({
            "institution_id":   row["institution_id"],
            "institution_name": row["name"],
            "province":         row["province"],
            "faculty_name":     fa.get("name"),
            "overview":         fa.get("overview"),
        })

with open(OUT_M/"index.programmes.json","w",encoding="utf-8") as f:
    json.dump({"total":len(prog_index),"programmes":prog_index},f,indent=2,ensure_ascii=False)
log(f"index.programmes.json: {len(prog_index)}")

with open(OUT_M/"index.faculties.json","w",encoding="utf-8") as f:
    json.dump({"total":len(fac_index),"faculties":fac_index},f,indent=2,ensure_ascii=False)
log(f"index.faculties.json: {len(fac_index)}")

# ===========================================================================
# STEP 6 - Coverage report
# ===========================================================================
print("\n  Coverage report ...")
unis  = [r for r in index_rows if "university" in (r.get("institution_type") or "").lower()]
tvets = [r for r in index_rows if "tvet"       in (r.get("institution_type") or "").lower()]
setas = [r for r in index_rows if "seta"       in (r.get("institution_type") or "").lower()]

print(f"\n  Total institutions  : {len(index_rows)}")
print(f"  Universities        : {len(unis)}")
print(f"  TVET Colleges       : {len(tvets)}")
print(f"  SETAs               : {len(setas)}")
print(f"  Other               : {len(index_rows)-len(unis)-len(tvets)-len(setas)}")
print(f"\n  Universities with programmes  : {sum(1 for r in unis if r['programmes_count']>0)}/{len(unis)}")
print(f"  TVET with programmes          : {sum(1 for r in tvets if r['programmes_count']>0)}/{len(tvets)}")
print(f"  With APS rules                : {sum(1 for r in index_rows if r['aps_rules_count']>0)}")
print(f"  With campuses                 : {sum(1 for r in index_rows if r['campuses_count']>0)}")
print(f"  With rich profile             : {sum(1 for r in index_rows if r['has_profile'])}")
print(f"\n  Total programmes index : {len(prog_index)}")
print(f"  Total faculties index  : {len(fac_index)}")

print("\n  Top 10 by programme count:")
for r in sorted(index_rows,key=lambda x:x["programmes_count"],reverse=True)[:10]:
    print(f"    [{r['institution_id']:>4}] {r['name']:<52} {r['programmes_count']:>5} progs")

gaps = [r for r in unis if r["programmes_count"]==0]
if gaps:
    print(f"\n  Universities missing programmes ({len(gaps)}):")
    for r in gaps:
        print(f"    [{r['institution_id']:>4}] {r['name']}")

print(f"\nDone!")
print(f"  Concatenated -> {OUT_C}")
print(f"  Merged       -> {OUT_M}")
