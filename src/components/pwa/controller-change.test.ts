import { describe, expect, it, vi } from "vitest";
import { createControllerChangeHandler } from "./controller-change";

describe("mudança do controlador do service worker", () => {
  it("não recarrega quando a primeira instalação assume o controle", () => {
    const reload = vi.fn();
    const change = createControllerChangeHandler(false, reload);
    change();
    expect(reload).not.toHaveBeenCalled();
  });
  it("recarrega uma vez quando uma atualização substitui o primeiro controlador", () => {
    const reload = vi.fn();
    const change = createControllerChangeHandler(false, reload);
    change();
    expect(reload).not.toHaveBeenCalled();
    change();
    expect(reload).toHaveBeenCalledOnce();
  });
  it("recarrega ao atualizar uma página que já tinha controlador", () => {
    const reload = vi.fn();
    createControllerChangeHandler(true, reload)();
    expect(reload).toHaveBeenCalledOnce();
  });
  it.each([true, false])("ignora eventos repetidos após iniciar a recarga: %s", (initiallyControlled) => {
    const reload = vi.fn();
    const change = createControllerChangeHandler(initiallyControlled, reload);
    change(); change(); change(); change();
    expect(reload).toHaveBeenCalledOnce();
  });
});
