"use client";

import { ReactNode } from "react";
import { ProcessSettings, FitMode, OutputFormat, CompressionMode } from "@/lib/types";
import { SIZE_PRESETS } from "@/lib/constants";

interface SettingsPanelProps {
  settings: ProcessSettings;
  onChange: (patch: Partial<ProcessSettings>) => void;
  disabled?: boolean;
}

function OptionButton({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-4 py-1.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-red-600 bg-gradient-to-b from-red-500 to-red-600 text-white shadow-sm"
          : "border-zinc-300 bg-white text-zinc-700 hover:border-red-400"
      }`}
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-zinc-800">{title}</p>
      {children}
    </div>
  );
}

const FIT_LABELS: Record<FitMode, string> = {
  inside: "アスペクト比維持",
  contain: "収める",
  cover: "トリミング",
};

const FORMAT_LABELS: Record<OutputFormat, string> = {
  keep: "元形式",
  jpeg: "JPEG",
  png: "PNG",
  webp: "WebP",
};

export default function SettingsPanel({ settings, onChange, disabled }: SettingsPanelProps) {
  const resizeEnabled = settings.resizeMode !== "original";

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <Section title="サイズ">
        <div className="flex flex-wrap gap-2">
          <OptionButton
            active={settings.resizeMode === "original"}
            onClick={() => onChange({ resizeMode: "original" })}
            disabled={disabled}
          >
            元サイズ
          </OptionButton>
          {SIZE_PRESETS.map((size) => (
            <OptionButton
              key={size}
              active={settings.resizeMode === "preset" && settings.presetSize === size}
              onClick={() => onChange({ resizeMode: "preset", presetSize: size })}
              disabled={disabled}
            >
              {size}×{size}
            </OptionButton>
          ))}
          <OptionButton
            active={settings.resizeMode === "custom"}
            onClick={() => onChange({ resizeMode: "custom" })}
            disabled={disabled}
          >
            カスタム
          </OptionButton>
        </div>
        {settings.resizeMode === "custom" && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="number"
              min={1}
              placeholder="横幅"
              value={settings.customWidth ?? ""}
              disabled={disabled}
              onChange={(e) =>
                onChange({ customWidth: e.target.value ? Number(e.target.value) : null })
              }
              className="w-24 rounded-md border border-zinc-300 px-2 py-1 text-sm"
            />
            <span className="text-zinc-400">×</span>
            <input
              type="number"
              min={1}
              placeholder="高さ"
              value={settings.customHeight ?? ""}
              disabled={disabled}
              onChange={(e) =>
                onChange({ customHeight: e.target.value ? Number(e.target.value) : null })
              }
              className="w-24 rounded-md border border-zinc-300 px-2 py-1 text-sm"
            />
            <span className="text-sm text-zinc-400">px</span>
          </div>
        )}
      </Section>

      <Section title="リサイズ方式">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FIT_LABELS) as FitMode[]).map((mode) => (
            <OptionButton
              key={mode}
              active={settings.fitMode === mode}
              onClick={() => onChange({ fitMode: mode })}
              disabled={disabled || !resizeEnabled}
            >
              {FIT_LABELS[mode]}
            </OptionButton>
          ))}
        </div>
        <label className="flex items-center gap-2 pt-1 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={settings.preventEnlarge}
            disabled={disabled || !resizeEnabled}
            onChange={(e) => onChange({ preventEnlarge: e.target.checked })}
          />
          元画像より小さい場合のみリサイズ（拡大しない）
        </label>
      </Section>

      <Section title="圧縮">
        <div className="flex flex-wrap gap-2">
          {(["auto", "quality"] as CompressionMode[]).map((mode) => (
            <OptionButton
              key={mode}
              active={settings.compressionMode === mode}
              onClick={() => onChange({ compressionMode: mode })}
              disabled={disabled}
            >
              {mode === "auto" ? "おまかせ" : "画質指定"}
            </OptionButton>
          ))}
        </div>
        {settings.compressionMode === "quality" && (
          <div className="flex items-center gap-3 pt-1">
            <input
              type="range"
              min={1}
              max={100}
              value={settings.quality}
              disabled={disabled}
              onChange={(e) => onChange({ quality: Number(e.target.value) })}
              className="w-48"
            />
            <span className="w-10 text-sm text-zinc-600">{settings.quality}</span>
          </div>
        )}
      </Section>

      <Section title="形式">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FORMAT_LABELS) as OutputFormat[]).map((fmt) => (
            <OptionButton
              key={fmt}
              active={settings.outputFormat === fmt}
              onClick={() => onChange({ outputFormat: fmt })}
              disabled={disabled}
            >
              {FORMAT_LABELS[fmt]}
            </OptionButton>
          ))}
        </div>
      </Section>
    </div>
  );
}
