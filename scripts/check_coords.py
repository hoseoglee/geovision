#!/usr/bin/env python3
"""CCTV 좌표 이상치 탐지"""
import re, json

with open('src/data/publicCCTVs.ts', 'r') as f:
    content = f.read()

pattern = re.compile(
    r"id:\s*'([^']+)'\s*,\s*name:\s*'([^']+)'\s*,\s*city:\s*'([^']+)'\s*,\s*country:\s*'([^']+)'\s*,\s*lat:\s*([-\d.]+)\s*,\s*lng:\s*([-\d.]+)"
)
matches = pattern.findall(content)

CITY_COORDS = {
    'New York': (40.7128, -74.006), 'London': (51.5074, -0.1278),
    'Paris': (48.8566, 2.3522), 'Tokyo': (35.6762, 139.6503),
    'Seoul': (37.5665, 126.978), 'Dubai': (25.2048, 55.2708),
    'Sydney': (-33.8688, 151.2093), 'Los Angeles': (34.0522, -118.2437),
    'Miami': (25.7617, -80.1918), 'Singapore': (1.3521, 103.8198),
    'Hong Kong': (22.3193, 114.1694), 'Istanbul': (41.0082, 28.9784),
    'Rome': (41.9028, 12.4964), 'Berlin': (52.5200, 13.4050),
    'Moscow': (55.7558, 37.6173), 'Bangkok': (13.7563, 100.5018),
    'Mumbai': (19.076, 72.8777), 'Cairo': (30.0444, 31.2357),
    'Rio de Janeiro': (-22.9068, -43.1729), 'Buenos Aires': (-34.6037, -58.3816),
    'Mexico City': (19.4326, -99.1332), 'Toronto': (43.6532, -79.3832),
    'Chicago': (41.8781, -87.6298), 'San Francisco': (37.7749, -122.4194),
    'Las Vegas': (36.1699, -115.1398), 'Amsterdam': (52.3676, 4.9041),
    'Barcelona': (41.3874, 2.1686), 'Stockholm': (59.3293, 18.0686),
    'Oslo': (59.9139, 10.7522), 'Helsinki': (60.1699, 24.9384),
    'Prague': (50.0755, 14.4378), 'Vienna': (48.2082, 16.3738),
    'Zurich': (47.3769, 8.5417), 'Athens': (37.9838, 23.7275),
    'Lisbon': (38.7223, -9.1393), 'Warsaw': (52.2297, 21.0122),
    'Taipei': (25.033, 121.5654), 'Manila': (14.5995, 120.9842),
    'Jakarta': (-6.2088, 106.8456), 'Kuala Lumpur': (3.139, 101.6869),
    'Nairobi': (-1.2921, 36.8219), 'Cape Town': (-33.9249, 18.4241),
    'Vancouver': (49.2827, -123.1207), 'Honolulu': (21.3069, -157.8583),
    'Lima': (-12.0464, -77.0428), 'Santiago': (-33.4489, -70.6693),
    'Bogota': (4.711, -74.0721), 'Havana': (23.1136, -82.3666),
    'Beijing': (39.9042, 116.4074), 'Shanghai': (31.2304, 121.4737),
    'Osaka': (34.6937, 135.5023), 'Busan': (35.1796, 129.0756),
    'Hanoi': (21.0285, 105.8542), 'Ho Chi Minh': (10.8231, 106.6297),
    'Delhi': (28.7041, 77.1025), 'Colombo': (6.9271, 79.8612),
    'Doha': (25.2854, 51.531), 'Riyadh': (24.7136, 46.6753),
    'Tel Aviv': (32.0853, 34.7818), 'Amman': (31.9454, 35.9284),
    'Casablanca': (33.5731, -7.5898), 'Accra': (5.6037, -0.187),
    'Lagos': (6.5244, 3.3792), 'Dar es Salaam': (-6.7924, 39.2083),
    'Addis Ababa': (9.0250, 38.7469),
    'Perth': (-31.9505, 115.8605), 'Melbourne': (-37.8136, 144.9631),
    'Auckland': (-36.8485, 174.7633), 'Wellington': (-41.2865, 174.7762),
    'Fiji': (-17.7134, 178.065), 'Tahiti': (-17.5516, -149.5585),
}

issues = []
for id_, name, city, country, lat_s, lng_s in matches:
    lat, lng = float(lat_s), float(lng_s)

    # City distance check
    if city in CITY_COORDS:
        clat, clng = CITY_COORDS[city]
        dist_deg = ((lat - clat)**2 + (lng - clng)**2)**0.5
        if dist_deg > 3.0:
            issues.append({
                'id': id_, 'name': name, 'city': city, 'country': country,
                'lat': lat, 'lng': lng,
                'expected_lat': clat, 'expected_lng': clng,
                'dist': round(dist_deg, 1),
                'issue': f'far from {city} ({dist_deg:.1f}deg)',
            })

    # Hemisphere/sign checks
    if country == 'US' and lng > 0 and city != 'Honolulu':
        issues.append({'id': id_, 'name': name, 'city': city, 'country': country, 'lat': lat, 'lng': lng, 'issue': 'US but lng>0 (sign error?)'})
    if country in ('JP', 'KR', 'TW', 'SG', 'TH', 'MY', 'ID', 'PH', 'CN', 'IN', 'VN') and lng < 0:
        issues.append({'id': id_, 'name': name, 'city': city, 'country': country, 'lat': lat, 'lng': lng, 'issue': 'East Asia but lng<0'})
    if country in ('AU', 'NZ') and lat > 0:
        issues.append({'id': id_, 'name': name, 'city': city, 'country': country, 'lat': lat, 'lng': lng, 'issue': 'Southern hemisphere but lat>0'})
    if lat == 0 and lng == 0:
        issues.append({'id': id_, 'name': name, 'city': city, 'country': country, 'lat': lat, 'lng': lng, 'issue': 'null island (0,0)'})
    # lat/lng swapped? (lat outside -90..90 or clearly wrong pattern)
    if abs(lat) > 90:
        issues.append({'id': id_, 'name': name, 'city': city, 'country': country, 'lat': lat, 'lng': lng, 'issue': 'lat > 90 (swapped?)'})

# Dedup
seen = set()
deduped = []
for i in issues:
    if i['id'] not in seen:
        seen.add(i['id'])
        deduped.append(i)

print(f"Total cameras: {len(matches)}")
print(f"Issues found: {len(deduped)}")
print()
for i in deduped:
    print(json.dumps(i, ensure_ascii=False))
