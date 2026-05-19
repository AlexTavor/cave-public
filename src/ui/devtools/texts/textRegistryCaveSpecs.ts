import type { TextOwnerSpec } from "./textRegistrySpecTypes";
import { understandingTextSpec } from "./understandingTextSpec";

export const caveTextSpecs: readonly TextOwnerSpec[] = [
    {
        ownerType: "guidance",
        fields: [
            {
                path: "title",
                label: "title",
                category: "title",
                optional: true,
            },
            { path: "text", label: "text", category: "text", optional: true },
        ],
    },
    {
        ownerType: "tutorial",
        lists: [
            {
                path: "guidances",
                fields: [
                    {
                        path: "titleOverride",
                        label: "guidance[{guidanceIdOrIndex}].titleOverride",
                        category: "title",
                        optional: true,
                    },
                    {
                        path: "textOverride",
                        label: "guidance[{guidanceIdOrIndex}].textOverride",
                        category: "textOverride",
                        optional: true,
                    },
                ],
            },
        ],
    },
    {
        ownerType: "knowledge",
        fields: [
            { path: "label", label: "label", category: "label" },
            {
                path: "description",
                label: "description",
                category: "description",
            },
            {
                path: "textOverride",
                label: "textOverride",
                category: "textOverride",
                optional: true,
            },
        ],
    },
    {
        ownerType: "trait",
        fields: [
            { path: "label", label: "label", category: "label" },
            {
                path: "description",
                label: "description",
                category: "description",
                optional: true,
            },
        ],
    },
    {
        ownerType: "habitus",
        fields: [
            { path: "label", label: "label", category: "label" },
            {
                path: "description",
                label: "description",
                category: "description",
            },
            { path: "summary", label: "summary", category: "summary" },
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
    },
    understandingTextSpec,
    {
        ownerType: "purge_milestone",
        lists: [
            {
                path: "messages",
                fields: [
                    {
                        path: "",
                        label: "message[{index1}]",
                        category: "message",
                    },
                ],
            },
        ],
    },
];
