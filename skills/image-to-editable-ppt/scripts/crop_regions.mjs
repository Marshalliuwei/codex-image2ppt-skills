#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

function usage() {
  return "Usage: crop_regions.mjs --input <image> --regions <regions.json> --out-dir <directory>";
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) throw new Error(`Unexpected argument: ${key}`);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${key}`);
    out[key.slice(2)] = value;
    i += 1;
  }
  return out;
}

function safeName(value) {
  const normalized = String(value).trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!normalized) throw new Error(`Region name cannot be converted to a safe filename: ${value}`);
  return normalized;
}

function integer(value, label) {
  const n = Number(value);
  if (!Number.isInteger(n)) throw new Error(`${label} must be an integer`);
  return n;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input || !args.regions || !args["out-dir"]) throw new Error(usage());

  const modulesDir = process.env.RUNTIME_NODE_MODULES;
  if (!modulesDir) throw new Error("RUNTIME_NODE_MODULES is required; use the path returned by load_workspace_dependencies");
  const requireFromRuntime = createRequire(path.join(modulesDir, "package.json"));
  const sharp = requireFromRuntime("sharp");

  const inputPath = path.resolve(args.input);
  const regionsPath = path.resolve(args.regions);
  const outDir = path.resolve(args["out-dir"]);
  const parsed = JSON.parse(await fs.readFile(regionsPath, "utf8"));
  const regions = Array.isArray(parsed) ? parsed : parsed.regions;
  if (!Array.isArray(regions) || regions.length === 0) throw new Error("Region manifest must contain a non-empty regions array");

  const metadata = await sharp(inputPath).metadata();
  if (!metadata.width || !metadata.height) throw new Error("Could not determine source image dimensions");
  await fs.mkdir(outDir, { recursive: true });

  const seen = new Set();
  const written = [];
  for (const [index, region] of regions.entries()) {
    const name = safeName(region.name ?? `region-${index + 1}`);
    if (seen.has(name)) throw new Error(`Duplicate region name: ${name}`);
    seen.add(name);

    const x = integer(region.x, `${name}.x`);
    const y = integer(region.y, `${name}.y`);
    const width = integer(region.width, `${name}.width`);
    const height = integer(region.height, `${name}.height`);
    const padding = integer(region.padding ?? 0, `${name}.padding`);
    if (width <= 0 || height <= 0 || padding < 0) throw new Error(`${name} has invalid dimensions or padding`);

    const left = Math.max(0, x - padding);
    const top = Math.max(0, y - padding);
    const right = Math.min(metadata.width, x + width + padding);
    const bottom = Math.min(metadata.height, y + height + padding);
    if (left >= right || top >= bottom) throw new Error(`${name} is outside the source image`);

    const outputPath = path.join(outDir, `${name}.png`);
    await sharp(inputPath)
      .extract({ left, top, width: right - left, height: bottom - top })
      .png()
      .toFile(outputPath);
    written.push({ name, path: outputPath, x: left, y: top, width: right - left, height: bottom - top });
  }

  const manifestPath = path.join(outDir, "crop-manifest.json");
  await fs.writeFile(manifestPath, `${JSON.stringify({ source: inputPath, width: metadata.width, height: metadata.height, regions: written }, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ count: written.length, manifest: manifestPath })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
