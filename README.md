# Codex Visual Skills

两个面向 Codex 的开源视觉工作流 Skill：精准重绘软件架构图，以及把截图/信息图高保真重建为可编辑 PowerPoint。

Two reusable Codex skills for architecture-diagram redraws and high-fidelity image-to-editable-PowerPoint reconstruction.

## 包含的 Skill

| Skill | 能力 | 典型输出 |
| --- | --- | --- |
| [`architecture-diagram-redraw`](skills/architecture-diagram-redraw/) | 在锁定文字、区域/框数量和连线关系的前提下，美化流程图与软件架构图；支持原始配色和智能多彩配色 | PNG |
| [`image-to-editable-ppt`](skills/image-to-editable-ppt/) | 将幻灯片截图、信息图或流程图拆解为原生文本框、形状、连线和独立图标，并完成渲染 QA | PPTX |

## 效果展示

### Architecture Diagram Redraw

<img src="docs/images/architecture-diagram-redraw-demo.png" alt="Architecture Diagram Redraw 多彩软件架构图示例" width="100%">

> 智能多彩配色示例：用颜色强化传统流程与 AI 原生流程的语义分组，同时保持清晰的框、连线和信息层级。

### Image to Editable PPT

<img src="docs/images/image-to-editable-ppt-demo.png" alt="Image to Editable PPT 最终 PPTX 渲染示例" width="100%">

> 最终 PPTX 渲染示例：文字、卡片、连接线和图标按独立对象重建，便于继续编辑、移动和替换。

以上图片均为通用演示内容，不包含真实业务数据。

## 设计原则

- 内容优先：参考图中的文字、结构和关系不应因美化而发生语义漂移。
- 可编辑优先：PPT 重建不使用整页截图冒充“可编辑”，可原生化的元素尽量使用 PowerPoint 对象。
- 可验证交付：最终结果需要经过逐项清单和渲染检查，不以“看起来差不多”代替校验。
- 非破坏式输出：保留原始输入，生成新文件；遇到同名结果时使用新版本。

## 安装

先克隆仓库：

```bash
git clone https://github.com/Marshalliuwei/codex-visual-skills.git
cd codex-visual-skills
```

Windows PowerShell：

```powershell
$skillsHome = Join-Path $env:USERPROFILE '.codex\skills'
New-Item -ItemType Directory -Force -Path $skillsHome | Out-Null
Copy-Item -Recurse '.\skills\architecture-diagram-redraw' $skillsHome
Copy-Item -Recurse '.\skills\image-to-editable-ppt' $skillsHome
```

macOS / Linux：

```bash
mkdir -p ~/.codex/skills
cp -R skills/architecture-diagram-redraw ~/.codex/skills/
cp -R skills/image-to-editable-ppt ~/.codex/skills/
```

如果目标目录中已有同名 Skill，请先备份或确认差异，再进行替换。安装完成后新建一个 Codex 任务，或重启当前客户端，使 Skill 列表重新加载。

## 快速使用

上传一张原始图片，然后在请求中显式调用 Skill。

架构图重绘：

```text
$architecture-diagram-redraw 使用原始配色重绘这张图
$architecture-diagram-redraw 使用智能多彩配色重绘这张图
$architecture-diagram-redraw 同时生成原始配色和智能多彩配色两版
```

图片转可编辑 PPT：

```text
$image-to-editable-ppt 将这张幻灯片截图高保真重建为可编辑 PPTX
$image-to-editable-ppt 将这张信息图重建为可编辑 PPT，并让内容按 80% 等比缩放后居中
```

更多提示词、脚本参数、依赖和质量检查方法见[操作指南](docs/USAGE.zh-CN.md)。

## 运行依赖

- 支持本地 Skill 的 Codex 环境。
- `architecture-diagram-redraw` 需要可用的图片查看与图片编辑/生成能力（仓库中的 Skill 默认路由到 Codex 的 `imagegen` 能力）。
- `image-to-editable-ppt` 需要 Codex 的 Presentations 工作流及其工作区运行时。
- 两个 `.mjs` 脚本依赖 Codex 工作区运行时提供的 Node.js 包；不要求在本仓库执行全局 `npm install`。

仓库不包含模型密钥、用户素材、生成结果或本机配置。

## 仓库结构

```text
codex-visual-skills/
├── skills/
│   ├── architecture-diagram-redraw/
│   └── image-to-editable-ppt/
├── docs/
│   └── USAGE.zh-CN.md
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

## 参与贡献

欢迎提交 Issue 或 Pull Request。提交前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)，并确保 Skill 结构校验通过、脚本实际运行过、文档与行为保持一致。

## 许可证

[MIT License](LICENSE)
