import { useMemo, useState } from "react";
import { render } from "@testing-library/react";
import { IconRegistryProvider } from "../../lib/foundation/icon-registry/IconRegistryProvider";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { WorldInteractionContext } from "./context/WorldInteractionContext";
import { SelectionOverlay } from "./SelectionOverlay";
import { createRuntimeTestDouble } from "./testUtils";

export const makeSelectionOverlayEntity = () =>
    ({
        id: "pool-1",
        label: "Food Pool",
        display: { bars: [{ key: "state.food", maxKey: "state.food.max" }] },
        state: {
            food: {
                value: 5,
                max: 10,
                allowDeposit: true,
                allowWithdraw: true,
                priority: 1,
            },
        },
    }) as any;

export const createSelectionOverlayRuntime = (getEntity: (id: string) => any) =>
    createRuntimeTestDouble({
        getEntity,
        commands: { enqueue: () => undefined },
    });

const Harness = ({
    runtime,
    onSelect,
}: {
    runtime: any;
    onSelect: (id: string | null) => void;
}) => {
    const [selectedEntityId, setSelectedEntityId] = useState<string | null>(
        "pool-1",
    );
    const value = useMemo(
        () => ({
            runtime,
            selectedEntityId,
            selectEntity: (id: string | null) => {
                onSelect(id);
                setSelectedEntityId(id);
            },
            getCameraState: () => null,
            setCameraState: () => undefined,
            consumePendingCameraRestore: () => null,
            consumeRuntimeVisualEffects: () => [],
        }),
        [onSelect, runtime, selectedEntityId],
    );
    return (
        <ThemeProvider>
            <IconRegistryProvider>
                <WorldInteractionContext.Provider value={value}>
                    <SelectionOverlay />
                </WorldInteractionContext.Provider>
            </IconRegistryProvider>
        </ThemeProvider>
    );
};

export const renderSelectionOverlayHarness = (
    runtime: any,
    onSelect: (id: string | null) => void,
) => render(<Harness runtime={runtime} onSelect={onSelect} />);
