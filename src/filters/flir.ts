// FLIR Enhanced — 군사급 열화상 + 타겟팅 레티클 + HUD 오버레이
// WorldView 스타일 FLIR 시뮬레이션
const flirShader = /* glsl */ `
uniform sampler2D colorTexture;
in vec2 v_textureCoordinates;

// 열화상 컬러맵 (White-hot 모드)
vec3 whiteHotMap(float t) {
  // 검정 → 보라 → 파랑 → 시안 → 흰색
  if (t < 0.2) {
    return mix(vec3(0.0), vec3(0.2, 0.0, 0.3), t / 0.2);
  } else if (t < 0.4) {
    return mix(vec3(0.2, 0.0, 0.3), vec3(0.0, 0.2, 0.8), (t - 0.2) / 0.2);
  } else if (t < 0.6) {
    return mix(vec3(0.0, 0.2, 0.8), vec3(0.0, 0.8, 0.8), (t - 0.4) / 0.2);
  } else if (t < 0.8) {
    return mix(vec3(0.0, 0.8, 0.8), vec3(0.9, 0.9, 0.5), (t - 0.6) / 0.2);
  } else {
    return mix(vec3(0.9, 0.9, 0.5), vec3(1.0, 1.0, 1.0), (t - 0.8) / 0.2);
  }
}

// 타겟팅 레티클
float reticle(vec2 uv) {
  vec2 center = vec2(0.5);
  float dist = length(uv - center);

  // 외곽 원
  float outerRing = abs(dist - 0.18) < 0.001 ? 1.0 : 0.0;
  // 내부 원
  float innerRing = abs(dist - 0.06) < 0.0008 ? 1.0 : 0.0;

  // 십자선 — 중앙 간격 있는 크로스헤어
  float gap = 0.03;
  float crossH = (abs(uv.y - 0.5) < 0.0006 && abs(uv.x - 0.5) > gap && abs(uv.x - 0.5) < 0.22) ? 1.0 : 0.0;
  float crossV = (abs(uv.x - 0.5) < 0.0006 && abs(uv.y - 0.5) > gap && abs(uv.y - 0.5) < 0.22) ? 1.0 : 0.0;

  // 코너 마커 (네 모서리 L자)
  float cornerSize = 0.04;
  float cornerThick = 0.001;
  float corners = 0.0;
  // 좌상
  if (uv.x > 0.1 && uv.x < 0.1 + cornerSize && abs(uv.y - 0.1) < cornerThick) corners = 1.0;
  if (uv.y > 0.1 && uv.y < 0.1 + cornerSize && abs(uv.x - 0.1) < cornerThick) corners = 1.0;
  // 우상
  if (uv.x > 0.9 - cornerSize && uv.x < 0.9 && abs(uv.y - 0.1) < cornerThick) corners = 1.0;
  if (uv.y > 0.1 && uv.y < 0.1 + cornerSize && abs(uv.x - 0.9) < cornerThick) corners = 1.0;
  // 좌하
  if (uv.x > 0.1 && uv.x < 0.1 + cornerSize && abs(uv.y - 0.9) < cornerThick) corners = 1.0;
  if (uv.y > 0.9 - cornerSize && uv.y < 0.9 && abs(uv.x - 0.1) < cornerThick) corners = 1.0;
  // 우하
  if (uv.x > 0.9 - cornerSize && uv.x < 0.9 && abs(uv.y - 0.9) < cornerThick) corners = 1.0;
  if (uv.y > 0.9 - cornerSize && uv.y < 0.9 && abs(uv.x - 0.9) < cornerThick) corners = 1.0;

  // 틱 마크 (원 위에 4방향)
  float ticks = 0.0;
  if (abs(uv.y - 0.5) < 0.0006 && abs(abs(uv.x - 0.5) - 0.18) < 0.012) ticks = 1.0;
  if (abs(uv.x - 0.5) < 0.0006 && abs(abs(uv.y - 0.5) - 0.18) < 0.012) ticks = 1.0;

  return max(max(max(max(outerRing, innerRing), max(crossH, crossV)), corners), ticks);
}

// HUD 프레임 (상단/하단 바)
float hudFrame(vec2 uv) {
  float frame = 0.0;
  // 상단 바
  if (uv.y < 0.04 && uv.y > 0.035) frame = 0.5;
  // 하단 바
  if (uv.y > 0.96 && uv.y < 0.965) frame = 0.5;
  // 좌측 스케일 바
  if (uv.x < 0.035 && uv.x > 0.03 && uv.y > 0.2 && uv.y < 0.8) frame = 0.3;
  return frame;
}

void main() {
  vec2 uv = v_textureCoordinates;
  vec3 color = texture(colorTexture, uv).rgb;

  // 밝기 추출 + 컨트라스트 강화
  float lum = dot(color, vec3(0.299, 0.587, 0.114));
  lum = clamp((lum - 0.15) * 1.8, 0.0, 1.0);

  // 약간의 노이즈 — FLIR 센서 시뮬레이션
  float noise = fract(sin(dot(uv * 800.0, vec2(12.9898, 78.233))) * 43758.5453) * 0.03;
  lum += noise;
  lum = clamp(lum, 0.0, 1.0);

  // 열화상 컬러맵
  vec3 thermal = whiteHotMap(lum);

  // 스캔라인 (약한 수평선)
  float scanline = sin(uv.y * 600.0) * 0.03;
  thermal -= scanline;

  // 레티클 오버레이 (녹색)
  float ret = reticle(uv);
  vec3 reticleColor = vec3(0.0, 1.0, 0.3);
  thermal = mix(thermal, reticleColor, ret * 0.9);

  // HUD 프레임 (녹색)
  float hud = hudFrame(uv);
  thermal = mix(thermal, reticleColor * 0.7, hud);

  out_FragColor = vec4(thermal, 1.0);
}
`;

export default flirShader;
