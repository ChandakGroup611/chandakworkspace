import fs from "fs";
import path from "path";

interface DiscoveredRoute {
  pattern: RegExp;
  rawPath: string;
}

function getAllFiles(dir: string, exts?: string[]): string[] {
  let files: string[] = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git" || entry.name === "scratch") continue;
    if (entry.isDirectory()) {
      files = files.concat(getAllFiles(full, exts));
    } else if (!exts || exts.some((ext) => entry.name.endsWith(ext))) {
      files.push(full);
    }
  }
  return files;
}

function buildRouteRegex(routePath: string): RegExp {
  // Convert Next.js route path to regex:
  // e.g. /vehicle/[[...slug]] -> ^/vehicle(?:/.*)?$
  // e.g. /auth/[...rest] -> ^/auth/.*$
  // e.g. /tickets/[id] -> ^/tickets/[^/]+$
  // e.g. / -> ^/$
  let p = routePath
    .replace(/\/\[\[\.\.\.[^\]]+\]\]/g, "(?:/.*)?")
    .replace(/\[\[\.\.\.[^\]]+\]\]/g, "(?:/.*)?")
    .replace(/\/\[\.\.\.[^\]]+\]/g, "/.+")
    .replace(/\[\.\.\.[^\]]+\]/g, ".+")
    .replace(/\[[^\]]+\]/g, "[^/]+");
  return new RegExp(`^${p}$`);
}

export function loadAllAppRoutes(): DiscoveredRoute[] {
  const routes: DiscoveredRoute[] = [];

  // 1. Static files in public/
  const publicFiles = getAllFiles("public");
  for (const pFile of publicFiles) {
    const fullNormalized = path.resolve(pFile).replace(/\\/g, "/");
    const pubNormalized = path.resolve("public").replace(/\\/g, "/");
    let rel = fullNormalized.replace(pubNormalized, "");
    if (!rel.startsWith("/")) rel = "/" + rel;
    // URL-encoded variants
    const encoded = encodeURI(rel);
    routes.push({ rawPath: rel, pattern: new RegExp(`^${rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) });
    if (encoded !== rel) {
      routes.push({ rawPath: encoded, pattern: new RegExp(`^${encoded.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) });
    }
  }

  // 2. Base well-known routes
  const baseRoutes = [
    "/",
    "/api/version",
    "/api/health",
    "/manifest.json",
    "/offline"
  ];
  for (const b of baseRoutes) {
    routes.push({ rawPath: b, pattern: new RegExp(`^${b}$`) });
  }

  // 3. App Router pages & API routes
  const appFiles = getAllFiles("app", [".ts", ".tsx", ".js", ".jsx"]);
  for (const file of appFiles) {
    const base = path.basename(file);
    if (base.startsWith("page.") || base.startsWith("route.")) {
      const fullNormalized = path.resolve(file).replace(/\\/g, "/");
      const appNormalized = path.resolve("app").replace(/\\/g, "/");
      let rel = fullNormalized.replace(appNormalized, "");
      rel = rel.replace(/\/(page|route)\.(tsx?|jsx?)$/, "");
      if (rel === "/page" || rel === "/route" || rel === "") rel = "/";

      routes.push({
        rawPath: rel,
        pattern: buildRouteRegex(rel)
      });
    }
  }

  return routes;
}

interface DeadLinkOccurrence {
  file: string;
  line: number;
  type: "href" | "router" | "redirect" | "email";
  link: string;
  cleanPath: string;
  reason: string;
}

export function scanForDeadLinks(routes: DiscoveredRoute[]): DeadLinkOccurrence[] {
  const codeFiles = [
    ...getAllFiles("app", [".ts", ".tsx", ".js", ".jsx"]),
    ...getAllFiles("components", [".ts", ".tsx", ".js", ".jsx"]),
    ...getAllFiles("lib", [".ts", ".tsx", ".js", ".jsx"])
  ];

  const deadLinks: DeadLinkOccurrence[] = [];

  // Patterns to match links in code
  const hrefRegex = /\bhref\s*=\s*["'`]([^"'`]+)["'`]/g;
  const routerPushRegex = /\brouter\.(?:push|replace)\s*\(\s*["'`]([^"'`]+)["'`]/g;
  const redirectRegex = /\b(?:redirect|permanentRedirect)\s*\(\s*["'`]([^"'`]+)["'`]/g;

  // External or non-navigational protocols
  const isIgnored = (link: string) => {
    if (!link) return true;
    const l = link.trim();
    if (l.startsWith("http://") || l.startsWith("https://")) return true;
    if (l.startsWith("mailto:") || l.startsWith("tel:")) return true;
    if (l.startsWith("#") || l.startsWith("blob:") || l.startsWith("data:")) return true;
    if (l.startsWith("javascript:")) return true;
    if (l.startsWith("ftp://")) return true;
    // Template string starting with a variable e.g. `${url}` or `${redirectOrigin}`
    if (l.startsWith("${") && !l.startsWith("${siteUrl}/") && !l.startsWith("${baseUrl}/")) {
      return true;
    }
    // Template placeholder like {{link}} or regex snippet like [^"
    if (l.includes("{{") || l.includes("[^")) return true;
    return false;
  };

  const checkLink = (link: string, file: string, line: number, type: "href" | "router" | "redirect" | "email") => {
    if (isIgnored(link)) return;

    let clean = link.trim();
    if (clean.startsWith("${siteUrl}")) clean = clean.slice("${siteUrl}".length);
    if (clean.startsWith("${baseUrl}")) clean = clean.slice("${baseUrl}".length);
    if (clean.startsWith("${origin}")) clean = clean.slice("${origin}".length);

    // Strip query strings and hash anchors
    let cleanPath = clean.split("?")[0].split("#")[0].trim();
    if (!cleanPath.startsWith("/")) {
      if (cleanPath === "" || cleanPath.startsWith("${")) return;
      cleanPath = "/" + cleanPath;
    }

    // Replace interpolation segments e.g. /tasks/${id} -> /tasks/param_placeholder
    cleanPath = cleanPath.replace(/\$\{[^}]+\}/g, "param_placeholder");

    // If string ends with slash because of string concatenation e.g. "/users/" + id
    if (cleanPath.endsWith("/") && cleanPath.length > 1) {
      // Test both with trailing placeholder and exact path
      const withPlaceholder = cleanPath + "param_placeholder";
      const withoutTrailingSlash = cleanPath.slice(0, -1);
      if (routes.some((r) => r.pattern.test(withPlaceholder) || r.pattern.test(withoutTrailingSlash))) {
        return;
      }
    }

    // Skip purely dynamic paths where root itself is variable e.g. /${module}/${id}
    if (cleanPath === "/param_placeholder" || cleanPath.startsWith("/param_placeholder/")) {
      return;
    }

    // If string ends with placeholder that might be query parameters or dynamic ID
    const withoutTrailingPlaceholder = cleanPath.replace(/\/param_placeholder$/, "").replace(/param_placeholder$/, "");
    if (routes.some((r) => r.pattern.test(withoutTrailingPlaceholder))) {
      return;
    }

    // Match against discovered application routes
    const matches = routes.some((r) => r.pattern.test(cleanPath));
    if (!matches) {
      deadLinks.push({
        file: file.replace(/\\/g, "/"),
        line,
        type,
        link,
        cleanPath,
        reason: `Path '${cleanPath}' does not resolve to any active Next.js page or API route`
      });
    }
  };

  for (const file of codeFiles) {
    if (file.includes("http-error-logger") || file.includes("ROUTES.md") || file.includes("check-dead-links")) continue;

    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");

    lines.forEach((lineText, idx) => {
      const lineNum = idx + 1;
      let m: RegExpExecArray | null;

      while ((m = hrefRegex.exec(lineText)) !== null) {
        checkLink(m[1], file, lineNum, "href");
      }

      while ((m = routerPushRegex.exec(lineText)) !== null) {
        checkLink(m[1], file, lineNum, "router");
      }

      while ((m = redirectRegex.exec(lineText)) !== null) {
        checkLink(m[1], file, lineNum, "redirect");
      }
    });
  }

  return deadLinks;
}

async function main() {
  const routes = loadAllAppRoutes();
  console.log(`Loaded ${routes.length} application routes (including static assets).`);

  const deadLinks = scanForDeadLinks(routes);
  console.log(`\nDead Link Scan Results: Found ${deadLinks.length} dead links.`);

  if (deadLinks.length > 0) {
    console.table(deadLinks);
  }

  const isCi = process.argv.includes("--ci");
  if (isCi && deadLinks.length > 0) {
    console.error(`\n❌ CI FAILURE: ${deadLinks.length} dead links detected in application code!`);
    process.exit(1);
  } else {
    console.log("\n✅ All links successfully verified against live route contract.");
  }
}

if (require.main === module || process.argv[1]?.endsWith("check-dead-links.ts")) {
  main().catch(console.error);
}
