#!/usr/bin/env python3
"""여정 JSON을 한 장짜리 HTML 여정 지도로 변환한다 (고객 여정 지도 / CUJ 공용).

사용법: python build_journey_map.py journey.json journey_map.html
입력 형식: assets/example_journey.json 참고
  - mode: "map" (고객 여정 지도) 또는 "cuj"
  - stages[].emotion: -2(매우 부정) ~ +2(매우 긍정) 정수
  - stages[].mot: true 이면 Moment of Truth로 강조
값이 하나도 없는 행은 자동으로 숨긴다.
"""
import json
import sys
from html import escape

COL_W = 190   # 단계 열 너비(px)
LABEL_W = 130
CURVE_H = 150

ROWS = [  # (키, 라벨) — 위에서 아래 순서
    ("action", "행동"),
    ("touchpoint", "터치포인트"),
    ("actor", "상호작용 주체"),
    ("thought", "생각·감정"),
    ("__curve__", "감정 곡선"),
    ("as_is", "As-Is"),
    ("pain", "페인포인트"),
    ("insight", "인사이트"),
    ("opportunity", "기회·개선안"),
    ("metric", "지표"),
    ("screen_id", "화면 ID"),
]
EMOJI = {-2: "😣", -1: "😕", 0: "😐", 1: "🙂", 2: "😍"}


def e(v):
    return escape(str(v)) if v not in (None, "") else ""


def curve_svg(stages):
    n = len(stages)
    w = n * COL_W
    pad = 22

    def y(score):
        score = max(-2, min(2, int(score)))
        return pad + (2 - score) * (CURVE_H - 2 * pad) / 4

    pts = [(i * COL_W + COL_W / 2, y(s.get("emotion", 0))) for i, s in enumerate(stages)]
    path = " ".join(("M" if i == 0 else "L") + f"{x:.1f},{yy:.1f}" for i, (x, yy) in enumerate(pts))
    parts = [f'<svg width="{w}" height="{CURVE_H}" viewBox="0 0 {w} {CURVE_H}" role="img" aria-label="단계별 감정 곡선">',
             f'<line x1="0" x2="{w}" y1="{y(0):.1f}" y2="{y(0):.1f}" class="zero"/>',
             f'<path d="{path}" class="line"/>']
    for (x, yy), s in zip(pts, stages):
        score = int(s.get("emotion", 0))
        cls = "pos" if score > 0 else "neg" if score < 0 else "neu"
        parts.append(f'<circle cx="{x:.1f}" cy="{yy:.1f}" r="7" class="dot {cls}"/>')
        shown = f"{score:+d}" if score else "0"
        parts.append(f'<text x="{x:.1f}" y="{yy - 13:.1f}" class="lbl">{EMOJI.get(max(-2, min(2, score)), "")} {shown}</text>')
    parts.append("</svg>")
    return "".join(parts)


def build(data):
    stages = data["stages"]
    mode = data.get("mode", "map")
    kind = "CUJ (Critical User Journey)" if mode == "cuj" else "고객 여정 지도"
    as_is_label = data.get("as_is_label")
    rows = [(k, (f"As-Is ({as_is_label})" if k == "as_is" and as_is_label else lbl))
            for k, lbl in ROWS
            if k == "__curve__" or any(s.get(k) for s in stages)]

    meta = []
    for key, label in (("persona", "페르소나"), ("scenario", "시나리오"), ("cuj_type", "CUJ 유형"),
                       ("oec", "핵심 지표"), ("evidence", "근거")):
        if data.get(key):
            meta.append(f'<div class="meta"><span>{label}</span>{e(data[key])}</div>')

    head = "".join(
        f'<div class="stage{" mot" if s.get("mot") else ""}"><b>{i}. {e(s["name"])}</b>'
        f'{"<em>MOT</em>" if s.get("mot") else ""}</div>'
        for i, s in enumerate(stages, start=1))
    body = []
    for key, label in rows:
        body.append(f'<div class="label">{label}</div>')
        if key == "__curve__":
            body.append(f'<div class="curve" style="grid-column: span {len(stages)}">{curve_svg(stages)}</div>')
            continue
        for s in stages:
            v = s.get(key, "")
            if isinstance(v, list):
                v = "<br>".join(e(x) for x in v)
            else:
                v = e(v)
            cls = f"cell {key}" + (" mot" if s.get("mot") else "")
            body.append(f'<div class="{cls}">{v}</div>')

    insights = "".join(f"<li>{e(x)}</li>" for x in data.get("insights", []))
    goal = f'<blockquote>{e(data["goal"])}</blockquote>' if data.get("goal") else ""
    grid_cols = f"{LABEL_W}px repeat({len(stages)}, {COL_W}px)"

    return f"""<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(data.get('title', kind))}</title>
<style>
:root {{ --bg:#fbfaf7; --surface:#ffffff; --text:#1d1d1b; --muted:#6b6a65; --line:#e3e0d8;
  --accent:#2f5d50; --pos:#2e8b57; --neg:#c0392b; --neu:#9a978e; --mot:#fff4d6; --head:#eef2ef;
  color-scheme: light; box-sizing:border-box;
  padding-top:env(safe-area-inset-top,0px); padding-bottom:env(safe-area-inset-bottom,0px); }}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{
  --bg:#181816; --surface:#22221f; --text:#ecebe6; --muted:#a3a198; --line:#3a3934;
  --accent:#8cc5b2; --pos:#5fc28a; --neg:#ef7a6c; --neu:#8a887f; --mot:#3d3420; --head:#273029; color-scheme: dark; }} }}
:root[data-theme="dark"] {{ --bg:#181816; --surface:#22221f; --text:#ecebe6; --muted:#a3a198; --line:#3a3934;
  --accent:#8cc5b2; --pos:#5fc28a; --neg:#ef7a6c; --neu:#8a887f; --mot:#3d3420; --head:#273029; color-scheme: dark; }}
*, *::before, *::after {{ box-sizing: inherit; }}
body {{ margin:0; background:var(--bg); color:var(--text);
  font-family:"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif; line-height:1.5; }}
main {{ max-width:100%; padding:28px 24px 40px; }}
.kind {{ color:var(--accent); font-weight:700; font-size:13px; letter-spacing:.04em; }}
h1 {{ margin:4px 0 10px; font-size:26px; }}
blockquote {{ margin:0 0 14px; padding:10px 14px; border-left:4px solid var(--accent); background:var(--surface); max-width:900px; }}
.metas {{ display:flex; flex-wrap:wrap; gap:8px 20px; margin-bottom:18px; font-size:14px; }}
.meta span {{ color:var(--muted); margin-right:6px; }}
.scroll {{ overflow-x:auto; border:1px solid var(--line); border-radius:10px; background:var(--surface); }}
.grid {{ display:grid; grid-template-columns:{grid_cols}; font-size:13px; }}
.grid > div {{ border-bottom:1px solid var(--line); border-right:1px solid var(--line); padding:9px 10px; }}
.corner, .stage {{ background:var(--head); position:sticky; top:0; }}
.stage b {{ display:block; font-size:14px; }}
.stage em {{ font-style:normal; font-size:11px; font-weight:700; color:var(--bg); background:var(--accent); padding:1px 6px; border-radius:4px; }}
.label {{ color:var(--muted); font-weight:600; background:var(--surface); position:sticky; left:0; z-index:1; }}
.cell.mot, .stage.mot {{ background:var(--mot); }}
.cell.pain {{ color:var(--neg); }}
.cell.opportunity {{ color:var(--accent); font-weight:600; }}
.cell.thought {{ font-style:italic; }}
.cell.screen_id {{ font-family:ui-monospace,Menlo,monospace; font-size:12px; }}
.curve {{ padding:0 !important; }}
svg .zero {{ stroke:var(--line); stroke-dasharray:4 4; }}
svg .line {{ fill:none; stroke:var(--accent); stroke-width:2.5; }}
svg .dot {{ stroke:var(--surface); stroke-width:2; }}
svg .pos {{ fill:var(--pos); }} svg .neg {{ fill:var(--neg); }} svg .neu {{ fill:var(--neu); }}
svg .lbl {{ fill:var(--text); font-size:12px; text-anchor:middle; }}
h2 {{ font-size:17px; margin:26px 0 8px; }}
ul {{ margin:0; padding-left:20px; max-width:900px; }}
li {{ margin:4px 0; }}
@media print {{ .scroll {{ overflow:visible; }} body {{ background:#fff; }} }}
</style></head>
<body><main>
<div class="kind">{kind}</div>
<h1>{e(data.get('title', ''))}</h1>
{goal}
<div class="metas">{''.join(meta)}</div>
<div class="scroll"><div class="grid">
<div class="corner"></div>{head}
{''.join(body)}
</div></div>
{f'<h2>핵심 발견</h2><ul>{insights}</ul>' if insights else ''}
</main></body></html>"""


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    with open(sys.argv[1], encoding="utf-8") as f:
        data = json.load(f)
    warnings = []
    if not 3 <= len(data["stages"]) <= 8:
        warnings.append(f"단계 수 {len(data['stages'])}개 — 여정 지도는 5~7개, CUJ는 4~6개를 권장")
    for s in data["stages"]:
        if "emotion" in s and not -2 <= int(s["emotion"]) <= 2:
            warnings.append(f"감정 점수 범위 초과(-2~+2): {s['name']}")
    if data.get("mode") == "cuj" and not any(s.get("mot") for s in data["stages"]):
        warnings.append("CUJ에 MOT(mot: true) 단계가 없습니다")
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        f.write(build(data))
    print(f"생성 완료: {sys.argv[2]} (단계 {len(data['stages'])}개)")
    for w in warnings:
        print("경고:", w)


if __name__ == "__main__":
    main()
