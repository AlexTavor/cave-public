import React from "react";
import { Card } from "../card";

export const mockResolveRef = (
  type: string,
  id: string,
): React.ReactElement | null => {
  if (type === "body") {
    return (
      <Card padding="sm">
        <div style={{ minWidth: "200px" }}>
          <strong>Body Card: {id}</strong>
          <div>Level 5 Human</div>
          <div style={{ fontSize: "0.9em", color: "#aaa" }}>
            Click to view details
          </div>
        </div>
      </Card>
    );
  }
  if (type === "item") {
    return (
      <Card padding="xs">
        <strong>Item: {id}</strong>
      </Card>
    );
  }
  return null;
};
