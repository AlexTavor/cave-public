import styled from "@emotion/styled";

const Screen = styled.div`
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    background: rgba(5, 9, 14, 0.92);
    color: #e6edf7;
    font:
        600 14px/1.4 "IBM Plex Sans",
        sans-serif;
    letter-spacing: 0.04em;
`;

const Card = styled.div`
    min-width: 240px;
    padding: 18px 22px;
    border: 1px solid rgba(148, 163, 184, 0.28);
    background: rgba(15, 23, 42, 0.84);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
    text-align: center;
`;

export const DevtoolsLoadingScreen = () => (
    <Screen>
        <Card>Loading DevTools session...</Card>
    </Screen>
);
