#!/usr/bin/env node
/**
 * optimize-images.mjs
 *
 * Re-runnable, idempotent-safe image optimizer for the TOP-LEVEL raster
 * assets in public/assets/. Does NOT touch public/assets/seq/** (image
 * sequences, out of scope) or any video (.mp4) files.
 *
 * - PNGs (have alpha): re-encoded with sharp's palette quantizer
 *   (png({ palette: true, quality: 90, effort: 10 })) — near-lossless,
 *   much smaller than default PNG encoding.
 * - JPGs: re-encoded with mozjpeg (jpeg({ quality: 80, mozjpeg: true })).
 * - Every original file that will be touched is backed up first to
 *   BACKUP_DIR (see below), before any overwrite happens.
 * - A file is only overwritten if the recompressed version is at least
 *   MIN_SAVINGS_RATIO smaller than the original. Otherwise the original
 *   is left untouched.
 * - Exact pixel dimensions are always preserved (no resizing is ever
 *   performed).
 *
 * Usage: node scripts/optimize-images.mjs
 *        npm run optimize:images
 */

import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const ASSETS_DIR = path.join(REPO_ROOT, "public", "assets");
const BACKUP_DIR =
  "C:\\Users\\haseg\\AppData\\Local\\Temp\\claude\\C--Users-haseg\\c2a21e13-dbed-4f54-8a73-c306e88cae4f\\scratchpad\\img-backup";

const MIN_SAVINGS_RATIO = 0.08; // only keep new file if >=8% smaller

async function listTopLevelImages() {
  const entries = await fs.readdir(ASSETS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => /\.(png|jpe?g)$/i.test(name));
}

async function backupFile(filePath) {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const dest = path.join(BACKUP_DIR, path.basename(filePath));
  // Only back up once per run per file; if a backup already exists from a
  // previous run we still refresh it so it reflects the true "original"
  // only if that backup doesn't already exist (never clobber the very
  // first captured original).
  try {
    await fs.access(dest);
    // Backup already exists from a prior run - assume it holds the
    // pristine original and do not overwrite it.
  } catch {
    await fs.copyFile(filePath, dest);
  }
}

async function optimizePng(filePath) {
  const original = await fs.readFile(filePath);
  const originalSize = original.length;
  const meta = await sharp(original).metadata();

  const recompressed = await sharp(original)
    .png({ palette: true, quality: 90, effort: 10 })
    .toBuffer();

  const newMeta = await sharp(recompressed).metadata();

  return {
    original,
    originalSize,
    recompressed,
    newSize: recompressed.length,
    dimsMatch:
      meta.width === newMeta.width && meta.height === newMeta.height,
    hasAlpha: meta.hasAlpha,
    newHasAlpha: newMeta.hasAlpha,
  };
}

async function optimizeJpg(filePath) {
  const original = await fs.readFile(filePath);
  const originalSize = original.length;
  const meta = await sharp(original).metadata();

  const recompressed = await sharp(original)
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();

  const newMeta = await sharp(recompressed).metadata();

  return {
    original,
    originalSize,
    recompressed,
    newSize: recompressed.length,
    dimsMatch:
      meta.width === newMeta.width && meta.height === newMeta.height,
    hasAlpha: meta.hasAlpha,
    newHasAlpha: newMeta.hasAlpha,
  };
}

async function main() {
  const files = await listTopLevelImages();
  files.sort();

  const results = [];

  for (const name of files) {
    const filePath = path.join(ASSETS_DIR, name);
    const ext = path.extname(name).toLowerCase();

    let result;
    try {
      if (ext === ".png") {
        result = await optimizePng(filePath);
      } else {
        result = await optimizeJpg(filePath);
      }
    } catch (err) {
      console.error(`ERROR processing ${name}: ${err.message}`);
      results.push({ name, status: "error", error: err.message });
      continue;
    }

    const { originalSize, newSize, dimsMatch, hasAlpha, newHasAlpha } =
      result;
    const savings = 1 - newSize / originalSize;

    // Safety checks: never accept a result that changed dimensions or
    // dropped an alpha channel that used to exist.
    const safe =
      dimsMatch && (!hasAlpha || newHasAlpha === hasAlpha);

    if (safe && savings >= MIN_SAVINGS_RATIO) {
      await backupFile(filePath);
      await fs.writeFile(filePath, result.recompressed);
      results.push({
        name,
        status: "kept",
        originalSize,
        newSize,
        savings,
      });
    } else {
      const reason = !dimsMatch
        ? "dimension mismatch"
        : hasAlpha && newHasAlpha !== hasAlpha
        ? "alpha channel lost"
        : `only ${(savings * 100).toFixed(1)}% smaller (< ${
            MIN_SAVINGS_RATIO * 100
          }% threshold)`;
      results.push({
        name,
        status: "reverted",
        originalSize,
        newSize,
        savings,
        reason,
      });
    }
  }

  // Report
  let totalBefore = 0;
  let totalAfter = 0;
  console.log(
    "\nfile".padEnd(32) +
      "before".padStart(10) +
      "after".padStart(10) +
      "saved".padStart(9) +
      "  status"
  );
  for (const r of results) {
    if (r.status === "error") {
      console.log(`${r.name.padEnd(32)}  ERROR: ${r.error}`);
      continue;
    }
    totalBefore += r.originalSize;
    totalAfter += r.status === "kept" ? r.newSize : r.originalSize;
    const pct = (r.savings * 100).toFixed(1) + "%";
    const line =
      r.name.padEnd(32) +
      String(r.originalSize).padStart(10) +
      String(r.status === "kept" ? r.newSize : r.originalSize).padStart(10) +
      pct.padStart(9) +
      "  " +
      r.status +
      (r.reason ? ` (${r.reason})` : "");
    console.log(line);
  }
  console.log(
    `\nTotal: ${totalBefore} -> ${totalAfter} bytes (${(
      (1 - totalAfter / totalBefore) *
      100
    ).toFixed(1)}% saved)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
