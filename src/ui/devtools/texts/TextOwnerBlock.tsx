import type { TextOwnerBlock as TextOwnerBlockType } from "./types";
import {
    BlockRow,
    FieldStack,
    HeaderGrid,
    MirrorPanel,
    OwnerId,
    OwnerMeta,
} from "./TextOwnerBlock.styles";
import { TextFieldRow } from "./TextFieldRow";

interface TextOwnerBlockProps {
    block: TextOwnerBlockType;
}

interface OwnerHeaderProps {
    ownerId: string;
    ownerType: TextOwnerBlockType["ownerType"];
    filename: string;
}

const OwnerHeader = ({ ownerId, ownerType, filename }: OwnerHeaderProps) => (
    <>
        <OwnerId>{ownerId}</OwnerId>
        <OwnerMeta>
            {ownerType} · {filename}
        </OwnerMeta>
    </>
);

export const TextOwnerBlock = ({ block }: TextOwnerBlockProps) => {
    return (
        <BlockRow>
            <HeaderGrid>
                <MirrorPanel>
                    <OwnerHeader
                        ownerId={block.ownerId}
                        ownerType={block.ownerType}
                        filename={block.filename}
                    />
                </MirrorPanel>
                <MirrorPanel>
                    <OwnerHeader
                        ownerId={block.ownerId}
                        ownerType={block.ownerType}
                        filename={block.filename}
                    />
                </MirrorPanel>
            </HeaderGrid>
            <FieldStack>
                {block.fields.map((field) => (
                    <TextFieldRow
                        key={field.key}
                        filename={field.filename}
                        path={field.path}
                        label={field.label}
                        value={field.value}
                    />
                ))}
            </FieldStack>
        </BlockRow>
    );
};
