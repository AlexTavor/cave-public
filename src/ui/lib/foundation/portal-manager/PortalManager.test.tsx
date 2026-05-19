// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Portal } from "./Portal";
import { PortalManager } from "./PortalManager";

afterEach(() => {
    cleanup();
});

describe("PortalManager", () => {
    it("lets release events bubble while still blocking press events", () => {
        const down = vi.fn();
        const up = vi.fn();
        document.addEventListener("mousedown", down);
        document.addEventListener("mouseup", up);

        render(
            <PortalManager>
                <Portal layer="overlay">
                    <button type="button">Resize Handle</button>
                </Portal>
            </PortalManager>,
        );

        const handle = screen.getByRole("button", { name: "Resize Handle" });
        fireEvent.mouseDown(handle);
        fireEvent.mouseUp(handle);

        expect(down).not.toHaveBeenCalled();
        expect(up).toHaveBeenCalledTimes(1);

        document.removeEventListener("mousedown", down);
        document.removeEventListener("mouseup", up);
    });

    it("keeps tooltip, modal, and float portal layers in the correct order", () => {
        render(
            <PortalManager>
                <Portal layer="tooltip">
                    <div>Tooltip</div>
                </Portal>
                <Portal layer="overlay">
                    <div>Modal</div>
                </Portal>
                <Portal layer="float">
                    <div>Lens</div>
                </Portal>
                <Portal layer="toast">
                    <div>Notification</div>
                </Portal>
            </PortalManager>,
        );

        const tooltip = Number(
            document.getElementById("portal-tooltips")?.style.zIndex ?? 0,
        );
        const overlay = Number(
            document.getElementById("portal-overlays")?.style.zIndex ?? 0,
        );
        const float = Number(
            document.getElementById("portal-floats")?.style.zIndex ?? 0,
        );
        const toast = Number(
            document.getElementById("portal-toasts")?.style.zIndex ?? 0,
        );

        expect(tooltip).toBeGreaterThan(overlay);
        expect(overlay).toBeGreaterThan(float);
        expect(overlay).toBeGreaterThan(toast);
    });
});
