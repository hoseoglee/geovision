#!/usr/bin/env python3
"""중복 좌표를 약간 분산 + 부호 오류 수정"""
import re
from collections import Counter

with open('src/data/publicCCTVs.ts', 'r') as f:
    content = f.read()

# Find all lat/lng values and their line positions
pattern = re.compile(r"(lat:\s*)([-\d.]+)(,\s*\n\s*lng:\s*)([-\d.]+)")
matches = list(pattern.finditer(content))

# Group by coordinate
coord_positions = {}
for m in matches:
    lat, lng = float(m.group(2)), float(m.group(4))
    key = (lat, lng)
    if key not in coord_positions:
        coord_positions[key] = []
    coord_positions[key].append(m)

# Fix duplicates: spread cameras in a small circle around the point
import math
fixes = []
for (lat, lng), group in coord_positions.items():
    if len(group) <= 3:
        continue
    # Spread in a circle, radius ~0.002 degrees (~200m)
    radius = 0.002
    for i, m in enumerate(group):
        if i == 0:
            continue  # Keep first one at original position
        angle = (2 * math.pi * i) / len(group)
        new_lat = round(lat + radius * math.sin(angle), 6)
        new_lng = round(lng + radius * math.cos(angle), 6)
        fixes.append((m.start(), m.end(), m.group(1) + str(new_lat) + m.group(3) + str(new_lng)))

# Apply fixes in reverse order (to preserve positions)
fixes.sort(key=lambda x: x[0], reverse=True)
for start, end, replacement in fixes:
    content = content[:start] + replacement + content[end:]

with open('src/data/publicCCTVs.ts', 'w') as f:
    f.write(content)

print(f"Fixed {len(fixes)} duplicate coordinate entries")
