import React, { useEffect, useState } from "react";
import {
    PreviewEmpty,
    SectionTitle,
    VisualSection,
} from "../blueprint/visuals/BlueprintVisualsModal.styles";
import type { ViewEditorAdapter } from "./ViewEditor.types";
import { ViewEditorDelaySection } from "./ViewEditorDelaySection";
import { ViewEditorDisplayPreview } from "./ViewEditorDisplayPreview";

type BlueprintRuntimePreview = Extract<
    ViewEditorAdapter["preview"],
    { kind: "blueprint_runtime" }
>;

type BlueprintPreviewProps = {
    draft: BlueprintRuntimePreview["draft"];
    blueprintId: string;
    enabled: boolean;
};

export const ViewEditorPreview: React.FC<{
    editor: ViewEditorAdapter;
}> = ({ editor }) => {
    const { preview } = editor;
    const [blueprintPreview, setBlueprintPreview] =
        useState<React.ComponentType<BlueprintPreviewProps> | null>(null);
    useEffect(() => {
        let active = true;
        if (preview.kind !== "blueprint_runtime" || !preview.enabled) {
            setBlueprintPreview(null);
            return () => {
                active = false;
            };
        }
        import("../blueprint/visuals/BlueprintVisualsPreview")
            .then(({ BlueprintVisualsPreview }) => {
                if (active) setBlueprintPreview(() => BlueprintVisualsPreview);
            })
            .catch(() => {
                if (active) setBlueprintPreview(null);
            });
        return () => {
            active = false;
        };
    }, [preview]);
    let content = <PreviewEmpty>Preview unavailable.</PreviewEmpty>;
    if (preview.kind === "blueprint_runtime") {
        if (blueprintPreview) {
            const BlueprintVisualsPreview = blueprintPreview;
            content = (
                <BlueprintVisualsPreview
                    draft={preview.draft}
                    blueprintId={preview.blueprintId}
                    enabled={preview.enabled}
                />
            );
        }
    } else {
        content = (
            <ViewEditorDisplayPreview
                cycleProgressPreview={editor.cycleProgress?.previewProgress}
                displayKey={preview.displayKey}
                filename={preview.filename}
            />
        );
    }
    return (
        <VisualSection>
            <SectionTitle>Preview</SectionTitle>
            {content}
            <ViewEditorDelaySection editor={editor} />
        </VisualSection>
    );
};
