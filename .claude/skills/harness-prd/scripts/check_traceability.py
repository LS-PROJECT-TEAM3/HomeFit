#!/usr/bin/env python3
"""PRD와 IA(정보구조도)·사용자 여정 사이의 추적성을 검사한다.

사용법:
  python check_traceability.py PRD.md --ia IA파일 [--journey 여정파일 ...]
  python check_traceability.py PRD.md IA파일            (이전 형식, IA만)
  IA파일:   screens.json | IA 엑셀(.xlsx, 'IA' 시트) | INFORMATION_ARCHITECTURE.md
  여정파일: 여정 지도 JSON(build_journey_map.py 입력 형식) | 여정/CUJ 마크다운

IA 검사
  [오류] PRD가 IA에 없는 화면 ID를 참조
  [경고] 요구사항(Must/Should)이 하나도 없는 MVP 화면
  [경고] '보류'·'삭제' 화면이 Won't 외의 요구사항에 등장
  [경고] 수용 기준이 비어 있는 Must 요구사항
  [참고] 화면 ID가 없는 요구사항, Must 요구사항에 걸린 '2차' 화면
여정 검사
  [경고] Must 요구사항이 없는 MOT 단계
  [경고] PRD에 흔적(화면 ID·단계 이름)이 없는 페인포인트 단계
  [경고] PRD에 등장하지 않는 CUJ ID
  [경고] IA에 없는 여정 화면 ID / IA에서 '2차'·'보류'인 MOT 화면 (--ia 함께 줄 때)
  [참고] PRD에 반영되지 않은 여정 지표, 화면 ID 없는 MOT
종료 코드: 오류가 있으면 1
"""
import json
import re
import sys
from pathlib import Path

ID_RE = re.compile(r"\b[A-Z]{2}_\d{6}_[A-Z]{2}\b")
TYPE_CODES = {"페이지": "PG", "팝업": "PU", "탭": "TB", "링크": "LK", "모달": "MD"}
PRIORITIES = ("must", "should", "could", "won't", "wont")


def make_id(menu, nos, type_name):
    nos = [int(n or 0) for n in (list(nos) + [0, 0, 0])[:3]]
    return f"{menu}_{nos[0]:02d}{nos[1]:02d}{nos[2]:02d}_{TYPE_CODES.get(type_name, '??')}"


def cells(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def col_index(header, *keys):
    for i, h in enumerate(header):
        if any(k in h for k in keys):
            return i
    return None


def load_ia(path):
    """{화면 ID: {'priority':..., 'status':..., 'name':...}}"""
    p = Path(path)
    screens = {}
    if p.suffix == ".json":
        for s in json.loads(p.read_text(encoding="utf-8"))["screens"]:
            sid = make_id(s["menu_code"], s.get("no", []), s.get("type", ""))
            screens[sid] = {"priority": s.get("priority", ""), "status": s.get("status", ""),
                            "name": s.get("name", s["path"][-1])}
    elif p.suffix == ".xlsx":
        from openpyxl import load_workbook
        ws = load_workbook(p, data_only=True)["IA"]
        rows = list(ws.iter_rows(values_only=True))
        h = [str(c or "") for c in rows[0]]
        ix = {k: col_index(h, k) for k in ("화면 ID", "메뉴약자", "1D", "2D", "3D", "화면명", "형태", "우선순위", "상태")}
        ix["형태"] = next(i for i, c in enumerate(h) if c == "형태")
        for r in rows[1:]:
            if not any(r):
                continue
            sid = r[ix["화면 ID"]]
            if not sid or not ID_RE.fullmatch(str(sid)):  # 수식 캐시가 없으면 직접 계산
                sid = make_id(r[ix["메뉴약자"]], [r[ix["1D"]], r[ix["2D"]], r[ix["3D"]]], r[ix["형태"]])
            screens[sid] = {"priority": r[ix["우선순위"]] or "", "status": r[ix["상태"]] or "",
                            "name": r[ix["화면명"]] or ""}
    else:
        header = None
        for line in p.read_text(encoding="utf-8").splitlines():
            if not line.strip().startswith("|"):
                header = None
                continue
            c = cells(line)
            if header is None:
                header = c
                continue
            m = ID_RE.search(c[0]) if c else None
            if m:
                pi, si, ni = col_index(header, "우선순위"), col_index(header, "상태"), col_index(header, "화면명")
                get = lambda i: c[i] if i is not None and i < len(c) else ""
                screens[m.group()] = {"priority": get(pi), "status": get(si), "name": get(ni)}
    return screens


def parse_prd(path):
    text = Path(path).read_text(encoding="utf-8")
    refs = set(ID_RE.findall(text))
    frs, header = [], None
    for line in text.splitlines():
        if not line.strip().startswith("|"):
            header = None
            continue
        c = cells(line)
        if header is None:
            header = c
            continue
        if c and re.match(r"FR-\d+", c[0]):
            pi = col_index(header, "우선순위")
            ai = col_index(header, "수용")
            pr = c[pi].lower() if pi is not None and pi < len(c) else ""
            if not pr.startswith(PRIORITIES):
                pr = next((x.lower() for x in c if x.lower().startswith(PRIORITIES)), "")
            frs.append({
                "id": c[0], "ids": set(ID_RE.findall(line)),
                "priority": pr.replace("wont", "won't"),
                "accept": c[ai] if ai is not None and ai < len(c) else "",
            })
    return refs, frs


CUJ_RE = re.compile(r"\bCUJ-\d+\b")


def load_journey(path):
    """[{'name','screen_id','mot','pain','metric'}], {CUJ ID}"""
    p = Path(path)
    stages, cuj_ids = [], set()
    if p.suffix == ".json":
        d = json.loads(p.read_text(encoding="utf-8"))
        if d.get("id"):
            cuj_ids.add(d["id"])
        for s in d.get("stages", []):
            stages.append({"name": s.get("name", ""), "screen_id": s.get("screen_id", ""),
                           "mot": bool(s.get("mot")), "pain": s.get("pain", ""),
                           "metric": s.get("metric", "")})
        return stages, cuj_ids
    text = p.read_text(encoding="utf-8")
    cuj_ids |= set(CUJ_RE.findall(text))
    header = None
    for line in text.splitlines():
        if not line.strip().startswith("|"):
            header = None
            continue
        c = cells(line)
        if header is None:
            header = c
            continue
        if set("".join(c)) <= set("-: "):
            continue
        get = lambda *k: (lambda i: c[i] if i is not None and i < len(c) else "")(col_index(header, *k))
        ids = ID_RE.findall(line)
        mot_cell = get("MOT").strip()
        name = get("과업", "단계", "화면명") or (c[1] if len(c) > 1 else "")
        if ids or mot_cell:
            stages.append({"name": name, "screen_id": ids[0] if ids else "",
                           "mot": mot_cell not in ("", "-", "—", "X", "x", "N"),
                           "pain": get("페인"), "metric": get("지표")})
    return stages, cuj_ids


def main():
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print(__doc__)
        sys.exit(2)
    prd_path, ia_path, journeys = args[0], None, []
    rest = args[1:]
    i = 0
    while i < len(rest):
        if rest[i] == "--ia" and i + 1 < len(rest):
            ia_path = rest[i + 1]; i += 2
        elif rest[i] == "--journey" and i + 1 < len(rest):
            journeys.append(rest[i + 1]); i += 2
        elif ia_path is None and not rest[i].startswith("--"):
            ia_path = rest[i]; i += 1
        else:
            print(f"알 수 없는 인자: {rest[i]}\n{__doc__}")
            sys.exit(2)
    if not ia_path and not journeys:
        print("--ia 또는 --journey 중 하나는 필요합니다.\n" + __doc__)
        sys.exit(2)

    prd_text = Path(prd_path).read_text(encoding="utf-8")
    refs, frs = parse_prd(prd_path)
    ia = load_ia(ia_path) if ia_path else {}
    errors, warns, notes = [], [], []

    def level(f):
        return f["priority"].split(" ")[0] if f["priority"] else ""

    if ia_path:
        for sid in sorted(refs - set(ia)):
            errors.append(f"IA에 없는 화면 ID 참조: {sid}")
        active = {"must", "should", "could"}
        covered = {sid for f in frs if f["priority"].startswith(("must", "should")) for sid in f["ids"]}
        for sid, s in ia.items():
            if str(s["priority"]).upper() == "MVP" and s["status"] != "삭제" and sid not in covered:
                warns.append(f"Must/Should 요구사항이 없는 MVP 화면: {sid} {s['name']}")
        for f in frs:
            for sid in f["ids"] & set(ia):
                s = ia[sid]
                if level(f) in active and (s["priority"] == "보류" or s["status"] == "삭제"):
                    warns.append(f"{f['id']}({level(f)})가 '{s['priority'] or s['status']}' 화면을 참조: {sid}")
                if level(f) == "must" and s["priority"] == "2차":
                    notes.append(f"{f['id']}(Must)가 IA상 '2차' 화면을 참조: {sid} — IA 우선순위 확인")

    for f in frs:
        if level(f) == "must" and not re.sub(r"[-\s`—]", "", f["accept"]):
            warns.append(f"수용 기준이 비어 있는 Must 요구사항: {f['id']}")
        if not f["ids"]:
            notes.append(f"화면 ID가 없는 요구사항: {f['id']} (화면 없는 기능이면 정상)")
        if not level(f):
            warns.append(f"우선순위(MoSCoW)를 읽을 수 없는 요구사항: {f['id']}")

    must_ids = {sid for f in frs if level(f) == "must" for sid in f["ids"]}
    n_stages = 0
    for jp in journeys:
        stages, cuj_ids = load_journey(jp)
        n_stages += len(stages)
        tag = Path(jp).name
        for cid in sorted(cuj_ids):
            if cid not in prd_text:
                warns.append(f"[{tag}] PRD에 없는 CUJ: {cid}")
        for s in stages:
            sid, name = s["screen_id"], s["name"]
            label = f"{name} ({sid})" if sid else name
            if ia_path and sid and sid not in ia:
                warns.append(f"[{tag}] IA에 없는 여정 화면 ID: {label} — 여정과 IA 중 최신본 확인")
            if s["mot"]:
                if not sid:
                    notes.append(f"[{tag}] 화면 ID 없는 MOT: {name} — PRD에서 직접 확인")
                elif sid not in must_ids:
                    warns.append(f"[{tag}] Must 요구사항이 없는 MOT: {label}")
                if ia_path and sid in ia and ia[sid]["priority"] in ("2차", "보류"):
                    warns.append(f"[{tag}] MOT 화면이 IA에서 '{ia[sid]['priority']}': {label} — 범위 충돌")
            if s["pain"] and not ((sid and sid in refs) or (name and name in prd_text)):
                warns.append(f"[{tag}] PRD에서 처리되지 않은 페인포인트: {label} — 요구사항·이후 범위·하지 않을 것·가정 중 하나로")
            for m in re.split(r"[,/·]", s["metric"] or ""):
                m = m.strip()
                if m and m not in prd_text:
                    notes.append(f"[{tag}] PRD에 없는 여정 지표: '{m}' ({name}) — KPI나 수용 기준에 필요한지 확인")

    summary = f"PRD 요구사항 {len(frs)}개 / 참조 화면 ID {len(refs)}개"
    if ia_path:
        summary = f"IA 화면 {len(ia)}개 / " + summary
    if journeys:
        summary += f" / 여정 단계 {n_stages}개"
    print(summary)
    for tag, items in (("오류", errors), ("경고", warns), ("참고", notes)):
        for item in items:
            print(f"[{tag}] {item}")
    if not (errors or warns):
        print("추적성 검사 통과")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
