export const textRegistryDraftsByFile = {
    "alpha.bp": {
        metadata: { id: "alpha.bp", name: "Alpha", version: "1" },
        assets: {},
        blueprints: {
            forge: {
                id: "forge",
                components: {
                    display: { label: "Forge", description: "Heat" },
                    body: {
                        passport: { name: "Smith", description: "Worker" },
                    },
                },
                _editor: {
                    abilities: {
                        passport: { label: "Paper", description: "Docs" },
                        notifications: [{ title: "Hot", text: "Careful" }],
                        storage: [{ resource: "food", displayName: "Rations" }],
                        upkeep: [{ resource: "heat", displayName: "Fuel" }],
                        draft: { label: "Drafting" },
                    },
                },
            },
        },
    },
    "beta.draft": {
        metadata: { id: "beta.draft", name: "Beta", version: "1" },
        assets: {},
        blueprints: {},
        draftOptions: {
            pick: { id: "pick", title: "Pick", description: "Choose" },
        },
        draftPools: { pool: { id: "pool", texts: ["Line one"] } },
    },
    "gamma.cave": {
        metadata: { id: "gamma.cave", name: "Gamma", version: "1" },
        assets: {},
        blueprints: {},
        config: {
            traits: { brave: { id: "brave", label: "Brave" } },
            habiti: {
                calm: {
                    id: "calm",
                    label: "Calm",
                    description: "Still",
                    summary: "Quiet",
                    effects: [{ description: "Ease" }],
                },
            },
            understanding: {
                insight: {
                    id: "insight",
                    label: "Insight",
                    description: "Sees deeper.",
                    effects: [{ description: "Clarity" }],
                },
            },
            settings: {
                guidances: [{ id: "g-1", text: "Read me" }],
                tutorials: [
                    {
                        id: "t-1",
                        guidances: [
                            { guidanceId: "g-1", textOverride: "Override" },
                        ],
                    },
                ],
                knowledge: [{ id: "k-1", label: "Know", description: "Facts" }],
                game_config: {
                    purge: {
                        milestones: [{ id: "m-1", messages: ["Warn"] }],
                        susDisplays: [{ text: "skip" }],
                    },
                },
            },
        },
    },
} as const;

export const textRegistryOwnerTypes = [
    "blueprint_display",
    "blueprint_body_passport",
    "blueprint_passport",
    "blueprint_notification",
    "blueprint_storage",
    "blueprint_upkeep",
    "blueprint_draft_ability",
    "draft_option",
    "draft_pool",
    "guidance",
    "tutorial",
    "knowledge",
    "trait",
    "habitus",
    "understanding",
    "purge_milestone",
] as const;
