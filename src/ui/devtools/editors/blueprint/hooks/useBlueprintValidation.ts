import { useMemo } from "react";
import type { Blueprint } from "../../../../../data/schemas/blueprint";
import {
    collisionDetector,
    type ValidationIssue,
} from "../../../../../engine/compiler/validation/collisionDetector";
import { useBlueprintContext } from "../BlueprintContext";
import { useBlueprintReferenceCatalog } from "./useBlueprintReferenceCatalog";

interface BlueprintValidationResult {
    issues: ValidationIssue[];
    hasErrors: boolean;
}

export const useBlueprintValidation = (
    blueprint: Blueprint | null,
): BlueprintValidationResult => {
    useBlueprintContext();
    const { ids: blueprintIds } = useBlueprintReferenceCatalog();
    const stateKeys = useMemo(
        () => Object.keys(blueprint?.components?.state ?? {}),
        [blueprint],
    );

    const issues = useMemo(() => {
        if (!blueprint?._editor) return [];
        return collisionDetector(blueprint._editor, {
            blueprintIds,
            stateKeys,
        });
    }, [blueprint, blueprintIds, stateKeys]);

    const hasErrors = useMemo(
        () => issues.some((issue) => issue.severity === "error"),
        [issues],
    );

    return { issues, hasErrors };
};

