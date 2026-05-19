// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { createRuntimeTestDouble } from "../../testUtils";
import { BodyBrick } from "./BodyBrick";

vi.mock("../../../../lib/atoms/game-icon/GameIcon", () => ({
    GameIcon: ({ id }: any) => <span aria-label={id} />,
}));
vi.mock("../body/BodyAvatar", () => ({
    BodyAvatar: ({ subjectId }: any) => (
        <span data-testid="body-avatar">{subjectId}</span>
    ),
}));
vi.mock("../../../../lib/atoms/tooltip", () => ({
    SmartTooltip: ({ children }: any) => <>{children}</>,
}));

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe("BodyBrick flyweight", () => {
    it("renders the compact row stats around the body avatar", () => {
        const entity = {
            id: "b1",
            blueprintId: "newbody",
            traits: [{ id: "starving" }],
            body: {
                level: 3,
                xp: 10,
                health: 7,
                maxHealth: 9,
                passport: { name: "New Body" },
                attributes: { body: 1, mind: 2, social: 3 },
                habiti: [],
            },
            display: { label: "New Body", icon: "body_icon" },
        } as any;
        const runtimeDouble = createRuntimeTestDouble({
            getEntity: (id: string) => (id === entity.id ? entity : null),
            getCartridge: () => ({
                config: { habiti: {} },
                blueprints: {
                    newbody: {
                        id: "newbody",
                        label: "New Body",
                        tags: [],
                        components: {
                            display: { label: "New Body", icon: "body_icon" },
                        },
                    },
                },
            }),
        });

        render(
            <ThemeProvider>
                <BodyBrick
                    entityId={entity.id}
                    runtime={runtimeDouble.runtime as any}
                    onMouseDown={vi.fn()}
                    onMouseEnter={vi.fn()}
                />
            </ThemeProvider>,
        );

        expect(screen.getByTestId("body-avatar").textContent).toBe("b1");
        expect(screen.getAllByText("3").length).toBeGreaterThan(1);
        expect(screen.getByText("7/9")).toBeTruthy();
        expect(screen.getByLabelText("cave_level")).toBeTruthy();
        expect(screen.getByLabelText("attr_body")).toBeTruthy();
        expect(screen.getByLabelText("food")).toBeTruthy();
    });
});

