import { z } from "zod";

export interface FieldProps {
    label: string;
    schema: z.ZodTypeAny;
    filename: string;
    path: string;
    tooltip?: string;
    onValueChange?: (value: string) => void;
}

