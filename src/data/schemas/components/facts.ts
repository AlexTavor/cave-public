import { z } from "zod";

const FactValuesSchema = z.record(z.string(), z.number().min(0));

export const FactsComponentSchema = z.record(z.string(), FactValuesSchema);

export type FactsComponent = z.infer<typeof FactsComponentSchema>;
