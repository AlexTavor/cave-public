import React, { useEffect } from "react";
import { Card } from "../../lib/atoms/card";
import { Button } from "../../lib/atoms/button";
import { useToastStore } from "./toastStore";

export const ToastViewport: React.FC = () => {
    const items = useToastStore((s) => s.items);
    const remove = useToastStore((s) => s.remove);

    useEffect(() => {
        const timers = items.map((item) =>
            globalThis.setTimeout(() => remove(item.id), 2200),
        );
        return () => timers.forEach((timer) => globalThis.clearTimeout(timer));
    }, [items, remove]);

    return (
        <div
            style={{
                position: "fixed",
                right: 12,
                bottom: 12,
                width: 360,
                pointerEvents: "auto",
            }}
        >
            {items.map((item) => (
                <Card
                    key={item.id}
                    variant={item.type === "error" ? "modal" : "highlight"}
                    padding="sm"
                    style={{ marginBottom: 8 }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 8,
                        }}
                    >
                        <span>{item.message}</span>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => remove(item.id)}
                        >
                            ×
                        </Button>
                    </div>
                </Card>
            ))}
        </div>
    );
};
