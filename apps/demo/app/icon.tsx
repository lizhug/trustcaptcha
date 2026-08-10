import { ImageResponse } from "next/og";

export const size = { height: 64, width: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#155dfc",
          borderRadius: 14,
          color: "white",
          display: "flex",
          fontFamily: "Arial",
          fontSize: 36,
          fontWeight: 800,
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        TC
      </div>
    ),
    size,
  );
}
