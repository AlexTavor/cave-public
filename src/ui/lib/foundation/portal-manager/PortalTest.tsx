import React, { useState } from "react";
import { PortalLayer } from "./types";
import { Portal } from "./Portal";
import { PortalManager } from "./PortalManager";

// --- Types ---
interface TestItem {
    id: number;
    layer: PortalLayer;
    x?: number;
    y?: number;
    color: string;
}

let nextId = 0;

const getRandomColor = () => {
    const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];
    return colors[Math.floor(Math.random() * colors.length)];
};

const getRandomPos = () => ({
    x: 100 + Math.random() * (window.innerWidth - 300),
    y: 100 + Math.random() * (window.innerHeight - 300),
});

// --- Visual Components ---

const ControlPanel: React.FC<{
    onAdd: (layer: PortalLayer) => void;
    onClearRandom: () => void;
    onClearAll: () => void;
    count: number;
}> = ({ onAdd, onClearRandom, onClearAll, count }) => (
    <div
        style={{
            position: "absolute",
            bottom: "80px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#333",
            padding: "12px 24px",
            borderRadius: "12px",
            display: "flex",
            gap: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            zIndex: 10000, // Ensure controls are above everything for testing
            color: "white",
            fontFamily: "monospace",
            alignItems: "center",
            pointerEvents: "all",
        }}
    >
        <span>Items: {count}</span>
        <div style={{ width: "1px", height: "20px", background: "#666" }} />
        <button onClick={() => onAdd("overlay")}>+ Overlay (z1000)</button>
        <button onClick={() => onAdd("float")}>+ Float (z2000)</button>
        <button onClick={() => onAdd("toast")}>+ Toast (z3000)</button>
        <div style={{ width: "1px", height: "20px", background: "#666" }} />
        <button onClick={onClearRandom} style={{ color: "#fca5a5" }}>
            Pop Random
        </button>
        <button onClick={onClearAll} style={{ color: "#ef4444" }}>
            Clear All
        </button>
    </div>
);

const TestOverlay: React.FC<{ item: TestItem }> = ({ item }) => (
    <div
        style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "all", // Block clicks
        }}
    >
        <div
            style={{
                width: "400px",
                padding: "24px",
                background: "#222",
                border: `2px solid ${item.color}`,
                color: "white",
                borderRadius: "8px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            }}
        >
            <h3 style={{ marginTop: 0 }}>Overlay #{item.id}</h3>
            <p>I am on the Overlay layer (z-index 1000).</p>
            <p>
                I should block interactions with the game, but NOT obscure
                Tooltips or Toasts.
            </p>
        </div>
    </div>
);

const TestFloat: React.FC<{ item: TestItem }> = ({ item }) => (
    <div
        style={{
            position: "absolute",
            left: item.x,
            top: item.y,
            background: "#fff",
            color: "#000",
            padding: "8px 12px",
            borderRadius: "4px",
            borderLeft: `4px solid ${item.color}`,
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            pointerEvents: "none", // Floats usually don't block
            whiteSpace: "nowrap",
        }}
    >
        <strong>Float #{item.id}</strong> (z-index 2000)
        <br />
        <small>I should appear ABOVE overlays.</small>
    </div>
);

const TestToast: React.FC<{ item: TestItem; index: number }> = ({
    item,
    index,
}) => (
    <div
        style={{
            position: "fixed",
            top: 20 + index * 70,
            right: 20,
            width: "300px",
            background: item.color,
            color: "white",
            padding: "16px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            pointerEvents: "all",
            transition: "all 0.3s ease",
        }}
    >
        <strong>Toast #{item.id}</strong> (z-index 3000)
        <div style={{ fontSize: "12px", opacity: 0.9 }}>
            I am the topmost layer.
        </div>
    </div>
);

// --- Main Component ---

export const PortalTest: React.FC = () => {
    const [items, setItems] = useState<TestItem[]>([]);

    const handleAdd = (layer: PortalLayer) => {
        const newItem: TestItem = {
            id: nextId++,
            layer,
            color: getRandomColor(),
            ...getRandomPos(),
        };
        setItems((prev) => [...prev, newItem]);
    };

    const handleClearRandom = () => {
        if (items.length === 0) return;
        const index = Math.floor(Math.random() * items.length);
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    const handleClearAll = () => setItems([]);

    // Filter items for the Toast stack calculation
    const toastItems = items.filter((i) => i.layer === "toast");

    return (
        <PortalManager>
            <ControlPanel
                onAdd={handleAdd}
                onClearRandom={handleClearRandom}
                onClearAll={handleClearAll}
                count={items.length}
            />

            {items.map((item) => (
                <Portal key={item.id} layer={item.layer}>
                    {item.layer === "overlay" && <TestOverlay item={item} />}
                    {item.layer === "float" && <TestFloat item={item} />}
                    {item.layer === "toast" && (
                        <TestToast
                            item={item}
                            index={toastItems.indexOf(item)}
                        />
                    )}
                </Portal>
            ))}
        </PortalManager>
    );
};
