import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%", height: "100%",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #e060a0 0%, #f4a0c8 100%)",
        borderRadius: "8px",
      }}
    >
      <span style={{ color: "#fff", fontSize: 22, fontWeight: 900, fontFamily: "Arial" }}>H</span>
    </div>,
    { ...size }
  )
}
