# Reconstruction workflow

Use this workflow for each source image. Keep temporary manifests, crops, renders, and QA notes under a task-specific writable build directory; place only the requested final PPTX in the delivery location.

## 1. Establish the source geometry

1. Inspect the original file at full resolution rather than relying on the chat preview.
2. Record source width, height, aspect ratio, and orientation.
3. Use a PowerPoint canvas with the same pixel ratio unless the user explicitly requests a standard size. Artifact Tool slide geometry uses pixels, so matching the source dimensions is usually the most direct coordinate system.
4. If several images represent several slides, preserve their order and inspect each independently.

## 2. Build an element inventory

Create a concise temporary manifest that accounts for every visible element:

- background fill or gradient;
- titles, subtitles, labels, bullets, numbers, and body rows;
- containers, cards, bands, circles, polygons, and dividers;
- straight, elbow, curved, dashed, or dotted lines and arrowheads;
- icons, logos, screenshots, photos, and decorative images;
- z-order relationships, repeated spacing, alignment guides, and grouping.

For each element, record a bounding box in source pixels: `x`, `y`, `width`, `height`. Sample representative fill, stroke, and text colors from the source. Identify likely fonts, weight, alignment, and visual tracking. Font matching should be verified by rendered width and height, not by font name alone.

Use programmatic image analysis only to measure or inspect. Do not treat OCR output as authoritative.

## 3. Transcribe and verify text

1. Transcribe all visible text.
2. Compare the transcription against the source character by character, including punctuation, spacing, slashes, numerals, and capitalization.
3. Split different visible rows into separate text boxes so they remain easy to edit and align.
4. Use rich-text runs or a separate bullet mark when the bullet color differs from the row text.
5. Reproduce deliberate character spacing with explicit spaces or supported text styling, then validate the rendered width.
6. Never shrink important text until it merely fits. First correct the box width, font, tracking, or line break.

## 4. Extract reusable visual assets

Use a reviewed JSON manifest and `scripts/crop_regions.mjs` when icons should be preserved from the source.

Example region manifest:

```json
{
  "regions": [
    { "name": "deploy-icon", "x": 160, "y": 165, "width": 78, "height": 78 },
    { "name": "analysis-icon", "x": 1106, "y": 164, "width": 86, "height": 80, "padding": 2 }
  ]
}
```

Run it with the workspace dependency paths returned by `load_workspace_dependencies`:

```powershell
$env:RUNTIME_NODE_MODULES = '<Node.js packages path>'
& '<Node.js executable>' '<skill-dir>\scripts\crop_regions.mjs' --input '<source.png>' --regions '<regions.json>' --out-dir '<temporary asset directory>'
```

Review every crop before use. It must not contain adjacent text, borders, or unrelated marks. Preserve transparent backgrounds when present. A crop with a white background is acceptable only when it visually merges with its target surface.

Use native PowerPoint shapes instead when a simple icon can be reproduced faithfully and remains meaningfully more editable. Do not approximate a distinctive logo with generic shapes.

## 5. Author the slide

Follow the current Presentations skill and use `@oai/artifact-tool` from a JavaScript ES module.

Recommended construction order:

1. slide background;
2. long connectors, outer brackets, mapping lines, and process arrows;
3. major containers and repeated cards;
4. fills, footer bands, dividers, and badges;
5. independently cropped icons and other images;
6. row-level text boxes;
7. small foreground details.

Prefer helper functions for repeated cards, rows, and text styling, but keep each output object separate. Use semantic names such as `step-2-footer-title`, `capability-4-icon`, or `value-output-connector` so later edits are discoverable.

For connector fidelity:

- match line type, thickness, color, dash pattern, arrowhead, and bend direction;
- keep connectors behind cards and labels;
- use attached connectors where movement should preserve the relationship;
- use exact free-positioned lines or editable custom paths only when the source routing cannot be expressed with an attached connector.

Add a `[Sources]` block to speaker notes identifying the user-provided reference image and any external assets actually used.

## 6. Apply proportional scaling when requested

Keep the original slide canvas and transform the reconstructed slide-local content as one coordinate system. Use the same factor for horizontal position, vertical position, width, height, font size, text insets, corner radius, and any safely writable stroke width.

For scale factor `s` and alignment offsets `ox`, `oy`:

```text
x' = ox + s * x
y' = oy + s * y
w' = s * w
h' = s * h
```

Default to centered placement on both axes:

```text
ox = slideWidth  * (1 - s) / 2
oy = slideHeight * (1 - s) / 2
```

A request for 80% occupancy means `s = 0.8`, leaving approximately 10% of the slide width on both the left and right and approximately 10% of the slide height on both the top and bottom. This is 64% of the original area, which is expected for linear scaling.

For an already exported editable deck, run:

```powershell
$env:RUNTIME_NODE_MODULES = '<Node.js packages path>'
& '<Node.js executable>' '<skill-dir>\scripts\scale_ppt_content.mjs' --input '<source.pptx>' --output '<scaled-copy.pptx>' --scale 0.8
```

The script defaults to `--horizontal center --vertical center`. Use explicit alignment flags only when the user requests another placement. Never overwrite the source deck. Render the scaled PPTX and confirm that all relative geometry, wrapping, connector routes, and editability remain intact.

## 7. Visual verification loop

Perform at least one full comparison after the first export and another after the final PPTX export.

1. Export an authoring preview.
2. Render the exported PPTX with the Presentations skill's rendering helper. The PPTX render is authoritative because Office conversion can change fonts, text metrics, crop behavior, and geometry.
3. Inspect each slide individually at full size beside the source.
4. Run the overflow test.
5. Check the QA ledger below and correct every observable issue before delivery.

### QA ledger

- canvas ratio and margins match;
- every source text row is present and correct;
- no one-line title or footer label wraps;
- fonts, weights, colors, and visual tracking are credible;
- repeated cards share consistent dimensions and spacing;
- icon crops are sharp, isolated, and independently selectable;
- borders, corner radii, shadows, and gradients are consistent;
- all connector types, endpoints, bends, dash patterns, and arrowheads are present;
- z-order is correct and no connector crosses readable text;
- no unintended overlap, clipping, overflow, unresolved placeholder, or off-canvas object remains;
- no complete-slide reference image is hiding behind editable objects;
- final PPTX opens, renders, and contains the expected slide count.

If the renderer fails because a localized filename cannot be decoded, copy the same PPTX to a temporary ASCII-only path for QA. Do not rename the user's final deliverable merely to accommodate the validator.

## 8. Delivery statement

Summarize what is editable and what remains rasterized. A useful handoff reports the number of native text boxes, shapes/connectors, and independent image assets when that information is available. Cite only the final PPTX as the output artifact.
