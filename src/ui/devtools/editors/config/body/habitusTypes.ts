import { z } from "zod";
import type { HabitusTypeId } from "../../../../../data/schemas/game/habiti";

export const HABITUS_TYPES: HabitusTypeId[] = [
    "species",
    "gender",
    "social_category",
    "profession",
    "sexual_preference",
    "unique_body",
];

export const IDENTITY_HABITUS_TYPES: HabitusTypeId[] = [
    "species",
    "gender",
    "social_category",
    "profession",
    "sexual_preference",
];

export const habitusTypeSchema = z.enum([
    "species",
    "gender",
    "social_category",
    "profession",
    "sexual_preference",
    "unique_body",
]);

export const formatHabitusTypeLabel = (type: HabitusTypeId) =>
    type.replaceAll("_", " ");
