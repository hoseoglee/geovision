/** 화면 중앙 조준선 — 팔란티어 스타일 타겟팅 크로스헤어 */
export default function Crosshair() {
  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex items-center justify-center">
      {/* 수평선 */}
      <div className="absolute w-10 h-[1px] bg-green-500/30" />
      {/* 수직선 */}
      <div className="absolute w-[1px] h-10 bg-green-500/30" />
      {/* 중앙 도트 */}
      <div className="absolute w-1.5 h-1.5 rounded-full border border-green-500/50" />
      {/* 외곽 링 */}
      <div className="absolute w-8 h-8 rounded-full border border-green-500/15" />
      {/* 코너 틱 마크 */}
      <div className="absolute w-5 h-5">
        <div className="absolute top-0 left-0 w-1.5 h-[1px] bg-green-500/40" />
        <div className="absolute top-0 left-0 w-[1px] h-1.5 bg-green-500/40" />
        <div className="absolute top-0 right-0 w-1.5 h-[1px] bg-green-500/40" />
        <div className="absolute top-0 right-0 w-[1px] h-1.5 bg-green-500/40" />
        <div className="absolute bottom-0 left-0 w-1.5 h-[1px] bg-green-500/40" />
        <div className="absolute bottom-0 left-0 w-[1px] h-1.5 bg-green-500/40" />
        <div className="absolute bottom-0 right-0 w-1.5 h-[1px] bg-green-500/40" />
        <div className="absolute bottom-0 right-0 w-[1px] h-1.5 bg-green-500/40" />
      </div>
    </div>
  );
}
