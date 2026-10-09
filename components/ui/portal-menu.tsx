"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

type PortalMenuProps = {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  align?: "left" | "right";
  widthClass?: string;
  matchAnchorWidth?: boolean;
};

export function PortalMenu({
  open,
  onClose,
  anchorRef,
  children,
  align = "left",
  widthClass = "w-44",
  matchAnchorWidth = false,
}: PortalMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;

    const place = () => {
      const anchor = anchorRef.current;
      const menu = menuRef.current;
      if (!anchor || !menu) return;

      const rect = anchor.getBoundingClientRect();
      const menuWidth = menu.offsetWidth || 176;
      const menuHeight = menu.offsetHeight || 160;
      const gap = 4;
      const viewportPad = 8;

      let top = rect.bottom + gap;
      if (top + menuHeight > window.innerHeight - viewportPad) {
        top = Math.max(viewportPad, rect.top - menuHeight - gap);
      }

      let left = align === "right" ? rect.right - menuWidth : rect.left;
      left = Math.min(
        Math.max(viewportPad, left),
        window.innerWidth - menuWidth - viewportPad,
      );

      menu.style.top = `${Math.round(top)}px`;
      menu.style.left = `${Math.round(left)}px`;
      if (matchAnchorWidth) {
        menu.style.minWidth = `${Math.round(rect.width)}px`;
        menu.style.width = `${Math.round(rect.width)}px`;
      }
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [align, anchorRef, matchAnchorWidth, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Yopish"
        className="fixed inset-0 z-[80] cursor-default"
        onClick={onClose}
      />
      <div
        ref={menuRef}
        className={`fixed z-[90] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl ${widthClass}`}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}
