import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";

type Options = {
  align?: "start" | "end";
  estimatedHeight?: number;
  gap?: number;
  padding?: number;
};

export function useOverlayPlacement(
  open: boolean,
  triggerRef: RefObject<HTMLElement>,
  overlayRef: RefObject<HTMLElement>,
  { align = "end", estimatedHeight = 240, gap = 8, padding = 16 }: Options = {}
) {
  const [placement, setPlacement] = useState<"above" | "below">("below");
  const [style, setStyle] = useState<CSSProperties>({ position: "fixed", visibility: "hidden" });

  useLayoutEffect(() => {
    if (!open) return;

    function update() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const triggerRect = trigger.getBoundingClientRect();
      const overlayRect = overlayRef.current?.getBoundingClientRect();
      const width = overlayRect?.width || 208;
      const height = overlayRect?.height || estimatedHeight;
      const spaceBelow = window.innerHeight - triggerRect.bottom - padding;
      const spaceAbove = triggerRect.top - padding;
      const nextPlacement = spaceBelow >= height || spaceBelow >= spaceAbove ? "below" : "above";
      const rawTop = nextPlacement === "below"
        ? Math.min(triggerRect.bottom + gap, window.innerHeight - height - padding)
        : Math.max(padding, triggerRect.top - height - gap);
      const top = Math.max(padding, rawTop);
      const wantedLeft = align === "start" ? triggerRect.left : triggerRect.right - width;
      const left = Math.max(padding, Math.min(wantedLeft, window.innerWidth - width - padding));

      setPlacement(nextPlacement);
      setStyle({ position: "fixed", top, left, visibility: "visible" });
    }

    update();
    const frame = window.requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [align, estimatedHeight, gap, open, overlayRef, padding, triggerRef]);

  return { placement, style };
}
