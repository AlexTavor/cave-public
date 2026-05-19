import type React from "react";
import type { FieldProps } from "./Shared.types";

type FieldRenderer = (props: FieldProps) => React.ReactElement | null;

let renderer: FieldRenderer = () => null;

export const registerSchemaFieldRenderer = (r: FieldRenderer): void => {
  renderer = r;
};

export const renderSchemaField = (
  props: FieldProps,
): React.ReactElement | null => renderer(props);
