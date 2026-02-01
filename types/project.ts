// Design system types for templates
export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  muted?: string;
}

export interface Typography {
  headingFont: string;
  bodyFont: string;
  sizes: {
    title: number;
    heading: number;
    subheading: number;
    body: number;
    caption: number;
  };
  weights: {
    regular: number;
    medium: number;
    bold: number;
  };
}

export interface LayoutRules {
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  slideWidth: number;
  slideHeight: number;
}

export interface DesignSystem {
  colors: ColorPalette;
  typography: Typography;
  layout: LayoutRules;
}

// Project types
export interface Project {
  id: string;
  name: string;
  description: string | null;
  folderPath: string;
  aspectRatio: string;
  templateId: string | null;
  claudeMdContent: string | null;
  createdAt: Date;
  updatedAt: Date;
  template?: Template | null;
  assets?: Asset[];
  exports?: Export[];
}

export interface Template {
  id: string;
  name: string;
  category: string;
  previewImage: string | null;
  designSystem: DesignSystem;
  styleReference: string | null;
  isBuiltIn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AssetCategory = "images" | "fonts" | "references";

export interface AssetMetadata {
  width?: number;
  height?: number;
  format?: string;
  colorSpace?: string;
  [key: string]: unknown;
}

export interface Asset {
  id: string;
  projectId: string;
  filename: string;
  storedFilename: string;
  mimeType: string;
  size: number;
  category: AssetCategory;
  path: string;
  thumbnail: string | null;
  metadata: AssetMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ExportStatus = "pending" | "processing" | "completed" | "failed";

export interface Export {
  id: string;
  projectId: string;
  format: string;
  outputPath: string;
  fileSize: number | null;
  slideCount: number | null;
  status: ExportStatus;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  projectId: string;
  outputBuffer: string;
  isActive: boolean;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Project with full relations
export interface ProjectWithRelations extends Project {
  template: Template | null;
  assets: Asset[];
  exports: Export[];
}
