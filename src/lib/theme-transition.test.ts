import { afterEach, describe, expect, it, vi } from "vitest";
import { changeTheme } from "./theme-transition";

const originalTransition = Object.getOwnPropertyDescriptor(document, "startViewTransition");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.documentElement.removeAttribute("data-theme-transition");
  if (originalTransition) Object.defineProperty(document, "startViewTransition", originalTransition);
  else Reflect.deleteProperty(document, "startViewTransition");
});

describe("changeTheme", () => {
  it("changes theme directly when View Transitions are unavailable", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: undefined });
    const setTheme = vi.fn();
    changeTheme(setTheme, "dark");
    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("respects reduced motion", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const start = vi.fn();
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: start });
    const setTheme = vi.fn();
    changeTheme(setTheme, "light");
    expect(start).not.toHaveBeenCalled();
    expect(setTheme).toHaveBeenCalledWith("light");
  });
});
