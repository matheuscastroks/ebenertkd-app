"use client";

import type { Variants } from "motion/react";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";
import { useParentHoverAnimation } from "@/lib/use-parent-hover-animation";

export interface CalendarCheck2IconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface CalendarCheck2IconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  strokeWidth?: number;
}

const CHECK_VARIANTS: Variants = {
  normal: {
    pathLength: 1,
    opacity: 1,
    transition: {
      duration: 0.3,
    },
  },
  animate: {
    pathLength: [0, 1],
    opacity: [0, 1],
    transition: {
      pathLength: { duration: 0.4, ease: "easeInOut" },
      opacity: { duration: 0.4, ease: "easeInOut" },
    },
  },
};

const CalendarCheck2Icon = forwardRef<
  CalendarCheck2IconHandle,
  CalendarCheck2IconProps
>(({ onMouseEnter, onMouseLeave, className, size = 16, strokeWidth = 2, "aria-hidden": ariaHidden, ...props }, ref) => {
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

  const { containerRef, hasInteractiveParentRef } = useParentHoverAnimation(
    isControlledRef,
    start,
    stop
  );

  useImperativeHandle(ref, () => {
    isControlledRef.current = true;

    return {
      startAnimation: () => {
        if (!shouldReduceMotion) controls.start("animate");
      },
      stopAnimation: () => controls.start("normal"),
    };
  });

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) {
        onMouseEnter?.(e);
      } else if (!hasInteractiveParentRef.current) {
        start();
      }
    },
    [hasInteractiveParentRef, onMouseEnter, start]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) {
        onMouseLeave?.(e);
      } else if (!hasInteractiveParentRef.current) {
        stop();
      }
    },
    [hasInteractiveParentRef, onMouseLeave, stop]
  );

  return (
    <div
      ref={containerRef}
      aria-hidden={resolvedAriaHidden}
      className={cn("inline-flex shrink-0 items-center justify-center [&>svg]:size-full", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <svg
        aria-hidden={props["aria-label"] ? true : resolvedAriaHidden}
        fill="none"
        height={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <path d="M21 14V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8" />
        <path d="M3 10h18" />
        <motion.path
          animate={controls}
          d="m16 20 2 2 4-4"
          initial="normal"
          style={{ transformOrigin: "center" }}
          variants={CHECK_VARIANTS}
        />
      </svg>
    </div>
  );
});

CalendarCheck2Icon.displayName = "CalendarCheck2Icon";

export { CalendarCheck2Icon };
