// src/theme.js
// 推しカラーのテーマ切替・ブレークポイント・表示用フォーマッタ
// 色トークン自体は src/index.css の :root に定義（白ベース）

import { useState, useEffect } from "react";

// 推しカラーのパレット（白背景で読める濃色・淡色・ボタン用グラデをセットで持つ）
// key はメンバー ID（data.js）。推し未設定は "all"（きゅるしてピンク）
export const ACCENTS = {
  all:  { accent: "#ff69b4", rgb: "255,105,180", deep: "#d63c8c", soft: "#ffe7f2", grad: "linear-gradient(135deg,#ff85c2 0%,#b57edc 100%)", on: "#ffffff" },
  uta:  { accent: "#ffcc1f", rgb: "245,190,20",  deep: "#9a6f00", soft: "#fff6cf", grad: "linear-gradient(135deg,#ffe066 0%,#ffbb1f 100%)", on: "#4a3500" },
  yane: { accent: "#a96bd1", rgb: "155,89,182",  deep: "#7d3fa5", soft: "#f3e8fb", grad: "linear-gradient(135deg,#c08ae6 0%,#8e4fb5 100%)", on: "#ffffff" },
  yuna: { accent: "#ff69b4", rgb: "255,105,180", deep: "#d63c8c", soft: "#ffe7f2", grad: "linear-gradient(135deg,#ff8fc8 0%,#f0509e 100%)", on: "#ffffff" },
  amu:  { accent: "#f0524a", rgb: "231,76,60",   deep: "#c9352a", soft: "#ffe9e6", grad: "linear-gradient(135deg,#ff7a72 0%,#e03b3b 100%)", on: "#ffffff" },
};

export function applyAccent(memberId) {
  const p = ACCENTS[memberId] || ACCENTS.all;
  const s = document.documentElement.style;
  s.setProperty("--accent", p.accent);
  s.setProperty("--accent-rgb", p.rgb);
  s.setProperty("--accent-deep", p.deep);
  s.setProperty("--accent-soft", p.soft);
  s.setProperty("--accent-grad", p.grad);
  s.setProperty("--on-accent", p.on);
}

// メンバーカラーのチップ用 CSS 変数（index.css の .chip.is-active が参照する）
export const chipVars = (memberId) => {
  const p = ACCENTS[memberId];
  return p ? { "--chip": p.accent, "--chip-soft": p.soft, "--chip-deep": p.deep } : undefined;
};

const widthToBp = (w) => (w >= 1024 ? "desktop" : w >= 640 ? "tablet" : "mobile");

export function useBreakpoint() {
  // 初回から実際の幅で判定する（PC で一瞬モバイルレイアウトが出るのを防ぐ）
  const [bp, setBp] = useState(() => widthToBp(window.innerWidth));
  useEffect(() => {
    const update = () => setBp(widthToBp(window.innerWidth));
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return bp;
}

export const fmt = (n) => (n >= 10000 ? (n / 10000).toFixed(1) + "万" : n.toLocaleString());

export const formatDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
};
