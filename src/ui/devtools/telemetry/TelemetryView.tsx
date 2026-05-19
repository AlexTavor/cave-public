import React, { useEffect } from "react";
import { ToolFrame } from "../../lib/atoms/tool-frame";
import { Button } from "../../lib/atoms/button";
import { useTelemetryStore } from "../../runtime/state/useTelemetryStore";
import { useRuntimeToolStore } from "../../runtime/state/useRuntimeToolStore";
import { StickyHud } from "./components/StickyHud";
import { LogStreamViewer } from "./components/LogStreamViewer";
import { TelemetryTab } from "../../runtime/state/types";
import {
    ContentArea,
    MessageContainer,
    PanelBody,
    TabButton,
    TabsRow,
    TelemetryRoot,
} from "./TelemetryView.styles";

export interface TelemetryViewProps {
    title?: string;
}

const TAB_LABELS: Record<TelemetryTab, string> = {
    runtime: "Runtime",
    tick: "Tick",
    systems: "Systems",
    errors: "Errors",
};

const UI_SYNC_INTERVAL = 100; // 10fps update rate

export const TelemetryView: React.FC<TelemetryViewProps> = ({
    title = "Telemetry",
}) => {
    const activeTab = useRuntimeToolStore((s) => s.activeTelemetryTab);
    const setTab = useRuntimeToolStore((s) => s.setTelemetryTab);

    const sticky = useTelemetryStore((s) => s.sticky);
    const streams = useTelemetryStore((s) => s.streams);
    const clearTab = useTelemetryStore((s) => s.clearTab);
    const syncFromBridge = useTelemetryStore((s) => s.syncFromBridge);

    const isVisible = useRuntimeToolStore((s) => s.isTelemetryOpen);

    // Poll the bridge to update UI state
    useEffect(() => {
        const timer = setInterval(() => {
            isVisible && syncFromBridge();
        }, UI_SYNC_INTERVAL);

        return () => clearInterval(timer);
    }, [syncFromBridge, isVisible]);

    if (!isVisible) {
        return (
            <TelemetryRoot>
                <MessageContainer>Telemetry disabled</MessageContainer>
            </TelemetryRoot>
        );
    }

    const handleTabClick = (tab: TelemetryTab) => setTab(tab);

    return (
        <TelemetryRoot>
            <ToolFrame
                title={title}
                toolbarActions={
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => clearTab(activeTab)}
                    >
                        Clear
                    </Button>
                }
            >
                <PanelBody>
                    <TabsRow>
                        {(Object.keys(TAB_LABELS) as TelemetryTab[]).map(
                            (tab) => (
                                <TabButton
                                    key={tab}
                                    isActive={tab === activeTab}
                                    onClick={() => handleTabClick(tab)}
                                    aria-selected={tab === activeTab}
                                >
                                    {TAB_LABELS[tab]}
                                </TabButton>
                            ),
                        )}
                    </TabsRow>

                    <ContentArea
                        data-testid="telemetry-content"
                        data-tab={activeTab}
                    >
                        {activeTab === "runtime" ? (
                            <StickyHud sticky={sticky} />
                        ) : (
                            <LogStreamViewer logs={streams[activeTab]} />
                        )}
                    </ContentArea>
                </PanelBody>
            </ToolFrame>
        </TelemetryRoot>
    );
};
