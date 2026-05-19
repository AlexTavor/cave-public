import { describe, expect, it } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";

const compileStorage = (initialValue: number, capacity = 10) =>
    new CompilerService().compile(
        createBlueprint("egg", {
            components: {},
            _editor: {
                abilities: {
                    storage: [
                        {
                            resource: "food",
                            initialValue,
                            capacity: {
                                base: capacity,
                                perBody: 0,
                                multPerBody: 0,
                            },
                            isDefault: true,
                            entropy: { base: 0, perBody: 0, multPerBody: 0 },
                            visible: true,
                            allowDeposit: true,
                            allowWithdraw: true,
                            priority: 0,
                        },
                    ],
                },
            },
        }),
    );

describe("storageCompiler initialValue", () => {
    it("compiles the authored initial value into state", () => {
        expect((compileStorage(4).components.state as any).food.value).toBe(4);
    });

    it("clamps the authored initial value to capacity", () => {
        expect((compileStorage(14, 6).components.state as any).food.value).toBe(
            6,
        );
    });
});
