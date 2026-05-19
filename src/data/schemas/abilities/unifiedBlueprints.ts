import { z } from "zod";

export const UnifiedBlueprintMembershipSchema = z.object({
    tag: z.string(),
    spawnWhenPeerSpawns: z.boolean().default(false),
});

export const UnifiedBlueprintsAbilitySchema = z.array(
    UnifiedBlueprintMembershipSchema,
);

export type UnifiedBlueprintMembership = z.input<
    typeof UnifiedBlueprintMembershipSchema
>;
export type UnifiedBlueprintsAbilityConfig = z.input<
    typeof UnifiedBlueprintsAbilitySchema
>;
