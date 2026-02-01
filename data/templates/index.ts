import corporateTemplate from "./corporate.json";
import creativeTemplate from "./creative.json";
import minimalTemplate from "./minimal.json";
import pitchDeckTemplate from "./pitch-deck.json";
import dataHeavyTemplate from "./data-heavy.json";
import type { DesignSystem } from "@/types/project";

export interface TemplateData {
  id: string;
  name: string;
  category: string;
  previewImage: string | null;
  designSystem: DesignSystem;
  styleReference: string | null;
  isBuiltIn: boolean;
}

export const builtInTemplates: TemplateData[] = [
  corporateTemplate as TemplateData,
  creativeTemplate as TemplateData,
  minimalTemplate as TemplateData,
  pitchDeckTemplate as TemplateData,
  dataHeavyTemplate as TemplateData,
];

export function getTemplateById(id: string): TemplateData | undefined {
  return builtInTemplates.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: string): TemplateData[] {
  return builtInTemplates.filter((t) => t.category === category);
}
