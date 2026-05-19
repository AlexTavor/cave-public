import { z } from "zod";

const DisplayAssetBaseSchema = z.object({
    tooltip: z.string().optional().describe("ui:textarea"),
    tags: z.array(z.string()).optional().describe("ui:collapsed"),
    defaultLineThickness: z.number().positive().optional(),
});

const finite = () => z.float64();

export const TransferNodeRadiusByValueSchema = z
    .object({
        minValue: finite(),
        minRadius: finite().min(0),
        maxValue: finite(),
        maxRadius: finite().min(0),
    })
    .refine((value) => value.minValue <= value.maxValue, {
        message: "minValue must be less than or equal to maxValue",
    });

export const DisplayAssetTypeSchema = z.enum([
    "body",
    "attribute_pool",
    "resource",
]);

export const BodyDisplayAssetSchema = DisplayAssetBaseSchema.extend({
    type: z.literal("body"),
});

export const AttributePoolDisplayAssetSchema = DisplayAssetBaseSchema.extend({
    type: z.literal("attribute_pool"),
    attribute: z.enum(["body", "mind", "social"]),
    glyphKey: z.string().describe("ui:glyph").optional(),
});

export const ResourceDisplayAssetSchema = DisplayAssetBaseSchema.extend({
    type: z.literal("resource"),
    styleId: z.string().describe("ui:style"),
    glyphKey: z.string().describe("ui:glyph"),
    transferNodeRadiusByValue: TransferNodeRadiusByValueSchema.optional(),
});

export const DisplayAssetSchema = z.discriminatedUnion("type", [
    BodyDisplayAssetSchema,
    AttributePoolDisplayAssetSchema,
    ResourceDisplayAssetSchema,
]);

export type DisplayAssetType = z.infer<typeof DisplayAssetTypeSchema>;
export type BodyDisplayAsset = z.infer<typeof BodyDisplayAssetSchema>;
export type TransferNodeRadiusByValue = z.infer<
    typeof TransferNodeRadiusByValueSchema
>;
export type AttributePoolDisplayAsset = z.infer<
    typeof AttributePoolDisplayAssetSchema
>;
export type ResourceDisplayAsset = z.infer<typeof ResourceDisplayAssetSchema>;
export type DisplayAsset = z.infer<typeof DisplayAssetSchema>;
