import React from "react";

export default function Card({ title, children, style }) {
  return (
    <div
      style={{
        background: "#161922",
        border: "1px solid #1f2937",
        borderRadius: 10,
        padding: 18,
        ...style,
      }}
    >
      {title && <h3 style={{ marginTop: 0, fontSize: 15, color: "#d1d5db" }}>{title}</h3>}
      {children}
    </div>
  );
}
