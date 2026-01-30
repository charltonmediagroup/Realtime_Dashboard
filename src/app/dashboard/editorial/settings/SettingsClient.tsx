"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Stepper from "@/src/components/Stepper";

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

// DEFAULTS object
const DEFAULTS = {
    rotation: 60_000,
    stripspeed: 100,
    cardduration: 4000,
    activeNowIntervalms: 10_000,
    activeTodayIntervalms: 60_000,
    videoDisplayTime: 30,
    fullscreen: false,
};

export default function EditorialSettingsClient() {
    const router = useRouter();
    const searchParams = useSearchParams();

    /* ---------------- FORM STATE ---------------- */
    const [rotation, setRotation] = useState<number>(DEFAULTS.rotation);
    const [stripSpeed, setStripSpeed] = useState<number>(DEFAULTS.stripspeed);
    const [cardDurationSec, setCardDurationSec] = useState<number>(DEFAULTS.cardduration / 1000);
    const [activeNowIntervalsec, setActiveNowIntervalms] = useState<number>(DEFAULTS.activeNowIntervalms / 1000);
    const [activeTodayIntervalsec, setActiveTodayIntervalms] = useState<number>(DEFAULTS.activeTodayIntervalms / 1000);
    const [videoDisplayTime, setVideoDisplayTime] = useState<number>(DEFAULTS.videoDisplayTime);
    const [fullscreen, setFullscreen] = useState<boolean>(DEFAULTS.fullscreen);

    /* ---------------- INITIALIZE FROM URL ---------------- */
    useEffect(() => {
        const r = searchParams.get("rotation");
        if (r !== null && !isNaN(Number(r))) setRotation(Number(r));

        const s = searchParams.get("stripspeed");
        if (s !== null && !isNaN(Number(s))) setStripSpeed(Number(s));

        const c = searchParams.get("cardduration");
        if (c !== null && !isNaN(Number(c))) setCardDurationSec(Math.max(2, Math.round(Number(c) / 1000)));

        const f = searchParams.get("fullscreen");
        if (f !== null) setFullscreen(f === "1");

        const at = searchParams.get("activeTodayIntervalms");
        if (at !== null && !isNaN(Number(at))) setActiveTodayIntervalms(Math.max(10, Math.round(Number(at) / 1000)));

        const vdt = searchParams.get("videoDisplayTime");
        if (vdt !== null && !isNaN(Number(vdt))) setVideoDisplayTime(Number(vdt));

        const an = searchParams.get("activeNowIntervalms");
        if (an !== null && !isNaN(Number(an))) setActiveNowIntervalms(Math.max(5, Math.round(Number(an) / 1000)));
    }, [searchParams]);

    /* ---------------- SAVE HANDLER ---------------- */
    const handleSave = () => {
        const params = new URLSearchParams();

        if (rotation !== DEFAULTS.rotation) params.set("rotation", String(rotation));
        if (stripSpeed !== DEFAULTS.stripspeed) params.set("stripspeed", String(stripSpeed));

        const cardDurationMs = Math.max(cardDurationSec, 2) * 1000;
        if (cardDurationMs !== DEFAULTS.cardduration) params.set("cardduration", String(cardDurationMs));

        const activeTodayMs = Math.max(activeTodayIntervalsec, 10) * 1000;
        if (activeTodayMs !== DEFAULTS.activeTodayIntervalms) params.set("activeTodayIntervalms", String(activeTodayMs));

        const activeNowMs = Math.max(activeNowIntervalsec, 5) * 1000;
        if (activeNowMs !== DEFAULTS.activeNowIntervalms) params.set("activeNowIntervalms", String(activeNowMs));

        if (videoDisplayTime !== DEFAULTS.videoDisplayTime) params.set("videoDisplayTime", String(videoDisplayTime));

        if (fullscreen !== DEFAULTS.fullscreen) params.set("fullscreen", "1");

        router.push(`/dashboard/editorial?${params.toString()}`);
    };

    /* ---------------- RESTORE DEFAULTS ---------------- */
    const handleRestoreDefaults = () => {
        setRotation(DEFAULTS.rotation);
        setStripSpeed(DEFAULTS.stripspeed);
        setCardDurationSec(DEFAULTS.cardduration / 1000);
        setActiveTodayIntervalms(DEFAULTS.activeTodayIntervalms / 1000);
        setActiveNowIntervalms(DEFAULTS.activeNowIntervalms / 1000);
        setVideoDisplayTime(DEFAULTS.videoDisplayTime);
        setFullscreen(DEFAULTS.fullscreen);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 text-gray-900">
            <div className="w-full max-w-lg bg-white rounded-lg shadow p-6 space-y-6">
                <h1 className="text-xl font-bold">Editorial Dashboard Settings</h1>

                {/* Page Interval */}
                <div>
                    <label className="block text-sm font-medium mb-1">Page Interval</label>
                    <select value={rotation} onChange={(e) => setRotation(Number(e.target.value))} className="w-full border rounded px-3 py-2">
                        {ROTATION_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                <Stepper
                    label="Exclusives Duration"
                    value={cardDurationSec}
                    min={2}
                    max={120}
                    step={1}
                    suffix="sec"
                    onChange={setCardDurationSec}
                />

                <Stepper
                    label="Latest News Speed"
                    value={stripSpeed}
                    min={10}
                    max={1000}
                    step={10}
                    onChange={setStripSpeed}
                />

                <Stepper
                    label="Active Today Refresh Interval"
                    value={activeTodayIntervalsec}
                    min={10}
                    max={120}
                    step={10}
                    suffix="sec"
                    onChange={setActiveTodayIntervalms}
                />

                <Stepper
                    label="Active Now Refresh Interval"
                    value={activeNowIntervalsec}
                    min={5}
                    max={120}
                    step={5}
                    suffix="sec"
                    onChange={setActiveNowIntervalms}
                />
                <Stepper
                    label="Video Duration"
                    value={videoDisplayTime}
                    min={5}
                    max={60}
                    step={5}
                    suffix="sec"
                    onChange={setVideoDisplayTime}
                />

                {/* Fullscreen */}
                <div className="flex items-center gap-2">
                    <input id="fullscreen" type="checkbox" checked={fullscreen} onChange={(e) => setFullscreen(e.target.checked)} className="h-5 w-5 accent-black" />
                    <label htmlFor="fullscreen" className="text-sm">Auto fullscreen</label>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <button onClick={() => router.back()} className="px-4 py-2 rounded border">Cancel</button>
                    <button onClick={handleRestoreDefaults} className="px-4 py-2 rounded border bg-gray-200 hover:bg-gray-300">Restore Defaults</button>
                    <button onClick={handleSave} className="px-2 py-2 rounded bg-black text-white">Save & Open Dashboard</button>
                </div>
            </div>
        </div>
    );
}
