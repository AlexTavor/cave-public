import styled from "@emotion/styled";
import { motion } from "framer-motion";

export const Row = styled.div`
    border: ${({ theme }) =>
        `${theme.borderWidth.thin} solid ${theme.colors.surfaceHighlight}`};
    border-radius: ${({ theme }) => theme.radius.md};
    overflow: hidden;
    background: ${({ theme }) => theme.colors.surface};
    gap: ${({ theme }) => theme.spacing.lg};
`;

export const RowHeader = styled.button<{ isOpen: boolean }>`
    width: 100%;
    display: grid;
    grid-template-columns: auto 1fr auto;
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

export const Left = styled.div`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.sm};
    min-width: 0;
`;

export const Title = styled.div`
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const Summary = styled.div`
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: 12px;
    color: ${({ theme }) => theme.colors.secondary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: left;
`;

export const Chevron = styled(motion.div)`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    color: ${({ theme }) => theme.colors.secondary};
`;

export const Body = styled(motion.div)`
    position: relative;
    padding: ${({ theme }) => theme.spacing.md};
    background: ${({ theme }) => theme.colors.background};
    border-top: ${({ theme }) =>
        `${theme.borderWidth.thin} solid ${theme.colors.surfaceHighlight}`};
`;

export const DeleteArea = styled.div`
    position: absolute;
    top: ${({ theme }) => theme.spacing.sm};
    right: ${({ theme }) => theme.spacing.sm};
`;

