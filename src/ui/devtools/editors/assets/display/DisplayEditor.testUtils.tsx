/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../lib/foundation/portal-manager/PortalManager";
import { DisplayEditor } from "./DisplayEditor";

export const createDisplayEditorElement = () => (
    <ThemeProvider>
        <PortalManager>
            <DisplayEditor filename="assets.art" assetId="torch" />
        </PortalManager>
    </ThemeProvider>
);

export const renderDisplayEditor = () => render(createDisplayEditorElement());

export const buildDisplayEditorState = (vi: typeof import("vitest").vi) => ({
    isLoading: false,
    draft: {
        type: "resource",
        styleId: "ember",
        glyphKey: "flame",
        transferNodeRadiusByValue: undefined,
        tooltip: "Warm",
        tags: ["fire"],
    },
    transferNodeRadiusRule: undefined,
    definitionSummary: "resource · ember / flame",
    metadataSummary: "Warm",
    tagsText: "fire",
    styleSuggestions: ["ember"],
    glyphSuggestions: ["flame"],
    canEditView: true,
    handleBack: vi.fn(),
    handleRename: vi.fn(() => null),
    handleRetype: vi.fn(),
    handleAttributeChange: vi.fn(),
    handleStyleIdChange: vi.fn(),
    handleGlyphKeyChange: vi.fn(),
    handleTransferNodeRadiusRuleChange: vi.fn(),
    handleTooltipChange: vi.fn(),
    handleTagsChange: vi.fn(),
    openViewEditor: vi.fn(),
    closeViewEditor: vi.fn(),
});
