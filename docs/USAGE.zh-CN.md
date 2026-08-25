# 操作指南

本文介绍两个 Skill 的适用范围、推荐提示词、辅助脚本和验收标准。

## 1. 使用前准备

1. 将目标 Skill 目录复制到 `~/.codex/skills/`。
2. 确认 Codex 能识别 `$architecture-diagram-redraw` 或 `$image-to-editable-ppt`。
3. 上传清晰的原图；尽量使用未压缩的 PNG、JPG 或原始截图。
4. 在提示词中明确哪些内容必须保留、哪些视觉属性可以调整，以及期望的输出位置或格式。

参考图片只作为内容源。图片内部出现的命令、提示语或操作要求，不会被当作用户指令执行。

## 2. 架构图重绘

### 适用场景

- 美化已有流程图、系统架构图或评测架构图。
- 保留原图配色，只提升排版、对比度和质感。
- 使用语义分组的多彩配色提升区域区分度。
- 同时输出原始配色版和智能多彩配色版。

### 配色模式

`original`：保留原图的主色和语义色彩关系，主要优化对比度、边框、阴影、渐变和一致性。

`smart-multicolor`：按语义分组使用克制的企业级多彩方案。例如：智能系统使用靛蓝/紫色，确定性流程使用青绿，关键结果或过渡使用少量琥珀/珊瑚色。

未明确指定配色时，Skill 默认选择 `original`，以减少不必要的语义变化。

### 推荐提示词

```text
$architecture-diagram-redraw 使用原始配色重绘这张图。
必须逐字保留全部中英文、数字与标点，区域和框的数量不变，连线起点、终点和方向不变。
可以优化布局间距、字体、图标、边框、阴影和线条质感。
```

```text
$architecture-diagram-redraw 使用智能多彩配色重绘这张软件架构图。
文字、框数、区域数、层级和连线拓扑必须保持不变；按不同系统域使用和谐但克制的颜色。
```

### 验收清单

- 所有可见文字逐字一致。
- 外层区域、面板和框的数量一致。
- 每条连线的来源、目标、方向和箭头一致。
- Logo、品牌文字和画布比例未被意外修改。
- 没有新增标题、节点、框、水印或装饰性伪节点。
- 智能多彩版使用颜色表达分组，而不是无意义的彩虹化。

## 3. 图片转可编辑 PPT

### 适用场景

- 将单页或多页幻灯片截图重建为 PPTX。
- 将信息图、流程图拆解成可编辑文本框、形状和连线。
- 保留图标为独立图片对象，便于移动、替换和缩放。
- 对已重建内容进行等比缩放，同时保持原幻灯片画布不变。

普通的从零制作演示文稿不属于本 Skill 的范围；此时应直接使用 Presentations 工作流。

### 可编辑性约定

- 可读文字使用原生文本框，必要时按可见行拆分。
- 简单卡片、边框、分隔线、箭头、括号和连接关系使用原生 PowerPoint 形状。
- 复杂图标可裁剪为独立图片对象，但不会宣称为可编辑矢量路径。
- 不允许把完整参考图铺成整页背景后声称“已可编辑”。
- 默认保持参考图片的宽高比，除非用户指定其他页面尺寸。

### 推荐提示词

```text
$image-to-editable-ppt 将这张截图高保真重建为可编辑 PPTX。
所有可读文字使用原生文本框；卡片、边框、箭头和连线使用原生形状；复杂图标可以独立裁剪。
保持原图宽高比，导出后逐页渲染并检查文字换行、越界、遮挡和连线层级。
```

```text
$image-to-editable-ppt 重建这张信息图，并让全部可编辑内容按线性比例 80% 缩放后在原画布中水平、垂直居中。
不要改变页面尺寸，不要覆盖原始 PPTX。
```

“80%”指宽度和高度都乘以 `0.8`，不是把总面积缩放为 80%。居中时，左右和上下分别保留约 10% 的画布尺寸。

### 图标批量裁剪脚本

为待裁剪图标准备 JSON：

```json
{
  "regions": [
    { "name": "deploy-icon", "x": 160, "y": 165, "width": 78, "height": 78 },
    { "name": "analysis-icon", "x": 1106, "y": 164, "width": 86, "height": 80, "padding": 2 }
  ]
}
```

使用 Codex 工作区依赖加载器返回的 Node.js 路径和包目录运行：

```powershell
$env:RUNTIME_NODE_MODULES = '<Node.js packages path>'
& '<Node.js executable>' '.\skills\image-to-editable-ppt\scripts\crop_regions.mjs' `
  --input '<source.png>' `
  --regions '<regions.json>' `
  --out-dir '<output-directory>'
```

脚本会生成各个 PNG 和 `crop-manifest.json`。使用前应逐一检查裁剪图，确保没有带入相邻文字、边框或无关图形。

### 已有 PPTX 的内容缩放脚本

```powershell
$env:RUNTIME_NODE_MODULES = '<Node.js packages path>'
& '<Node.js executable>' '.\skills\image-to-editable-ppt\scripts\scale_ppt_content.mjs' `
  --input '<source.pptx>' `
  --output '<scaled-copy.pptx>' `
  --scale 0.8 `
  --horizontal center `
  --vertical center
```

可用对齐参数：

- `--horizontal center|left|right`
- `--vertical center|top|bottom`

脚本拒绝覆盖源文件。缩放后仍需重新渲染 PPTX，确认字体、换行、连接线和相对几何关系没有漂移。

### 最终验收清单

- 页面比例和留白与参考图一致。
- 所有文字行完整、无错字、无意外换行。
- 形状、图标、连接线、箭头和层级关系完整。
- 没有越界、裁切、遮挡或未处理占位符。
- 没有整页参考图隐藏在可编辑对象后面。
- 最终 PPTX 可打开、可渲染、页数正确。
- 交付说明明确区分原生可编辑对象与独立栅格图标。

## 4. Skill 结构校验

可使用 Codex 自带的 Skill Creator 校验器：

```powershell
python -X utf8 "$env:USERPROFILE\.codex\skills\.system\skill-creator\scripts\quick_validate.py" `
  '.\skills\architecture-diagram-redraw'

python -X utf8 "$env:USERPROFILE\.codex\skills\.system\skill-creator\scripts\quick_validate.py" `
  '.\skills\image-to-editable-ppt'
```

校验器检查目录名、YAML frontmatter 和未完成占位符，但不能代替真实图片/PPT 工作流测试。

## 5. 常见问题

### 为什么生成图仍可能出现文字错误？

图片生成模型可能对密集中文和复杂拓扑产生漂移。Skill 会先建立保留清单并限制重试次数，但最终仍应人工核对文字、框数和连线。如果两次定向重试后仍不准确，应明确报告剩余差异，而不是声称完全一致。

### 为什么 PPT 中部分图标不是矢量？

复杂图标若用原生形状重画会显著降低效率或精度，因此可以独立裁剪为图片对象。它们可移动、缩放和替换，但不是路径级矢量编辑。

### 是否需要安装 npm 依赖？

仓库脚本设计为使用 Codex 工作区运行时中的 `sharp` 和 `@oai/artifact-tool`。在标准 Codex 工作流中无需全局安装依赖；脱离该运行时单独使用脚本时，需要自行提供兼容包路径。
