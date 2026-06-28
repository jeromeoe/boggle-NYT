import type { CSSProperties } from "react";

/**
 * Renders a single-color line-engraving (from /public/marks) as a CSS mask
 * filled with `currentColor`. Because the fill is currentColor, the mark
 * adopts whatever text color its container sets — so the same asset reads as
 * baize-green in light mode and brass in dark mode via the `text-ink-accent`
 * token, with zero per-theme asset work. Decorative, so it's aria-hidden.
 */
export function Engraving({
  src,
  className,
  style,
}: {
  src: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: "block",
        backgroundColor: "currentColor",
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        ...style,
      }}
    />
  );
}
