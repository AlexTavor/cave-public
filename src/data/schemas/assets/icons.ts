import { z } from "zod";

export const IconAssetTypeSchema = z.enum(["emoji", "image"]);

export const IconAssetDefinitionSchema = z.object({
    type: IconAssetTypeSchema,
    value: z.string(),
    tooltip: z.string().optional().describe("ui:textarea"),
    tags: z.array(z.string()).optional().describe("ui:collapsed"),
});

export type IconAssetType = z.infer<typeof IconAssetTypeSchema>;
export type IconAssetDefinition = z.infer<typeof IconAssetDefinitionSchema>;
