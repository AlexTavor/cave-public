import React from "react";
import { StyledInput, defaultTerminalTheme } from "./styles";
import { highlightSemanticText } from "./syntaxHighlight";

interface SmartInputInlineProps {
    value: string;
    inputRef: React.RefObject<HTMLInputElement | null>;
    placeholder: string;
    onChange: (value: string) => void;
    onFocus: () => void;
    onBlur: () => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onCursorUpdate: () => void;
}

export const SmartInputInline: React.FC<SmartInputInlineProps> = ({
    value,
    inputRef,
    placeholder,
    onChange,
    onFocus,
    onBlur,
    onKeyDown,
    onCursorUpdate,
}) => (
    <div style={{ position: "relative", flex: 1 }}>
        {value ? (
            <div
                aria-hidden
                style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    whiteSpace: "pre",
                    overflow: "hidden",
                }}
            >
                {highlightSemanticText(value)}
            </div>
        ) : null}
        <StyledInput
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            onKeyUp={onCursorUpdate}
            onClick={onCursorUpdate}
            onSelect={onCursorUpdate}
            spellCheck={false}
            autoComplete="off"
            placeholder={placeholder}
            style={
                value
                    ? {
                          color: "transparent",
                          caretColor: defaultTerminalTheme.colors.cursor,
                      }
                    : undefined
            }
        />
    </div>
);
