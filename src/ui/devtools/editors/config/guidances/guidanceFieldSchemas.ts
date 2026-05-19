import { z } from "zod";

export const GUIDANCES_PATH = "config.settings.guidances";
export const guidanceStringSchema = z.string();
export const guidanceTargetKindSchema = z.enum(["entity_id", "entity_tag"]);
export const guidancePresentationSchema = z.enum([
    "node_callout",
    "screen_callout",
    "modal",
    "draft_guidance",
]);
export const guidanceAttentionSchema = z.enum([
    "stop_time",
    "hide_time_controls",
    "hide_notifications",
    "hide_all_but_self",
    "show_attention_effect_on_self",
]);
export const guidanceNodeSlotSchema = z.enum([
    "top",
    "top_right",
    "right",
    "bottom_right",
    "bottom",
    "bottom_left",
    "left",
    "top_left",
]);
export const guidanceScreenSlotSchema = z.enum([
    "top_left",
    "top_right",
    "bottom_left",
    "bottom_right",
    "center",
]);
