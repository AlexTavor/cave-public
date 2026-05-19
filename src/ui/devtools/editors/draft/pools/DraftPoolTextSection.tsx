import React from "react";
import styled from "@emotion/styled";
import { Button } from "../../../../lib/atoms/button";
import { DraftTextRow } from "./DraftTextRow";

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ theme }) => theme.spacing.md};
    margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Title = styled.h3`
    margin: 0;
    font-size: ${({ theme }) => theme.fontSize.lg};
`;

interface DraftPoolTextSectionProps {
    filename: string;
    poolId: string;
    texts: string[];
    onAdd: () => void;
    onRemove: (index: number) => void;
}

export const DraftPoolTextSection: React.FC<DraftPoolTextSectionProps> = ({
    filename,
    poolId,
    texts,
    onAdd,
    onRemove,
}) => {
    return (
        <section>
            <Header>
                <Title>Draft Texts</Title>
                <Button size="sm" variant="ghost" onClick={onAdd}>
                    Add Text
                </Button>
            </Header>
            {texts.length === 0 ? <div>No draft texts yet.</div> : null}
            {texts.map((_, index) => (
                <DraftTextRow
                    key={`${poolId}-text-${index}`}
                    filename={filename}
                    poolId={poolId}
                    index={index}
                    onRemove={() => onRemove(index)}
                />
            ))}
        </section>
    );
};
