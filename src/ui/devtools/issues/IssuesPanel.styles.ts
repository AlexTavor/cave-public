import styled from "@emotion/styled";
import { Card } from "../../lib/atoms/card";

export const Container = styled.div`
    height: 100%;
    display: flex;
    flex-direction: column;
    background: ${({ theme }) => theme.colors.background};
    padding: ${({ theme }) => theme.spacing.md};
    gap: ${({ theme }) => theme.spacing.sm};
`;

export const Title = styled.div`
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: ${({ theme }) => theme.fontSize.md};
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text};
`;

export const Empty = styled.div`
    color: ${({ theme }) => theme.colors.secondary};
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: ${({ theme }) => theme.fontSize.md};
    padding: ${({ theme }) => theme.spacing.sm};
`;

export const Row = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ theme }) => theme.spacing.sm};
`;

export const Mono = styled.div`
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: ${({ theme }) => theme.fontSize.sm};
    color: ${({ theme }) => theme.colors.secondary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const IssueCard = styled(Card)`
    cursor: pointer;
`;

export const IssueCardBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.xs};
`;

export const IssueHeader = styled.div`
    display: flex;
    justify-content: space-between;
    gap: ${({ theme }) => theme.spacing.sm};
    align-items: center;
`;

export const IssueHeaderDetails = styled.div`
    min-width: 0;
`;

export const MissingLabel = styled.div`
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: ${({ theme }) => theme.fontSize.md};
    font-weight: 700;
    color: ${({ theme }) => theme.colors.error};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;
