import { ImageResponse } from "next/og";

export const alt = "RakuKit - Seller Tools for Rakuten Ichiba";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          background: "linear-gradient(160deg, #9c0000 0%, #bf0000 55%, #e2432a 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 4,
            color: "#ffc72c",
          }}
        >
          RAKUTEN ICHIBA SELLER TOOLS
        </div>
        <div
          style={{
            fontSize: 128,
            fontWeight: 900,
            color: "#ffffff",
            lineHeight: 1,
          }}
        >
          RakuKit
        </div>
        <div
          style={{
            fontSize: 30,
            color: "#fde3e0",
          }}
        >
          Free calculators + Pro workspace for Rakuten sellers
        </div>
      </div>
    ),
    { ...size }
  );
}
