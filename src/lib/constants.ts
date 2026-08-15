import { ProcessSettings } from "./types";

export const MAX_FILE_SIZE = 20 * 1024 * 1024;
export const MAX_FILES = 50;
export const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
export const SIZE_PRESETS = [500, 800, 1000, 1200];
export const FILENAME_SUFFIX = "_resized";

export const DEFAULT_SETTINGS: ProcessSettings = {
  resizeMode: "original",
  presetSize: 1000,
  customWidth: null,
  customHeight: null,
  fitMode: "inside",
  preventEnlarge: true,
  compressionMode: "auto",
  quality: 80,
  outputFormat: "keep",
};
