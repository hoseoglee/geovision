// CRT (Cathode Ray Tube) 효과 — 스캔라인 + 색수차 + 배럴 왜곡
const crtShader = /* glsl */ `
uniform sampler2D colorTexture;
in vec2 v_textureCoordinates;

vec2 barrelDistortion(vec2 coord, float amt) {
  vec2 cc = coord - 0.5;
  float dist = dot(cc, cc);
  return coord + cc * dist * amt;
}

void main() {
  vec2 uv = v_textureCoordinates;

  // 배럴 왜곡
  vec2 distorted = barrelDistortion(uv, 0.1);

  // 색수차 (chromatic aberration) — RGB 채널별 약간 다른 오프셋
  float aberration = 0.003;
  float r = texture(colorTexture, barrelDistortion(uv, 0.1 + aberration)).r;
  float g = texture(colorTexture, distorted).g;
  float b = texture(colorTexture, barrelDistortion(uv, 0.1 - aberration)).b;

  vec3 color = vec3(r, g, b);

  // 스캔라인
  float scanline = sin(uv.y * 800.0) * 0.08;
  color -= scanline;

  // 밝기 비네팅
  float vignette = smoothstep(0.8, 0.3, length(uv - 0.5));
  color *= vignette;

  // 약간의 밝기 부스트
  color *= 1.15;

  out_FragColor = vec4(color, 1.0);
}
`;

export default crtShader;
