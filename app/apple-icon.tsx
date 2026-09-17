import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%", height: "100%",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #e060a0 0%, #f4a0c8 100%)",
        borderRadius: "40px",
      }}
    >
      <span style={{ color: "#fff", fontSize: 80, fontWeight: 900, letterSpacing: -3, fontFamily: "Arial" }}>
        H
      </span>
    </div>,
    { ...size }
  )
}
