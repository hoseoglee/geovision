#!/usr/bin/env python3
"""CCTV 좌표 정밀 검증 — 이름 기반 랜드마크 좌표 매칭"""
import re, json

with open('src/data/publicCCTVs.ts', 'r') as f:
    content = f.read()

pattern = re.compile(
    r"id:\s*'([^']+)'\s*,\s*name:\s*'([^']+)'\s*,\s*city:\s*'([^']+)'\s*,\s*country:\s*'([^']+)'\s*,\s*lat:\s*([-\d.]+)\s*,\s*lng:\s*([-\d.]+)"
)
matches = pattern.findall(content)

# 이름에서 추정 가능한 유명 랜드마크 좌표
LANDMARKS = {
    'eiffel': (48.8584, 2.2945),
    'times square': (40.758, -73.9855),
    'shibuya': (35.6595, 139.7004),
    'empire state': (40.7484, -73.9857),
    'big ben': (51.5007, -0.1246),
    'tower bridge': (51.5055, -0.0754),
    'colosseum': (41.8902, 12.4922),
    'sagrada': (41.4036, 2.1744),
    'burj khalifa': (25.1972, 55.2744),
    'statue of liberty': (40.6892, -74.0445),
    'golden gate': (37.8199, -122.4783),
    'kremlin': (55.752, 37.6175),
    'acropolis': (37.9715, 23.7267),
    'niagara': (43.0896, -79.0849),
    'waikiki': (21.2765, -157.8272),
    'venice': (45.4408, 12.3155),
    'taj mahal': (27.1751, 78.0421),
    'machu picchu': (-13.1631, -72.545),
    'christ the redeemer': (-22.9519, -43.2105),
    'opera house': (-33.8568, 151.2153),  # Sydney
    'harbour bridge': (-33.8523, 151.2108),
    'petronas': (3.1578, 101.7117),
    'mount fuji': (35.3606, 138.7274),
    'charles bridge': (50.0865, 14.4114),
    'brandenburg': (52.5163, 13.3777),
    'manneken pis': (50.845, 4.3499),
    'red square': (55.7539, 37.6208),
    'hagia sophia': (41.0086, 28.9802),
    'blue mosque': (41.0054, 28.9768),
    'santorini': (36.3932, 25.4615),
    'copacabana': (-22.9711, -43.1822),
    'ipanema': (-22.9838, -43.2096),
}

issues = []
for id_, name, city, country, lat_s, lng_s in matches:
    lat, lng = float(lat_s), float(lng_s)
    name_lower = name.lower()

    for lm_name, (lm_lat, lm_lng) in LANDMARKS.items():
        if lm_name in name_lower:
            dist = ((lat - lm_lat)**2 + (lng - lm_lng)**2)**0.5
            if dist > 1.0:
                issues.append({
                    'id': id_, 'name': name, 'city': city,
                    'lat': lat, 'lng': lng,
                    'landmark': lm_name,
                    'expected': f'{lm_lat},{lm_lng}',
                    'dist_deg': round(dist, 2),
                })
            break

    # 같은 도시 카메라들 중 다른 카메라들과 크게 다른 위치 (클러스터 이탈)
    # → 별도 분석 필요

# Also check: Windy cameras with city mismatch
windy_issues = []
for id_, name, city, country, lat_s, lng_s in matches:
    lat, lng = float(lat_s), float(lng_s)
    # Country code vs hemisphere
    if country == 'BR' and lat > 5:
        windy_issues.append({'id': id_, 'name': name, 'city': city, 'lat': lat, 'lng': lng, 'issue': 'Brazil lat>5'})
    if country == 'AR' and lat > 0:
        windy_issues.append({'id': id_, 'name': name, 'city': city, 'lat': lat, 'lng': lng, 'issue': 'Argentina lat>0'})
    if country == 'CL' and lat > 0:
        windy_issues.append({'id': id_, 'name': name, 'city': city, 'lat': lat, 'lng': lng, 'issue': 'Chile lat>0'})
    if country == 'ZA' and lat > 0:
        windy_issues.append({'id': id_, 'name': name, 'city': city, 'lat': lat, 'lng': lng, 'issue': 'South Africa lat>0'})

print(f"Landmark mismatches: {len(issues)}")
for i in issues:
    print(json.dumps(i, ensure_ascii=False))

if windy_issues:
    print(f"\nHemisphere issues: {len(windy_issues)}")
    for i in windy_issues:
        print(json.dumps(i, ensure_ascii=False))

# Check duplicate coordinates (exact same lat,lng)
from collections import Counter
coords = [(float(lat_s), float(lng_s)) for _, _, _, _, lat_s, lng_s in matches]
coord_counts = Counter(coords)
dupes = [(c, cnt) for c, cnt in coord_counts.items() if cnt > 5]
if dupes:
    print(f"\nSuspicious duplicate coords (>5 cameras at same point): {len(dupes)}")
    for (lat, lng), cnt in sorted(dupes, key=lambda x: -x[1])[:10]:
        names = [n for _, n, _, _, la, lo in matches if float(la) == lat and float(lo) == lng]
        print(f"  ({lat}, {lng}): {cnt} cameras — {names[:3]}...")
