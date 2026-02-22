"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(6px)";
    // Force reflow
    el.getBoundingClientRect();
    el.style.transition = "opacity 0.25s ease-out, transform 0.25s ease-out";
    el.style.opacity = "1";
    el.style.transform = "translateY(0)";
  }, [pathname]);

  return (
    <div ref={ref} className="will-change-[opacity,transform]">
      {children}
    </div>
  );
}
