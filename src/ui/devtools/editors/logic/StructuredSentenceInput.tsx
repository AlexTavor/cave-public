import React, { useMemo, useState, useCallback } from "react";
import type { FieldProps } from "../fields/Shared.types";
import { FieldContainer, Label } from "../fields/Shared.styles";
import type { LogicToken } from "../../../../data/schemas/logic";
import { useSessionStore } from "../../state/useSessionStore";
import { getByPath } from "../../../../utils/objectUtils";
import { applyLogicTokens, clearLogicTokens } from "./logicTokenService";
import {
    Container,
    TokenRow,
    TokenPill,
    TokenInput,
    InputRow,
    HelperText,
} from "./StructuredSentenceInput.styles";
import { Button } from "../../../lib/atoms/button/Button";

export const StructuredSentenceInput: React.FC<FieldProps> = ({
    label,
    filename,
    path,
}) => {
    const [inputValue, setInputValue] = useState("");

    const tokens = useSessionStore(
        useCallback(
            (state) => {
                const session = state.sessions[filename];
                if (!session) return [] as LogicToken[];
                const rule = getByPath(session.draft, path) as {
                    tokens?: LogicToken[];
                };
                return Array.isArray(rule?.tokens) ? rule.tokens : [];
            },
            [filename, path],
        ),
    );

    const andCount = useMemo(
        () =>
            tokens.filter((token) => token.t === "keyword" && token.v === "AND")
                .length,
        [tokens],
    );

    const appendTokens = () => {
        if (!inputValue.trim()) return;
        applyLogicTokens(filename, path, inputValue, "append");
        setInputValue("");
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            appendTokens();
        }
    };

    const resolveTone = (
        token: LogicToken,
    ): "keyword" | "op" | "value" | "ref" | "global" => {
        if (token.t === "keyword") return "keyword";
        if (token.t === "op") return "op";
        if (token.t === "val") return "value";
        if (token.t === "ref" && token.v.startsWith("global.")) return "global";
        return "ref";
    };

    return (
        <FieldContainer>
            <Label>
                {label}
                {andCount > 3 && <span>⚠️</span>}
            </Label>
            <Container>
                <TokenRow>
                    {tokens.length === 0 && (
                        <HelperText>
                            No tokens. Add a token sequence below.
                        </HelperText>
                    )}
                    {tokens.map((token, index) => (
                        <TokenPill
                            key={`${token.t}-${index}`}
                            tone={resolveTone(token)}
                        >
                            {token.v}
                        </TokenPill>
                    ))}
                </TokenRow>
                <InputRow>
                    <TokenInput
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="self.hp + 5"
                    />
                    <Button variant="ghost" size="sm" onClick={appendTokens}>
                        Add
                    </Button>
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={() => clearLogicTokens(filename, path)}
                    >
                        Clear
                    </Button>
                </InputRow>
                <HelperText>
                    Tokens are appended on Enter. Keywords: IF AND OR NOT.
                </HelperText>
            </Container>
        </FieldContainer>
    );
};
