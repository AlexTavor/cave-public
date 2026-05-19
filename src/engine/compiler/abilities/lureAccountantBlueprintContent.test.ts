import { describe, expect, it, vi } from "vitest";
import snapshot from "../../../../public/bootstrap/vfs-prod.json";
import { CompilerService } from "../CompilerService";

const files = structuredClone(snapshot as unknown as Record<string, unknown>);
const rawFiles = (
    import.meta as ImportMeta & {
        glob: <T>(
            pattern: string,
            options: { eager: true; query: string; import: string },
        ) => Record<string, T>;
    }
).glob<string>("../../../data/raw/example/modules/lure_accountant.bp", {
    eager: true,
    query: "?raw",
    import: "default",
});
const readRawBlueprint = () =>
    JSON.parse(
        rawFiles["../../../data/raw/example/modules/lure_accountant.bp"],
    );
const readBootstrapBlueprint = () =>
    structuredClone(files["example/modules/lure_accountant.bp"]) as any;

describe("lure_accountant blueprint content", () => {
    it("keeps assignment-only spawner triggers in raw and bootstrap data", () => {
        expect(
            readRawBlueprint()._editor.abilities.spawner[0].triggers,
        ).toEqual(["assignment_complete"]);
        expect(
            readBootstrapBlueprint()._editor.abilities.spawner[0].triggers,
        ).toEqual(["assignment_complete"]);
    });

    it("compiles without the cycle-required spawner warning", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const compiler = new CompilerService();

        compiler.compile(readRawBlueprint());
        compiler.compile(readBootstrapBlueprint());

        expect(warn).not.toHaveBeenCalledWith(
            "Spawner ability requires cycle on 'lure_accountant'.",
        );
        warn.mockRestore();
    });
});
