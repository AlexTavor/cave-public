import React from "react";
import { ModuleMetadataSchema } from "../../../../../data/schemas/module";
import { BlueprintConfigSchema } from "../../../../../data/schemas/blueprintConfig";
import { SchemaForm } from "../../SchemaForm";
import { Breadcrumbs } from "../../breadcrumbs/Breadcrumbs";
import { Button } from "../../../../lib/atoms/button";
import {
    Container,
    ScrollArea,
    Section,
    SectionTitle,
    Toolbar,
    ToolbarActions,
} from "./ModuleMetadataEditor.styles";
import { useModuleMetadataEditor } from "./useModuleMetadataEditor";

interface ModuleMetadataEditorProps {
    filename: string;
    tabId?: string;
}

export const ModuleMetadataEditor: React.FC<ModuleMetadataEditorProps> = ({
    filename,
    tabId,
}) => {
    const { isLoading, draft, sessionId, handleBack } = useModuleMetadataEditor(
        filename,
        tabId,
    );

    if (isLoading) return <div>Loading...</div>;
    if (!draft) return <div>Error loading metadata.</div>;

    return (
        <Container>
            <Toolbar>
                <Breadcrumbs
                    path={[filename, "Metadata"]}
                    onNavigate={(idx) => (idx === 0 ? handleBack() : null)}
                />
                <ToolbarActions>
                    <Button size="sm" variant="ghost" onClick={handleBack}>
                        Back
                    </Button>
                </ToolbarActions>
            </Toolbar>
            <ScrollArea>
                <Section>
                    <SectionTitle>Metadata</SectionTitle>
                    <SchemaForm
                        schema={ModuleMetadataSchema}
                        filename={sessionId}
                        rootPath="metadata"
                    />
                </Section>
                <Section>
                    <SectionTitle>Blueprint Config</SectionTitle>
                    <SchemaForm
                        schema={BlueprintConfigSchema}
                        filename={sessionId}
                        rootPath="blueprint"
                    />
                </Section>
            </ScrollArea>
        </Container>
    );
};
