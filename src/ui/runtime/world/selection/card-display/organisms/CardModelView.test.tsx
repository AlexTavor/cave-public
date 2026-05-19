// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { CardModelView } from "./CardModelView";

afterEach(cleanup);

const renderView = (
    props: Partial<React.ComponentProps<typeof CardModelView>>,
) =>
    render(
        <ThemeProvider>
            <CardModelView model={null} runtime={null} {...props} />
        </ThemeProvider>,
    );

describe("CardModelView", () => {
    it("renders sections before description", () => {
        renderView({
            model: {
                id: "body-card",
                entityId: "body-1",
                sections: [
                    {
                        id: "stats",
                        layout: "row",
                        density: "normal",
                        capsules: [
                            {
                                id: "health",
                                skin: "value",
                                title: "Health",
                                value: { text: "7/10" },
                                effects: [],
                            },
                        ],
                    },
                ],
                description: { id: "description", text: "Description text" },
            },
        });

        const sectionText = screen.getByText("Health");
        const descriptionText = screen.getByText("Description text");
        const relation =
            sectionText.compareDocumentPosition(descriptionText) &
            Node.DOCUMENT_POSITION_FOLLOWING;

        expect(relation).toBeTruthy();
    });

    it("renders custom slots and forwards actions", () => {
        const onAction = vi.fn();
        renderView({
            customSlots: { actions: <div>Custom slot</div> },
            onAction,
            model: {
                id: "job-card",
                entityId: "job-1",
                title: {
                    id: "title",
                    text: "Job",
                    action: {
                        id: "title-action",
                        label: "Title",
                        kind: "codex",
                    },
                },
                sections: [
                    {
                        id: "actions",
                        title: "Actions",
                        action: {
                            id: "section-action",
                            label: "Section",
                            kind: "codex",
                        },
                        layout: "column",
                        density: "normal",
                        customContentKind: "actions",
                    },
                ],
                description: {
                    id: "description",
                    text: "Description",
                    action: {
                        id: "description-action",
                        label: "Description",
                        kind: "codex",
                    },
                },
            },
        });

        expect(screen.getByText("Custom slot")).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Title" }));
        fireEvent.click(screen.getByRole("button", { name: "Section" }));
        fireEvent.click(screen.getByRole("button", { name: "Description" }));
        expect(onAction).toHaveBeenCalledTimes(2);
    });
});
