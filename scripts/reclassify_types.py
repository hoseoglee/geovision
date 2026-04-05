#!/usr/bin/env python3
"""CCTV type 재분류 — 이름 기반"""
import re

with open('src/data/publicCCTVs.ts', 'r') as f:
    content = f.read()

# 이름 패턴 → type 매핑
LANDMARK_PATTERNS = [
    r'tower', r'bridge', r'palace', r'castle', r'cathedral', r'church',
    r'monument', r'statue', r'temple', r'shrine', r'museum', r'opera',
    r'square', r'plaza', r'piazza', r'platz', r'gate', r'wall',
    r'eiffel', r'colosseum', r'acropolis', r'kremlin', r'big ben',
    r'sagrada', r'parthenon', r'stonehenge', r'taj mahal',
    r'pyramid', r'sphinx', r'burj', r'obelisk',
]

TRAFFIC_PATTERNS = [
    r'traffic', r'highway', r'freeway', r'motorway', r'intersection',
    r'road', r'street\s+cam', r'roundabout', r'tunnel', r'autobahn',
    r'expressway', r'toll', r'beltway',
]

PORT_PATTERNS = [
    r'port\b', r'harbor', r'harbour', r'marina', r'dock', r'wharf',
    r'pier\b', r'cruise', r'ferry', r'shipyard', r'canal lock',
]

CITY_PATTERNS = [
    r'skyline', r'downtown', r'city\s*(view|cam|centre|center)',
    r'panorama', r'aerial', r'rooftop', r'observation',
    r'live\s*stream.*city', r'city\s*live',
]

BEACH_PATTERNS = [
    r'beach', r'playa', r'surf', r'coast', r'shore', r'seaside',
    r'praia', r'strand', r'spiaggia',
]

changes = 0
lines = content.split('\n')
result_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    # Look for type: 'webcam' lines
    if "type: 'webcam'" in line:
        # Search backwards for name
        name = ''
        for j in range(max(0, i-7), i):
            m = re.search(r"name:\s*'([^']+)'", lines[j])
            if m:
                name = m.group(1).lower()
                break

        new_type = 'webcam'
        if any(re.search(p, name) for p in LANDMARK_PATTERNS):
            new_type = 'landmark'
        elif any(re.search(p, name) for p in TRAFFIC_PATTERNS):
            new_type = 'traffic'
        elif any(re.search(p, name) for p in PORT_PATTERNS):
            new_type = 'port'
        elif any(re.search(p, name) for p in CITY_PATTERNS):
            new_type = 'city'
        elif any(re.search(p, name) for p in BEACH_PATTERNS):
            new_type = 'city'  # beach → city category

        if new_type != 'webcam':
            line = line.replace("type: 'webcam'", f"type: '{new_type}'")
            changes += 1

    result_lines.append(line)
    i += 1

with open('src/data/publicCCTVs.ts', 'w') as f:
    f.write('\n'.join(result_lines))

print(f"Reclassified {changes} cameras from 'webcam' to specific types")
