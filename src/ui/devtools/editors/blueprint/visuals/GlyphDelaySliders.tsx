import React from "react";
import { FieldLabel, RangeInput } from "./BlueprintVisualsModal.styles";

const POSITIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

interface GlyphDelaySlidersProps {
    delays: number[];
    updateDelay(position: number, value: number): void;
}

export const GlyphDelaySliders: React.FC<GlyphDelaySlidersProps> = (props) => (
    <>
        {POSITIONS.map((position) => (
            <FieldLabel key={`delay-${position}`}>
                Delay {position + 1}
                <RangeInput
                    type="range"
                    min="0"
                    max="180"
                    step="1"
                    value={props.delays[position]}
                    onChange={(e) =>
                        props.updateDelay(position, Number(e.target.value))
                    }
                />
            </FieldLabel>
        ))}
    </>
);
