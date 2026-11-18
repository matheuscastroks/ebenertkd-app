"use client";

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  type ComponentType,
  type HTMLAttributes,
} from "react";
import {
  motion,
  useAnimation,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";
import { cn } from "@/lib/utils";
import {
  useParentHoverAnimation,
  type AnimatedIconHandle,
} from "@/lib/use-parent-hover-animation";

export interface LucideAnimatedProps extends HTMLAttributes<HTMLDivElement> {
  size?: number | string;
  strokeWidth?: number | string;
  color?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

export type LucideAnimatedHandle = AnimatedIconHandle;

export const ICON_VARIANTS: Record<string, Variants> = {
  default: {
    normal: { scale: 1 },
    animate: {
      scale: [1, 1.15, 0.95, 1],
      transition: { duration: 0.35, ease: "easeOut" },
    },
  },
  pin: {
    normal: { y: 0, scale: 1 },
    animate: {
      y: [0, -4, 1, 0],
      scale: [1, 1.12, 0.96, 1],
      transition: { duration: 0.45, ease: "easeOut" },
    },
  },
  clock: {
    normal: { rotate: 0 },
    animate: {
      rotate: 360,
      transition: { duration: 0.6, ease: "easeInOut" },
    },
  },
  alert: {
    normal: { scale: 1, rotate: 0 },
    animate: {
      scale: [1, 1.15, 1],
      rotate: [0, -8, 8, -6, 6, 0],
      transition: { duration: 0.45, ease: "easeInOut" },
    },
  },
  check: {
    normal: { scale: 1 },
    animate: {
      scale: [1, 1.25, 0.9, 1],
      transition: { duration: 0.4, ease: "easeOut" },
    },
  },
  pulse: {
    normal: { scale: 1 },
    animate: {
      scale: [1, 1.25, 1, 1.18, 1],
      transition: { duration: 0.5, ease: "easeInOut" },
    },
  },
  award: {
    normal: { scale: 1, rotate: 0 },
    animate: {
      scale: [1, 1.2, 1],
      rotate: [0, -10, 10, 0],
      transition: { duration: 0.5, ease: "easeOut" },
    },
  },
  spin: {
    normal: { rotate: 0 },
    animate: {
      rotate: 360,
      transition: { duration: 0.55, ease: "easeInOut" },
    },
  },
  infiniteSpin: {
    normal: { rotate: 0 },
    animate: {
      rotate: 360,
      transition: { repeat: Infinity, duration: 1, ease: "linear" },
    },
  },
  arrowLeft: {
    normal: { x: 0 },
    animate: {
      x: [0, -4, 0],
      transition: { duration: 0.35, ease: "easeInOut" },
    },
  },
  arrowRight: {
    normal: { x: 0 },
    animate: {
      x: [0, 4, 0],
      transition: { duration: 0.35, ease: "easeInOut" },
    },
  },
  arrowUp: {
    normal: { y: 0 },
    animate: {
      y: [0, -4, 0],
      transition: { duration: 0.35, ease: "easeInOut" },
    },
  },
  arrowDown: {
    normal: { y: 0 },
    animate: {
      y: [0, 4, 0],
      transition: { duration: 0.35, ease: "easeInOut" },
    },
  },
  arrowUpRight: {
    normal: { x: 0, y: 0 },
    animate: {
      x: [0, 3, 0],
      y: [0, -3, 0],
      transition: { duration: 0.35, ease: "easeInOut" },
    },
  },
  camera: {
    normal: { scale: 1 },
    animate: {
      scale: [1, 1.18, 0.95, 1],
      transition: { duration: 0.35, ease: "easeOut" },
    },
  },
  phone: {
    normal: { rotate: 0 },
    animate: {
      rotate: [0, -14, 14, -10, 10, 0],
      transition: { duration: 0.5, ease: "easeInOut" },
    },
  },
  trash: {
    normal: { y: 0, rotate: 0 },
    animate: {
      y: [0, -3, 0],
      rotate: [0, -8, 8, 0],
      transition: { duration: 0.4, ease: "easeInOut" },
    },
  },
  save: {
    normal: { scale: 1 },
    animate: {
      scale: [1, 0.9, 1.15, 1],
      transition: { duration: 0.35, ease: "easeOut" },
    },
  },
  eraser: {
    normal: { rotate: 0, x: 0 },
    animate: {
      rotate: [0, -15, 15, -10, 10, 0],
      x: [0, -2, 2, 0],
      transition: { duration: 0.45, ease: "easeInOut" },
    },
  },
  message: {
    normal: { scale: 1 },
    animate: {
      scale: [1, 1.2, 0.95, 1],
      transition: { duration: 0.4, ease: "easeOut" },
    },
  },
  lock: {
    normal: { y: 0 },
    animate: {
      y: [0, -3, 0],
      transition: { duration: 0.35, ease: "easeInOut" },
    },
  },
};

export function createAnimatedIcon(
  BaseIcon: ComponentType<{
    size?: number | string;
    strokeWidth?: number | string;
    color?: string;
    className?: string;
    "aria-hidden"?: boolean | "true" | "false";
  }>,
  variants: Variants = ICON_VARIANTS.default,
  displayName?: string
) {
  const AnimatedComponent = forwardRef<LucideAnimatedHandle, LucideAnimatedProps>(
    (
      {
        onMouseEnter,
        onMouseLeave,
        className,
        size = 16,
        strokeWidth = 2,
        color,
        "aria-hidden": ariaHidden,
        ...props
      },
      ref
    ) => {
      const controls = useAnimation();
      const shouldReduceMotion = useReducedMotion();
      const isControlledRef = useRef(false);
      const resolvedAriaHidden = props["aria-label"]
        ? undefined
        : (ariaHidden ?? true);

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
          className={cn(
            "inline-flex shrink-0 items-center justify-center select-none [&>div>svg]:size-full",
            className
          )}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          {...props}
        >
          <motion.div
            animate={controls}
            initial="normal"
            variants={variants}
            className="inline-flex size-full items-center justify-center pointer-events-none"
          >
            <BaseIcon
              size={size}
              strokeWidth={strokeWidth}
              color={color}
              aria-hidden={true}
            />
          </motion.div>
        </div>
      );
    }
  );

  if (displayName) {
    AnimatedComponent.displayName = displayName;
  }

  return AnimatedComponent;
}
