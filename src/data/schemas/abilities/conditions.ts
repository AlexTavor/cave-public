import { z } from "zod";
import { compileConditionText } from "../../../lib/logic/compileConditionText";

export const ConditionLinesSchema = z
    .array(z.string())
    .superRefine((lines, ctx) => {
        lines.forEach((line, index) => {
            if (!line?.trim()) return;
            const result = compileConditionText(line);
            if (result.ok) return;
            ctx.addIssue({
                code: "custom",
                message: result.error,
                path: [index],
            });
        });
    });
