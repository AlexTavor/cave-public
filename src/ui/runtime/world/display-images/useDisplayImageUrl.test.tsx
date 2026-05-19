// @vitest-environment jsdom
import { useEffect } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useDisplayImageExportStore } from "../../state/useDisplayImageExportStore";
import { useDisplayImageUrl } from "./useDisplayImageUrl";

const Probe = () => {
    const result = useDisplayImageUrl({
        kind: "attribute_display",
        displayKey: "attr_body",
    });
    return <span data-testid="status">{result.status}</span>;
};

const Trap = () => {
    useEffect(() => {
        globalThis.addEventListener("error", preventDefault);
        return () => globalThis.removeEventListener("error", preventDefault);
    }, []);
    return <Probe />;
};

const preventDefault = (event: ErrorEvent) => event.preventDefault();

afterEach(() => {
    cleanup();
    useDisplayImageExportStore.getState().clear();
});

describe("useDisplayImageUrl", () => {
    it("falls back to error state when the service throws synchronously", async () => {
        useDisplayImageExportStore.getState().setService({
            getImageUrl: () => {
                throw new Error("boom");
            },
            clear() {},
        });

        render(<Trap />);

        await waitFor(() => {
            expect(screen.getByTestId("status").textContent).toBe("error");
        });
    });
});
