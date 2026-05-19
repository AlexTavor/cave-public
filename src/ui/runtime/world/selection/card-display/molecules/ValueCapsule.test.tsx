// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IconRegistryProvider } from "../../../../../lib/foundation/icon-registry/IconRegistryProvider";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { ValueCapsule } from "./ValueCapsule";

afterEach(cleanup);

describe("ValueCapsule", () => {
    it("renders visible content and click affordance for actions", () => {
        // Given
        const onClick = vi.fn();

        // When
        render(
            <ThemeProvider>
                <IconRegistryProvider>
                    <ValueCapsule
                        model={{
                            id: "health",
                            skin: "value",
                            iconId: "health",
                            title: "Health",
                            value: { text: "7/10" },
                            effects: [
                                {
                                    id: "regen",
                                    text: "+1/5s",
                                    tone: "positive",
                                },
                            ],
                            action: {
                                id: "open",
                                label: "Open health",
                                kind: "callback",
                                callback: onClick,
                            },
                        }}
                    />
                </IconRegistryProvider>
            </ThemeProvider>,
        );

        // Then
        expect(screen.getByText("Health")).toBeTruthy();
        expect(screen.getByText("7/10")).toBeTruthy();
        expect(screen.getByText("ⓘ")).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Open health" }));
        expect(onClick).toHaveBeenCalledTimes(1);
    });
});
