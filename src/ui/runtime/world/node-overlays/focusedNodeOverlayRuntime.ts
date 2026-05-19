import {
    makeNodeOverlayRuntime,
    makePhysicsBody,
} from "./nodeOverlayTestUtils";

export const makeFocusedNodeOverlayRuntime = () =>
    ({
        ...makeNodeOverlayRuntime(
            [{ id: "a", state: { food: { value: 1, max: 2 } } }, { id: "b" }],
            {
                a: makePhysicsBody("a", 0, 0),
                b: makePhysicsBody("b", 20, 0),
            },
        ),
        getEntity: () => ({
            tutorial: {
                active: true,
                bindings: [
                    {
                        bindingId: "intro::0",
                        guidanceId: "hint",
                        targetId: "a",
                        targetOptionId: null,
                        textOverride: null,
                    },
                    {
                        bindingId: "intro::1",
                        guidanceId: "hint",
                        targetId: "b",
                        targetOptionId: null,
                        textOverride: null,
                    },
                ],
                attention: {
                    hideNotifications: false,
                    hideTimeControls: false,
                    pauseGame: false,
                    focusEntityIds: ["a"],
                    ringEntityIds: [],
                    cameraFocusEntityId: "a",
                    blockNonFocusedInteraction: true,
                },
            },
        }),
        getCartridge: () => ({
            config: {
                settings: {
                    guidances: [
                        {
                            id: "hint",
                            presentation: "node_callout",
                            target: { kind: "entity_id", entityId: "a" },
                            slot: "top",
                            text: "Hint",
                            attention: [],
                            imageUrl: null,
                        },
                    ],
                },
            },
            blueprints: {},
        }),
    }) as any;
