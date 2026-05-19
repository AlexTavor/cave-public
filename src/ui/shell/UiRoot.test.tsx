// @vitest-environment jsdom
import { useContext } from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { UiRoot } from "./UiRoot";
import { IconRegistryContext } from "../lib/foundation/icon-registry/IconRegistryContext";
import { PortalContext } from "../lib/foundation/portal-manager/PortalContext";

const ContextProbe = () => {
    const iconRegistry = useContext(IconRegistryContext);
    const portalContext = useContext(PortalContext);

    if (!iconRegistry || !portalContext) return null;

    return <div>ready</div>;
};

afterEach(() => {
    cleanup();
});

describe("UiRoot", () => {
    it("provides icon registry and portal contexts", async () => {
        render(
            <UiRoot>
                <ContextProbe />
            </UiRoot>,
        );

        await waitFor(() => {
            expect(screen.getByText("ready")).toBeDefined();
        });
    });
});

