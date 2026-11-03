"use client";
import dynamic from "next/dynamic";
const Scene = dynamic(() => import("./hero-scene"), { ssr: false });
export function HeroVisual() {
  return (
    <div className="hero-visual">
      <div className="hero-orbit" />
      <Scene />
      <div className="visual-label">
        <span className="visual-label-line" />Ý tưởng kết nối. Công việc tiến
        xa.
      </div>
    </div>
  );
}
