import React from "react";
import { Button } from "../../lib/atoms/button";
import type { LeverDefinition } from "../../../engine/balancing/Scanner";
import { useLeverStore } from "./state/useLeverStore";
import { LeverLabel, LeverRow, LeverValueInput } from "./LeverList.styles";

interface LeverRowItemProps {
    lever: LeverDefinition;
}

export const LeverRowItem: React.FC<LeverRowItemProps> = ({ lever }) => {
    const overrides = useLeverStore((s) => s.overrides);
    const promotions = useLeverStore((s) => s.promotions);
    const setOverride = useLeverStore((s) => s.setOverride);
    const promoteLever = useLeverStore((s) => s.promoteLever);

    const override = overrides[lever.id];
    const value = Number.isFinite(override) ? override : lever.value;
    const isPromoted = Boolean(promotions[lever.id]);

    return (
        <LeverRow>
            <LeverLabel>{lever.label}</LeverLabel>
            <LeverValueInput
                type="number"
                value={value}
                step="any"
                onChange={(event) => {
                    const raw = event.currentTarget.value;
                    if (!raw) {
                        setOverride(lever.id, null);
                        return;
                    }
                    setOverride(lever.id, Number(raw));
                }}
            />
            {lever.type === "behavior" ? (
                <Button
                    variant="ghost"
                    onClick={() => promoteLever(lever.id)}
                    disabled={isPromoted}
                >
                    {isPromoted ? "Promoted" : "Promote"}
                </Button>
            ) : (
                <div />
            )}
        </LeverRow>
    );
};
