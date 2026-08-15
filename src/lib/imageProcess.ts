import sharp from "sharp";
import { ProcessSettings } from "./types";

export interface ProcessImageResult {
  buffer: Buffer;
  format: "jpeg" | "png" | "webp";
  width: number;
  height: number;
}

const SUPPORTED_FORMATS = new Set(["jpeg", "png", "webp"]);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

type SharpFit = "contain" | "cover" | "fill" | "inside" | "outside";

const FIT_MAP: Record<ProcessSettings["fitMode"], SharpFit> = {
  inside: "inside",
  contain: "contain",
  cover: "cover",
};

export async function processImage(
  input: Buffer,
  settings: ProcessSettings
): Promise<ProcessImageResult> {
  let pipeline = sharp(input, { failOn: "none" });
  const meta = await pipeline.metadata();
  const originalFormat = meta.format ?? "jpeg";

  if (settings.resizeMode !== "original") {
    const targetWidth =
      settings.resizeMode === "preset"
        ? settings.presetSize
        : settings.customWidth ?? undefined;
    const targetHeight =
      settings.resizeMode === "preset"
        ? settings.presetSize
        : settings.customHeight ?? undefined;

    if (targetWidth || targetHeight) {
      const outputFormatForBg =
        settings.outputFormat === "keep" ? originalFormat : settings.outputFormat;
      const background =
        outputFormatForBg === "jpeg"
          ? { r: 255, g: 255, b: 255, alpha: 1 }
          : { r: 255, g: 255, b: 255, alpha: 0 };

      pipeline = pipeline.resize({
        width: targetWidth,
        height: targetHeight,
        fit: FIT_MAP[settings.fitMode],
        withoutEnlargement: settings.preventEnlarge,
        background,
      });
    }
  }

  let outFormat = settings.outputFormat === "keep" ? originalFormat : settings.outputFormat;
  if (!SUPPORTED_FORMATS.has(outFormat)) outFormat = "jpeg";

  const quality =
    settings.compressionMode === "auto" ? 80 : clamp(Math.round(settings.quality), 1, 100);

  if (outFormat === "jpeg") {
    pipeline = pipeline
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality, mozjpeg: true });
  } else if (outFormat === "webp") {
    pipeline = pipeline.webp({ quality });
  } else {
    pipeline = pipeline.png({ quality, palette: true, effort: 8 });
  }

  const buffer = await pipeline.toBuffer();
  const outMeta = await sharp(buffer).metadata();

  return {
    buffer,
    format: outFormat as ProcessImageResult["format"],
    width: outMeta.width ?? 0,
    height: outMeta.height ?? 0,
  };
}
