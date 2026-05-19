import React from "react";

interface ExplorerContextMenuProps {
    x: number;
    y: number;
    isMulti: boolean;
    isFolderTarget: boolean;
    onClose: () => void;
    onRename: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onNewFile: () => void;
    onNewFolder: () => void;
}

const Item: React.FC<{ label: string; onClick: () => void }> = ({
    label,
    onClick,
}) => (
    <button
        type="button"
        onClick={onClick}
        style={{ display: "block", width: "100%", textAlign: "left" }}
    >
        {label}
    </button>
);

export const ExplorerContextMenu: React.FC<ExplorerContextMenuProps> = (
    props,
) => {
    const { x, y, isMulti, isFolderTarget, onClose } = props;

    return (
        <div
            role="button"
            tabIndex={0}
            style={{ position: "fixed", inset: 0, zIndex: 1000 }}
            onClick={onClose}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
        >
            <div
                role="menu"
                tabIndex={-1}
                style={{ position: "absolute", top: y, left: x, minWidth: 180 }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.key === "Escape" && onClose()}
            >
                {isMulti ? (
                    <>
                        <Item label="Move" onClick={onClose} />
                        <Item label="Delete" onClick={props.onDelete} />
                    </>
                ) : (
                    <>
                        <Item label="Rename" onClick={props.onRename} />
                        <Item label="Duplicate" onClick={props.onDuplicate} />
                        <Item label="Delete" onClick={props.onDelete} />
                    </>
                )}
                {isFolderTarget && (
                    <>
                        <Item label="New File" onClick={props.onNewFile} />
                        <Item label="New Folder" onClick={props.onNewFolder} />
                        <Item label="Import from Disk" onClick={onClose} />
                    </>
                )}
            </div>
        </div>
    );
};
