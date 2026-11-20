"use client";

import { motion, useAnimation, useReducedMotion } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";
import { useParentHoverAnimation } from "@/lib/use-parent-hover-animation";

export interface KeyIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface KeyIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  strokeWidth?: number;
}

const KeyIcon = forwardRef<KeyIconHandle, KeyIconProps>(
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
          initial="normal"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          style={{ originX: 0.3, originY: 0.7 }}
          variants={{
            normal: {
              rotate: 0,
              transition: {
                type: "spring",
                stiffness: 120,
                damping: 14,
                duration: 0.8,
              },
            },
            animate: {
              rotate: [-3, -33, -25, -28],
              transition: {
                duration: 0.6,
                times: [0, 0.6, 0.8, 1],
                ease: "easeInOut",
              },
            },
          }}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" />
          <path d="m21 2-9.6 9.6" />
          <circle cx="7.5" cy="15.5" r="5.5" />
        </motion.svg>
      </div>
    );
  }
);

KeyIcon.displayName = "KeyIcon";

export { KeyIcon };
