import React from "react";
import { SuggestionsList, SuggestionItem, SuggestionType } from "./styles";
import { Suggestion } from "../types";
import { highlightSemanticText } from "./syntaxHighlight";

export interface SuggestionBoxProps {
    suggestions: Suggestion[];
    selectedIndex: number;
    onSelect: (index: number) => void;
}

export const SuggestionBox: React.FC<SuggestionBoxProps> = ({
    suggestions,
    selectedIndex,
    onSelect,
}) => {
    if (suggestions.length === 0) return null;

    return (
        <SuggestionsList>
            {suggestions.map((s, i) => (
                <SuggestionItem
                    key={s.label + i}
                    active={i === selectedIndex}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onSelect(i)}
                >
                    <span>{highlightSemanticText(s.label)}</span>
                    <SuggestionType>{s.type}</SuggestionType>
                </SuggestionItem>
            ))}
        </SuggestionsList>
    );
};
