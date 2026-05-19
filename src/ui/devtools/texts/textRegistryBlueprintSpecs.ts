import type { TextOwnerSpec } from "./textRegistrySpecTypes";

export const blueprintTextSpecs: readonly TextOwnerSpec[] = [
    {
        ownerType: "blueprint_display",
        fields: [
            {
                path: "components.display.label",
                label: "label",
                category: "label",
            },
            {
                path: "components.display.description",
                label: "description",
                category: "description",
            },
        ],
    },
    {
        ownerType: "blueprint_body_passport",
        fields: [
            {
                path: "components.body.passport.name",
                label: "name",
                category: "name",
            },
            {
                path: "components.body.passport.description",
                label: "description",
                category: "description",
            },
        ],
    },
    {
        ownerType: "blueprint_passport",
        fields: [
            {
                path: "_editor.abilities.passport.label",
                label: "label",
                category: "label",
            },
            {
                path: "_editor.abilities.passport.description",
                label: "description",
                category: "description",
            },
        ],
    },
    {
        ownerType: "blueprint_notification",
        lists: [
            {
                path: "_editor.abilities.notifications",
                fields: [
                    {
                        path: "title",
                        label: "notification[{index1}].title",
                        category: "title",
                    },
                    {
                        path: "text",
                        label: "notification[{index1}].text",
                        category: "text",
                    },
                ],
            },
        ],
    },
    {
        ownerType: "blueprint_storage",
        lists: [
            {
                path: "_editor.abilities.storage",
                fields: [
                    {
                        path: "displayName",
                        label: "storage[{resourceOrIndex}].displayName",
                        category: "displayName",
                    },
                ],
            },
        ],
    },
    {
        ownerType: "blueprint_upkeep",
        lists: [
            {
                path: "_editor.abilities.upkeep",
                fields: [
                    {
                        path: "displayName",
                        label: "upkeep[{resourceOrIndex}].displayName",
                        category: "displayName",
                    },
                ],
            },
        ],
    },
    {
        ownerType: "blueprint_draft_ability",
        fields: [
            {
                path: "_editor.abilities.draft.label",
                label: "label",
                category: "label",
            },
        ],
    },
];
