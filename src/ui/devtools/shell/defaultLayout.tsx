import { IJsonModel } from "flexlayout-react";

export const defaultLayout: IJsonModel = {
    global: {
        tabEnableClose: true,
    },
    borders: [],
    layout: {
        type: "row",
        weight: 100,
        children: [
            {
                type: "column",
                weight: 100,
                children: [
                    {
                        // Top Item (Game View)
                        type: "tabset",
                        id: "main",
                        weight: 70,
                        selected: 0,
                        children: [
                            {
                                type: "tab",
                                id: "game_view",
                                name: "Game",
                                component: "game_view",
                                enableClose: false,
                            },
                        ],
                    },
                    {
                        // Bottom Item (HUD Tools)
                        type: "tabset",
                        weight: 30,
                        selected: 0,
                        children: [
                            {
                                type: "tab",
                                id: "terminal",
                                name: "Terminal",
                                component: "terminal",
                                enableClose: false,
                            },
                            {
                                type: "tab",
                                id: "telemetry",
                                name: "Telemetry",
                                component: "telemetry",
                                enableClose: false,
                            },
                            {
                                type: "tab",
                                id: "balancing",
                                name: "Balancing",
                                component: "balancing",
                                enableClose: false,
                            },
                            {
                                type: "tab",
                                id: "home",
                                name: "Explorer",
                                component: "home",
                                enableClose: false,
                            },
                        ],
                    },
                ],
            },
        ],
    },
};
