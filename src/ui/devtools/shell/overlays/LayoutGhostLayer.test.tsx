// @vitest-environment jsdom
import React from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { LayoutGhostLayer } from "./LayoutGhostLayer";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { useSessionStore } from "../../state/useSessionStore";
import { useShellStore } from "../shell";
import {
    createBlueprint,
    createCartridge,
} from "../../../../engine/test/factories";

const filename = "test-module";
const blueprintId = "ghost";
const SESSION_ID = `${filename}::blueprints::${blueprintId}`;

const renderWithTheme = (ui: React.ReactElement) =>
    render(<ThemeProvider>{ui}</ThemeProvider>);

afterEach(() => {
    cleanup();
    useSessionStore.setState({ sessions: {} });
    useShellStore.setState({
        activeFilePath: null,
        activeModuleFilename: null,
    });
});

describe("LayoutGhostLayer", () => {
    it("renders nothing when invisible", () => {
        renderWithTheme(<LayoutGhostLayer />);
        expect(screen.queryByTestId("layout-ghost-layer")).toBeNull();
    });

    it("renders ghost elements when visible", async () => {
        useSessionStore.getState().initSession(
            filename,
            createCartridge(filename, {
                blueprints: {
                    [blueprintId]: createBlueprint(blueprintId, {
                        components: {
                            physics: {
                                x: 10,
                                y: 20,
                                radius: 15,
                                mass: 1,
                                drag: 0.1,
                                isStatic: false,
                            },
                        },
                    }),
                },
            }),
        );
        useShellStore.getState().openFile(SESSION_ID);

        renderWithTheme(<LayoutGhostLayer />);

        await waitFor(() => {
            expect(screen.getByTestId("layout-ghost-layer")).toBeDefined();
        });

        expect(screen.getByTestId("layout-ghost-node")).toBeDefined();
        expect(screen.getByTestId("layout-ghost-crosshair-x")).toBeDefined();
        expect(screen.getByTestId("layout-ghost-crosshair-y")).toBeDefined();
    });
});
