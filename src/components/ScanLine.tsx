/** 레이더 스캔 라인 오버레이 — CSS 애니메이션 */
export default function ScanLine() {
  return (
    <div className="fixed inset-0 z-20 pointer-events-none overflow-hidden">
      {/* 수평 스캔 라인 */}
      <div className="scan-line-h" />
      {/* 격자 오버레이 */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,255,0,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,0,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />
    </div>
  );
}
