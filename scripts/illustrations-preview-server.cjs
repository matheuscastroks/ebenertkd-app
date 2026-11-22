// Serve only generated visual fixtures and public assets on loopback, never Appwrite.
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const pages = { "/aluno/eventos": "aluno-eventos", "/admin/eventos": "admin-eventos", "/aluno/exames": "aluno-exames", "/aluno/conquistas": "aluno-conquistas" };
const publicRoot = path.resolve("public");
const fontRoot = path.resolve("src/app/fonts");
const pageRoot = path.resolve("reports/illustrations/pages");
const types = { ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".ttf": "font/ttf", ".html": "text/html; charset=utf-8" };
const rootHtml = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prévia local das ilustrações</title><style>body{font:16px/1.6 system-ui;margin:32px;max-width:900px;background:#f4f3f7;color:#252329}a{color:#754300}td,th{padding:12px;text-align:left}table{background:white;border-radius:16px}h1{font-size:26px}</style><h1>Ilustrações — prévia local</h1><p>Páginas reais com dados fictícios, sem conexão com o Appwrite. Prévia visual estática: ações de inscrição e pagamento não são executadas.</p><table><tr><th>Página</th><th>Com conteúdo</th><th>Estado vazio</th></tr>${Object.entries(pages).map(([url, name]) => `<tr><td>${name}</td><td><a href="${url}">Abrir</a></td><td><a href="${url}?empty=1">Abrir</a></td></tr>`).join("")}</table><p><a href="/gallery">Coleção completa com os avatares de referência</a></p></html>`;

function inside(root, name) {
  const resolved = path.resolve(root, name);
  if (!resolved.startsWith(root + path.sep)) throw new Error("Invalid asset path");
  return resolved;
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    response.setHeader("Content-Security-Policy", "default-src 'self'; connect-src 'none'; img-src 'self' data:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; form-action 'none'; frame-ancestors 'none'");
    response.setHeader("Cache-Control", "no-store");
    let file;
    let html;
    if (url.pathname === "/") html = rootHtml;
    else if (pages[url.pathname]) file = path.join(pageRoot, `${pages[url.pathname]}${url.searchParams.has("empty") ? "-empty" : ""}.html`);
    else if (url.pathname === "/gallery") file = path.resolve("docs/illustrations/gallery.html");
    else if (url.pathname.startsWith("/assets/")) file = inside(publicRoot, decodeURIComponent(url.pathname.slice(8)));
    else if (url.pathname.startsWith("/fonts/")) file = inside(fontRoot, decodeURIComponent(url.pathname.slice(7)));
    else { response.writeHead(404); response.end("Esta tela não faz parte da prévia local."); return; }
    if (file && !types[path.extname(file)]) throw new Error("Unsupported asset");
    if (file && path.extname(file) === ".html") html = await fs.readFile(file, "utf8");
    if (html) {
      html = html.replaceAll(pathToFileURL(publicRoot).href + "/", "/assets/").replaceAll(pathToFileURL(fontRoot).href + "/", "/fonts/").replaceAll("../../public/", "/assets/");
      // Next's image optimizer is unnecessary for the standalone visual fixture.
      html = html.replace(/(?:https?:\/\/localhost:3000)?\/assets\/_next\/image\?url=([^&"\s]+)[^"\s]*/g, (_, encoded) => `/assets${decodeURIComponent(encoded)}`);
      html = html.replace(/<form\b/g, '<form onsubmit="event.preventDefault()"');
      response.writeHead(200, { "Content-Type": types[".html"] }); response.end(html);
    } else {
      const content = await fs.readFile(file);
      response.writeHead(200, { "Content-Type": types[path.extname(file)] }); response.end(content);
    }
  } catch {
    response.writeHead(404); response.end("Arquivo de prévia não encontrado. Gere as páginas locais primeiro.");
  }
});
server.listen(Number(process.env.ILLUSTRATION_PREVIEW_PORT || 4317), "127.0.0.1", () => {
  console.log(`Offline illustration preview: http://127.0.0.1:${server.address().port}`);
});
