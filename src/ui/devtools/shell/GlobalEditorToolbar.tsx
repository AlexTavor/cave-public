import { Button } from "../../lib/atoms/button";
import { useGlobalEditorToolbar } from "./useGlobalEditorToolbar";
import { GlobalEjectButton } from "./GlobalEjectButton";
import {
    ToolbarRoot,
    ToolbarSurface,
    FileMeta,
    Filename,
    PathLabel,
    StatusRow,
    StatusPill,
    ActionGroup,
} from "./GlobalEditorToolbar.styles";
export const GlobalEditorToolbar = () => {
    const viewModel = useGlobalEditorToolbar();
    if (!viewModel) return null;

    return (
        <ToolbarRoot>
            <ToolbarSurface>
                <FileMeta>
                    <Filename title={viewModel.filename}>
                        {viewModel.filename}
                    </Filename>
                    {viewModel.activeFilePath && (
                        <PathLabel title={viewModel.activeFilePath}>
                            {viewModel.activeFilePath}
                        </PathLabel>
                    )}
                    <StatusRow>
                        <StatusPill variant={viewModel.statusVariant}>
                            {viewModel.statusLabel}
                        </StatusPill>
                    </StatusRow>
                </FileMeta>

                <ActionGroup>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={viewModel.handleMenu}
                        title="Open the main menu and leave devtools"
                    >
                        Menu
                    </Button>
                    <GlobalEjectButton />
                    <Button
                        size="sm"
                        variant="ghost"
                        disabled={viewModel.disableUndo}
                        onClick={viewModel.undo}
                        title="Undo (Ctrl+Z)"
                    >
                        Undo
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        disabled={viewModel.disableRedo}
                        onClick={viewModel.redo}
                        title="Redo (Ctrl+Y)"
                    >
                        Redo
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        disabled={viewModel.disableTexts}
                        onClick={viewModel.handleTexts}
                        title="Open full-screen texts editor"
                    >
                        Texts
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        disabled={viewModel.disablePhysics}
                        onClick={viewModel.handlePhysics}
                        title="Open layout mode for the loaded project"
                    >
                        Physics
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        disabled={viewModel.disableCompile}
                        onClick={viewModel.handleCompile}
                        title="Compile current project and refresh runtime module"
                    >
                        {viewModel.isCompiling ? "Compiling…" : "Compile"}
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        disabled={viewModel.disableExportBootstrap}
                        onClick={viewModel.handleExportBootstrap}
                        title="Write the current VFS snapshot to public/bootstrap/vfs-prod.json"
                    >
                        {viewModel.isExportingBootstrap
                            ? "Exporting…"
                            : "Export Bootstrap"}
                    </Button>
                    <Button
                        size="sm"
                        variant="primary"
                        disabled={viewModel.disableSave}
                        onClick={viewModel.handleSave}
                        title="Save Module to Disk (Ctrl+S)"
                    >
                        {viewModel.isSaving ? "Saving…" : "Save"}
                    </Button>
                </ActionGroup>
            </ToolbarSurface>
        </ToolbarRoot>
    );
};

