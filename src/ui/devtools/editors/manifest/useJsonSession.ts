import { useEffect, useState } from "react";
import { vfs } from "../../../../engine/vfs/FileSystem";

export function useJsonSession(filename: string) {
    const [draft, setDraft] = useState<unknown>(null);

    useEffect(() => {
        let mounted = true;
        void vfs.readFile(filename).then((data) => {
            if (mounted) setDraft(data ?? null);
        });
        return () => {
            mounted = false;
        };
    }, [filename]);

    return { draft, setDraft };
}
