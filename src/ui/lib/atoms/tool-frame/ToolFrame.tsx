import { ToolFrameProps } from "./types";
import {
    Actions,
    Body,
    Frame,
    Header,
    Title,
    TitleCluster,
} from "./ToolFrame.styles";
import { Button } from "../button";

export function ToolFrame({
    title,
    icon,
    onClose,
    toolbarActions,
    children,
    className,
    bodyRef,
}: Readonly<ToolFrameProps>) {
    return (
        <Frame className={className}>
            <Header>
                <TitleCluster>
                    {icon}
                    {typeof title === "string" ? (
                        <Title title={title}>{title}</Title>
                    ) : (
                        title
                    )}
                </TitleCluster>

                <Actions>
                    {toolbarActions}
                    {onClose && (
                        <Button size="sm" variant="ghost" onClick={onClose}>
                            Close
                        </Button>
                    )}
                </Actions>
            </Header>

            <Body ref={bodyRef}>{children}</Body>
        </Frame>
    );
}
