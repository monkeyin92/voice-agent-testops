#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { access, mkdir, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_HTML = ".voice-testops/report.html";
const DEFAULT_PDF = ".voice-testops/report.pdf";
const DEFAULT_PNG = ".voice-testops/report.png";

const args = parseArgs(process.argv.slice(2));
const htmlPath = path.resolve(ROOT_DIR, args.html ?? DEFAULT_HTML);
const pdfPath = path.resolve(ROOT_DIR, args.pdf ?? DEFAULT_PDF);
const pngPath = path.resolve(ROOT_DIR, args.png ?? DEFAULT_PNG);

await ensureReadableReport(htmlPath);
await mkdir(path.dirname(pdfPath), { recursive: true });
await mkdir(path.dirname(pngPath), { recursive: true });

const server = await startStaticServer(ROOT_DIR);
const browser = await chromium.launch({ headless: true });

try {
  const reportRoute = path.relative(ROOT_DIR, htmlPath).split(path.sep).map(encodeURIComponent).join("/");
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1600 },
    deviceScaleFactor: 1,
  });
  await page.goto(`http://127.0.0.1:${server.port}/${reportRoute}`, { waitUntil: "networkidle" });
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "14mm", right: "12mm", bottom: "14mm", left: "12mm" },
  });
  await page.screenshot({
    path: pngPath,
    fullPage: true,
  });
  console.log(`PDF report: ${path.relative(ROOT_DIR, pdfPath)}`);
  console.log(`PNG report: ${path.relative(ROOT_DIR, pngPath)}`);
} finally {
  await browser.close();
  await new Promise((resolve, reject) => {
    server.instance.close((error) => (error ? reject(error) : resolve()));
  });
}

function parseArgs(argv) {
  const values = new Map();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${arg} requires a value`);
    }

    values.set(arg.slice(2), value);
    index += 1;
  }

  return {
    html: values.get("html"),
    pdf: values.get("pdf"),
    png: values.get("png"),
  };
}

async function ensureReadableReport(filePath) {
  await access(filePath);
  const info = await stat(filePath);
  if (!info.isFile()) {
    throw new Error(`${path.relative(ROOT_DIR, filePath)} is not a file`);
  }
}

async function startStaticServer(rootDir) {
  const instance = http.createServer((request, response) => {
    const rawPath = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname);
    const relativePath = rawPath === "/" ? DEFAULT_HTML : rawPath.slice(1);
    const filePath = path.resolve(rootDir, relativePath);

    if (!isInsideRoot(rootDir, filePath)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const stream = createReadStream(filePath);
    stream.on("open", () => {
      response.writeHead(200, { "content-type": contentTypeFor(filePath) });
      stream.pipe(response);
    });
    stream.on("error", () => {
      response.writeHead(404);
      response.end("Not found");
    });
  });

  await new Promise((resolve, reject) => {
    instance.once("error", reject);
    instance.listen(0, "127.0.0.1", resolve);
  });

  const address = instance.address();
  if (typeof address !== "object" || address === null) {
    throw new Error("Could not start report export server");
  }

  return { instance, port: address.port };
}

function isInsideRoot(rootDir, filePath) {
  const relative = path.relative(rootDir, filePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function contentTypeFor(filePath) {
  switch (path.extname(filePath)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".png":
      return "image/png";
    case ".pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}
