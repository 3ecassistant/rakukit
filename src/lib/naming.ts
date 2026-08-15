const EXT_BY_FORMAT: Record<string, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
};

const MIME_BY_FORMAT: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function baseNameOf(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx > 0 ? filename.slice(0, idx) : filename;
}

export function originalExtOf(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx > 0 ? filename.slice(idx + 1) : "";
}

export function extensionForFormat(
  format: string,
  keepOriginalExtFrom?: string
): string {
  if (keepOriginalExtFrom) {
    const ext = originalExtOf(keepOriginalExtFrom);
    if (ext) return ext;
  }
  return EXT_BY_FORMAT[format] ?? format;
}

export function mimeForFormat(format: string): string {
  return MIME_BY_FORMAT[format] ?? "application/octet-stream";
}

export function buildUniqueName(
  baseName: string,
  ext: string,
  usedNames: Set<string>
): string {
  let candidate = `${baseName}.${ext}`;
  let i = 1;
  while (usedNames.has(candidate)) {
    candidate = `${baseName}_${i}.${ext}`;
    i++;
  }
  usedNames.add(candidate);
  return candidate;
}
