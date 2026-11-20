"use client";

import type { Variants } from "motion/react";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";
import { useParentHoverAnimation } from "@/lib/use-parent-hover-animation";

export interface FlameIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface FlameIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  strokeWidth?: number;
}

const PATH_VARIANTS: Variants = {
  normal: {
    pathLength: 1,
    opacity: 1,
    pathOffset: 0,
  },
  animate: {
    opacity: [0, 1],
    pathLength: [0, 1],
    transition: {
      delay: 0.1,
      duration: 0.4,
      opacity: { duration: 0.1, delay: 0.1 },
    },
  },
};

const FlameIcon = forwardRef<FlameIconHandle, FlameIconProps>(
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
            d="M8.9 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
            fill="none"
            initial="normal"
            variants={PATH_VARIANTS}
          />
        </svg>
      </div>
    );
  }
);

FlameIcon.displayName = "FlameIcon";

export { FlameIcon };
