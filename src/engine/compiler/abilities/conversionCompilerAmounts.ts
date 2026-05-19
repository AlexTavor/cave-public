import type { Blueprint } from "../../../data/schemas/blueprint";
import { compileScalableValue } from "../utils/scalableCompiler";
import {
    conversionInputAmountKey,
    conversionOutputBaseAmountKey,
    conversionOutputFinalAmountKey,
} from "./resourceGainAmountKeys";
import { appendResourceGainAdjustedAmount } from "./resourceGainAmountCompiler";
import { ensureStateEntry } from "./conversionCompilerUtils";

const DEFAULT_SCALE = { base: 0, perBody: 0, multPerBody: 0 };

const normalizeScale = (value?: Partial<typeof DEFAULT_SCALE>) => ({
    base: value?.base ?? DEFAULT_SCALE.base,
    perBody: value?.perBody ?? DEFAULT_SCALE.perBody,
    multPerBody: value?.multPerBody ?? DEFAULT_SCALE.multPerBody,
});

export const compileConversionInputAmount = (input: {
    draft: Blueprint;
    resource: string;
    conversionIndex: number;
    inputIndex: number;
    amount?: Partial<typeof DEFAULT_SCALE>;
}) => {
    const amountKey = conversionInputAmountKey(
        input.resource,
        input.conversionIndex,
        input.inputIndex,
    );
    ensureStateEntry(input.draft, amountKey);
    ensureStateEntry(input.draft, input.resource);
    compileScalableValue(
        input.draft,
        normalizeScale(input.amount),
        `self.state.${amountKey}.value`,
        `conv_in_${input.conversionIndex}_${input.inputIndex}`,
    );
    return `self.state.${amountKey}.value`;
};

export const compileConversionOutputAmount = (input: {
    draft: Blueprint;
    resource: string;
    conversionIndex: number;
    outputIndex: number;
    amount?: Partial<typeof DEFAULT_SCALE>;
}) => {
    const baseKey = conversionOutputBaseAmountKey(
        input.resource,
        input.conversionIndex,
        input.outputIndex,
    );
    const finalKey = conversionOutputFinalAmountKey(
        input.resource,
        input.conversionIndex,
        input.outputIndex,
    );
    ensureStateEntry(input.draft, baseKey);
    ensureStateEntry(input.draft, finalKey);
    ensureStateEntry(input.draft, input.resource);
    compileScalableValue(
        input.draft,
        normalizeScale(input.amount),
        `self.state.${baseKey}.value`,
        `conv_out_base_${input.conversionIndex}_${input.outputIndex}`,
    );
    appendResourceGainAdjustedAmount({
        draft: input.draft,
        resource: input.resource,
        baseKey,
        finalKey,
        multiplierKey: `vals_conv_out_mult_${input.resource}_${input.conversionIndex}_${input.outputIndex}`,
    });
    return `self.state.${finalKey}.value`;
};
