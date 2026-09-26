import { render, screen, act } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { MobileGestureDetector } from "@/components/dashboard/mobile-gesture-detector";

function TestGestureWrapper() {
  const { openMobile, isMobile } = useSidebar();
  return (
    <div>
      <span data-testid="is-mobile">{isMobile ? "yes" : "no"}</span>
      <span data-testid="drawer-state">{openMobile ? "open" : "closed"}</span>
      <MobileGestureDetector />
    </div>
  );
}

describe("MobileGestureDetector", () => {
  beforeEach(() => {
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false
    })) as unknown as typeof window.matchMedia;
  });

  it("opens mobile drawer when swiping right from left edge on mobile screen", () => {
    render(
      <SidebarProvider defaultOpen={false}>
        <TestGestureWrapper />
      </SidebarProvider>
    );

    expect(screen.getByTestId("is-mobile")).toHaveTextContent("yes");

    // Simulate touch start near left edge (x=10, y=100)
    act(() => {
      const touchStart = new CustomEvent("touchstart") as unknown as TouchEvent;
      Object.defineProperty(touchStart, "touches", {
        value: [{ clientX: 10, clientY: 100 }]
      });
      window.dispatchEvent(touchStart);
    });

    // Simulate touch end 100px to the right (x=110, y=105)
    act(() => {
      const touchEnd = new CustomEvent("touchend") as unknown as TouchEvent;
      Object.defineProperty(touchEnd, "changedTouches", {
        value: [{ clientX: 110, clientY: 105 }]
      });
      window.dispatchEvent(touchEnd);
    });

    expect(screen.getByTestId("drawer-state")).toHaveTextContent("open");
  });

  it("does not open mobile drawer if swipe did not start from left edge", () => {
    render(
      <SidebarProvider defaultOpen={false}>
        <TestGestureWrapper />
      </SidebarProvider>
    );

    // Start swipe in the center of the screen (x=200, y=100)
    act(() => {
      const touchStart = new CustomEvent("touchstart") as unknown as TouchEvent;
      Object.defineProperty(touchStart, "touches", {
        value: [{ clientX: 200, clientY: 100 }]
      });
      window.dispatchEvent(touchStart);
    });

    act(() => {
      const touchEnd = new CustomEvent("touchend") as unknown as TouchEvent;
      Object.defineProperty(touchEnd, "changedTouches", {
        value: [{ clientX: 300, clientY: 100 }]
      });
      window.dispatchEvent(touchEnd);
    });

    expect(screen.getByTestId("drawer-state")).toHaveTextContent("closed");
  });
});
