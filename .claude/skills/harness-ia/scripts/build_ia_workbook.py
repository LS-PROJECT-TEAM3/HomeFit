#!/usr/bin/env python3
"""화면 정의 JSON을 IA / 메뉴구조도 / 화면목록 엑셀로 변환한다.

사용법: python build_ia_workbook.py screens.json output.xlsx
입력 형식: assets/example_screens.json 참고
  - path: ["메인", 1Depth, 2Depth, 3Depth] (최대 4개, 마지막 항목이 화면명)
  - no:   [1Depth 번호, 2Depth 번호, 3Depth 번호]
  - menu_entry: true 이면 메뉴구조도에 포함
"""
import json
import sys
from collections import Counter

from openpyxl import Workbook
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation

TYPE_CODES = [("페이지", "PG"), ("팝업", "PU"), ("탭", "TB"), ("링크", "LK"), ("모달", "MD")]
STATUS_COLORS = {"신규": "C6EFCE", "변경": "FFEB9C", "삭제": "FFC7CE", "유지": "FFFFFF"}
LISTS = {
    "형태": [t for t, _ in TYPE_CODES],
    "로그인": ["필요", "불필요"],
    "개발 구분": ["개발", "콘텐츠", "외부연동"],
    "우선순위": ["MVP", "2차", "보류"],
    "상태": list(STATUS_COLORS),
}

FONT = "Arial"
HEAD_FILL = PatternFill("solid", fgColor="1F3864")
INPUT_FILL = PatternFill("solid", fgColor="FFF9E5")
THIN = Side(style="thin", color="BFBFBF")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)


def header(ws, row, titles, widths):
    for i, (t, w) in enumerate(zip(titles, widths), start=1):
        c = ws.cell(row=row, column=i, value=t)
        c.font = Font(name=FONT, bold=True, color="FFFFFF")
        c.fill = HEAD_FILL
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = BORDER
        ws.column_dimensions[c.column_letter].width = w


def style_body(ws, first_row, last_row, ncols):
    for r in range(first_row, last_row + 1):
        for col in range(1, ncols + 1):
            c = ws.cell(row=r, column=col)
            c.font = Font(name=FONT, size=10, bold=c.font.bold)
            c.border = BORDER
            c.alignment = Alignment(vertical="center")


def python_id(s):
    code = dict(TYPE_CODES).get(s.get("type", ""), "??")
    no = (list(s.get("no", [])) + [0, 0, 0])[:3]
    return f"{s['menu_code']}_{no[0]:02d}{no[1]:02d}{no[2]:02d}_{code}"


def check(screens):
    warnings = []
    for key, label in ((python_id, "화면 ID"), (lambda s: " > ".join(s["path"]), "화면 경로")):
        counts = Counter(key(s) for s in screens)
        warnings += [f"{label} 중복: {k} ({n}회)" for k, n in counts.items() if n > 1]
    for s in screens:
        if len(s["path"]) > 4:
            warnings.append(f"3 Depth 초과: {' > '.join(s['path'])}")
        if s.get("type") not in dict(TYPE_CODES):
            warnings.append(f"알 수 없는 형태 '{s.get('type')}': {s['path'][-1]}")
    return warnings


def build(data, out):
    screens = data["screens"]
    wb = Workbook()

    # 작성가이드
    g = wb.active
    g.title = "작성가이드"
    g["A1"] = f"{data.get('project', '')} 정보구조 문서"
    g["A1"].font = Font(name=FONT, bold=True, size=14)
    g["A2"] = "노란 셀만 수정하세요. 화면 ID·형태 코드·중복 검사·화면목록은 수식으로 자동 계산됩니다."
    g["A2"].font = Font(name=FONT, size=10, color="7F7F7F")
    header(g, 4, ["형태", "코드"], [14, 10])
    for i, (t, code) in enumerate(TYPE_CODES, start=5):
        g.cell(row=i, column=1, value=t)
        g.cell(row=i, column=2, value=code)
    type_last = 4 + len(TYPE_CODES)
    style_body(g, 5, type_last, 2)
    r = type_last + 2
    g.cell(row=r, column=1, value="화면 ID 규칙").font = Font(name=FONT, bold=True)
    rules = [
        "[메뉴약자 2자]_[1D 2자리][2D 2자리][3D 2자리]_[형태 코드]  예) MY_010200_PU",
        "ID는 중복 금지. 변경·삭제된 화면의 ID는 재사용하지 않고 다음 빈 번호를 사용",
        "공유가 끝난 ID는 '값으로 붙여넣기'로 고정해 두면 번호 수정 시 바뀌지 않음",
        "상태 색상: 신규=초록, 변경=노랑, 삭제=빨강",
    ]
    for i, t in enumerate(rules, start=r + 1):
        g.cell(row=i, column=1, value=t).font = Font(name=FONT, size=10)
    g.column_dimensions["A"].width = 14

    # IA
    ia = wb.create_sheet("IA")
    cols = ["화면 ID", "메뉴약자", "1D 번호", "2D 번호", "3D 번호", "형태 코드",
            "0 Depth", "1 Depth", "2 Depth", "3 Depth", "화면명", "형태", "로그인",
            "개발 구분", "우선순위", "상태", "URL", "비고", "검사"]
    widths = [16, 9, 8, 8, 8, 9, 10, 14, 16, 16, 18, 9, 8, 10, 9, 8, 22, 30, 7]
    header(ia, 1, cols, widths)
    type_range = f"작성가이드!$A$5:$B${type_last}"
    for i, s in enumerate(screens, start=2):
        no = (list(s.get("no", [])) + [0, 0, 0])[:3]
        path = (s["path"] + ["", "", "", ""])[:4]
        values = [
            f'=CONCATENATE(B{i},"_",TEXT(C{i},"00"),TEXT(D{i},"00"),TEXT(E{i},"00"),"_",F{i})',
            s["menu_code"], no[0], no[1], no[2],
            f'=IFERROR(VLOOKUP(L{i},{type_range},2,FALSE),"??")',
            *path, s.get("name", s["path"][-1]), s.get("type", ""), s.get("login", ""),
            s.get("dev", ""), s.get("priority", ""), s.get("status", ""),
            s.get("url", ""), s.get("note", ""),
            f'=IF(COUNTIF($A:$A,A{i})>1,"중복","")',
        ]
        for col, v in enumerate(values, start=1):
            ia.cell(row=i, column=col, value=v)
    last = len(screens) + 1
    style_body(ia, 2, last, len(cols))
    for r in range(2, last + 1):
        ia.cell(row=r, column=1).font = Font(name=FONT, size=10, bold=True)
        for col in list(range(2, 6)) + list(range(7, 19)):
            ia.cell(row=r, column=col).fill = INPUT_FILL
    for name, letter in (("형태", "L"), ("로그인", "M"), ("개발 구분", "N"), ("우선순위", "O"), ("상태", "P")):
        dv = DataValidation(type="list", formula1='"' + ",".join(LISTS[name]) + '"', allow_blank=True)
        ia.add_data_validation(dv)
        dv.add(f"{letter}2:{letter}{last + 200}")
    for status, color in STATUS_COLORS.items():
        if color != "FFFFFF":
            ia.conditional_formatting.add(
                f"A2:R{last + 200}",
                FormulaRule(formula=[f'$P2="{status}"'], fill=PatternFill("solid", fgColor=color)))
    ia.conditional_formatting.add(
        f"S2:S{last + 200}", FormulaRule(formula=['S2="중복"'], font=Font(color="C00000", bold=True)))
    ia.freeze_panes = "B2"
    ia.auto_filter.ref = f"A1:S{last}"

    # 메뉴구조도
    mn = wb.create_sheet("메뉴구조도")
    header(mn, 1, ["0 Depth", "1 Depth", "2 Depth", "3 Depth", "상태"], [12, 16, 20, 20, 8])
    menu = [s for s in screens if s.get("menu_entry") and len(s["path"]) <= 4]
    for i, s in enumerate(menu, start=2):
        depth = len(s["path"]) - 1
        mn.cell(row=i, column=depth + 1, value=s["path"][-1])
        mn.cell(row=i, column=5, value=s.get("status", ""))
        if depth <= 1:
            mn.cell(row=i, column=depth + 1).font = Font(name=FONT, bold=True)
    style_body(mn, 2, len(menu) + 1, 5)
    for status, color in STATUS_COLORS.items():
        if color != "FFFFFF":
            mn.conditional_formatting.add(
                f"A2:E{len(menu) + 1}",
                FormulaRule(formula=[f'$E2="{status}"'], fill=PatternFill("solid", fgColor=color)))
    mn.cell(row=len(menu) + 3, column=1,
            value="메뉴·서비스 진입점까지만 표시 (최종 단계 화면은 IA 시트 참고)").font = Font(name=FONT, size=9, color="7F7F7F")

    # 화면목록
    sl = wb.create_sheet("화면목록")
    header(sl, 1, ["No", "화면 ID", "화면명", "Location", "형태", "구현 상태"], [6, 16, 20, 44, 9, 10])
    for i, s in enumerate(screens, start=2):
        sl.cell(row=i, column=1, value=i - 1)
        sl.cell(row=i, column=2, value=f"=IA!A{i}")
        sl.cell(row=i, column=3, value=f"=IA!K{i}")
        sl.cell(row=i, column=4, value=" > ".join(s["path"]))
        sl.cell(row=i, column=5, value=f"=IA!L{i}")
        sl.cell(row=i, column=6, value="대기")
    style_body(sl, 2, last, 6)
    for r in range(2, last + 1):
        sl.cell(row=r, column=6).fill = INPUT_FILL
    dv = DataValidation(type="list", formula1='"대기,진행,완료"', allow_blank=True)
    sl.add_data_validation(dv)
    dv.add(f"F2:F{last + 200}")
    sl.freeze_panes = "C2"

    wb.save(out)


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    with open(sys.argv[1], encoding="utf-8") as f:
        data = json.load(f)
    warnings = check(data["screens"])
    build(data, sys.argv[2])
    print(f"생성 완료: {sys.argv[2]} (화면 {len(data['screens'])}개)")
    for w in warnings:
        print("경고:", w)


if __name__ == "__main__":
    main()
