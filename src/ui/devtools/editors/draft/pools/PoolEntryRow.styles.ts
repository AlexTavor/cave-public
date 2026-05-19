import styled from "@emotion/styled";
import { motion } from "framer-motion";

export const EntryWrapper = styled.div`
    border: ${({ theme }) =>
        `${theme.borderWidth.thin} solid ${theme.colors.surfaceHighlight}`};
    border-radius: ${({ theme }) => theme.radius.md};
    overflow: hidden;
    background: ${({ theme }) => theme.colors.surface};
`;

export const Header = styled.button<{ isOpen: boolean }>`
    width: 100%;
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.sm};
    padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
    background: ${({ theme, isOpen }) =>
        isOpen ? theme.colors.background : theme.colors.surface};
    border: none;
    cursor: pointer;
    color: ${({ theme }) => theme.colors.text};
    &:hover {
        background: ${({ theme }) => theme.colors.background};
    }
`;

export const Label = styled.div`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.xs};
    flex: 1;
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: 12px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const WeightInput = styled.input`
    width: 60px;
    background: ${({ theme }) => theme.colors.surface};
    border: ${({ theme }) =>
        `${theme.borderWidth.thin} solid ${theme.colors.whiteBorderSubtle}`};
    color: ${({ theme }) => theme.colors.text};
    padding: 2px 4px;
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: 12px;
    border-radius: 4px;
`;

export const OneOffCheckbox = styled.input`
    cursor: pointer;
    margin: 0;
`;

export const Chevron = styled(motion.div)`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    color: ${({ theme }) => theme.colors.secondary};
`;

export const Body = styled(motion.div)`
    padding: ${({ theme }) => theme.spacing.md};
    background: ${({ theme }) => theme.colors.background};
    border-top: ${({ theme }) =>
        `${theme.borderWidth.thin} solid ${theme.colors.surfaceHighlight}`};
`;
