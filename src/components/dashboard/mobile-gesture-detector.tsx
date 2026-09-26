"use client";

import { useEffect } from "react";
import { useSidebar } from "@/components/ui/sidebar";

/**
 * Detecta gestos de deslizar (swipe) em dispositivos móveis:
 * - Deslizar da borda esquerda para a direita (swipe right): Abre a gaveta lateral.
 * - Deslizar para a esquerda quando aberta (swipe left): Fecha a gaveta lateral.
 */
export function MobileGestureDetector() {
  const { isMobile, openMobile, setOpenMobile } = useSidebar();

  useEffect(() => {
    if (!isMobile) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let isTracking = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();

      // Swipe para abrir: só rastreia se o toque começou próximo à borda esquerda (<= 40px)
      // Swipe para fechar: se o menu estiver aberto, qualquer arrasto para a esquerda é considerado
      if (startX <= 40 || openMobile) {
        isTracking = true;
      } else {
        isTracking = false;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isTracking) return;
      isTracking = false;

      if (e.changedTouches.length !== 1) return;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const duration = Date.now() - startTime;

      // Gestos naturais duram até 600ms
      if (duration > 600) return;

      // Movimento deve ser predominantemente horizontal
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) * 1.3;

      if (isHorizontal) {
        // Gesto da borda esquerda para direita: abrir menu
        if (!openMobile && startX <= 40 && deltaX > 50) {
          setOpenMobile(true);
        }
        // Gesto da direita para esquerda quando aberto: fechar menu
        else if (openMobile && deltaX < -50) {
          setOpenMobile(false);
        }
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isMobile, openMobile, setOpenMobile]);

  return null;
}
