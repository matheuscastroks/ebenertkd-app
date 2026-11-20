"use client";

import type { Variants } from "motion/react";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";
import { useParentHoverAnimation } from "@/lib/use-parent-hover-animation";

export interface ChartLineIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ChartLineIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  strokeWidth?: number;
}

const LINE_VARIANTS: Variants = {
  normal: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.3 },
  },
  animate: {
    pathLength: [0, 1],
    opacity: [0.4, 1],
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export const ChartLineIcon = forwardRef<ChartLineIconHandle, ChartLineIconProps>(
  (
    {
      onMouseEnter,
      onMouseLeave,
      className,
      size = 18,
      strokeWidth = 2,
      "aria-hidden": ariaHidden,
      ...props
    },
    ref
  ) => {
    const controls = useAnimation();
    const shouldReduceMotion = useReducedMotion();
    const isControlledRef = useRef(false);
    const resolvedAriaHidden = props["aria-label"] ? undefined : (ariaHidden ?? true);

    const start = useCallback(() => {
      if (!shouldReduceMotion) controls.start("animate");
    }, [controls, shouldReduceMotion]);

    const stop = useCallback(() => {
      controls.start("normal");
    }, [controls]);

    useImperativeHandle(
      ref,
      () => {
        isControlledRef.current = true;
        return {
          startAnimation: start,
          stopAnimation: stop,
        };
      },
      [start, stop]
    );

    const { containerRef, hasInteractiveParentRef } = useParentHoverAnimation(
      isControlledRef,
      start,
      stop
    );

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) start();
        onMouseEnter?.(e);
      },
      [onMouseEnter, start]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) stop();
        onMouseLeave?.(e);
      },
      [onMouseLeave, stop]
    );

    return (
      <div
        ref={containerRef}
        className={cn("inline-flex select-none items-center justify-center", className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-hidden={resolvedAriaHidden}
        {...props}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 3v18h18" />
          <motion.path
            d="m19 9-5 5-4-4-3 3"
            variants={LINE_VARIANTS}
            initial="normal"
            animate={controls}
          />
        </svg>
      </div>
    );
  }
);

ChartLineIcon.displayName = "ChartLineIcon";
