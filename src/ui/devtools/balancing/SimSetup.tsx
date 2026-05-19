import React from "react";
import { useSimulationSetup } from "./hooks/useSimulationSetup";
import {
    SetupRoot,
    SetupRow,
    SetupSelect,
    SetupTitle,
} from "./SimSetup.styles";
import { LeverLabel, LeverValueInput } from "./LeverList.styles";

export const SimSetup: React.FC = () => {
    const { config, setConfig, scriptIds } = useSimulationSetup();

    return (
        <SetupRoot>
            <SetupTitle>Simulation Config</SetupTitle>
            <SetupRow>
                <LeverLabel>Run Length (sec)</LeverLabel>
                <LeverValueInput
                    type="number"
                    min={1}
                    value={config.durationSeconds}
                    onChange={(event) =>
                        setConfig({
                            durationSeconds:
                                Number.parseFloat(event.target.value) || 1,
                        })
                    }
                />
            </SetupRow>
            <SetupRow>
                <LeverLabel>Setup Script</LeverLabel>
                <SetupSelect
                    value={config.scriptId}
                    onChange={(event) =>
                        setConfig({ scriptId: event.target.value })
                    }
                    disabled={scriptIds.length === 0}
                >
                    {scriptIds.length === 0 && (
                        <option value="">No .cvs scripts found</option>
                    )}
                    {scriptIds.map((id) => (
                        <option key={id} value={id}>
                            {id}
                        </option>
                    ))}
                </SetupSelect>
            </SetupRow>
        </SetupRoot>
    );
};
