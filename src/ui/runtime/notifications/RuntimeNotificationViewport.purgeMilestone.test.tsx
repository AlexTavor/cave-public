// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PortalManager } from "../../lib/foundation/portal-manager/PortalManager";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { TestWorldInteractionProvider } from "../world/testUtils";
import { RuntimeNotificationViewport } from "./RuntimeNotificationViewport";
import { runtimeNotificationStore } from "./runtimeNotificationStore";

vi.mock("../../lib/atoms/animatable/Animatable", () => ({
    Animatable: ({ children }: any) => children,
    AnimatePresence: ({ children }: any) => children,
}));

describe("RuntimeNotificationViewport purge milestone", () => {
    beforeEach(() => runtimeNotificationStore.getState().reset());
    afterEach(cleanup);

    it("renders purge milestone event text through the event viewport", () => {
        runtimeNotificationStore.getState().applyEventBatch([
            {
                kind: "purge_milestone",
                aggregationKey: "purge_milestone:dread",
                count: 1,
                entityLabel: "The darkness grows.",
            },
        ] as any);
        render(
            <ThemeProvider>
                <PortalManager>
                    <TestWorldInteractionProvider
                        value={{ runtime: null } as any}
                    >
                        <RuntimeNotificationViewport />
                    </TestWorldInteractionProvider>
                </PortalManager>
            </ThemeProvider>,
        );
        expect(screen.getByText("The darkness grows.")).toBeTruthy();
    });
});
