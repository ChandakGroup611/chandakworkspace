import fs from "fs";
import path from "path";

interface ApiRouteInfo {
  path: string;
  sourceFile: string;
  type: "api" | "page";
  allowedMethods: string[];
}

function getAllFiles(dir: string, exts: string[] = [".ts", ".tsx", ".js", ".jsx"]): string[] {
  let files: string[] = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
    if (entry.isDirectory()) {
      files = files.concat(getAllFiles(full, exts));
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      files.push(full);
    }
  }
  return files;
}

function normalizeRoutePath(filePath: string): string {
  // Convert app/api/version/route.ts -> /api/version
  // Convert app/dashboards/[key]/[[...path]]/route.ts -> /dashboards/[key]/[[...path]]
  let rel = path.relative(path.resolve("app"), filePath).replace(/\\/g, "/");
  rel = rel.replace(/\/(route|page)\.(tsx?|jsx?)$/, "");
  if (rel === "page" || rel === "route" || rel === "") return "/";
  return "/" + rel;
}

export function discoverRoutes(): ApiRouteInfo[] {
  const routes: ApiRouteInfo[] = [];
  const files = getAllFiles("app");

  for (const file of files) {
    const base = path.basename(file);
    if (base.startsWith("route.")) {
      const content = fs.readFileSync(file, "utf8");
      const methods: string[] = [];
      const standardMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
      for (const m of standardMethods) {
        const regex = new RegExp(`(export\\s+(async\\s+)?function\\s+${m}\\b|export\\s*\\{[^}]*\\b${m}\\b)`);
        if (regex.test(content)) {
          methods.push(m);
        }
      }
      routes.push({
        path: normalizeRoutePath(file),
        sourceFile: file.replace(/\\/g, "/"),
        type: "api",
        allowedMethods: methods
      });
    } else if (base.startsWith("page.")) {
      routes.push({
        path: normalizeRoutePath(file),
        sourceFile: file.replace(/\\/g, "/"),
        type: "page",
        allowedMethods: ["GET", "HEAD", "POST"] // POST allowed for Next.js Server Actions
      });
    }
  }

  return routes.sort((a, b) => a.path.localeCompare(b.path));
}

export function generateRoutesMd(routes: ApiRouteInfo[]): string {
  let md = "# Application Routes & Method Contract (ROUTES.md)\n\n";
  md += "> Authoritative contract of all active HTTP routes, allowed methods, and types.\n";
  md += `> Automatically generated on ${new Date().toISOString()}.\n\n`;

  md += "## 1. API Endpoints\n\n";
  md += "| Endpoint Path | Allowed Methods | Source File |\n";
  md += "| :--- | :--- | :--- |\n";

  const apiRoutes = routes.filter((r) => r.type === "api");
  for (const r of apiRoutes) {
    md += `| \`${r.path}\` | \`${r.allowedMethods.join(", ")}\` | [\`${r.sourceFile}\`](file:///${path.resolve(r.sourceFile).replace(/\\/g, "/")}) |\n`;
  }

  md += "\n## 2. Page & View Routes\n\n";
  md += "| Page Route | Allowed Methods | Source File |\n";
  md += "| :--- | :--- | :--- |\n";

  const pageRoutes = routes.filter((r) => r.type === "page");
  for (const r of pageRoutes) {
    md += `| \`${r.path}\` | \`${r.allowedMethods.join(", ")}\` | [\`${r.sourceFile}\`](file:///${path.resolve(r.sourceFile).replace(/\\/g, "/")}) |\n`;
  }

  return md;
}

export function scanCodebaseCalls(routes: ApiRouteInfo[]) {
  const codeFiles = [
    ...getAllFiles("app"),
    ...getAllFiles("components"),
    ...getAllFiles("lib")
  ];

  const routeMap = new Map<string, ApiRouteInfo>();
  routes.forEach((r) => routeMap.set(r.path, r));

  const mismatches: Array<{ file: string; url: string; method: string; reason: string }> = [];

  const fetchRegex = /fetch\s*\(\s*(['"`][^'"`]+['"`]|`[^`]+`)/g;
  const methodRegex = /method\s*:\s*['"`]([A-Za-z]+)['"`]/;

  for (const file of codeFiles) {
    const content = fs.readFileSync(file, "utf8");
    let match: RegExpExecArray | null;

    while ((match = fetchRegex.exec(content)) !== null) {
      let rawUrl = match[1].slice(1, -1).trim();
      // Only check internal /api/ routes
      if (!rawUrl.startsWith("/api/")) continue;

      // Clean template strings e.g. /api/proxy-attachment/${id} -> /api/proxy-attachment/[id]
      const cleanUrl = rawUrl
        .split("?")[0]
        .replace(/\$\{[^}]+\}/g, (m) => "[id]");

      // Look around fetch call for method: "..."
      const windowAround = content.slice(match.index, match.index + 250);
      const mMatch = methodRegex.exec(windowAround);
      const method = mMatch ? mMatch[1].toUpperCase() : "GET";

      // Match against known routes
      let matchedRoute: ApiRouteInfo | undefined;
      for (const [rPath, rInfo] of routeMap.entries()) {
        if (rInfo.type !== "api") continue;
        const pattern = "^" + rPath.replace(/\[\.\.\.[^\]]+\]/g, ".*").replace(/\[\[\.\.\.[^\]]+\]\]/g, ".*").replace(/\[[^\]]+\]/g, "[^/]+") + "$";
        if (new RegExp(pattern).test(cleanUrl)) {
          matchedRoute = rInfo;
          break;
        }
      }

      if (!matchedRoute) {
        mismatches.push({
          file: file.replace(/\\/g, "/"),
          url: cleanUrl,
          method,
          reason: "404 Not Found (no matching API route registered)"
        });
      } else if (!matchedRoute.allowedMethods.includes(method)) {
        mismatches.push({
          file: file.replace(/\\/g, "/"),
          url: cleanUrl,
          method,
          reason: `405 Method Not Allowed (endpoint accepts: ${matchedRoute.allowedMethods.join(", ")})`
        });
      }
    }
  }

  return mismatches;
}

async function main() {
  const routes = discoverRoutes();
  console.log(`Discovered ${routes.length} total routes (${routes.filter(r => r.type === 'api').length} API, ${routes.filter(r => r.type === 'page').length} Pages)`);

  const md = generateRoutesMd(routes);
  fs.writeFileSync(path.resolve("docs/ROUTES.md"), md, "utf8");
  console.log("Wrote authoritative docs/ROUTES.md");

  const mismatches = scanCodebaseCalls(routes);
  console.log(`\nScan complete: Found ${mismatches.length} method or route mismatches.`);
  if (mismatches.length > 0) {
    console.table(mismatches);
  }
}

if (require.main === module || process.argv[1]?.endsWith("scan-api-contracts.ts")) {
  main().catch(console.error);
}
