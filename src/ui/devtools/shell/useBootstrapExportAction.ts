import { useCallback, useState } from "react";
import { BOOTSTRAP_SNAPSHOT_DISK_PATH } from "../../../engine/vfs/bootstrap";
import { vfs } from "../../../engine/vfs/FileSystem";
import { filterBootstrapSnapshot } from "./bootstrapExportSnapshot";

type LogType = "input" | "output" | "error" | "info" | "success";
type PushType = "success" | "error" | "info";

interface Params {
    log: (type: LogType, content: string) => void;
    pushToast: (type: PushType, content: string) => void;
}

export const useBootstrapExportAction = ({ log, pushToast }: Params) => {
    const [isExportingBootstrap, setIsExportingBootstrap] = useState(false);

    const handleExportBootstrap = useCallback(async () => {
        try {
            setIsExportingBootstrap(true);
            const snapshot = filterBootstrapSnapshot(await vfs.exportState());
            await vfs.saveJsonToDisk(BOOTSTRAP_SNAPSHOT_DISK_PATH, snapshot);
            const message =
                "Bootstrap snapshot exported to public/bootstrap/vfs-prod.json.";
            pushToast("success", message);
            log("success", message);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Bootstrap export failed.";
            pushToast("error", message);
            log("error", message);
        } finally {
            setIsExportingBootstrap(false);
        }
    }, [log, pushToast]);

    return { isExportingBootstrap, handleExportBootstrap };
};
