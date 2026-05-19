import type { TabNode } from "flexlayout-react";
import { resolveWindowComponent } from "./WindowLayoutResolver";

export class WindowLayoutController {
    private readonly activeModuleFilename: string | null;

    constructor(params: { activeModuleFilename: string | null }) {
        this.activeModuleFilename = params.activeModuleFilename;
    }

    factory = (node: TabNode) => {
        if (!this.activeModuleFilename && node.getComponent() === "home") {
            return resolveWindowComponent(node);
        }
        return resolveWindowComponent(node);
    };
}
