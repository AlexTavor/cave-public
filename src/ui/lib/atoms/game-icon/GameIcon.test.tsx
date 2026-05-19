// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../foundation/theme/ThemeProvider";

const { mockUseResolvedDisplayIcon } = vi.hoisted(() => ({
    mockUseResolvedDisplayIcon: vi.fn(),
}));

vi.mock("../../foundation/icon-registry/useResolvedDisplayIcon", () => ({
    useResolvedDisplayIcon: mockUseResolvedDisplayIcon,
}));

import { GameIcon } from "./GameIcon";

const renderIcon = (id: string) =>
    render(
        <ThemeProvider>
            <GameIcon id={id} />
        </ThemeProvider>,
    );

afterEach(() => {
    cleanup();
});

describe("GameIcon", () => {
    it("renders the resolved image when the primary request succeeds", () => {
        mockUseResolvedDisplayIcon.mockImplementation((id: string) =>
            id === "wood"
                ? { url: "wood.png", status: "ready" }
                : { url: null, status: "idle" },
        );

        renderIcon("wood");

        expect(screen.getByAltText("wood").getAttribute("src")).toBe(
            "wood.png",
        );
    });

    it("renders the loading display while the primary request is pending", () => {
        mockUseResolvedDisplayIcon.mockImplementation((id: string) => {
            if (id === "wood") return { url: null, status: "loading" };
            if (id === "loading")
                return { url: "loading.png", status: "ready" };
            return { url: null, status: "idle" };
        });

        renderIcon("wood");

        expect(screen.getByAltText("wood").getAttribute("src")).toBe(
            "loading.png",
        );
    });

    it("renders the unknown display when the primary request fails", () => {
        mockUseResolvedDisplayIcon.mockImplementation((id: string) => {
            if (id === "missing") return { url: null, status: "error" };
            if (id === "unknown")
                return { url: "unknown.png", status: "ready" };
            return { url: null, status: "idle" };
        });

        renderIcon("missing");

        expect(screen.getByAltText("missing").getAttribute("src")).toBe(
            "unknown.png",
        );
    });
});
