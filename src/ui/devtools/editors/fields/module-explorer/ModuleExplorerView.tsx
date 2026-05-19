import React from "react";
import { ToolFrame } from "../../../../lib/atoms/tool-frame";
import {
    DashboardCard,
    DashboardGrid,
    DashboardIcon,
    DashboardSubtitle,
    DashboardTitle,
} from "./ModuleExplorer.styles";

interface ModuleExplorerViewProps {
    title: string;
    version: string;
    onOpenSettings: () => void;
    onOpenPhysics: () => void;
    onOpenBlueprints: () => void;
    onOpenDisplays: () => void;
    onOpenDraftOptions: () => void;
    onOpenDraftPools: () => void;
    bodyRef: React.Ref<HTMLDivElement>;
}

export const ModuleExplorerView: React.FC<ModuleExplorerViewProps> = ({
    title,
    version,
    onOpenSettings,
    onOpenPhysics,
    onOpenBlueprints,
    onOpenDisplays,
    onOpenDraftOptions,
    onOpenDraftPools,
    bodyRef,
}) => {
    return (
        <ToolFrame title={`${title} (v${version})`} bodyRef={bodyRef}>
            <DashboardGrid>
                <DashboardCard onClick={onOpenSettings}>
                    <DashboardIcon>⚙️</DashboardIcon>
                    <DashboardTitle>Settings</DashboardTitle>
                    <DashboardSubtitle>Module metadata</DashboardSubtitle>
                </DashboardCard>
                <DashboardCard onClick={onOpenPhysics}>
                    <DashboardIcon>🧲</DashboardIcon>
                    <DashboardTitle>Physics</DashboardTitle>
                    <DashboardSubtitle>Layout simulation</DashboardSubtitle>
                </DashboardCard>
                <DashboardCard onClick={onOpenBlueprints}>
                    <DashboardIcon>🧩</DashboardIcon>
                    <DashboardTitle>Blueprints</DashboardTitle>
                    <DashboardSubtitle>Entities & behaviors</DashboardSubtitle>
                </DashboardCard>
                <DashboardCard onClick={onOpenDraftOptions}>
                    <DashboardIcon>🎲</DashboardIcon>
                    <DashboardTitle>Draft Options</DashboardTitle>
                    <DashboardSubtitle>Option payloads</DashboardSubtitle>
                </DashboardCard>
                <DashboardCard onClick={onOpenDraftPools}>
                    <DashboardIcon>🪄</DashboardIcon>
                    <DashboardTitle>Draft Pools</DashboardTitle>
                    <DashboardSubtitle>Pool distribution</DashboardSubtitle>
                </DashboardCard>
                <DashboardCard onClick={onOpenDisplays}>
                    <DashboardIcon>🎴</DashboardIcon>
                    <DashboardTitle>Displays</DashboardTitle>
                    <DashboardSubtitle>Asset library</DashboardSubtitle>
                </DashboardCard>
            </DashboardGrid>
        </ToolFrame>
    );
};

