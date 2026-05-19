import { create } from "zustand";
import type { DisplayImageExportService } from "../../../engine/phaser/display-export/DisplayImageExportTypes";

interface DisplayImageExportState {
    service: DisplayImageExportService | null;
    setService: (service: DisplayImageExportService | null) => void;
    clear: () => void;
}

export const useDisplayImageExportStore = create<DisplayImageExportState>(
    (set) => ({
        service: null,
        setService: (service) => set({ service }),
        clear: () => set({ service: null }),
    }),
);
