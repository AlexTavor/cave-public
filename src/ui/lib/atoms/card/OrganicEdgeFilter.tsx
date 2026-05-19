import React from "react";

/**
 * SVG filter definitions for organic edge effects.
 * This component should be rendered once at the root level.
 */
export const OrganicEdgeFilter: React.FC = () => {
    return (
        <svg
            style={{
                position: "absolute",
                width: 0,
                height: 0,
                pointerEvents: "none",
            }}
            aria-hidden="true"
        >
            <defs>
                <filter id="organic-edge">
                    <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.02"
                        numOctaves="3"
                        result="noise"
                    />
                    <feDisplacementMap
                        in="SourceGraphic"
                        in2="noise"
                        scale="15"
                    />
                </filter>
            </defs>
        </svg>
    );
};

