import { DEFAULT_VEIN_CONFIG } from "../../../../data/schemas/assets/veins";
import { GameIcon } from "../game-icon/GameIcon";
import { RefLink } from "./RefLink";
import type { RichTextProcessor } from "./types";

const ATTRIBUTE_COLORS = {
    body: DEFAULT_VEIN_CONFIG.colors.base_body,
    mind: DEFAULT_VEIN_CONFIG.colors.base_mind,
    social: DEFAULT_VEIN_CONFIG.colors.base_social,
};

const capitalize = (value: string) =>
    value ? value[0].toUpperCase() + value.slice(1) : value;

const parseRef = (value: string) => {
    const [type = "unknown", ...rest] = value.split(":");
    return { type, id: rest.join(":") || "unknown" };
};

export const getDefaultRichTextProcessors = (): Record<
    string,
    RichTextProcessor
> => ({
    b: (node, { key, renderChildren }) => (
        <strong key={key}>{renderChildren(node.children, key)}</strong>
    ),
    i: (node, { key, renderChildren }) => (
        <em key={key}>{renderChildren(node.children, key)}</em>
    ),
    u: (node, { key, renderChildren }) => (
        <u key={key}>{renderChildren(node.children, key)}</u>
    ),
    color: (node, { key, renderChildren }) => (
        <span key={key} style={{ color: node.attr }}>
            {renderChildren(node.children, key)}
        </span>
    ),
    icon: (node, { key }) => (
        <div
            key={key}
            style={{ verticalAlign: "middle", display: "inline-block" }}
        >
            <GameIcon key={key} id={node.attr || "unknown"} size="lg" />
        </div>
    ),
    ref: (node, { key, renderChildren }) => {
        const { type, id } = parseRef(node.attr);
        return (
            <RefLink key={key} type={type} id={id}>
                {renderChildren(node.children, key)}
            </RefLink>
        );
    },
    attribute: (node, { key, getTextContent }) => {
        const raw = (node.attr || getTextContent(node.children)).trim();
        const attribute = raw.toLowerCase() as keyof typeof ATTRIBUTE_COLORS;
        return (
            <span key={key} style={{ color: ATTRIBUTE_COLORS[attribute] }}>
                {capitalize(raw)}
            </span>
        );
    },
});
