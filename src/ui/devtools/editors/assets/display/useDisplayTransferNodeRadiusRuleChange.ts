import type {
    ModuleDisplayAsset,
    TransferNodeRadiusByValueRule,
} from "../../../state/moduleStore.assets";

export const applyTransferNodeRadiusRule = (
    current: ModuleDisplayAsset,
    rule: TransferNodeRadiusByValueRule | undefined,
) => {
    if (current.type !== "resource") return;
    if (rule) current.transferNodeRadiusByValue = rule;
    else delete current.transferNodeRadiusByValue;
};
