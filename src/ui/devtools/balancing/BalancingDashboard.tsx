import React, { useEffect } from "react";
import { Button } from "../../lib/atoms/button";
import { useShellStore } from "../shell/shell";
import { useModuleStore } from "../state/moduleStore";
import { useEnsureModuleSession } from "../state/moduleSession";
import { useBalancingRunner } from "./hooks/useBalancingRunner";
import { useLeverStore } from "./state/useLeverStore";
import { LeverList } from "./LeverList";
import { SimulationChart } from "./SimulationChart";
import { SimSetup } from "./SimSetup";
import {
    DashboardRoot,
    PanelActions,
    PanelCard,
    PanelContent,
    PanelHeader,
    PanelHint,
    PanelTitle,
    EmptyState,
} from "./BalancingDashboard.styles";

export const BalancingDashboard: React.FC = () => {
    const activeModuleFilename = useShellStore((s) => s.activeModuleFilename);
    const activeModule = useModuleStore((s) =>
        activeModuleFilename ? s.modules[activeModuleFilename] : null,
    );
    const scan = useLeverStore((s) => s.scan);
    const commit = useLeverStore((s) => s.commit);
    const overrides = useLeverStore((s) => s.overrides);
    const promotions = useLeverStore((s) => s.promotions);
    const isRunning = useLeverStore((s) => s.isRunning);
    const simulationResult = useLeverStore((s) => s.simulationResult);

    useEnsureModuleSession(activeModuleFilename);
    const { runSimulation } = useBalancingRunner(activeModuleFilename);

    useEffect(() => {
        if (!activeModuleFilename || !activeModule) return;
        scan(activeModule);
    }, [activeModuleFilename, activeModule, scan]);

    if (!activeModuleFilename) {
        return <EmptyState>Select a module to begin balancing.</EmptyState>;
    }

    const hasChanges =
        Object.keys(overrides).length > 0 || Object.keys(promotions).length > 0;

    return (
        <DashboardRoot>
            <PanelCard>
                <PanelHeader>
                    <div>
                        <PanelTitle>Levers</PanelTitle>
                        <PanelHint>Stage overrides or promotions</PanelHint>
                    </div>
                </PanelHeader>
                <LeverList />
            </PanelCard>
            <PanelCard>
                <PanelHeader>
                    <div>
                        <PanelTitle>
                            Simulation: {activeModuleFilename}
                        </PanelTitle>
                        <PanelHint>Run the headless economy test</PanelHint>
                    </div>
                    <PanelActions>
                        <Button
                            variant="ghost"
                            onClick={() => commit(activeModuleFilename)}
                            disabled={!hasChanges || isRunning}
                        >
                            Commit
                        </Button>
                        <Button
                            variant="primary"
                            onClick={runSimulation}
                            disabled={isRunning}
                        >
                            {isRunning ? "Running..." : "Run"}
                        </Button>
                    </PanelActions>
                </PanelHeader>
                <PanelContent>
                    <SimSetup />
                    <SimulationChart result={simulationResult} />
                </PanelContent>
            </PanelCard>
        </DashboardRoot>
    );
};
