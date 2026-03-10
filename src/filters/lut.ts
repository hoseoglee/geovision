// LUT (Look-Up Table) 컬러 그레이딩 — 시네마틱 색감 보정
// WorldView 스타일 cinematic color grading
const lutShader = /* glsl */ `
uniform sampler2D colorTexture;
uniform float u_saturation;
uniform float u_vignette;
uniform float u_contrast;
in vec2 v_textureCoordinates;

// Lift-Gamma-Gain 3-way color correction
vec3 liftGammaGain(vec3 color, vec3 lift, vec3 gamma, vec3 gain) {
  // Lift (shadows)
  color = color * gain + lift;
  // Gamma (midtones)
  color = pow(max(color, vec3(0.0)), 1.0 / gamma);
  return clamp(color, 0.0, 1.0);
}

// Film tone mapping (ACES approximation)
vec3 acesTonemap(vec3 x) {
  float a = 2.51;
  float b = 0.03;
  float c = 2.43;
  float d = 0.59;
  float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
  vec2 uv = v_textureCoordinates;
  vec3 color = texture(colorTexture, uv).rgb;

  // 1. ACES 톤매핑 — 하이라이트 롤오프
  color = acesTonemap(color * 1.2);

  // 2. Lift-Gamma-Gain — 시네마틱 색감
  //    shadows: 청색 리프트, midtones: 따뜻하게, highlights: 약간 차가운 게인
  color = liftGammaGain(
    color,
    vec3(0.02, 0.02, 0.06),   // lift — 그림자에 약간의 블루
    vec3(0.95, 0.98, 1.02),   // gamma — 미드톤 따뜻하게
    vec3(1.02, 0.98, 0.96)    // gain — 하이라이트 살짝 차갑게
  );

  // 3. 채도 조절 — 약간 낮춰서 영화적 톤
  float lum = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(vec3(lum), color, u_saturation);

  // 4. 비네팅
  float dist = length(uv - 0.5) * u_vignette;
  float vignette = smoothstep(1.0, 0.4, dist);
  color *= mix(0.7, 1.0, vignette);

  // 5. 컨트라스트 S-커브 (u_contrast로 강도 조절)
  color = pow(smoothstep(vec3(0.0), vec3(1.0), color), vec3(u_contrast));

  out_FragColor = vec4(color, 1.0);
}
`;

export default lutShader;
