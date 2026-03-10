// 열화상/FLIR 효과 — 밝기 기반 컬러맵 (파랑 → 녹색 → 노랑 → 빨강 → 흰색)
const thermalShader = /* glsl */ `
uniform sampler2D colorTexture;
in vec2 v_textureCoordinates;

// 열화상 컬러맵: 온도(밝기)에 따라 색상 매핑
vec3 thermalColormap(float t) {
  // 파랑(차가움) → 녹색 → 노랑 → 빨강 → 흰색(뜨거움)
  if (t < 0.25) {
    // 검정-파랑
    float s = t / 0.25;
    return mix(vec3(0.0, 0.0, 0.1), vec3(0.0, 0.0, 1.0), s);
  } else if (t < 0.5) {
    // 파랑-녹색
    float s = (t - 0.25) / 0.25;
    return mix(vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 0.0), s);
  } else if (t < 0.7) {
    // 녹색-노랑
    float s = (t - 0.5) / 0.2;
    return mix(vec3(0.0, 1.0, 0.0), vec3(1.0, 1.0, 0.0), s);
  } else if (t < 0.9) {
    // 노랑-빨강
    float s = (t - 0.7) / 0.2;
    return mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), s);
  } else {
    // 빨강-흰색
    float s = (t - 0.9) / 0.1;
    return mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 1.0), s);
  }
}

void main() {
  vec2 uv = v_textureCoordinates;
  vec3 color = texture(colorTexture, uv).rgb;

  // 밝기(luminance) 계산
  float lum = dot(color, vec3(0.299, 0.587, 0.114));

  // 컨트라스트 강화
  lum = clamp((lum - 0.2) * 1.5, 0.0, 1.0);

  // 열화상 컬러맵 적용
  vec3 thermal = thermalColormap(lum);

  out_FragColor = vec4(thermal, 1.0);
}
`;

export default thermalShader;
