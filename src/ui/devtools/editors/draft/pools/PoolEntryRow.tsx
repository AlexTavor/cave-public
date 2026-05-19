import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import type {
    DraftOptionBlueprint,
    DraftPoolEntry,
} from "../../../../../data/schemas/draft";
import { GameIcon } from "../../../../lib/atoms/game-icon";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import { PoolEntryBody } from "./PoolEntryBody";
import {
    Body,
    Chevron,
    EntryWrapper,
    Header,
    Label,
    OneOffCheckbox,
    WeightInput,
} from "./PoolEntryRow.styles";

interface PoolEntryRowProps {
    entry: DraftPoolEntry;
    option?: DraftOptionBlueprint;
    filename: string;
    onWeightChange: (weight: number) => void;
    onOneOffChange: (checked: boolean) => void;
    onRemove: () => void;
}

const stop = (e: React.MouseEvent) => e.stopPropagation();

const CaretIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path
            d="M9 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export const PoolEntryRow: React.FC<PoolEntryRowProps> = ({
    entry,
    option,
    filename,
    onWeightChange,
    onOneOffChange,
    onRemove,
}) => {
    const [open, setOpen] = useState(false);
    const label = option?.title || entry.optionId;
    const iconId = option?.icon || "unknown";
    const oneOff = option?.oneOff ?? false;

    return (
        <EntryWrapper>
            <Header type="button" isOpen={open} onClick={() => setOpen(!open)}>
                <GameIcon id={iconId} size="sm" />
                <Label>{label}</Label>
                <SmartTooltip content="One-off: remove from pool after selection">
                    <OneOffCheckbox
                        type="checkbox"
                        checked={oneOff}
                        onClick={stop}
                        onChange={(e) => onOneOffChange(e.target.checked)}
                    />
                </SmartTooltip>
                <SmartTooltip content="Selection weight: higher values appear more often">
                    <WeightInput
                        type="number"
                        min={0}
                        value={entry.weight}
                        onClick={stop}
                        onChange={(e) =>
                            onWeightChange(Number(e.target.value) || 0)
                        }
                    />
                </SmartTooltip>
                <Chevron
                    animate={{ rotate: open ? 90 : 0 }}
                    transition={{ duration: 0.15 }}
                >
                    <CaretIcon />
                </Chevron>
            </Header>
            <AnimatePresence initial={false}>
                {open && (
                    <Body
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                    >
                        <PoolEntryBody
                            filename={filename}
                            optionId={entry.optionId}
                            onRemove={onRemove}
                        />
                    </Body>
                )}
            </AnimatePresence>
        </EntryWrapper>
    );
};
