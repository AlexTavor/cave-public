// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { TransferCard } from "./TransferCard";

const runtime = {
    getEntity: (id: string) =>
        (
            ({
                still_pool: { id, display: { label: "Still Pool" } },
                sys_world: { id, display: { label: "Cave" } },
            }) as Record<string, unknown>
        )[id],
} as never;

describe("TransferCard", () => {
    it("shows transfer summary and endpoints", () => {
        render(
            <ThemeProvider>
                <TransferCard
                    entity={
                        {
                            tags: ["pending_transfer"],
                            transfer: {
                                payload: { xp: 10 },
                                visualType: "xp",
                                sourceId: "still_pool",
                                targetId: "sys_world",
                            },
                        } as never
                    }
                    runtime={runtime}
                />
            </ThemeProvider>,
        );

        expect(screen.getByText("10 XP from Still Pool to Cave")).toBeTruthy();
        expect(screen.getByText("Transfer Node")).toBeTruthy();
        expect(screen.getByText("Type")).toBeTruthy();
        expect(screen.getByText("XP")).toBeTruthy();
        expect(screen.getByText("Value")).toBeTruthy();
        expect(screen.getByText("10")).toBeTruthy();
        expect(screen.getByText("From")).toBeTruthy();
        expect(screen.getByText("Still Pool")).toBeTruthy();
        expect(screen.getByText("To")).toBeTruthy();
        expect(screen.getByText("Cave")).toBeTruthy();
    });
});
