import React from "react";
import { ToolFrame } from "../../../../lib/atoms/tool-frame";
import { Button } from "../../../../lib/atoms/button";
import { SchemaForm } from "../../SchemaForm";
import { CarrierSettingsSchema } from "../../../../../data/schemas/game/carrier";
import { useSessionStore } from "../../../state/useSessionStore";
import { useShellStore } from "../../../shell/shell";

const CARRIER_PATH = "config.settings.carrier";

export const CarrierEditor: React.FC<{ filename: string }> = ({ filename }) => {
    const openFile = useShellStore((state) => state.openFile);
    const displayId = useSessionStore(
        (state) =>
            state.sessions[filename]?.draft?.config?.settings?.carrier
                ?.displayId ?? "egg",
    );
    return (
        <ToolFrame title="Carrier Editor">
            <SchemaForm
                schema={CarrierSettingsSchema}
                filename={filename}
                rootPath={CARRIER_PATH}
            />
            <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                    openFile(`${filename}::assets::displays::${displayId}`)
                }
            >
                Edit Display
            </Button>
        </ToolFrame>
    );
};
