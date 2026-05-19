import React from "react";

export const EmptyHome: React.FC = () => {
    return (
        <div
            style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#666",
                fontFamily: "monospace",
            }}
        >
            No module open. Type 'open [filename]' in terminal.
        </div>
    );
};
