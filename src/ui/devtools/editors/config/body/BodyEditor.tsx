import React from "react";
import { ToolFrame } from "../../../../lib/atoms/tool-frame";
import { BodyIdentityCatalogEditor } from "./identity/BodyIdentityCatalogEditor";
import { HabitiEditor } from "./habiti/HabitiEditor";
import { HabitiRulesEditor } from "./rules/HabitiRulesEditor";

type BodyEditorProps = { filename: string };

export const BodyEditor: React.FC<BodyEditorProps> = ({ filename }) => (
    <ToolFrame title="Body Editor">
        <BodyIdentityCatalogEditor filename={filename} />
        <HabitiEditor filename={filename} />
        <HabitiRulesEditor filename={filename} />
    </ToolFrame>
);
