import { writeFile } from "fs/promises";
import { getProjectClaudeMdPath } from "@/lib/project-fs";
import { getTemplateById } from "@/data/templates";
import {
  generateMetadataSection,
  generateDesignSystemSection,
  generateAssetsSection,
  generateInstructionsSection,
} from "./templates";
import type { DesignSystem } from "@/types/project";

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  aspectRatio: string;
  templateId: string | null;
}

// Simplified asset type that matches Prisma output
interface SimpleAsset {
  category: string;
  filename: string;
  path: string;
}

interface GenerateClaudeMdOptions {
  project: ProjectData;
  assets: SimpleAsset[];
  customInstructions?: string;
}

export async function generateClaudeMd(
  options: GenerateClaudeMdOptions
): Promise<string> {
  const { project, assets, customInstructions } = options;

  const sections: string[] = [];

  // 1. Metadata section
  sections.push(
    generateMetadataSection({
      name: project.name,
      description: project.description,
      aspectRatio: project.aspectRatio,
    })
  );

  // 2. Design system section (if template is selected)
  if (project.templateId) {
    const template = getTemplateById(project.templateId);
    if (template) {
      sections.push(
        generateDesignSystemSection(template.designSystem, template.name)
      );
    }
  } else {
    sections.push(`## Design System

No template selected. Select a template from the template panel to apply a consistent design system.
`);
  }

  // 3. Assets section
  sections.push(generateAssetsSection(assets));

  // 4. Instructions section
  sections.push(generateInstructionsSection());

  // 5. Custom instructions (if any)
  if (customInstructions) {
    sections.push(`## Custom Instructions

${customInstructions}
`);
  }

  const content = sections.join("\n");

  // Write to file
  const filePath = getProjectClaudeMdPath(project.id);
  await writeFile(filePath, content, "utf-8");

  return content;
}

export async function updateClaudeMdWithTemplate(
  projectId: string,
  templateId: string,
  existingContent: string
): Promise<string> {
  const template = getTemplateById(templateId);
  if (!template) {
    return existingContent;
  }

  const designSystemSection = generateDesignSystemSection(
    template.designSystem,
    template.name
  );

  // Replace or add design system section
  const designSystemRegex = /## Design System[\s\S]*?(?=## |$)/;
  let newContent: string;

  if (designSystemRegex.test(existingContent)) {
    newContent = existingContent.replace(
      designSystemRegex,
      designSystemSection + "\n"
    );
  } else {
    // Insert after metadata section
    const metadataEnd = existingContent.indexOf("\n## ");
    if (metadataEnd > -1) {
      newContent =
        existingContent.slice(0, metadataEnd) +
        "\n" +
        designSystemSection +
        existingContent.slice(metadataEnd);
    } else {
      newContent = existingContent + "\n" + designSystemSection;
    }
  }

  // Write to file
  const filePath = getProjectClaudeMdPath(projectId);
  await writeFile(filePath, newContent, "utf-8");

  return newContent;
}

export function parseDesignSystem(jsonString: string): DesignSystem | null {
  try {
    return JSON.parse(jsonString) as DesignSystem;
  } catch {
    return null;
  }
}
