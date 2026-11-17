import { test as base, expect } from "@playwright/test";

export const test = base.extend({
  context: async ({ context, baseURL }, provideContext) => {
    const origin = new URL(baseURL ?? "http://127.0.0.1:3000").origin;
    // Testes públicos não precisam acessar nenhum serviço externo, inclusive produção.
    await context.route("**/*", (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await provideContext(context);
  }
});
export { expect };
