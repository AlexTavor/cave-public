import React from "react";
import { usePostHog } from "@posthog/react";
import type { DraftOptionBlueprint } from "../../../data/schemas/draft";
import { GameIcon } from "../../lib/atoms/game-icon/GameIcon";
import { RichText } from "../../lib/atoms/rich-text/RichText";
import {
    CardBody,
    CardHeader,
    CardRoot,
    CardTop,
    CardTitle,
    IconRow,
    IconWrap,
} from "./DraftCard.styles";
import { resolveDraftOptionPreviewIds } from "./resolveDraftOptionPreviewIds";

interface DraftCardProps {
    option: DraftOptionBlueprint;
    disabled?: boolean;
    onSelect: () => void;
}

export const DraftCard: React.FC<DraftCardProps> = ({
    option,
    disabled = false,
    onSelect,
}) => {
    const posthog = usePostHog();
    const previewIds = resolveDraftOptionPreviewIds(option);
    const handleSelect = () => {
        posthog?.capture("draft_option_selected", {
            option_id: option.id,
            option_title: option.title,
            option_rarity: option.rarity,
        });
        onSelect();
    };
    return (
        <CardRoot disabled={disabled} onClick={handleSelect}>
            <CardTop>
                <IconWrap>
                    <IconRow>
                        {previewIds.map((id) => (
                            <GameIcon
                                key={`${option.id}:${id}`}
                                id={id}
                                size="lg"
                            />
                        ))}
                    </IconRow>
                </IconWrap>
                <CardBody>
                    <CardHeader>
                        <CardTitle>{option.title}</CardTitle>
                    </CardHeader>
                    <RichText text={option.description} />
                </CardBody>
            </CardTop>
        </CardRoot>
    );
};

