#!/usr/bin/env python3
"""檢查 data/ 下的行程檔。新增或修改行程後必須執行：python3 tools/validate.py"""
import json, re, sys, pathlib
from urllib.parse import urlparse
root = pathlib.Path(__file__).resolve().parent.parent / "data"
err = []
bare = lambda u: urlparse(str(u)).path in ("", "/")   # 只有網域首頁，沒有具體頁面
load = lambda p: json.loads(p.read_text(encoding="utf-8"))
trips = load(root / "trips.json")
reg = {t["id"] for t in trips}
files = {p.stem for p in root.glob("*.json") if p.name != "trips.json"}
for i in reg - files: err.append(f"trips.json 登記了 {i}，但找不到 data/{i}.json")
for i in files - reg: err.append(f"data/{i}.json 沒有登記在 trips.json")
TYPES = {"transport", "food", "sight", "stay", "tips"}
STAT = {"verified", "community", "tbd"}
for t in trips:
    for k in ("id", "title", "city", "days", "summary", "updated"):
        if k not in t: err.append(f"trips.json 的 {t.get('id')} 缺少 {k}")
for i in sorted(files):
    d = load(root / f"{i}.json")
    if d.get("id") != i or not re.fullmatch(r"[a-z0-9-]+", i): err.append(f"{i}：id 必須等於檔名且只含小寫英數與連字號")
    for k in ("title", "city", "currency", "units_per_twd", "updated", "summary", "days"):
        if k not in d: err.append(f"{i}：缺少 {k}")
    if not re.fullmatch(r"\d{4}-\d\d-\d\d", str(d.get("updated"))): err.append(f"{i}：updated 格式必須是 YYYY-MM-DD")
    if any(t["id"] == i and t.get("days") != len(d.get("days", [])) for t in trips): err.append(f"{i}：trips.json 的 days 與實際天數不符")
    seen = set()
    for day in d.get("days", []):
        for it in day.get("items", []):
            for k in ("id", "time", "name", "type", "cost", "note", "source", "status"):
                if k not in it: err.append(f"{i}/{it.get('id')}：缺少 {k}")
            iid = it.get("id", "")
            if not re.fullmatch(r"d\d+-\d\d", iid) or iid in seen: err.append(f"{i}：項目 id 格式錯誤或重複：{iid}")
            seen.add(iid)
            if it.get("type") not in TYPES: err.append(f"{i}/{iid}：type 不合法")
            if it.get("status") not in STAT: err.append(f"{i}/{iid}：status 不合法")
            c = it.get("cost")
            if c is not None and (isinstance(c, bool) or not isinstance(c, (int, float)) or c <= 0):
                err.append(f"{i}/{iid}：cost 必須是大於 0 的數字，沒有費用請填 null")
            if it.get("status") == "verified" and (not str(it.get("source", "")).startswith("http") or bare(it.get("source"))):
                err.append(f"{i}/{iid}：verified 必須附能找到該內容的具體官方頁面網址，不可只放網站首頁")
    cids = [c.get("id") for c in d.get("checklist", [])]
    if len(cids) != len(set(cids)) or any(not re.fullmatch(r"c\d\d", str(x)) for x in cids): err.append(f"{i}：checklist 的 id 必須是 c01 格式且不重複")
    gids = [g.get("id") for g in d.get("guides", [])]
    if len(gids) != len(set(gids)) or any(not re.fullmatch(r"g\d\d", str(x)) for x in gids): err.append(f"{i}：guides 的 id 必須是 g01 格式且不重複")
    for g in d.get("guides", []):
        if g.get("status") not in STAT or not g.get("points"): err.append(f"{i}/{g.get('id')}：guides 需要合法 status 與至少一個 points")
        if g.get("status") == "verified" and (not str(g.get("source", "")).startswith("http") or bare(g.get("source"))): err.append(f"{i}/{g.get('id')}：verified 必須附具體官方頁面網址，不可只放網站首頁")
print("\n".join(err) if err else f"通過：{len(files)} 個行程檔格式正確")
sys.exit(1 if err else 0)
