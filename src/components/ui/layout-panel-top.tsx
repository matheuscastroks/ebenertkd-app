"use client";

import { motion, useAnimation, useReducedMotion } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";
import { useParentHoverAnimation } from "@/lib/use-parent-hover-animation";

export interface LayoutPanelTopIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface LayoutPanelTopIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  strokeWidth?: number;
}

const LayoutPanelTopIcon = forwardRef<
  LayoutPanelTopIconHandle,
  LayoutPanelTopIconProps
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
        <motion.rect
          animate={controls}
          height="7"
          initial="normal"
          rx="1"
          variants={{
            normal: { opacity: 1, translateY: 0 },
            animate: {
              opacity: [0, 1],
              translateY: [-5, 0],
              transition: {
                opacity: { duration: 0.5, times: [0.2, 1] },
                duration: 0.5,
              },
            },
          }}
          width="18"
          x="3"
          y="3"
        />
        <motion.rect
          animate={controls}
          height="7"
          initial="normal"
          rx="1"
          variants={{
            normal: { opacity: 1, translateX: 0 },
            animate: {
              opacity: [0, 1],
              translateX: [-10, 0],
              transition: {
                opacity: { duration: 0.7, times: [0.5, 1] },
                translateX: { delay: 0.3 },
                duration: 0.5,
              },
            },
          }}
          width="7"
          x="3"
          y="14"
        />
        <motion.rect
          animate={controls}
          height="7"
          initial="normal"
          rx="1"
          variants={{
            normal: { opacity: 1, translateX: 0 },
            animate: {
              opacity: [0, 1],
              translateX: [10, 0],
              transition: {
                opacity: { duration: 0.8, times: [0.5, 1] },
                translateX: { delay: 0.4 },
                duration: 0.5,
              },
            },
          }}
          width="7"
          x="14"
          y="14"
        />
      </svg>
    </div>
  );
});

LayoutPanelTopIcon.displayName = "LayoutPanelTopIcon";

export { LayoutPanelTopIcon };
