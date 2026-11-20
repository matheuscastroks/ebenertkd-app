"use client";

import type { Transition, Variants } from "motion/react";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";
import { useParentHoverAnimation } from "@/lib/use-parent-hover-animation";

export interface MoonIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface MoonIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  strokeWidth?: number;
}

const SVG_VARIANTS: Variants = {
  normal: {
    rotate: 0,
  },
  animate: {
    rotate: [0, -10, 10, -5, 5, 0],
  },
};

const SVG_TRANSITION: Transition = {
  duration: 1.2,
  ease: "easeInOut",
};

const MoonIcon = forwardRef<MoonIconHandle, MoonIconProps>(
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
        <motion.svg
          animate={controls}
          aria-hidden={props["aria-label"] ? true : resolvedAriaHidden}
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          transition={SVG_TRANSITION}
          variants={SVG_VARIANTS}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </motion.svg>
      </div>
    );
  }
);

MoonIcon.displayName = "MoonIcon";

export { MoonIcon };
