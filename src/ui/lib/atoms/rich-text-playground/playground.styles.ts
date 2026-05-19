import type React from "react";

export const scrollContainerStyle: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  padding: "16px",
  height: "80%",
  width: "80%",
  overflowY: "auto",
  pointerEvents: "all",
  zIndex: 5000,
};

export const sectionHeadingStyle: React.CSSProperties = {
  color: "#aaa",
  borderBottom: "1px solid #444",
  paddingBottom: "8px",
};

export const sampleGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};

export const sampleGroupWithMarginStyle: React.CSSProperties = {
  ...sampleGroupStyle,
  marginBottom: "32px",
};

export const sampleTitleStyle: React.CSSProperties = {
  margin: "0 0 8px 0",
  color: "#888",
  fontSize: "12px",
};

export const rawTextStyle: React.CSSProperties = {
  fontSize: "10px",
  color: "#555",
  marginTop: "4px",
  fontFamily: "monospace",
};
