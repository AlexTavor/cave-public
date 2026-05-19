import React, { useMemo, useState } from "react";
import styled from "@emotion/styled";
import { highlightSemanticText } from "./syntaxHighlight";
import { defaultTerminalTheme } from "./styles";

const Frame = styled.div`
    position: relative;
    flex: 1;
    width: 100%;
    min-height: 0;
`;

const HighlightLayer = styled.div`
    position: absolute;
    inset: 0;
    padding: 12px;
    white-space: pre-wrap;
    word-break: break-word;
    overflow: hidden;
    pointer-events: none;
`;

const Editor = styled.textarea`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    resize: none;
    margin: 0;
    border: none;
    outline: none;
    padding: 12px;
    background: transparent;
    font: inherit;
    line-height: inherit;
`;

interface SmartInputTextAreaProps {
    value: string;
    inputRef: React.RefObject<HTMLTextAreaElement | null>;
    placeholder: string;
    onChange: (value: string) => void;
    onFocus: () => void;
    onBlur: () => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onCursorUpdate: () => void;
}

export const SmartInputTextArea: React.FC<SmartInputTextAreaProps> = ({
    value,
    inputRef,
    placeholder,
    onChange,
    onFocus,
    onBlur,
    onKeyDown,
    onCursorUpdate,
}) => {
    const [scrollTop, setScrollTop] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const highlighted = useMemo(() => highlightSemanticText(value), [value]);

    return (
        <Frame>
            <HighlightLayer
                aria-hidden
                style={{
                    transform: `translate(${-scrollLeft}px, ${-scrollTop}px)`,
                }}
            >
                {value ? highlighted : null}
            </HighlightLayer>
            <Editor
                ref={inputRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                onKeyUp={onCursorUpdate}
                onClick={onCursorUpdate}
                onSelect={onCursorUpdate}
                onScroll={(event) => {
                    setScrollTop(event.currentTarget.scrollTop);
                    setScrollLeft(event.currentTarget.scrollLeft);
                }}
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
        </Frame>
    );
};
