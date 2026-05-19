import type { TextOwnerSpec } from "./textRegistrySpecTypes";

export const draftTextSpecs: readonly TextOwnerSpec[] = [
    {
        ownerType: "draft_option",
        fields: [
            { path: "title", label: "title", category: "title" },
            {
                path: "description",
                label: "description",
                category: "description",
            },
        ],
    },
    {
        ownerType: "draft_pool",
        lists: [
            {
                path: "texts",
                fields: [
                    { path: "", label: "text[{index1}]", category: "text" },
                ],
            },
        ],
    },
];
