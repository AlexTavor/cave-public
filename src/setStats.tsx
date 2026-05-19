import Stats from "stats.js";

let stats: Stats | null = null;
let frameId: number | null = null;
let statsVisible = false;

const ensureStats = () => {
    if (typeof document === "undefined") return null;
    if (!stats) {
        stats = new Stats();
        stats.showPanel(0);
        stats.dom.style.display = "none";
    }
    if (!stats.dom.isConnected) document.body.appendChild(stats.dom);
    return stats;
};

const animate = () => {
    stats?.begin();
    stats?.end();
    frameId = requestAnimationFrame(animate);
};

export const setStats = () => {
    ensureStats();
};

export const getStatsVisible = () => statsVisible;

export const setStatsVisible = (visible: boolean) => {
    if (!visible && !stats) return;
    const current = ensureStats();
    if (!current) return;
    statsVisible = visible;
    current.dom.style.display = visible ? "block" : "none";
    if (visible && frameId === null) frameId = requestAnimationFrame(animate);
    if (!visible && frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
    }
};

