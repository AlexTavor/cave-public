import type { RuntimeCommandMetadata } from "../commandMetadata";
import { RuntimeCommandType } from "./runtimeCommandTypes";

export type Command<TType extends RuntimeCommandType, TPayload> = {
  type: TType;
  payload: TPayload;
  metadata?: RuntimeCommandMetadata;
};
