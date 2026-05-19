export const TEXT_FIELD_CATEGORIES = [
    "label",
    "title",
    "description",
    "body",
    "text",
    "textOverride",
    "summary",
    "name",
    "message",
    "displayName",
] as const;

export const TEXT_OWNER_TYPES = [
    "blueprint_display",
    "blueprint_passport",
    "blueprint_body_passport",
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

export type TextFieldCategory = (typeof TEXT_FIELD_CATEGORIES)[number];
export type TextOwnerType = (typeof TEXT_OWNER_TYPES)[number];

export interface TextFieldEntry {
    key: string;
    filename: string;
    ownerKey: string;
    ownerType: TextOwnerType;
    ownerId: string;
    category: TextFieldCategory;
    label: string;
    path: string;
    value: string;
}

export interface TextOwnerBlock {
    key: string;
    filename: string;
    ownerType: TextOwnerType;
    ownerId: string;
    fields: TextFieldEntry[];
}
