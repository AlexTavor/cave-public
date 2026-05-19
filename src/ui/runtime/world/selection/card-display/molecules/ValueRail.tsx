import styled from "@emotion/styled";
import type {
    CardDisplayActionHandler,
    CardSectionLayout,
    CardSectionDensity,
    ValueCapsuleModel,
} from "../cardDisplayTypes";
import { ValueCapsule } from "./ValueCapsule";

const Rail = styled.div<{
    layout: CardSectionLayout;
    density: CardSectionDensity;
}>`
    display: ${({ layout }) => (layout === "grid" ? "grid" : "flex")};
    flex-direction: ${({ layout }) => (layout === "column" ? "column" : "row")};
    flex-wrap: ${({ layout }) => (layout === "wrap" ? "wrap" : "nowrap")};
    grid-template-columns: ${({ layout }) =>
        layout === "grid" ? "repeat(auto-fit, minmax(160px, 1fr))" : "none"};
    gap: ${({ density, theme }) =>
        theme.spacing[density === "tight" ? "xs" : "sm"]};
    justify-content: space-around;
    align-items: center;
`;

type Props = Readonly<{
    capsules: ValueCapsuleModel[];
    layout: CardSectionLayout;
    density: CardSectionDensity;
    onAction?: CardDisplayActionHandler;
}>;

export function ValueRail({ capsules, layout, density, onAction }: Props) {
    return (
        <Rail layout={layout} density={density}>
            {capsules.map((capsule) => (
                <ValueCapsule
                    key={capsule.id}
                    model={capsule}
                    onAction={onAction}
                />
            ))}
        </Rail>
    );
}
