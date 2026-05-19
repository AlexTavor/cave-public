// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PortalManager } from "../../lib/foundation/portal-manager/PortalManager";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { TestWorldInteractionProvider } from "../world/testUtils";
import { RuntimeNotificationViewport } from "./RuntimeNotificationViewport";
import { runtimeNotificationStore } from "./runtimeNotificationStore";

vi.mock("../../lib/atoms/animatable/Animatable", () => ({
    Animatable: ({ children }: any) => <div>{children}</div>,
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("RuntimeNotificationViewport habiti attention", () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        runtimeNotificationStore.getState().reset();
    });

    it("keeps notifications visible while habiti announcements are active", () => {
        const world: any = {
            id: "sys_world",
            cave: { purge: { isActive: true } },
            habitiAnnouncement: {
                active: true,
                attention: { hideNotifications: true },
            },
        };
        const runtime = {
            getEntities: () => [],
            getEntity: () => world,
        } as any;

        runtimeNotificationStore
            .getState()
            .applyEventBatch([
                { kind: "body_added", aggregationKey: "body_added", count: 1 },
            ]);

        render(
            <ThemeProvider>
                <PortalManager>
                    <TestWorldInteractionProvider value={{ runtime }}>
                        <RuntimeNotificationViewport />
                    </TestWorldInteractionProvider>
                </PortalManager>
            </ThemeProvider>,
        );

        expect(screen.getByLabelText("Runtime notifications")).toBeDefined();
        expect(screen.getByText("1 new body")).toBeDefined();
    });
});
