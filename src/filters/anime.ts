// 애니메 셀셰이딩 효과 — Studio Ghibli 스타일 (WorldView 참고)
// 밝기를 4단계로 양자화 + 에지 검출 + 파스텔 톤매핑
const animeShader = /* glsl */ `
uniform sampler2D colorTexture;
uniform float u_edgeStrength;
uniform float u_pastelMix;
in vec2 v_textureCoordinates;

// Sobel edge detection
float edgeDetect(vec2 uv, vec2 texelSize) {
  float tl = dot(texture(colorTexture, uv + vec2(-1, -1) * texelSize).rgb, vec3(0.299, 0.587, 0.114));
  float t  = dot(texture(colorTexture, uv + vec2( 0, -1) * texelSize).rgb, vec3(0.299, 0.587, 0.114));
  float tr = dot(texture(colorTexture, uv + vec2( 1, -1) * texelSize).rgb, vec3(0.299, 0.587, 0.114));
  float l  = dot(texture(colorTexture, uv + vec2(-1,  0) * texelSize).rgb, vec3(0.299, 0.587, 0.114));
  float r  = dot(texture(colorTexture, uv + vec2( 1,  0) * texelSize).rgb, vec3(0.299, 0.587, 0.114));
  float bl = dot(texture(colorTexture, uv + vec2(-1,  1) * texelSize).rgb, vec3(0.299, 0.587, 0.114));
  float b  = dot(texture(colorTexture, uv + vec2( 0,  1) * texelSize).rgb, vec3(0.299, 0.587, 0.114));
  float br = dot(texture(colorTexture, uv + vec2( 1,  1) * texelSize).rgb, vec3(0.299, 0.587, 0.114));

  float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
  float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;
  return sqrt(gx*gx + gy*gy);
}

void main() {
  vec2 uv = v_textureCoordinates;
  vec3 color = texture(colorTexture, uv).rgb;

  // 밝기 양자화 — 4단계 셀셰이딩
  float lum = dot(color, vec3(0.299, 0.587, 0.114));
  float quantized;
  if (lum < 0.25) quantized = 0.15;
  else if (lum < 0.5) quantized = 0.4;
  else if (lum < 0.75) quantized = 0.7;
  else quantized = 0.95;

  // 색조 보존 — 채도를 유지하면서 밝기만 양자화
  vec3 hsv;
  float maxC = max(color.r, max(color.g, color.b));
  float minC = min(color.r, min(color.g, color.b));
  float delta = maxC - minC;

  // 파스텔 톤 — 채도를 줄이고 밝기를 높임
  vec3 pastel = mix(vec3(quantized), color, u_pastelMix);
  pastel = pastel * 0.85 + vec3(0.15); // 약간 밝게

  // Sobel edge — 잉크 라인
  vec2 texelSize = vec2(1.0 / 1920.0, 1.0 / 1080.0);
  float edge = edgeDetect(uv, texelSize * u_edgeStrength);
  float edgeLine = smoothstep(0.05, 0.15, edge);

  // 에지를 진한 아웃라인으로
  vec3 result = mix(pastel, vec3(0.05, 0.03, 0.08), edgeLine * 0.8);

  // 따뜻한 지브리 톤 — 약간의 주황/노란 틴트
  result = result * vec3(1.05, 1.02, 0.95);

  out_FragColor = vec4(result, 1.0);
}
`;

export default animeShader;
