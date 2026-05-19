import { createContext, useContext } from "react";
import { RichTextContextValue } from "./types";

export const RichTextContext = createContext<RichTextContextValue | null>(null);

export const useRichTextContext = () => useContext(RichTextContext);
