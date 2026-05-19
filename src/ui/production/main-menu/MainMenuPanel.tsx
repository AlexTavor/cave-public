import { useEffect, useState } from "react";
import { usePostHog } from "@posthog/react";
import type { MainMenuActionModel } from "./models";
import { setPhaserDebugEnabled } from "../../../engine/phaser/debug/phaserDebugToggle";
import { getStatsVisible, setStatsVisible } from "../../../setStats";
import { usePhaserDebugEnabled } from "../../runtime/debug/usePhaserDebugEnabled";
import { setRuntimeInspectorEnabled } from "../../runtime/inspector/runtimeInspectorToggle";
import { useRuntimeInspectorEnabled } from "../../runtime/inspector/useRuntimeInspectorEnabled";
import { useResetTutorial } from "../../runtime/tutorials/useResetTutorial";
import {
    useNodeOverlaysEnabled,
    useNodeOverlayValuesEnabled,
} from "../../runtime/world/node-overlays";
import { setNodeOverlaysEnabled } from "../../runtime/world/node-overlays/nodeOverlayToggle";
import { setNodeOverlayValuesEnabled } from "../../runtime/world/node-overlays/nodeOverlayValuesToggle";
import { MainMenuActionCard } from "./MainMenuActionCard";
import {
    ActionStack,
    PanelCard,
    PanelSubtitle,
    PanelText,
    PanelTitle,
    PanelWrap,
    ToggleButton,
    ToggleRow,
    ToggleStack,
} from "./MainMenuPanel.styles";

export interface MainMenuPanelProps {
    title: string;
    subtitle: string;
    statusText: string;
    errorText: string | null;
    actions: MainMenuActionModel[];
}

type ToggleOption = {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
};
export const MainMenuPanel = ({
    title,
    subtitle,
    statusText,
    errorText,
    actions,
}: MainMenuPanelProps) => {
    const posthog = usePostHog();
    const debugEnabled = usePhaserDebugEnabled();
    const inspectorEnabled = useRuntimeInspectorEnabled();
    const nodeOverlaysEnabled = useNodeOverlaysEnabled();
    const nodeOverlayValuesEnabled = useNodeOverlayValuesEnabled();
    const [showFps, setShowFps] = useState(getStatsVisible);
    const { canResetTutorial, resetTutorial } = useResetTutorial();
    const toggleOptions: ToggleOption[] = [
        { label: "Show FPS", checked: showFps, onChange: setShowFps },
        {
            label: "Runtime Inspector",
            checked: inspectorEnabled,
            onChange: setRuntimeInspectorEnabled,
        },
        {
            label: "Debug Stats",
            checked: debugEnabled,
            onChange: setPhaserDebugEnabled,
        },
        {
            label: "Node Overlays",
            checked: nodeOverlaysEnabled,
            onChange: setNodeOverlaysEnabled,
        },
        {
            label: "Node Overlay Values",
            checked: nodeOverlayValuesEnabled,
            onChange: setNodeOverlayValuesEnabled,
        },
    ];

    useEffect(() => {
        setStatsVisible(showFps);
    }, [showFps]);

    return (
        <PanelWrap>
            <PanelCard>
                <PanelTitle>{title}</PanelTitle>
                <PanelSubtitle aria-live="polite">{subtitle}</PanelSubtitle>
                <ActionStack>
                    {actions.map((action) => (
                        <MainMenuActionCard key={action.id} {...action} />
                    ))}
                </ActionStack>
                <PanelText aria-live="polite">{statusText}</PanelText>
                {errorText ? (
                    <PanelText aria-live="assertive">{errorText}</PanelText>
                ) : null}
            </PanelCard>
            <ToggleStack>
                {toggleOptions.map((toggle) => (
                    <ToggleRow key={toggle.label}>
                        <input
                            type="checkbox"
                            checked={toggle.checked}
                            onChange={(event) =>
                                toggle.onChange(event.currentTarget.checked)
                            }
                        />
                        <span>{toggle.label}</span>
                    </ToggleRow>
                ))}
                <ToggleButton
                    size="sm"
                    variant="ghost"
                    disabled={!canResetTutorial}
                    onClick={() => {
                        posthog?.capture("tutorial_reset");
                        resetTutorial();
                    }}
                >
                    RESET TUTORIAL
                </ToggleButton>
            </ToggleStack>
        </PanelWrap>
    );
};
