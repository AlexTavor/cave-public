import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../test/factories";
import { CompilerService } from "../CompilerService";

describe("notificationCompiler assignment fallback", () => {
    it("keeps assignment notifications when compiled through CompilerService", () => {
        const compiled = new CompilerService().compile(
            createBlueprint("lure_accountant", {
                components: {},
                _editor: {
                    abilities: {
                        assignment: {
                            slots: 1,
                            locking: true,
                            filter: [],
                            minimums: [],
                            duration: 30,
                            oneOff: true,
                            results: [],
                        },
                        notifications: [
                            {
                                id: "note-1",
                                title: "Lovers Reunited",
                                text: "done",
                                imageUrl: null,
                            },
                        ],
                    },
                },
            }),
        );
        expect(
            compiled.components.behavior?.rules?.find(
                (rule) => rule.id === "sys_assignment_complete_reset",
            )?.actions,
        ).toContainEqual({
            type: "SHOW_NOTIFICATION_ABILITY_GUIDANCE",
            abilityId: "note-1",
            title: "Lovers Reunited",
            text: "done",
            imageUrl: null,
        });
    });
});
