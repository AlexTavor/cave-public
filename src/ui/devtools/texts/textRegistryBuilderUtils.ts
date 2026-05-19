import { getByPath } from "../../../utils/objectUtils";
import type { TextFieldEntry, TextOwnerBlock, TextOwnerType } from "./types";
import type { TextFieldSpec, TextOwnerSpec } from "./textRegistrySpecTypes";

const joinPath = (base: string, path: string) =>
    path ? `${base}.${path}` : base;

const toLabelValue = (value: unknown, fallback: number) =>
    typeof value === "string" || typeof value === "number"
        ? String(value)
        : String(fallback);

const resolveLabel = (label: string, item: unknown, index: number) => {
    const record =
        item && typeof item === "object"
            ? (item as Record<string, unknown>)
            : {};
    const nextLabel = label.replaceAll("{index1}", String(index + 1));
    return nextLabel
        .replaceAll(
            "{resourceOrIndex}",
            toLabelValue(record.resource, index + 1),
        )
        .replaceAll(
            "{guidanceIdOrIndex}",
            toLabelValue(record.guidanceId, index + 1),
        );
};

const readString = (owner: unknown, spec: TextFieldSpec, path: string) => {
    const value = getByPath(owner, spec.path);
    if (typeof value === "string") return { path, value };
    if (spec.optional || value == null) return null;
    return null;
};

export const makeOwnerKey = (
    filename: string,
    ownerType: TextOwnerType,
    ownerId: string,
) => `${filename}:${ownerType}:${ownerId}`;

export const buildOwnerBlock = (
    filename: string,
    ownerType: TextOwnerType,
    ownerId: string,
    fields: TextFieldEntry[],
): TextOwnerBlock | null => {
    if (!ownerId || fields.length === 0) return null;
    return {
        key: makeOwnerKey(filename, ownerType, ownerId),
        filename,
        ownerType,
        ownerId,
        fields,
    };
};

export const collectOwnerFields = (
    filename: string,
    ownerBasePath: string,
    ownerType: TextOwnerType,
    ownerId: string,
    owner: unknown,
    spec: TextOwnerSpec,
): TextFieldEntry[] => {
    const ownerKey = makeOwnerKey(filename, ownerType, ownerId);
    const fields = (spec.fields ?? [])
        .map((field) => {
            const fullPath = joinPath(ownerBasePath, field.path);
            const hit = readString(owner, field, fullPath);
            if (!hit) return null;
            return {
                key: `${ownerKey}:${fullPath}`,
                filename,
                ownerKey,
                ownerType,
                ownerId,
                category: field.category,
                label: field.label,
                path: hit.path,
                value: hit.value,
            };
        })
        .filter(Boolean) as TextFieldEntry[];

    for (const list of spec.lists ?? []) {
        const items = getByPath(owner, list.path);
        if (!Array.isArray(items)) continue;
        items.forEach((item, index) => {
            list.fields.forEach((field) => {
                const itemPath = field.path
                    ? `${list.path}.${index}.${field.path}`
                    : `${list.path}.${index}`;
                const fullPath = joinPath(ownerBasePath, itemPath);
                const hit = readString(item, field, fullPath);
                if (!hit) return;
                fields.push({
                    key: `${ownerKey}:${fullPath}`,
                    filename,
                    ownerKey,
                    ownerType,
                    ownerId,
                    category: field.category,
                    label: resolveLabel(field.label, item, index),
                    path: hit.path,
                    value: hit.value,
                });
            });
        });
    }
    return fields;
};
