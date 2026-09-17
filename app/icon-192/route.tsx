import { ImageResponse } from "next/og"
import { NextRequest } from "next/server"

export async function GET(_req: NextRequest) {
  return new ImageResponse(
    <div
      style={{
        width: "100%", height: "100%",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #e060a0 0%, #f4a0c8 100%)",
        borderRadius: "48px",
      }}
    >
      <span style={{ color: "#fff", fontSize: 110, fontWeight: 900, letterSpacing: -4, fontFamily: "Arial" }}>
        H
      </span>
    </div>,
    { width: 192, height: 192 }
  )
}
