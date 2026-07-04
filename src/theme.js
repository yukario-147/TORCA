// src/theme.js
// テーマカラー・ブレークポイント等の UI 共通定義

import { useState, useEffect } from "react";

export const DEFAULT_ACCENT = "#FF69B4";
export const DEFAULT_ACCENT_RGB = "255,105,180";

export const ACCENT_RGB_MAP = {
  "#FFD700": "255,215,0",
  "#9B59B6": "155,89,182",
  "#FF69B4": "255,105,180",
  "#E74C3C": "231,76,60",
};

export function applyAccent(color) {
  const el = document.documentElement;
  el.style.setProperty("--accent", color);
  el.style.setProperty("--accent-rgb", ACCENT_RGB_MAP[color] || DEFAULT_ACCENT_RGB);
}

export function useBreakpoint() {
  const [bp, setBp] = useState("mobile");
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w >= 1024) setBp("desktop");
      else if (w >= 640) setBp("tablet");
      else setBp("mobile");
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return bp;
}

export const D = {
  bg: "#0c0c12", surface: "#13131e", surfaceHover: "#1c1c2a",
  border: "rgba(255,255,255,0.07)", borderHover: "rgba(255,255,255,0.14)",
  text: "#f0eeff", textSub: "#8a82b0", textMuted: "#4a4570",
  accent: DEFAULT_ACCENT, accentLight: "#ff8ec7", accentBg: "rgba(255,105,180,0.12)",
  pink: "#e84393", gold: "#f59e0b", green: "#10b981", red: "#ef4444",
};

export const fmt = (n) => n >= 10000 ? (n / 10000).toFixed(1) + "万" : n.toLocaleString();

export const formatDate = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
};
