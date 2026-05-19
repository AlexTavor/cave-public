import { z } from "zod";

export const TUTORIALS_PATH = "config.settings.tutorials";
export const tutorialStringSchema = z.string();
export const tutorialSelfKindSchema = z.enum([
    "auto",
    "entity_id",
    "entity_tag",
    "spawned_with_tag",
]);
export const tutorialTargetKindSchema = z.enum(["entity_id", "entity_tag"]);
