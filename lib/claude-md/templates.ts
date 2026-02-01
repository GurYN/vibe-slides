import type { DesignSystem } from "@/types/project";

// Simplified asset type that matches Prisma output
interface SimpleAsset {
  category: string;
  filename: string;
  path: string;
}

export function generateMetadataSection(project: {
  name: string;
  description: string | null;
  aspectRatio: string;
}): string {
  return `# ${project.name}

${project.description || "AI-powered presentation project."}

## Project Settings

- **Aspect Ratio**: ${project.aspectRatio}
- **Output Format**: PPTX (PowerPoint)
`;
}

export function generateDesignSystemSection(
  designSystem: DesignSystem,
  templateName: string
): string {
  const { colors, typography, layout } = designSystem;

  return `## Design System: ${templateName}

### Colors

| Role | Color |
|------|-------|
| Primary | ${colors.primary} |
| Secondary | ${colors.secondary} |
| Accent | ${colors.accent} |
| Background | ${colors.background} |
| Text | ${colors.text} |
${colors.muted ? `| Muted | ${colors.muted} |` : ""}

### Typography

- **Heading Font**: ${typography.headingFont}
- **Body Font**: ${typography.bodyFont}

| Style | Size | Weight |
|-------|------|--------|
| Title | ${typography.sizes.title}px | ${typography.weights.bold} |
| Heading | ${typography.sizes.heading}px | ${typography.weights.bold} |
| Subheading | ${typography.sizes.subheading}px | ${typography.weights.medium} |
| Body | ${typography.sizes.body}px | ${typography.weights.regular} |
| Caption | ${typography.sizes.caption}px | ${typography.weights.regular} |

### Layout

- **Slide Size**: ${layout.slideWidth}x${layout.slideHeight}px
- **Margins**: ${layout.margins.top}px (top), ${layout.margins.right}px (right), ${layout.margins.bottom}px (bottom), ${layout.margins.left}px (left)
`;
}

export function generateAssetsSection(assets: SimpleAsset[]): string {
  if (assets.length === 0) {
    return `## Assets

No assets uploaded yet. Upload images, fonts, or reference documents to use in your presentation.
`;
  }

  const imageAssets = assets.filter((a) => a.category === "images");
  const fontAssets = assets.filter((a) => a.category === "fonts");
  const refAssets = assets.filter((a) => a.category === "references");

  let section = `## Assets

`;

  if (imageAssets.length > 0) {
    section += `### Images

| File | Path |
|------|------|
${imageAssets.map((a) => `| ${a.filename} | \`${a.path}\` |`).join("\n")}

`;
  }

  if (fontAssets.length > 0) {
    section += `### Fonts

| File | Path |
|------|------|
${fontAssets.map((a) => `| ${a.filename} | \`${a.path}\` |`).join("\n")}

`;
  }

  if (refAssets.length > 0) {
    section += `### Reference Documents

| File | Path |
|------|------|
${refAssets.map((a) => `| ${a.filename} | \`${a.path}\` |`).join("\n")}

`;
  }

  return section;
}

export function generateInstructionsSection(): string {
  return `## Your Role

You are a professional PowerPoint presentation designer. Your job is to create beautiful, well-structured presentations using the PptxGenJS library based on user requests.

## Technical Setup

This project uses **PptxGenJS** to programmatically generate PowerPoint files. The library is already installed.

### Creating a Presentation

\`\`\`javascript
const pptxgen = require("pptxgenjs");

// Create a new presentation
const pres = new pptxgen();

// Set presentation properties
pres.layout = "LAYOUT_16x9"; // or "LAYOUT_4x3"
pres.author = "Vibe Slides";
pres.title = "Presentation Title";

// Add a slide
const slide = pres.addSlide();

// Add text
slide.addText("Hello World", {
  x: 1, y: 1, w: 8, h: 1,
  fontSize: 36,
  fontFace: "Arial",
  color: "363636",
  bold: true,
});

// Add an image from assets folder
slide.addImage({
  path: "./assets/images/logo.png",
  x: 1, y: 2, w: 4, h: 3,
});

// Add a shape
slide.addShape(pres.ShapeType.rect, {
  x: 0, y: 0, w: "100%", h: 0.5,
  fill: { color: "1e40af" },
});

// Save the presentation - ALWAYS use this exact path and filename
pres.writeToFile("./output/presentation.pptx");
\`\`\`

## Output Requirements

**CRITICAL**: Always save the presentation to this exact path:
\`\`\`
./output/presentation.pptx
\`\`\`

The preview system monitors this file. When you save to this location, the UI will automatically detect changes and regenerate thumbnails.

## Asset Paths

When referencing uploaded assets in your presentation:
- Images: \`./assets/images/filename.ext\`
- Fonts: \`./assets/fonts/filename.ext\`
- References: \`./assets/references/filename.ext\`

**Important**: Use relative paths starting with \`./\` since you're running from the project directory.

## Slide Structure Guidelines

1. **Title Slide**: Project name, subtitle, date/author if appropriate
2. **Content Slides**: Follow user's requested structure
3. **Closing Slide**: Call-to-action, contact info, or thank you message

## Design Best Practices

- Use the design system colors consistently (see Colors section above)
- Apply typography hierarchy: titles larger than headings, headings larger than body
- Maintain consistent margins (use layout values from Design System)
- Keep text concise - presentations are visual, not documents
- Use bullet points for lists (max 5-6 per slide)
- Include relevant images from assets when appropriate
- Add shapes for visual interest (backgrounds, dividers, accent elements)

## Workflow

1. Read the user's request carefully
2. Plan the slide structure
3. Write the JavaScript code using PptxGenJS
4. Run the script with: \`node script.js\`
5. The output will be at \`./output/presentation.pptx\`
`;
}
