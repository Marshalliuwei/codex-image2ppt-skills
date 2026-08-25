import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const EMU_PER_PIXEL = 9525;
const DEFAULT_SCALE = 0.8;
const EDITABLE_KINDS = new Set(["textbox", "shape", "image"]);

function usage() {
  return [
    "Usage:",
    "  scale_ppt_content.mjs --input <source.pptx> --output <scaled.pptx> [options]",
    "",
    "Options:",
    "  --scale <number>       Linear scale factor in (0, 1]. Default: 0.8",
    "  --horizontal <value>   center, left, or right. Default: center",
    "  --vertical <value>     center, top, or bottom. Default: center",
    "  --help                 Show this help",
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    scale: DEFAULT_SCALE,
    horizontal: "center",
    vertical: "center",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--help" || flag === "-h") {
      options.help = true;
      continue;
    }
    if (!["--input", "--output", "--scale", "--horizontal", "--vertical"].includes(flag)) {
      throw new Error(`Unknown argument: ${flag}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
    index += 1;
    if (flag === "--input") options.input = value;
    if (flag === "--output") options.output = value;
    if (flag === "--scale") options.scale = Number(value);
    if (flag === "--horizontal") options.horizontal = value.toLowerCase();
    if (flag === "--vertical") options.vertical = value.toLowerCase();
  }

  if (options.help) return options;
  if (!options.input) throw new Error("--input is required");
  if (!options.output) throw new Error("--output is required");
  if (!Number.isFinite(options.scale) || options.scale <= 0 || options.scale > 1) {
    throw new Error("--scale must be a number greater than 0 and no greater than 1");
  }
  if (!["center", "left", "right"].includes(options.horizontal)) {
    throw new Error("--horizontal must be center, left, or right");
  }
  if (!["center", "top", "bottom"].includes(options.vertical)) {
    throw new Error("--vertical must be center, top, or bottom");
  }
  return options;
}

function parseNdjson(value) {
  return value
    .split(/\r?\n/)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function finiteBox(value) {
  return value
    && Number.isFinite(value.left)
    && Number.isFinite(value.top)
    && Number.isFinite(value.width)
    && Number.isFinite(value.height);
}

function alignmentOffset(slideSize, scale, horizontal, vertical) {
  const spareWidth = slideSize.width * (1 - scale);
  const spareHeight = slideSize.height * (1 - scale);
  const x = horizontal === "left" ? 0 : horizontal === "right" ? spareWidth : spareWidth / 2;
  const y = vertical === "top" ? 0 : vertical === "bottom" ? spareHeight : spareHeight / 2;
  return { x, y };
}

function transformBox(box, offset, scale) {
  const transformed = {
    left: offset.x + box.left * scale,
    top: offset.y + box.top * scale,
    width: box.width * scale,
    height: box.height * scale,
  };
  if (Number.isFinite(box.rotation)) transformed.rotation = box.rotation;
  return transformed;
}

function scaleText(text, scale) {
  if (!text) return;
  if (Number.isFinite(text.fontSize)) text.fontSize *= scale;
  const insets = text.insets;
  if (insets) {
    text.insets = {
      top: (insets.top ?? 0) * scale,
      right: (insets.right ?? 0) * scale,
      bottom: (insets.bottom ?? 0) * scale,
      left: (insets.left ?? 0) * scale,
    };
  }
}

function scaleSafeStyleDimensions(element, scale) {
  if (Number.isFinite(element.borderRadius)) element.borderRadius *= scale;
  const line = element.line;
  if (line && Number.isFinite(line.width)) {
    element.line = { ...line, width: line.width * scale };
  }
}

async function loadArtifactTool() {
  const runtimeModules = process.env.RUNTIME_NODE_MODULES;
  if (!runtimeModules) {
    throw new Error("RUNTIME_NODE_MODULES is required; obtain it from load_workspace_dependencies");
  }
  const modulePath = path.join(runtimeModules, "@oai", "artifact-tool", "dist", "artifact_tool.mjs");
  await fs.access(modulePath);
  return import(pathToFileURL(modulePath).href);
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  console.log(usage());
  process.exit(0);
}

const inputPath = path.resolve(options.input);
const outputPath = path.resolve(options.output);
if (inputPath.toLowerCase() === outputPath.toLowerCase()) {
  throw new Error("The output must be a new file; refusing to overwrite the source PPTX");
}

await fs.access(inputPath);
await fs.mkdir(path.dirname(outputPath), { recursive: true });

const { FileBlob, PresentationFile } = await loadArtifactTool();
const presentation = await PresentationFile.importPptx(await FileBlob.load(inputPath));
const proto = presentation.toProto();
const slideSizes = new Map(
  (proto.slides ?? []).map((slide, index) => [index + 1, {
    width: Number(slide.widthEmu) / EMU_PER_PIXEL,
    height: Number(slide.heightEmu) / EMU_PER_PIXEL,
  }]),
);

for (const [slideNumber, size] of slideSizes) {
  if (!Number.isFinite(size.width) || !Number.isFinite(size.height) || size.width <= 0 || size.height <= 0) {
    throw new Error(`Could not determine valid canvas dimensions for slide ${slideNumber}`);
  }
}

const inspection = await presentation.inspect({
  kind: "slide,textbox,shape,image",
  include: "id,slide,name,bbox,text,textPreview",
  maxChars: 5_000_000,
});
const records = parseNdjson(inspection.ndjson);
const editableRecords = records.filter((record) => EDITABLE_KINDS.has(record.kind));
const counts = { textbox: 0, shape: 0, image: 0 };

for (const record of editableRecords) {
  const slideNumber = Number(record.slide);
  const slideSize = slideSizes.get(slideNumber);
  if (!slideSize) throw new Error(`Missing slide size for element ${record.id}`);

  const element = presentation.resolve(record.id);
  const sourceBox = record.kind === "image"
    ? (finiteBox(element.frame) ? element.frame : element.position)
    : (finiteBox(element.position) ? element.position : element.frame);
  if (!finiteBox(sourceBox)) throw new Error(`Missing editable geometry for element ${record.id}`);

  const offset = alignmentOffset(slideSize, options.scale, options.horizontal, options.vertical);
  const targetBox = transformBox(sourceBox, offset, options.scale);
  if (record.kind === "image") element.frame = targetBox;
  else element.position = targetBox;

  scaleText(element.text, options.scale);
  scaleSafeStyleDimensions(element, options.scale);
  counts[record.kind] += 1;
}

const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(outputPath);

console.log(JSON.stringify({
  input: inputPath,
  output: outputPath,
  slides: slideSizes.size,
  scale: options.scale,
  horizontal: options.horizontal,
  vertical: options.vertical,
  objectsScaled: counts,
}, null, 2));
