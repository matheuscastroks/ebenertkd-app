"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Tabs as TabsPrimitive } from "radix-ui"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "relative group/tabs-list inline-flex w-fit items-center justify-center rounded-xl p-1 text-muted-foreground min-h-11 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  children,
  ref,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  const listRef = React.useRef<React.ComponentRef<typeof TabsPrimitive.List> | null>(null)
  const pillRef = React.useRef<HTMLSpanElement | null>(null)
  const [pillReady, setPillReady] = React.useState(false)
  const hasMeasuredRef = React.useRef(false)

  React.useLayoutEffect(() => {
    if (variant !== "default") return
    const list = listRef.current
    const pill = pillRef.current
    if (!list || !pill) return

    const syncPill = (animate: boolean) => {
      const activeTab = list.querySelector<HTMLElement>(
        '[data-slot="tabs-trigger"][data-state="active"]'
      )
      if (!activeTab || activeTab.offsetWidth === 0) return

      const applyGeometry = () => {
        pill.style.transform = `translate3d(${activeTab.offsetLeft}px, ${activeTab.offsetTop}px, 0)`
        pill.style.width = `${activeTab.offsetWidth}px`
        pill.style.height = `${activeTab.offsetHeight}px`
      }

      if (!animate) {
        const previousTransition = pill.style.transition
        pill.style.transition = "none"
        applyGeometry()
        void pill.offsetWidth
        pill.style.transition = previousTransition
      } else {
        applyGeometry()
      }

      if (!hasMeasuredRef.current) {
        hasMeasuredRef.current = true
        setPillReady(true)
      }
    }

    syncPill(false)

    const mutationObserver = new MutationObserver(() => {
      syncPill(hasMeasuredRef.current)
    })
    mutationObserver.observe(list, {
      attributes: true,
      attributeFilter: ["data-state"],
      subtree: true,
    })

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => syncPill(false))
        : null
    resizeObserver?.observe(list)

    return () => {
      mutationObserver.disconnect()
      resizeObserver?.disconnect()
    }
  }, [variant])

  const assignRef = React.useCallback(
    (node: React.ComponentRef<typeof TabsPrimitive.List> | null) => {
      listRef.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    },
    [ref]
  )

  return (
    <TabsPrimitive.List
      ref={assignRef}
      data-slot="tabs-list"
      data-variant={variant}
      data-pill-ready={pillReady ? "true" : undefined}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      {variant === "default" ? (
        <span
          ref={pillRef}
          aria-hidden="true"
          data-slot="tabs-pill"
          className={cn(
            "pointer-events-none absolute top-0 left-0 z-0 rounded-lg segmented-indicator transition-[transform,width,height,opacity] duration-(--duration-fast) ease-(--ease-smooth-out) motion-reduce:transition-none",
            pillReady ? "opacity-100" : "opacity-0"
          )}
        />
      ) : null}
      {children}
    </TabsPrimitive.List>
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative z-1 inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-[color,background-color,box-shadow,transform] duration-(--duration-fast) ease-(--ease-smooth-out) motion-reduce:transition-none group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 dark:text-muted-foreground dark:hover:text-foreground group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent",
        "data-[state=active]:bg-card data-[state=active]:text-foreground dark:data-[state=active]:bg-card-elevated dark:data-[state=active]:text-foreground",
        "group-data-[pill-ready=true]/tabs-list:data-[state=active]:bg-transparent! group-data-[pill-ready=true]/tabs-list:data-[state=active]:shadow-none! dark:group-data-[pill-ready=true]/tabs-list:data-[state=active]:bg-transparent!",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-[opacity,transform] after:duration-(--duration-fast) after:ease-(--ease-smooth-out) motion-reduce:after:transition-none group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("t-panel-enter flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
