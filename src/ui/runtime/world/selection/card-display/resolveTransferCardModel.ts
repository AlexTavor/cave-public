import type { TransferCardData } from "../resolveTransferCardData";
import type { SelectionCardModel } from "./cardDisplayTypes";

const capsule = (id: string, title: string, text: string) => ({
    id,
    skin: "value" as const,
    title,
    value: { text },
    effects: [],
});

export const resolveTransferCardModel = (
    data: TransferCardData | null,
): SelectionCardModel | null => {
    if (!data) return null;
    return {
        id: `transfer:${data.summary}`,
        entityId: "",
        title: { id: `${data.summary}:title`, text: data.summary },
        description: {
            id: `${data.summary}:description`,
            text: "Transfer Node",
        },
        sections: [
            {
                id: `${data.summary}:details`,
                layout: "column",
                density: "normal",
                capsules: [
                    capsule("type", "Type", data.typeLabel),
                    capsule("value", "Value", data.valueLabel),
                    capsule("from", "From", data.sourceLabel),
                    capsule("to", "To", data.targetLabel),
                ],
            },
        ],
    };
};
