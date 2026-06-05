import React from "react";
import { InputWrapper, PromptLabel } from "./styles";
import { Suggestion } from "../types";
import { SuggestionBox } from "./SuggestionBox";
import { usePopoverSlot } from "../PopoverSlot";
import { useSmartInputState } from "./useSmartInputState";
import { SmartInputTextArea } from "./SmartInputTextArea";
import { SmartInputInline } from "./SmartInputInline";
export interface SmartInputProps {
    value: string;
    suggestions: Suggestion[];
    inputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
    onChange: (val: string) => void;
    onSubmit: (val: string) => void;
    onAbort?: () => void;
    onCursorChange?: (cursor: number) => void;
    promptLabel?: string;
    placeholder?: string;
    autoFocus?: boolean;
    multiline?: boolean;
}
export const SmartInput: React.FC<SmartInputProps> = ({
    value,
    suggestions,
    inputRef: externalInputRef,
    onChange,
    onSubmit,
    onAbort,
    onCursorChange,
    promptLabel = "ƒ",
    placeholder = "Enter logic rule...",
    autoFocus = false,
    multiline = false,
}) => {
    const renderPopover = usePopoverSlot();
    const {
        suggestionIndex,
        showSuggestions,
        inputRef,
        handleChange,
        handleKeyDown,
        handleFocus,
        handleBlur,
        handleCursorUpdate,
        handleSelectSuggestion,
    } = useSmartInputState({
        value,
        suggestions,
        inputRef: externalInputRef,
        onChange,
        onSubmit,
        onAbort,
        onCursorChange,
        autoFocus,
        multiline,
    });

    return (
        <>
            {showSuggestions &&
                renderPopover({
                    triggerRef: inputRef,
                    isOpen: true,
                    children: (
                        <SuggestionBox
                            suggestions={suggestions}
                            selectedIndex={suggestionIndex}
                            onSelect={handleSelectSuggestion}
                        />
                    ),
                })}
            <InputWrapper
                style={
                    multiline
                        ? {
                              height: "100%",
                              alignItems: "stretch",
                              borderTop: "none",
                              background: "transparent",
                              padding: 0,
                          }
                        : undefined
                }
            >
                {promptLabel && <PromptLabel>{promptLabel}</PromptLabel>}
                {multiline ? (
                    <SmartInputTextArea
                        value={value}
                        inputRef={
                            inputRef as React.RefObject<HTMLTextAreaElement | null>
                        }
                        placeholder={placeholder}
                        onChange={handleChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        onKeyDown={
                            handleKeyDown as (
                                e: React.KeyboardEvent<HTMLTextAreaElement>,
                            ) => void
                        }
                        onCursorUpdate={handleCursorUpdate}
                    />
                ) : (
                    <SmartInputInline
                        value={value}
                        inputRef={
                            inputRef as React.RefObject<HTMLInputElement | null>
                        }
                        placeholder={placeholder}
                        onChange={handleChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        onKeyDown={
                            handleKeyDown as (
                                e: React.KeyboardEvent<HTMLInputElement>,
                            ) => void
                        }
                        onCursorUpdate={handleCursorUpdate}
                    />
                )}
            </InputWrapper>
        </>
    );
};
