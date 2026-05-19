import React from "react";
import { AmbientLayer, InteractiveOverlay, OverlayLayer } from "../App.styles";
import {
    AnimatePresence,
    Animatable,
} from "../ui/lib/atoms/animatable/Animatable";
import { MouseBlocker } from "./MouseBlocker";

const fullScreenTransitionStyle = {
    inset: 0,
    position: "absolute" as const,
};

interface AppFadeLayerProps {
    visible: boolean;
    animationKey: string;
    testId: string;
    layer: "ambient" | "overlay";
    interactive?: boolean;
    children: React.ReactNode;
}

export const AppFadeLayer = ({
    visible,
    animationKey,
    testId,
    layer,
    interactive = false,
    children,
}: Readonly<AppFadeLayerProps>) => {
    const Layer = layer === "ambient" ? AmbientLayer : OverlayLayer;

    return (
        <AnimatePresence mode="wait">
            {visible ? (
                <Layer data-testid={testId}>
                    <Animatable
                        key={animationKey}
                        style={fullScreenTransitionStyle}
                        type="fade"
                    >
                        {interactive ? (
                            <InteractiveOverlay>
                                <MouseBlocker fill>{children}</MouseBlocker>
                            </InteractiveOverlay>
                        ) : (
                            children
                        )}
                    </Animatable>
                </Layer>
            ) : null}
        </AnimatePresence>
    );
};
