import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  let target = specifier;
  let isFilePath = false;

  if (target === "next/headers") {
    const nextHeadersPath = path.resolve(process.cwd(), "node_modules/next/headers.js");
    return nextResolve(pathToFileURL(nextHeadersPath).href, context);
  }

  if (target === "next/server") {
    const nextServerPath = path.resolve(process.cwd(), "node_modules/next/server.js");
    return nextResolve(pathToFileURL(nextServerPath).href, context);
  }

  if (target.startsWith("@/")) {
    target = path.resolve(process.cwd(), target.replace(/^@\//, ""));
    isFilePath = true;
  } else if (target.startsWith("./") || target.startsWith("../")) {
    const parentDir = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : process.cwd();
    target = path.resolve(parentDir, target);
    isFilePath = true;
  }

  if (isFilePath) {
    if (fs.existsSync(target)) {
      const stat = fs.statSync(target);
      if (stat.isDirectory()) {
        if (fs.existsSync(path.join(target, "index.ts"))) {
          target = path.join(target, "index.ts");
        } else if (fs.existsSync(path.join(target, "index.tsx"))) {
          target = path.join(target, "index.tsx");
        } else if (fs.existsSync(path.join(target, "index.js"))) {
          target = path.join(target, "index.js");
        }
      }
    } else {
      if (fs.existsSync(target + ".ts")) {
        target = target + ".ts";
      } else if (fs.existsSync(target + ".tsx")) {
        target = target + ".tsx";
      } else if (fs.existsSync(target + ".js")) {
        target = target + ".js";
      } else if (fs.existsSync(target + ".mjs")) {
        target = target + ".mjs";
      }
    }
    return nextResolve(pathToFileURL(target).href, context);
  }

  return nextResolve(specifier, context);
}
