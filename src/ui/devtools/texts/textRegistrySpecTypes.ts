import type { TextFieldCategory, TextOwnerType } from "./types";

export interface TextFieldSpec {
    path: string;
    label: string;
    category: TextFieldCategory;
    optional?: boolean;
}

export interface TextListSpec {
    path: string;
    fields: TextFieldSpec[];
}

export interface TextOwnerSpec {
    ownerType: TextOwnerType;
    fields?: TextFieldSpec[];
    lists?: TextListSpec[];
}
