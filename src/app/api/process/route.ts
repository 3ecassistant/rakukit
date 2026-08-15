import { NextRequest, NextResponse } from "next/server";
import { processImage } from "@/lib/imageProcess";
import {
  baseNameOf,
  buildUniqueName,
  extensionForFormat,
  mimeForFormat,
} from "@/lib/naming";
import { ProcessSettings, ProcessedFileResult, ProcessSummary } from "@/lib/types";
import { FILENAME_SUFFIX, MAX_FILE_SIZE, MAX_FILES } from "@/lib/constants";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "リクエストの解析に失敗しました" }, { status: 400 });
  }

  const settingsRaw = formData.get("settings");
  if (typeof settingsRaw !== "string") {
    return NextResponse.json({ error: "設定情報がありません" }, { status: 400 });
  }

  let settings: ProcessSettings;
  try {
    settings = JSON.parse(settingsRaw);
  } catch {
    return NextResponse.json({ error: "設定情報の解析に失敗しました" }, { status: 400 });
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "画像が選択されていません" }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `一度に処理できるのは${MAX_FILES}枚までです` },
      { status: 400 }
    );
  }

  const usedNames = new Set<string>();
  const results: ProcessedFileResult[] = [];

  for (const file of files) {
    const id = crypto.randomUUID();

    if (file.size > MAX_FILE_SIZE) {
      results.push({
        id,
        originalName: file.name,
        downloadName: file.name,
        mimeType: file.type,
        originalSize: file.size,
        processedSize: 0,
        width: 0,
        height: 0,
        dataBase64: "",
        error: "ファイルサイズが上限(20MB)を超えています",
      });
      continue;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const { buffer: outBuffer, format, width, height } = await processImage(buffer, settings);

      const ext = extensionForFormat(
        format,
        settings.outputFormat === "keep" ? file.name : undefined
      );
      const downloadName = buildUniqueName(
        `${baseNameOf(file.name)}${FILENAME_SUFFIX}`,
        ext,
        usedNames
      );

      results.push({
        id,
        originalName: file.name,
        downloadName,
        mimeType: mimeForFormat(format),
        originalSize: file.size,
        processedSize: outBuffer.length,
        width,
        height,
        dataBase64: outBuffer.toString("base64"),
      });
    } catch {
      results.push({
        id,
        originalName: file.name,
        downloadName: file.name,
        mimeType: file.type,
        originalSize: file.size,
        processedSize: 0,
        width: 0,
        height: 0,
        dataBase64: "",
        error: "画像の処理に失敗しました",
      });
    }
  }

  const successResults = results.filter((r) => !r.error);
  const originalTotalSize = successResults.reduce((sum, r) => sum + r.originalSize, 0);
  const processedTotalSize = successResults.reduce((sum, r) => sum + r.processedSize, 0);
  const savedSize = Math.max(0, originalTotalSize - processedTotalSize);

  const summary: ProcessSummary = {
    count: successResults.length,
    originalTotalSize,
    processedTotalSize,
    savedSize,
    savedRatio: originalTotalSize > 0 ? savedSize / originalTotalSize : 0,
  };

  return NextResponse.json({ results, summary });
}
