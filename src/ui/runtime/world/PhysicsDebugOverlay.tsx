import React, { useEffect, useLayoutEffect, useRef } from "react";
import { useRuntimeToolStore } from "../state/useRuntimeToolStore";
import { useWorldInteraction } from "./context/WorldInteractionContext";
import { DebugCanvas } from "./PhysicsDebugOverlay.styles";

// --- Drawing Helpers ---

const drawCollider = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
) => {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 255, 0, 0.5)"; // Green
    ctx.lineWidth = 1;
    ctx.stroke();
};

const drawVelocityVector = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    px: number,
    py: number,
) => {
    const vx = x - px;
    const vy = y - py;
    const speed = Math.hypot(vx, vy);

    if (speed <= 0.01) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    // Scale vector by 10 to make movement direction visible
    ctx.lineTo(x + vx * 10, y + vy * 10);
    ctx.strokeStyle = "rgba(255, 50, 50, 0.8)"; // Red
    ctx.lineWidth = 2;
    ctx.stroke();
};

const drawTargetVector = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    targetBody: { position: { x: number; y: number } } | undefined,
) => {
    if (!targetBody) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(targetBody.position.x, targetBody.position.y);
    ctx.strokeStyle = "rgba(255, 255, 0, 0.3)"; // Yellow (faint)
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
};

const renderFrame = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    runtime: any, // Typed as any to avoid deep import chains in UI layer, but practically represents the Runtime instance
) => {
    // Clear frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!runtime) return;

    const entities = runtime.getEntities();

    for (const entity of entities) {
        if (!entity.id) continue;

        const body = runtime.getPhysicsBody(entity.id);
        if (!body) continue;

        const { x, y } = body.position;
        const { x: px, y: py } = body.prevPosition;
        const { radius } = body;

        drawCollider(ctx, x, y, radius);
        drawVelocityVector(ctx, x, y, px, py);

        if (body.targetId) {
            const targetBody = runtime.getPhysicsBody(body.targetId);
            drawTargetVector(ctx, x, y, targetBody);
        }
    }
};

export const PhysicsDebugOverlay: React.FC = () => {
    const isVisible = useRuntimeToolStore((s) => s.isPhysicsDebugVisible);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { runtime } = useWorldInteraction();
    const runtimeRef = useRef(runtime);

    useEffect(() => {
        runtimeRef.current = runtime;
    }, [runtime]);

    useLayoutEffect(() => {
        if (!isVisible) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        // Initial sizing
        handleResize();
        window.addEventListener("resize", handleResize);

        const loop = () => {
            renderFrame(ctx, canvas, runtimeRef.current);
            animationFrameId = requestAnimationFrame(loop);
        };

        // Start Loop
        loop();

        return () => {
            window.removeEventListener("resize", handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [isVisible]);

    if (!isVisible) return null;

    return <DebugCanvas ref={canvasRef} />;
};
