import React from "react";
import { Button } from "../../../../lib/atoms/button";
import {
    SectionTitle,
    SlotButton,
    SlotGrid,
    VisualSection,
} from "./BlueprintVisualsModal.styles";
import { GlyphVisualInspector } from "./GlyphVisualInspector";

const POSITIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

interface GlyphVisualSectionProps {
    glyph: {
        placements: Array<{ position: number }>;
        pulse: { delayMsByPosition: number[] };
    };
    selectedPosition: number;
    selectedPlacement: React.ComponentProps<
        typeof GlyphVisualInspector
    >["selectedPlacement"];
    selectPosition(position: number): void;
    togglePlacement(position: number): void;
    updateShape(position: number, value: string): void;
    updateColor(position: number, value: string): void;
    updateScale(position: number, value: number): void;
    updateRotation(position: number, value: number): void;
    updateRadialPosition(position: number, value: number): void;
    updateDistanceMin(position: number, value: number): void;
    updateDistanceMax(position: number, value: number): void;
    updateScalePulseMin(position: number, value: number): void;
    updateScalePulseMax(position: number, value: number): void;
    updateRotationDeltaMin(position: number, value: number): void;
    updateRotationDeltaMax(position: number, value: number): void;
    removePlacement(position: number): void;
}

export const GlyphVisualSection: React.FC<GlyphVisualSectionProps> = (
    props,
) => (
    <VisualSection>
        <SectionTitle>Glyph</SectionTitle>
        <SlotGrid>
            {POSITIONS.map((position) => (
                <SlotButton
                    key={`slot-${position}`}
                    $active={position === props.selectedPosition}
                    $filled={props.glyph.placements.some(
                        (item) => item.position === position,
                    )}
                    onClick={() => props.selectPosition(position)}
                >
                    {position + 1}
                </SlotButton>
            ))}
        </SlotGrid>
        <Button
            size="sm"
            variant="ghost"
            onClick={() => props.togglePlacement(props.selectedPosition)}
        >
            {props.selectedPlacement.enabled ? "Disable Slot" : "Enable Slot"}
        </Button>
        <GlyphVisualInspector
            selectedPosition={props.selectedPosition}
            selectedPlacement={props.selectedPlacement}
            updateShape={props.updateShape}
            updateColor={props.updateColor}
            updateScale={props.updateScale}
            updateRotation={props.updateRotation}
            updateRadialPosition={props.updateRadialPosition}
            updateDistanceMin={props.updateDistanceMin}
            updateDistanceMax={props.updateDistanceMax}
            updateScalePulseMin={props.updateScalePulseMin}
            updateScalePulseMax={props.updateScalePulseMax}
            updateRotationDeltaMin={props.updateRotationDeltaMin}
            updateRotationDeltaMax={props.updateRotationDeltaMax}
            removePlacement={props.removePlacement}
        />
    </VisualSection>
);
