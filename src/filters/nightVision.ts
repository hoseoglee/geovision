// 야간투시경 효과 — 녹색 톤매핑 + 노이즈 + 비네팅
const nightVisionShader = /* glsl */ `
uniform sampler2D colorTexture;
in vec2 v_textureCoordinates;

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = v_textureCoordinates;
  vec3 color = texture(colorTexture, uv).rgb;

  float lum = dot(color, vec3(0.299, 0.587, 0.114));

  // 녹색 톤매핑
  vec3 nightColor = vec3(lum * 0.1, lum * 1.0, lum * 0.2);

  // 좌표 기반 노이즈 (정적)
  float noise = rand(uv * 500.0) * 0.12;
  nightColor += vec3(noise * 0.1, noise, noise * 0.1);

  // 비네팅
  float dist = length(uv - 0.5);
  float vignette = smoothstep(0.7, 0.3, dist);
  nightColor *= vignette;

  nightColor *= 1.5;
  nightColor = pow(nightColor, vec3(0.8));

  out_FragColor = vec4(nightColor, 1.0);
}
`;

export default nightVisionShader;
