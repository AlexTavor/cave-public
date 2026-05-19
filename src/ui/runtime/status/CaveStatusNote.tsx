import React, { useContext, useEffect, useRef, useState } from "react";
import { useTheme } from "@emotion/react";
import {
    Animatable,
    AnimatePresence,
} from "../../lib/atoms/animatable/Animatable";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { useActiveRuntimeAttention } from "../attention/useActiveRuntimeAttention";
import { WorldInteractionContext } from "../world/context/WorldInteractionContext";
import {
    resolveCaveEntity,
    resolveCaveStatusParts,
    type CaveStatusKeyword,
} from "./caveStatusUtils";
import {
    StatusReadout,
    StatusShellLeft,
    StatusStrip,
} from "./RuntimeStatusStrip.styles";

const joiner = (index: number, length: number) => {
    if (index >= length - 1) return "";
    if (length === 2) return " and ";
    return index === length - 2 ? ", and " : ", ";
};

const colorFor = (theme: any, keyword: CaveStatusKeyword) =>
    ({
        hungry: theme.colors.statusKeywordHungry,
        cold: theme.colors.statusKeywordCold,
        happy: theme.colors.success,
        sad: theme.colors.selected,
        curious: theme.colors.buttonSelected,
        worried: theme.colors.buttonSelected,
        scared: theme.colors.danger,
    })[keyword];

export const CaveStatusNote: React.FC<{ anchored?: boolean }> = ({
    anchored = true,
}) => {
    const context = useContext(WorldInteractionContext);
    const storeRuntime = useRuntimeStore((state) => state.runtime);
    const runtime = context?.runtime ?? storeRuntime;
    const attention = useActiveRuntimeAttention();
    const initialParts = runtime
        ? resolveCaveStatusParts(resolveCaveEntity(runtime as any))
        : [];
    const previousKey = useRef(initialParts.join("|"));
    const [parts, setParts] = useState<CaveStatusKeyword[]>(initialParts);
    const theme = useTheme();

    useEffect(() => {
        if (!runtime) return;
        let frameId = 0;
        const render = () => {
            const entity = resolveCaveEntity(runtime as any);
            const nextParts = entity ? resolveCaveStatusParts(entity) : [];
            const key = nextParts.join("|");
            if (key !== previousKey.current) {
                previousKey.current = key;
                setParts(nextParts);
            }
            frameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(frameId);
    }, [runtime]);

    if (!runtime) return null;
    const hiddenByTutorial = attention?.hideNotifications === true;
    if (hiddenByTutorial || parts.length === 0) return null;

    const content = (
        <StatusStrip
            aria-label="Cave status note"
            variant="transparent"
            padding="sm"
        >
            <StatusReadout>
                <span>Cave is </span>
                <span>
                    {parts.map((part, index) => (
                        <React.Fragment key={`${part}-${index}`}>
                            <span style={{ color: colorFor(theme, part) }}>
                                {part}
                            </span>
                            {joiner(index, parts.length)}
                        </React.Fragment>
                    ))}
                </span>
            </StatusReadout>
        </StatusStrip>
    );
    const shell = anchored ? (
        <StatusShellLeft data-anchored="true">{content}</StatusShellLeft>
    ) : (
        <div data-anchored="false">{content}</div>
    );

    return (
        <AnimatePresence initial={false}>
            <Animatable
                key={
                    anchored
                        ? "cave-status-note-anchored"
                        : "cave-status-note-floating"
                }
                type="slideUp"
            >
                {shell}
            </Animatable>
        </AnimatePresence>
    );
};
