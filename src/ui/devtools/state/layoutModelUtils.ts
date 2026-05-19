import { Model, type IJsonModel } from "flexlayout-react";
import { type TabNodeConfig } from "./layoutStore.types";

type AnyNode = any;

export function ensurePopouts(model: IJsonModel): IJsonModel {
    const m = model as any;
    if (m.popouts) return model;
    return { ...(model as any), popouts: {} };
}

export function canonicalize(model: IJsonModel): IJsonModel {
    // FlexLayout canonicalizes defaults / internal structure on round-trip
    return Model.fromJson(model).toJson();
}

export function normalizeTabConfig(node: TabNodeConfig): TabNodeConfig {
    return {
        type: "tab",
        ...node,
        name: node.name ?? node.id,
        // Tests omit component; some FlexLayout setups expect it.
        component: node.component ?? "placeholder",
    };
}

export function findFirstTabset(root: AnyNode): AnyNode | null {
    const queue: AnyNode[] = [root];
    while (queue.length) {
        const n = queue.shift();
        if (!n) continue;
        if (n.type === "tabset") return n;

        const kids = n.children ?? [];
        for (const k of kids) queue.push(k);
    }
    return null;
}

export function findTabsetById(root: AnyNode, tabsetId: string): AnyNode | null {
    const queue: AnyNode[] = [root];
    while (queue.length) {
        const n = queue.shift();
        if (!n) continue;

        if (n.type === "tabset" && n.id === tabsetId) return n;

        const kids = n.children ?? [];
        for (const k of kids) queue.push(k);
    }

    return null;
}

export function findTab(
    model: IJsonModel,
    tabId: string,
): { tabset: AnyNode; index: number } | null {
    const root = (model as any).layout;
    const queue: AnyNode[] = [root];
    while (queue.length) {
        const n = queue.shift();
        if (!n) continue;
        if (n.type === "tabset" && Array.isArray(n.children)) {
            const idx = n.children.findIndex(
                (c: AnyNode) => c?.type === "tab" && c?.id === tabId,
            );
            if (idx !== -1) return { tabset: n, index: idx };
        }

        const kids = n.children ?? [];
        for (const k of kids) queue.push(k);
    }

    return null;
}

export function clampSelected(tabset: AnyNode) {
    const len = tabset.children?.length ?? 0;
    if (len === 0) {
        tabset.selected = -1;
        return;
    }

    const sel = tabset.selected;
    if (typeof sel !== "number" || sel < 0 || sel >= len) {
        tabset.selected = 0;
    }
}
