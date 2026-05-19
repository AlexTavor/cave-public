import type { TextOwnerSpec } from "./textRegistrySpecTypes";

export const understandingTextSpec: TextOwnerSpec = {
    ownerType: "understanding",
    fields: [
        { path: "label", label: "label", category: "label" },
        {
            path: "description",
            label: "description",
            category: "description",
        },
    ],
    lists: [
        {
            path: "effects",
            fields: [
                {
                    path: "description",
                    label: "effect[{index1}].description",
                    category: "description",
                },
            ],
        },
    ],
};
