// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BodyAvatar } from "./BodyAvatar";

const uiAvatarMock = vi.fn(({ subjectId, fallbackIconId, size }: any) => (
    <div>{`${subjectId}:${fallbackIconId}:${size}`}</div>
));

vi.mock("../../body-avatar/UiAvatar", () => ({
    UiAvatar: (props: any) => uiAvatarMock(props),
}));

describe("BodyAvatar", () => {
    it("forwards the public props through the UiAvatar compatibility path", () => {
        render(
            <BodyAvatar subjectId="body-1" fallbackIconId="worker" size="sm" />,
        );
        expect(screen.getByText("body-1:worker:sm")).toBeTruthy();
        expect(uiAvatarMock.mock.calls[0][0]).toEqual(
            expect.objectContaining({
                subjectId: "body-1",
                fallbackIconId: "worker",
                size: "sm",
            }),
        );
    });
});
