import React, { useMemo, useCallback } from "react";
import { FieldContainer, Input, Label } from "../Shared.styles";
import type { FieldProps } from "../Shared.types";
import { useSessionStore } from "../../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
import {
    clampAttribute,
    normalizeBaseAttributes,
    parseTraitsInput,
    stringifyTraits,
} from "./bodyFieldTransforms";

export const BodyField: React.FC<FieldProps> = ({ label, filename, path }) => {
    const body = useSessionStore(
        useCallback(
            (state) => {
                const session = state.sessions[filename];
                if (!session) return null;
                return getByPath(session.draft, path) as Record<
                    string,
                    unknown
                >;
            },
            [filename, path],
        ),
    );

    const updateDraft = useSessionStore((state) => state.updateDraft);

    const baseAttributes = useMemo(
        () => normalizeBaseAttributes((body as any)?.baseAttributes),
        [body],
    );

    const setNumber = (key: string, value: number) => {
        updateDraft(filename, (draft) => {
            setByPath(draft, `${path}.${key}`, value);
        });
    };

    const setAttribute = (key: "body" | "mind" | "social", value: number) => {
        const clamped = clampAttribute(value);
        updateDraft(filename, (draft) => {
            setByPath(draft, `${path}.baseAttributes.${key}`, clamped);
        });
    };

    const setTraits = (value: string) => {
        const normalized = parseTraitsInput(value);
        updateDraft(filename, (draft) => {
            setByPath(draft, `${path}.traits`, normalized);
        });
    };

    if (!body) return null;

    return (
        <FieldContainer>
            <Label>{label}</Label>

            <Label>Experience</Label>
            <Input
                type="number"
                value={(body as any)?.xp ?? 0}
                onChange={(e) => setNumber("xp", Number(e.target.value))}
            />

            <Label>XP Rate</Label>
            <Input
                type="number"
                step="0.1"
                value={(body as any)?.xpRate ?? 1}
                onChange={(e) =>
                    setNumber("xpRate", Number.parseFloat(e.target.value))
                }
            />

            <Label>Level</Label>
            <Input
                type="number"
                value={(body as any)?.level ?? 1}
                onChange={(e) => setNumber("level", Number(e.target.value))}
            />

            <Label>Base Attributes</Label>
            <Input
                type="range"
                min={0}
                max={100}
                value={baseAttributes.body}
                onChange={(e) => setAttribute("body", Number(e.target.value))}
            />
            <Label>Body: {baseAttributes.body}</Label>

            <Input
                type="range"
                min={0}
                max={100}
                value={baseAttributes.mind}
                onChange={(e) => setAttribute("mind", Number(e.target.value))}
            />
            <Label>Mind: {baseAttributes.mind}</Label>

            <Input
                type="range"
                min={0}
                max={100}
                value={baseAttributes.social}
                onChange={(e) => setAttribute("social", Number(e.target.value))}
            />
            <Label>Social: {baseAttributes.social}</Label>

            <Label>Traits (comma separated)</Label>
            <Input
                type="text"
                value={stringifyTraits((body as any)?.traits)}
                onChange={(e) => setTraits(e.target.value)}
            />
        </FieldContainer>
    );
};
