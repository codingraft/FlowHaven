"use client";

import { useCallback } from "react";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"];

export function useConfetti() {
  return useCallback((count = 25) => {
    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      el.className = "confetti-piece";
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const size = 6 + Math.random() * 6;
      el.style.cssText = `left:${Math.random() * 100}vw;top:-10px;background:${color};width:${size}px;height:${size}px;animation-delay:${Math.random() * 0.4}s;animation-duration:${2 + Math.random() * 1.5}s;`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3500);
    }
  }, []);
}
