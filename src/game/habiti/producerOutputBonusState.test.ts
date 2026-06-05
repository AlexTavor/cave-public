import { describe, expect, it } from "vitest";
import {
    listProducerOutputBonusTags,
    readProducerOutputBonusValue,
} from "./producerOutputBonusState";
import { producerOutputBonusStateKey } from "../../utils/habitiBonusStateKeys";

describe("producerOutputBonusState", () => {
    it("lists unique producer tags in sorted order", () => {
        expect(
            listProducerOutputBonusTags({
                b: {
                    id: "b",
                    label: "B",
                    description: "",
                    summary: "",
                    type: "profession",
                    excludes: [],
                    effects: [
                        {
                            type: "add_producer_output_multiplier",
                            producerTag: "artisan",
                            amount: 0.2,
                            description: "",
                        },
                    ],
                },
                a: {
                    id: "a",
                    label: "A",
                    description: "",
                    summary: "",
                    type: "profession",
                    excludes: [],
                    effects: [
                        {
                            type: "add_producer_output_multiplier",
                            producerTag: "builder",
                            amount: 0.1,
                            description: "",
                        },
                        {
                            type: "add_producer_output_multiplier",
                            producerTag: "artisan",
                            amount: 0.1,
                            description: "",
                        },
                    ],
                },
            } as any),
        ).toEqual(["artisan", "builder"]);
    });

    it("reads hidden producer-tag bonus values from world state", () => {
        expect(
            readProducerOutputBonusValue(
                {
                    state: {
                        [producerOutputBonusStateKey("artisan")]: {
                            value: 0.25,
                        },
                    },
                },
                "artisan",
            ),
        ).toBe(0.25);
    });
});
