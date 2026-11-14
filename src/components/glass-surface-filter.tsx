"use client";

import { useEffect, useId, useRef } from "react";

// React Bits GlassSurface displacement map, sized to the host's existing outline.
function displacementMap(width: number, height: number, radius: number) {
  const edge = Math.min(width, height) * 0.035;
  const innerWidth = width - edge * 2;
  const innerHeight = height - edge * 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="x" x1="100%" y1="0%" x2="0%" y2="0%"><stop stop-color="red" stop-opacity="0"/><stop offset="1" stop-color="red"/></linearGradient>
      <linearGradient id="y" x1="0%" y1="0%" x2="0%" y2="100%"><stop stop-color="blue" stop-opacity="0"/><stop offset="1" stop-color="blue"/></linearGradient>
      <filter id="soft" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="5"/></filter>
    </defs>
    <rect width="${width}" height="${height}" fill="black"/>
    <rect width="${width}" height="${height}" rx="${radius}" fill="url(#x)"/>
    <rect width="${width}" height="${height}" rx="${radius}" fill="url(#y)" style="mix-blend-mode:difference"/>
    <rect x="${edge}" y="${edge}" width="${innerWidth}" height="${innerHeight}" rx="${Math.max(0, radius - edge)}" fill="#808080" fill-opacity=".96" filter="url(#soft)"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function GlassSurfaceFilter({ strength = 22 }: { strength?: number }) {
  const id = `landing-glass-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const image = useRef<SVGFEImageElement>(null);

  useEffect(() => {
    const map = image.current;
    const host = map?.ownerSVGElement?.parentElement;
    if (!map || !host || !/Chrom(?:e|ium)\//.test(navigator.userAgent) || !CSS.supports("backdrop-filter", `url(#${id})`)) return;

    const update = () => {
      const width = host.offsetWidth;
      const height = host.offsetHeight;
      if (!width || !height) return;
      const radius = parseFloat(getComputedStyle(host).borderTopLeftRadius) || 0;
      map.setAttribute("href", displacementMap(width, height, radius));
      host.style.setProperty("--glass-surface-refraction", `url(#${id})`);
    };
    const observer = new ResizeObserver(update);
    observer.observe(host);
    update();
    return () => {
      observer.disconnect();
      host.style.removeProperty("--glass-surface-refraction");
    };
  }, [id]);

  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }}>
      <defs>
        <filter id={id} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feImage ref={image} width="100%" height="100%" preserveAspectRatio="none" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale={-strength} xChannelSelector="R" yChannelSelector="B" />
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>
    </svg>
  );
}
