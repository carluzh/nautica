"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

/**
 * Leopard shark that swims in from the far right and drifts left as the page
 * scrolls, ending roughly three-quarters of the way across. Scroll progress is
 * written straight to the element's transform (no React re-render per frame).
 */
export function SwimmingShark() {
  const stripRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const strip = stripRef.current;
      const img = imgRef.current;
      if (!strip || !img) return;
      const rect = strip.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // 0 when the strip is entering from the bottom, 1 once it reaches the top.
      const p = Math.min(1, Math.max(0, 1 - rect.top / vh));
      // Start just off the right edge, travel ~75vw to the left.
      const x = 5 - p * 78;
      img.style.transform = `translate(${x}vw, -50%) scaleX(-1)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div ref={stripRef} className="relative h-28 sm:h-32" aria-hidden>
      <Image
        ref={imgRef}
        src="/animals/leopardhaineu.png"
        alt=""
        width={1372}
        height={768}
        sizes="360px"
        className="pointer-events-none absolute right-0 top-1/2 w-64 max-w-none select-none drop-shadow-xl lg:w-80"
        style={{ transform: "translate(5vw, -50%) scaleX(-1)" }}
      />
    </div>
  );
}
