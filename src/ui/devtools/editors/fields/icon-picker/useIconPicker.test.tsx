// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCartridge } from "../../../../../engine/test/factories";
import type { DraftOptionBlueprint } from "../../../../../data/schemas/draft";
import { useModuleStore } from "../../../state/moduleStore";
import { useSessionStore } from "../../../state/useSessionStore";
import { useIconPicker } from "./useIconPicker";

const filename = "game_data.json";
const assetFilename = "assets.art";
const optAlpha: DraftOptionBlueprint = {
    id: "opt_alpha",
    title: "Alpha",
    description: "",
    rarity: "none",
    icon: "unknown",
    payload: [],
};
const draftModule = {
    ...createCartridge(filename),
    draftOptions: { opt_alpha: optAlpha },
};
const assetBase = createCartridge(assetFilename);
const assetModule = {
    ...assetBase,
    assets: {
        ...assetBase.assets,
        displays: {
            ...assetBase.assets.displays,
            worker_icon: {
                type: "resource" as const,
                styleId: "ember",
                glyphKey: "flame",
            },
        },
    },
};

const Harness = () => {
    const { iconKeys } = useIconPicker(filename, "draftOptions.opt_alpha.icon");
    return <div>{iconKeys.join(",")}</div>;
};

afterEach(() => {
    cleanup();
    useSessionStore.setState({ sessions: {} });
});

beforeEach(() => {
    useSessionStore.setState({ sessions: {} });
    useSessionStore.getState().initSession(filename, draftModule);
    useSessionStore.getState().initSession(assetFilename, assetModule);
    useModuleStore.setState({
        modules: { [filename]: draftModule, [assetFilename]: assetModule },
        loading: { [filename]: false, [assetFilename]: false },
        getModule: (target: string) =>
            useModuleStore.getState().modules[target] ?? null,
        loadModule: vi.fn(async () => {}),
    } as any);
});

describe("useIconPicker", () => {
    it("suggests authored display keys from the linked assets module", () => {
        render(<Harness />);
        expect(screen.getByText(/worker_icon/)).toBeDefined();
    });
});
