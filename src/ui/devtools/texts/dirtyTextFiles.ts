import type { TextOwnerBlock } from "./types";

const groupByFile = (blocks: TextOwnerBlock[]) => {
    const grouped: Record<string, Record<string, string>> = {};
    blocks.forEach((block) => {
        grouped[block.filename] ??= {};
        block.fields.forEach((field) => {
            grouped[block.filename][field.path] = field.value;
        });
    });
    return grouped;
};

export const findDirtyTextFiles = (
    files: string[],
    current: TextOwnerBlock[],
    baseline: TextOwnerBlock[],
): string[] => {
    const currentByFile = groupByFile(current);
    const baselineByFile = groupByFile(baseline);
    return files.filter((filename) => {
        const currentFields = currentByFile[filename] ?? {};
        const baselineFields = baselineByFile[filename] ?? {};
        return JSON.stringify(currentFields) !== JSON.stringify(baselineFields);
    });
};
