import { useEffect, useRef, type TextareaHTMLAttributes } from "react";
import styled from "@emotion/styled";

const Area = styled.textarea`
    resize: none;
    overflow: hidden;
    min-height: 24px;
    padding: 10px 12px;
    border-radius: ${({ theme }) => theme.radius.sm};
    border: 1px solid ${({ theme }) => theme.colors.whiteBorderSubtle};
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    font: inherit;
`;

export const AutosizeTextArea = (
    props: TextareaHTMLAttributes<HTMLTextAreaElement>,
) => {
    const ref = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        element.style.height = "auto";
        element.style.height = `${Math.max(element.scrollHeight, 24)}px`;
    }, [props.value]);

    return <Area {...props} ref={ref} rows={1} />;
};
