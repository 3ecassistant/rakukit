export type ResizeMode = "original" | "preset" | "custom";
export type FitMode = "inside" | "contain" | "cover";
export type CompressionMode = "auto" | "quality";
export type OutputFormat = "keep" | "jpeg" | "png" | "webp";

export interface ProcessSettings {
  resizeMode: ResizeMode;
  presetSize: number;
  customWidth: number | null;
  customHeight: number | null;
  fitMode: FitMode;
  preventEnlarge: boolean;
  compressionMode: CompressionMode;
  quality: number;
  outputFormat: OutputFormat;
}

export interface ProcessedFileResult {
  id: string;
  originalName: string;
  downloadName: string;
  mimeType: string;
  originalSize: number;
  processedSize: number;
  width: number;
  height: number;
  dataBase64: string;
  error?: string;
}

export interface ProcessSummary {
  count: number;
  originalTotalSize: number;
  processedTotalSize: number;
  savedSize: number;
  savedRatio: number;
}

export interface ProcessResponse {
  results: ProcessedFileResult[];
  summary: ProcessSummary;
}

export interface UploadItem {
  id: string;
  file: File;
  previewUrl: string;
}
