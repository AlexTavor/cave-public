// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FloatingTree } from "@floating-ui/react";
import { ThemeProvider } from "../../foundation/theme/ThemeProvider";
import { PortalManager } from "../../foundation/portal-manager/PortalManager";
import { SmartTooltip } from "./SmartTooltip";

afterEach(cleanup);

describe("SmartTooltip portal layering", () => {
    it("mounts tooltip content in the tooltip portal layer", async () => {
        render(
            <ThemeProvider>
                <PortalManager>
                    <FloatingTree>
                        <SmartTooltip content="Tooltip body" enterDelay={0}>
                            <button type="button">Hover me</button>
                        </SmartTooltip>
                    </FloatingTree>
                </PortalManager>
            </ThemeProvider>,
        );

        fireEvent.mouseEnter(screen.getByRole("button", { name: "Hover me" }));

        await waitFor(() =>
            expect(
                document.querySelector("#portal-tooltips [role='tooltip']"),
            ).not.toBeNull(),
        );
    });
});
