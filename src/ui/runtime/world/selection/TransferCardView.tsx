import React from "react";
import { CardModelView } from "./card-display/organisms/CardModelView";
import { resolveTransferCardModel } from "./card-display/resolveTransferCardModel";
import type { TransferCardData } from "./resolveTransferCardData";

export const TransferCardView: React.FC<{ data: TransferCardData | null }> = ({
    data,
}) => <CardModelView model={resolveTransferCardModel(data)} runtime={null} />;
