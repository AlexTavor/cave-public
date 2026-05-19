import { createContext } from "react";
import { IconRegistryContextValue } from "./types";

export const IconRegistryContext =
    createContext<IconRegistryContextValue | null>(null);
