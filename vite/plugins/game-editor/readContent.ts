import fs from "node:fs";

export const readEditorContent = (fullPath: string) => {
    const content = fs.readFileSync(fullPath, "utf-8");
    if (!fullPath.toLowerCase().endsWith(".json")) return content;
    return JSON.parse(content);
};
