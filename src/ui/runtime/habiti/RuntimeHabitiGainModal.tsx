import React from "react";
import { usePostHog } from "@posthog/react";
import { Button } from "../../lib/atoms/button";
import { Modal } from "../../lib/atoms/modal";
import { RichText } from "../../lib/atoms/rich-text/RichText";
import { resolveHabitiDisplayEntries } from "../../../game/habiti/resolveHabitiDisplayEntries";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { useHabitiGainModalState } from "./useHabitiGainModalState";
import {
    HabitiDescriptionCell,
    HabitiEffectCell,
    HabitiGainModalContainer,
    HabitiGainSubtitle,
    HabitiGainTitle,
    HabitiListContainer,
    HabitiListRowContainer,
    HabitiSummaryContainer,
    HabitiTitleCell,
} from "./RuntimeHabitiGainModal.styles";

type WorldWithOwnedHabiti = { cave?: { ownedHabiti?: string[] } };
const readOwnedHabiti = (world: unknown): string[] => {
    const ownedHabiti = (world as WorldWithOwnedHabiti | undefined)?.cave
        ?.ownedHabiti;
    return Array.isArray(ownedHabiti) ? ownedHabiti : [];
};
const readHabitusIndex = (
    runtime: ReturnType<typeof useRuntimeStore.getState>["runtime"],
) =>
    runtime && typeof runtime.getCartridge === "function"
        ? (runtime.getCartridge().config?.habiti ?? {})
        : {};

export const RuntimeHabitiGainModal: React.FC = () => {
    const posthog = usePostHog();
    const runtime = useRuntimeStore((state) => state.runtime);
    const { activeItem, acknowledge } = useHabitiGainModalState();
    const world = runtime?.getEntity("sys_world");
    const items = resolveHabitiDisplayEntries({
        ids: activeItem?.habitusIds ?? [],
        ownedHabiti: readOwnedHabiti(world),
        habitusIndex: readHabitusIndex(runtime),
        mode: "cave",
    });

    if (!items || items.length === 0) {
        acknowledge();
        return null;
    }

    return (
        <Modal isOpen={activeItem !== null} onClose={() => undefined}>
            {activeItem ? (
                <HabitiGainModalContainer padding="xl">
                    <HabitiListContainer>
                        <HabitiGainTitle>New Habiti Gained!</HabitiGainTitle>
                        <HabitiGainSubtitle>
                            I absorbed new lifetime experiences. Now they are
                            permanently a part of me.
                        </HabitiGainSubtitle>
                        {items.map((item) => (
                            <HabitiListRowContainer key={item.id}>
                                <HabitiTitleCell>{item.label}</HabitiTitleCell>
                                <HabitiSummaryContainer>
                                    {item.effectDescriptions.map(
                                        (line, index) => (
                                            <HabitiEffectCell
                                                key={line + index}
                                            >
                                                <RichText text={line} />
                                            </HabitiEffectCell>
                                        ),
                                    )}
                                </HabitiSummaryContainer>
                                {item.description && (
                                    <HabitiDescriptionCell>
                                        <RichText text={item.description} />
                                    </HabitiDescriptionCell>
                                )}
                            </HabitiListRowContainer>
                        ))}
                    </HabitiListContainer>
                    <Button
                        size="lg"
                        variant="primary"
                        onClick={() => {
                            posthog?.capture("habiti_gain_acknowledged", {
                                habiti_ids: activeItem.habitusIds,
                                habiti_count: activeItem.habitusIds.length,
                            });
                            acknowledge();
                        }}
                    >
                        Continue
                    </Button>
                </HabitiGainModalContainer>
            ) : null}
        </Modal>
    );
};
