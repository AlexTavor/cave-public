import React from "react";
import type { TabNode } from "flexlayout-react";
import { IssuesPanel } from "../../issues/IssuesPanel";
import { GameTerminal } from "../../terminal/GameTerminal";
import { TelemetryView } from "../../telemetry/TelemetryView";
import { BalancingDashboard } from "../../balancing/BalancingDashboard";
import { GameViewPane } from "./GameViewPane.styles";
import { ProjectHome } from "./ProjectHome";

export const resolveCoreComponent = (
    node: TabNode,
    _activeModuleFilename: string | null,
): React.ReactElement | null => {
    const component = node.getComponent();

    if (component === "terminal") return <GameTerminal />;
    if (component === "telemetry") return <TelemetryView />;
    if (component === "balancing") return <BalancingDashboard />;
    if (component === "game_view") return <GameViewPane data-game-view />;
    if (component === "issues") return <IssuesPanel />;

    if (component === "home") return <ProjectHome />;

    return null;
};
