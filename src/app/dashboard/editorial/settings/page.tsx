"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const ROTATION_OPTIONS = [
    { label: "Pause", value: 0 },
    { label: "30 seconds", value: 30_000 },
    { label: "1 minute", value: 60_000 },
    { label: "1 min 30 sec", value: 90_000 },
    { label: "2 minutes", value: 120_000 },
    { label: "3 minutes", value: 180_000 },
    { label: "4 minutes", value: 240_000 },
    { label: "5 minutes", value: 300_000 },
];

export default function EditorialSettingsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    /* ---------------- FORM STATE ---------------- */
    const [rotation, setRotation] = useState<number>(60_000);
    const [stripSpeed, setStripSpeed] = useState<number>(100);
    const [cardDurationSec, setCardDurationSec] = useState<number>(4);
    const [activeNowIntervalsec, setActiveNowIntervalms] = useState<number>(10000);
    const [activeTodayIntervalsec, setActiveTodayIntervalms] = useState<number>(60000);

    const [fullscreen, setFullscreen] = useState<boolean>(true);

    /* ---------------- INITIALIZE FROM URL ---------------- */
    useEffect(() => {
        const r = Number(searchParams.get("rotation"));
        if (!isNaN(r)) setRotation(r);

        const s = Number(searchParams.get("stripspeed"));
        if (!isNaN(s)) setStripSpeed(s);

        const c = Number(searchParams.get("cardduration"));
        if (!isNaN(c)) setCardDurationSec(Math.max(2, Math.round(c / 1000)));

        const f = searchParams.get("fullscreen");
        setFullscreen(f === "1");

        const at = Number(searchParams.get("activeTodayIntervalms"));
        if (!isNaN(at)) setActiveTodayIntervalms(Math.max(10, Math.round(at / 1000)));

        const an = Number(searchParams.get("activeNowIntervalms"));
        if (!isNaN(an)) setActiveNowIntervalms(Math.max(5, Math.round(an / 1000)));

    }, [searchParams]);

    /* ---------------- SAVE HANDLER ---------------- */
    const handleSave = () => {
        const params = new URLSearchParams();

        if (rotation !== 60_000) params.set("rotation", String(rotation));
        if (stripSpeed !== 100) params.set("stripspeed", String(stripSpeed));

        const cardDurationMs = Math.max(cardDurationSec, 2) * 1000;
        if (cardDurationMs !== 4000) params.set("cardduration", String(cardDurationMs));

        const activeTodayMs = Math.max(activeTodayIntervalsec, 10) * 1000;
        if (activeTodayMs !== 60_000) params.set("activeTodayIntervalms", String(activeTodayMs));

        const activeNowMs = Math.max(activeNowIntervalsec, 5) * 1000;
        if (activeNowMs !== 10_000) params.set("activeNowIntervalms", String(activeNowMs));

        if (fullscreen) params.set("fullscreen", "1");

        router.push(`/dashboard/editorial?${params.toString()}`);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 text-gray-900">
            <div className="w-full max-w-lg bg-white rounded-lg shadow p-6 space-y-6">
                <h1 className="text-xl font-bold">Editorial Dashboard Settings</h1>

                {/* ---------------- ROTATION ---------------- */}
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Page Interval
                    </label>
                    <select
                        value={rotation}
                        onChange={(e) => setRotation(Number(e.target.value))}
                        className="w-full border rounded px-3 py-2"
                    >
                        {ROTATION_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* ---------------- STRIP SPEED ---------------- */}
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Latest News Speed
                    </label>
                    <input
                        type="number"
                        value={stripSpeed}
                        step={10}
                        min={0}
                        max={1000}
                        onChange={(e) => setStripSpeed(Number(e.target.value))}
                        className="w-full border rounded px-3 py-2"
                    />
                </div>

                {/* ---------------- CARD DURATION ---------------- */}
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Exclusives Duration (seconds)
                    </label>
                    <input
                        type="number"
                        min={2}
                        max={120}
                        value={cardDurationSec}
                        onChange={(e) =>
                            setCardDurationSec(Math.max(2, Number(e.target.value)))
                        }
                        className="w-full border rounded px-3 py-2"
                    />
                </div>

                {/* ---------------- Active Today Interval ---------------- */}

                <div>
                    <label className="block text-sm font-medium mb-1">
                        Active Today Refresh Interval <span className="text-xs">(Recommended 60 seconds)</span>
                    </label>
                    <input
                        type="number"
                        min={10}
                        max={120}
                        step={10}
                        value={activeTodayIntervalsec}
                        onChange={(e) =>
                            setActiveTodayIntervalms(Math.max(10, Number(e.target.value)))
                        }
                        className="w-full border rounded px-3 py-2"
                    />
                </div>

                {/* ---------------- Active Now Interval ---------------- */}

                <div>
                    <label className="block text-sm font-medium mb-1">
                        Active Now Refresh Interval <span className="text-xs">(Recommended 10 seconds)</span>
                    </label>
                    <input
                        type="number"
                        min={5}
                        max={120}
                        step={5}
                        value={activeNowIntervalsec}
                        onChange={(e) =>
                            setActiveNowIntervalms(Math.max(5, Number(e.target.value)))
                        }
                        className="w-full border rounded px-3 py-2"
                    />
                </div>

                {/* ---------------- FULLSCREEN ---------------- */}
                <div className="flex items-center gap-2">
                    <input
                        id="fullscreen"
                        type="checkbox"
                        checked={fullscreen}
                        onChange={(e) => setFullscreen(e.target.checked)}
                        className="h-5 w-5 accent-black"
                    />
                    <label htmlFor="fullscreen" className="text-sm">
                        Auto fullscreen
                    </label>
                </div>

                {/* ---------------- ACTIONS ---------------- */}
                <div className="flex justify-end gap-3">
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 rounded border"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-2 py-2 rounded bg-black text-white"
                    >
                        Save & Open Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
