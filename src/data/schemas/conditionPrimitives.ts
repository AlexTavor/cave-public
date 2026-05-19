import { z } from "zod";

export const FactScopeSchema = z.enum(["run", "permanent"]);
export const FactTypeSchema = z.enum([
    "elapsed_real_seconds",
    "elapsed_game_seconds",
    "run_number",
    "cave_status",
    "throttle_level",
    "body_selector_open",
    "processing_ongoing",
    "active_bodies",
    "blueprint_spawned",
    "blueprint_killed",
    "draft_opened",
    "draft_completed",
    "purge_began",
    "cycle_completed",
    "body_recruited_at",
    "habitus_owned",
    "understanding_owned",
    "thought_seen",
    "tutorial_completed",
]);
export const StructuredConditionOperatorSchema = z.enum([
    ">",
    ">=",
    "==",
    "<=",
    "<",
]);
export const UserInteractionStateSchema = z.enum([
    "self_selected",
    "self_unselected",
]);
export const CAVE_STATUS_ABOUTS = new Set(["food", "heat"]);
