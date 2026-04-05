#!/usr/bin/env python3
"""CCTV heading/tilt 추정"""
import re

with open('src/data/publicCCTVs.ts', 'r') as f:
    lines = f.readlines()

DIRECTION_MAP = {
    r'\bnorth\b|\bnord\b': 0,
    r'\beast\b|\best\b|\bost\b': 90,
    r'\bsouth\b|\bsud\b': 180,
    r'\bwest\b|\bouest\b': 270,
    r'\bnortheast\b|\bNE\b': 45,
    r'\bsoutheast\b|\bSE\b': 135,
    r'\bsouthwest\b|\bSW\b': 225,
    r'\bnorthwest\b|\bNW\b': 315,
}

changes = 0
result = []
i = 0
while i < len(lines):
    line = lines[i]
    result.append(line)

    # source 라인 뒤에 heading이 없으면 추가 시도
    if "source: 'youtube'" in line and i > 3:
        # Check if next line already has heading
        next_line = lines[i+1] if i+1 < len(lines) else ''
        if 'heading:' in next_line:
            i += 1
            continue

        # Look back for name
        name = ''
        for j in range(max(0, i-7), i):
            m = re.search(r"name:\s*'([^']*)'", lines[j])
            if m:
                name = m.group(1)
                break

        name_lower = name.lower()
        heading = None
        tilt = None

        # Direction keywords
        for pattern, h in DIRECTION_MAP.items():
            if re.search(pattern, name_lower):
                heading = h
                break

        # Beach/coast → 180 (seaward)
        if heading is None and re.search(r'beach|playa|surf|coast|shore|praia|strand|spiaggia|seaside', name_lower):
            heading = 180
            tilt = -5

        # Bridge/river → 90
        if heading is None and re.search(r'bridge|river|canal|pont\b', name_lower):
            heading = 90
            tilt = -10

        # Skyline/panorama → add tilt only
        if re.search(r'skyline|panorama|aerial|rooftop|observation|tower|overview', name_lower):
            tilt = -15
            if heading is None:
                heading = 0  # default north for panoramic views

        # Traffic → 0 (forward-facing default)
        if heading is None and re.search(r'traffic|highway|road|street|intersection', name_lower):
            heading = 0
            tilt = -20

        if heading is not None:
            indent = '    '
            heading_line = f"{indent}heading: {heading},\n"
            result.append(heading_line)
            if tilt is not None:
                result.append(f"{indent}tilt: {tilt},\n")
            changes += 1

    i += 1

with open('src/data/publicCCTVs.ts', 'w') as f:
    f.writelines(result)

print(f"Added heading to {changes} cameras")
