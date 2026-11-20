import "@testing-library/jest-dom/vitest";

if (typeof window !== "undefined") {
  Object.defineProperties(Element.prototype, {
    hasPointerCapture: { value: () => false },
    setPointerCapture: { value: () => undefined },
    releasePointerCapture: { value: () => undefined },
    scrollIntoView: { value: () => undefined }
  });

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false
    })
  });

  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
}
