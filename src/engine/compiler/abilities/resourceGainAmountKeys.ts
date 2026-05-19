const normalize = (resource: string) => resource.trim();

export const productionBaseAmountKey = (resource: string, index: number) =>
    `vals_prod_base_${normalize(resource)}_amt_${index}`;

export const productionFinalAmountKey = (resource: string, index: number) =>
    `vals_prod_${normalize(resource)}_amt_${index}`;

export const conversionInputAmountKey = (
    resource: string,
    conversionIndex: number,
    inputIndex: number,
) => `vals_conv_in_${normalize(resource)}_${conversionIndex}_${inputIndex}`;

export const conversionOutputBaseAmountKey = (
    resource: string,
    conversionIndex: number,
    outputIndex: number,
) =>
    `vals_conv_out_base_${normalize(resource)}_${conversionIndex}_${outputIndex}`;

export const conversionOutputFinalAmountKey = (
    resource: string,
    conversionIndex: number,
    outputIndex: number,
) => `vals_conv_out_${normalize(resource)}_${conversionIndex}_${outputIndex}`;
