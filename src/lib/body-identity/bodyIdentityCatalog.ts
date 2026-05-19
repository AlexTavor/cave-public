import rawCatalog from "./body_identity_name_catalog.json";

export type BodyIdentityCatalog = {
    givenNames: string[];
    familyRoots: string[];
    familySuffixes: string[];
};

const clone = (values: readonly string[]): string[] => [...values];
const catalog = rawCatalog as unknown as Record<string, string[]>;

export const bodyIdentityCatalog: BodyIdentityCatalog = {
    givenNames: clone(catalog["givenNames"] ?? []),
    familyRoots: clone(catalog["familyRoots"] ?? []),
    familySuffixes: clone(catalog["familySuffixes"] ?? []),
};
