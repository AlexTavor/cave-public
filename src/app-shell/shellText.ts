import type { ReactNode } from "react";

export const toShellText = (content: ReactNode): string => {
    if (typeof content === "string") return content;
    if (typeof content === "number") return String(content);
    return "Command execution failed.";
};
