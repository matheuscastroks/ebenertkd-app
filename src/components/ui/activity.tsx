"use client";

import type { Variants } from "motion/react";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";
import { useParentHoverAnimation } from "@/lib/use-parent-hover-animation";

export interface ActivityIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ActivityIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  strokeWidth?: number;
}

const VARIANTS: Variants = {
  normal: {
    opacity: 1,
    pathLength: 1,
    pathOffset: 0,
    transition: {
      duration: 0.4,
      opacity: { duration: 0.1 },
    },
  },
  animate: {
    opacity: [0, 1],
    pathLength: [0, 1],
    pathOffset: [1, 0],
    transition: {
      duration: 0.6,
      ease: "linear",
      opacity: { duration: 0.1 },
    },
  },
};

const ActivityIcon = forwardRef<ActivityIconHandle, ActivityIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 16, strokeWidth = 2, "aria-hidden": ariaHidden, ...props }, ref) => {
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
          <motion.path
            animate={controls}
            d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"
            initial="normal"
            variants={VARIANTS}
          />
        </svg>
      </div>
    );
  }
);

ActivityIcon.displayName = "ActivityIcon";

export { ActivityIcon };
