import { useEffect, useMemo } from "react";

export const useIdField = (
    value: string,
    originalValue: string,
    existingIds: string[],
    onValidityChange?: (isValid: boolean) => void,
) => {
    const error = useMemo(() => {
        if (!value.trim()) return "ID cannot be empty";

        // Regex: Only lowercase alphanumerics, underscores, dashes
        if (!/^[a-z0-9-_]+$/.test(value)) {
            return "Only lowercase a-z, 0-9, -, _";
        }

        // Uniqueness Check (Collision)
        // We only flag a collision if the ID is different from the original
        if (value !== originalValue && existingIds.includes(value)) {
            return "ID already exists";
        }

        return null;
    }, [value, originalValue, existingIds]);

    // Notify parent about validity (for disabling Save button)
    useEffect(() => {
        onValidityChange?.(!error);
    }, [error, onValidityChange]);

    return { error };
};
