import React from "react";
import styled from "@emotion/styled";
import { ToolFrame } from "../../../lib/atoms/tool-frame";
import { SessionJsonEditor } from "./SessionJsonEditor";

const WarningBanner = styled.div`
    padding: ${({ theme }) => theme.spacing.sm}
        ${({ theme }) => theme.spacing.md};
    background: ${({ theme }) => theme.colors.severity.warning.bg};
    border-left: 3px solid
        ${({ theme }) => theme.colors.severity.warning.border};
    font-size: ${({ theme }) => theme.fontSize.sm};
    color: ${({ theme }) => theme.colors.severity.warning.text};
`;

interface SystemEntityEditorProps {
    filename: string;
    rootPath: string;
    title: string;
}

export const SystemEntityEditor: React.FC<SystemEntityEditorProps> = ({
    filename,
    rootPath,
    title,
}) => {
    return (
        <ToolFrame title={title}>
            <WarningBanner>
                Warning: Overriding system internals. Invalid config may cause
                fatal errors.
            </WarningBanner>
            <SessionJsonEditor filename={filename} rootPath={rootPath} />
        </ToolFrame>
    );
};
