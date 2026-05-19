import { useEffect, useState } from "react";
import type { TransferNodeRadiusByValueRule } from "../../../state/moduleStore.assets";

const EMPTY_FIELDS = {
    minValue: "",
    minRadius: "",
    maxValue: "",
    maxRadius: "",
};

const toFields = (rule?: TransferNodeRadiusByValueRule) =>
    rule
        ? Object.fromEntries(
              Object.entries(rule).map(([key, value]) => [key, String(value)]),
          )
        : EMPTY_FIELDS;

export const useDisplayTransferNodeRadiusForm = (params: {
    initialRule: TransferNodeRadiusByValueRule | undefined;
    onCommit(rule: TransferNodeRadiusByValueRule | undefined): void;
}) => {
    const { initialRule, onCommit } = params;
    const [isEnabled, setEnabled] = useState(Boolean(initialRule));
    const [fields, setFields] = useState(() => toFields(initialRule));
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        setEnabled(Boolean(initialRule));
        setFields(toFields(initialRule));
        setError(null);
    }, [initialRule]);
    return {
        isEnabled,
        fields,
        error,
        setField: (name: keyof typeof EMPTY_FIELDS, value: string) => {
            setFields((current) => ({ ...current, [name]: value }));
            setError(null);
        },
        enable: () => setEnabled(true),
        clear: () => {
            setEnabled(false);
            setFields(EMPTY_FIELDS);
            setError(null);
            onCommit(undefined);
        },
        commit: () => {
            if (Object.values(fields).some((value) => value.trim() === "")) {
                setError("All transfer radius fields are required.");
                return;
            }
            const nextRule: TransferNodeRadiusByValueRule = {
                minValue: Number(fields.minValue),
                minRadius: Number(fields.minRadius),
                maxValue: Number(fields.maxValue),
                maxRadius: Number(fields.maxRadius),
            };
            if (
                Object.values(nextRule).some((value) => !Number.isFinite(value))
            ) {
                setError("Transfer radius values must be finite numbers.");
                return;
            }
            if (nextRule.minRadius < 0 || nextRule.maxRadius < 0) {
                setError(
                    "Transfer radius values must be greater than or equal to 0.",
                );
                return;
            }
            if (nextRule.minValue > nextRule.maxValue) {
                setError("Min value cannot be greater than max value.");
                return;
            }
            setError(null);
            onCommit(nextRule);
        },
    };
};
