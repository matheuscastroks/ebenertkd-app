import { fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { useParentHoverAnimation } from "@/lib/use-parent-hover-animation";

function TestIcon({
  controlled = false,
  onStart,
  onStop,
}: {
  controlled?: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  const isControlledRef = useRef(controlled);
  const { containerRef } = useParentHoverAnimation(isControlledRef, onStart, onStop);
  return <div ref={containerRef} data-testid="animated-icon" />;
}

describe("useParentHoverAnimation", () => {
  it("triggers start and stop callbacks when hovering the parent sidebar menu button or link", () => {
    const onStart = vi.fn();
    const onStop = vi.fn();

    render(
      <a href="/admin" data-slot="sidebar-menu-button">
        <TestIcon onStart={onStart} onStop={onStop} />
        <span>Visão geral</span>
      </a>
    );

    const parentLink = screen.getByRole("link", { name: /Visão geral/i });
    parentLink.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false }));
    expect(onStart).toHaveBeenCalledTimes(1);

    parentLink.dispatchEvent(new MouseEvent("mouseleave", { bubbles: false }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("does not override imperatively controlled icons", () => {
    const onStart = vi.fn();
    const onStop = vi.fn();

    render(
      <button type="button">
        <TestIcon controlled onStart={onStart} onStop={onStop} />
        <span>Ação</span>
      </button>
    );

    const button = screen.getByRole("button", { name: /Ação/i });
    fireEvent.mouseEnter(button);
    button.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false }));
    button.dispatchEvent(new MouseEvent("mouseleave", { bubbles: false }));

    expect(onStart).not.toHaveBeenCalled();
    expect(onStop).not.toHaveBeenCalled();
  });
});
