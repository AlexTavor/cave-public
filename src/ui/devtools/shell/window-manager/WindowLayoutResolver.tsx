import React from "react";
import type { TabNode } from "flexlayout-react";
import { resolveCoreComponent } from "./WindowLayoutResolver.core";
import { resolveEditorComponent } from "./WindowLayoutResolver.editors";

export const resolveWindowComponent = (node: TabNode): React.ReactElement => {
    const core = resolveCoreComponent(node, null);
    if (core) return core;

    const editor = resolveEditorComponent(node);
    if (editor) return editor;

    return <div className="p-4">Unknown component: {node.getComponent()}</div>;
};
