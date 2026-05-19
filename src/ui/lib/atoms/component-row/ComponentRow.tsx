import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Button } from "../button";
import { SmartTooltip } from "../tooltip";
import { ComponentRowProps } from "./types";
import {
    Body,
    Chevron,
    DeleteArea,
    Left,
    Row,
    RowHeader,
    Summary,
    Title,
} from "./ComponentRow.styles";

function CaretIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M9 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function ComponentRow({
    title,
    titleTooltip,
    icon,
    summary,
    children,
    isOpen,
    defaultOpen = false,
    onToggle,
    onDelete,
    deleteLabel = "Delete",
    className,
}: Readonly<ComponentRowProps>) {
    const [internalOpen, setInternalOpen] = useState(defaultOpen);

    const open = useMemo(() => isOpen ?? internalOpen, [isOpen, internalOpen]);

    const setOpen = (next: boolean) => {
        if (isOpen === undefined) setInternalOpen(next);
        onToggle?.(next);
    };

    return (
        <Row className={className}>
            <RowHeader
                type="button"
                isOpen={open}
                onClick={() => setOpen(!open)}
            >
                <Left>
                    {icon}
                    <SmartTooltip content={titleTooltip ?? title}>
                        <Title>{title}</Title>
                    </SmartTooltip>
                </Left>
                <Summary>{summary}</Summary>
                <Chevron
                    animate={{ rotate: open ? 90 : 0 }}
                    transition={{ duration: 0.15 }}
                >
                    <CaretIcon />
                </Chevron>
            </RowHeader>

            <AnimatePresence initial={false}>
                {open && (
                    <Body
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                    >
                        {onDelete && (
                            <DeleteArea>
                                <SmartTooltip content={deleteLabel}>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete();
                                        }}
                                    >
                                        {deleteLabel}
                                    </Button>
                                </SmartTooltip>
                            </DeleteArea>
                        )}
                        {children}
                    </Body>
                )}
            </AnimatePresence>
        </Row>
    );
}

