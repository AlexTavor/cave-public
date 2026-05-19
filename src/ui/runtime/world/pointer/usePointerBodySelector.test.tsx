// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
    Harness,
    makeBody,
    makeRuntime,
} from "./usePointerBodySelector.testHarness";

afterEach(cleanup);

describe("usePointerBodySelector", () => {
    it("filters out carried bodies that the target cannot accept", () => {
        render(
            <Harness
                runtime={makeRuntime([
                    makeBody("valid", ["swift"]),
                    makeBody("invalid"),
                ])}
                candidateIds={["valid", "invalid"]}
                targetEntity={{
                    id: "node",
                    assignment: {
                        filter: [
                            { kind: "required_traits_all", ids: ["swift"] },
                        ],
                    },
                }}
            />,
        );
        expect(screen.getByTestId("candidates").textContent).toBe("valid");
    });

    it("uses remaining capacity when selecting carried bodies", () => {
        render(
            <Harness
                runtime={makeRuntime([makeBody("a"), makeBody("b")])}
                candidateIds={["a", "b"]}
                targetEntity={{
                    id: "node",
                    assignment: { slots: 2, assignedIds: ["held"] },
                }}
            />,
        );
        fireEvent.mouseDown(screen.getByTestId("candidate-a"));
        fireEvent.mouseUp(screen.getByTestId("root"));
        fireEvent.mouseDown(screen.getByTestId("candidate-b"));
        fireEvent.mouseUp(screen.getByTestId("root"));
        expect(screen.getByTestId("selected").textContent).toBe("a");
    });

    it("allows confirmation before assignment minimums are met", () => {
        render(
            <Harness
                runtime={makeRuntime([makeBody("a")])}
                candidateIds={["a"]}
                targetEntity={{
                    id: "node",
                    assignment: {
                        minimums: [{ kind: "body_count", required: 2 }],
                    },
                }}
            />,
        );
        fireEvent.mouseDown(screen.getByTestId("candidate-a"));
        fireEvent.mouseUp(screen.getByTestId("root"));
        expect(
            (screen.getByTestId("confirm") as HTMLButtonElement).disabled,
        ).toBe(false);
    });

    it("prunes stale selections when the valid candidate set shrinks", () => {
        const runtime = makeRuntime([makeBody("a"), makeBody("b", ["swift"])]);
        const view = render(
            <Harness
                runtime={runtime}
                candidateIds={["a", "b"]}
                targetEntity={{ id: "node", assignment: {} }}
            />,
        );
        fireEvent.mouseDown(screen.getByTestId("candidate-a"));
        fireEvent.mouseDown(screen.getByTestId("candidate-b"));
        fireEvent.mouseUp(screen.getByTestId("root"));
        view.rerender(
            <Harness
                runtime={runtime}
                candidateIds={["a", "b"]}
                targetEntity={{
                    id: "node",
                    assignment: {
                        filter: [
                            { kind: "required_traits_all", ids: ["swift"] },
                        ],
                    },
                }}
            />,
        );
        expect(screen.getByTestId("selected").textContent).toBe("b");
    });
});
