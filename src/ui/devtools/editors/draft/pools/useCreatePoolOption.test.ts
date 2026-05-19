// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCreatePoolOption } from "./useCreatePoolOption";
import { useModuleStore } from "../../../state/moduleStore";
import { useSessionStore } from "../../../state/useSessionStore";
import { createCartridge } from "../../../../../engine/test/factories";
import type { ModuleCartridge } from "../../../../../data/schemas/module";
import type { DraftOptionBlueprint } from "../../../../../data/schemas/draft";

const filename = "mod.json";
const poolId = "pool_1";

const newOpt: DraftOptionBlueprint = {
    id: "opt_new",
    title: "New",
    description: "",
    rarity: "none",
    icon: "unknown",
    payload: [],
};

const baseModule: ModuleCartridge = {
    ...createCartridge(filename),
    draftOptions: { opt_new: newOpt },
    draftPools: {
        pool_1: { id: "pool_1", texts: [], entries: [] },
    },
};

beforeEach(() => {
    useSessionStore.setState({ sessions: {} });
    useSessionStore.getState().initSession(filename, baseModule);
    useModuleStore.setState({
        modules: { [filename]: baseModule },
        loading: {},
        loadModule: vi.fn(async () => {}),
        createDraftOption: vi.fn(async () => "opt_new"),
    } as unknown as ReturnType<typeof useModuleStore.getState>);
});

describe("useCreatePoolOption", () => {
    it("creates option and adds it to pool entries", async () => {
        const { result } = renderHook(() =>
            useCreatePoolOption(filename, poolId, []),
        );

        await act(async () => {
            await result.current();
        });

        const session = useSessionStore.getState().sessions[filename];
        const entries = session.draft.draftPools?.pool_1?.entries ?? [];
        const opts = session.draft.draftOptions ?? {};

        expect(entries).toHaveLength(1);
        expect(entries[0].optionId).toBe("opt_new");
        expect(opts.opt_new).toBeDefined();
    });
});

