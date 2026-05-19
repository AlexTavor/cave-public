import styled from "@emotion/styled";

export const FormSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

export const SectionLabel = styled.div`
    font-size: 12px;
    color: #aaa;
    text-transform: uppercase;
    letter-spacing: 0.04em;
`;

export const InjectionCard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.02);
`;

export const EffectsHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

export const EffectsList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

export const EffectsRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.03);
`;

export const ButtonRow = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`;
