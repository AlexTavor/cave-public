import React from "react";

export const UnknownFileViewer: React.FC<{ path: string }> = ({ path }) => (
    <div>Unknown file type: {path}</div>
);
