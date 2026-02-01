import type {
  Project,
  Template,
  Asset,
  Export,
  AssetCategory,
  ProjectWithRelations,
} from "./project";

// Generic API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Project API types
export interface CreateProjectRequest {
  name: string;
  description?: string;
  aspectRatio?: string;
  templateId?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string | null;
  aspectRatio?: string;
  templateId?: string | null;
  claudeMdContent?: string | null;
}

export type ProjectResponse = ApiResponse<Project>;
export type ProjectListResponse = ApiResponse<Project[]>;
export type ProjectDetailResponse = ApiResponse<ProjectWithRelations>;

// Template API types
export type TemplateResponse = ApiResponse<Template>;
export type TemplateListResponse = ApiResponse<Template[]>;

export interface ApplyTemplateRequest {
  templateId: string;
}

// Asset API types
export interface UploadAssetRequest {
  category?: AssetCategory;
}

export interface AssetUploadResult {
  asset: Asset;
  thumbnailGenerated: boolean;
}

export type AssetResponse = ApiResponse<Asset>;
export type AssetListResponse = ApiResponse<Asset[]>;
export type AssetUploadResponse = ApiResponse<AssetUploadResult>;

// Export API types
export type ExportResponse = ApiResponse<Export>;
export type ExportListResponse = ApiResponse<Export[]>;

// Preview API types
export interface SlidePreview {
  slideNumber: number;
  thumbnailPath: string;
  width: number;
  height: number;
}

export type PreviewResponse = ApiResponse<SlidePreview[]>;

// WebSocket message types for terminal
export type WebSocketMessageType =
  | "session:connect"
  | "session:connected"
  | "session:disconnect"
  | "session:error"
  | "terminal:input"
  | "terminal:output"
  | "terminal:resize";

export interface WSSessionConnect {
  type: "session:connect";
  projectId: string;
}

export interface WSSessionConnected {
  type: "session:connected";
  sessionId: string;
  outputBuffer: string;
}

export interface WSSessionDisconnect {
  type: "session:disconnect";
}

export interface WSSessionError {
  type: "session:error";
  message: string;
}

export interface WSTerminalInput {
  type: "terminal:input";
  data: string;
}

export interface WSTerminalOutput {
  type: "terminal:output";
  data: string;
}

export interface WSTerminalResize {
  type: "terminal:resize";
  cols: number;
  rows: number;
}

export type WebSocketMessage =
  | WSSessionConnect
  | WSSessionConnected
  | WSSessionDisconnect
  | WSSessionError
  | WSTerminalInput
  | WSTerminalOutput
  | WSTerminalResize;
