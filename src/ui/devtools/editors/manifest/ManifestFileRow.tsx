import React from "react";
import { Button } from "../../../lib/atoms/button";
import { Card } from "../../../lib/atoms/card";

interface ManifestFileRowProps {
    file: string;
    selected: boolean;
    onSelect: () => void;
    onOpen: () => void;
    onDelete: () => void;
    onDragStart: () => void;
    onDrop: () => void;
}

export const ManifestFileRow: React.FC<ManifestFileRowProps> = ({
    file,
    selected,
    onSelect,
    onOpen,
    onDelete,
    onDragStart,
    onDrop,
}) => (
    <Card
        padding="sm"
        variant={selected ? "highlight" : "surface"}
        draggable
        onClick={onSelect}
        onDoubleClick={onOpen}
        onDragStart={onDragStart}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        style={
            selected
                ? {
                      border: "1px solid rgba(255, 255, 255, 0.45)",
                      boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.2)",
                  }
                : undefined
        }
    >
        <div
            style={{ display: "flex", justifyContent: "space-between", gap: 8 }}
        >
            <span>{selected ? `● ${file}` : file}</span>
            <Button size="sm" variant="ghost" onClick={onDelete}>
                Delete
            </Button>
        </div>
    </Card>
);
