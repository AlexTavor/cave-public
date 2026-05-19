// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createCartridge } from "../../../../../../engine/test/factories";
import { getByPath } from "../../../../../../utils/objectUtils";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { useSessionStore } from "../../../../state/useSessionStore";
import { HabitusRowEditor } from "./HabitusRowEditor";

describe("HabitusRowEditor", () => {
    it("renders summary and commits authored display text", () => {
        const filename = "test.cave";
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(
            filename,
            createCartridge(filename, {
                config: {
                    habiti: {
                        human: {
                            id: "human",
                            label: "Human",
                            description: "",
                            summary: "",
                            type: "species",
                            effects: [],
                            excludes: [],
                        },
                    },
                },
            }),
        );
        const { container } = render(
            <ThemeProvider>
                <HabitusRowEditor
                    filename={filename}
                    habitusId="human"
                    onDelete={() => {}}
                    onRename={() => null}
                />
            </ThemeProvider>,
        );
        fireEvent.click(screen.getByRole("button"));
        const textareas = container.querySelectorAll("textarea");
        fireEvent.change(textareas[1], {
            target: { value: "Deepens my memory." },
        });
        fireEvent.blur(textareas[1]);
        expect(screen.getByText("Description")).toBeTruthy();
        expect(
            getByPath(
                useSessionStore.getState().sessions[filename]?.draft,
                "config.habiti.human.summary",
            ),
        ).toBe("Deepens my memory.");
    });
});
