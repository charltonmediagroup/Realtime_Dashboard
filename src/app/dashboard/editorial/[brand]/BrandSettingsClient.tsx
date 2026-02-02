"use client";

import { useEffect, useState } from "react";
import Stepper from "@/src/components/Stepper";

interface EditorialBrandSettingsClientProps {
  brand: string;
  siteConfig: any;
  currentParams: Record<string, string>;
  onClose: () => void;
  onSave?: (updatedParams: Record<string, string>) => void;
}

const DEFAULTS = {
  stripspeed: 100,
  cardduration: 4000,
  activeNowIntervalms: 10_000,
  activeTodayIntervalms: 60_000,
  videoDisplayTime: 30,
};

export default function EditorialBrandSettingsClient({
  brand,
  siteConfig,
  currentParams,
  onClose,
  onSave,
}: EditorialBrandSettingsClientProps) {
  /* ---------------- FORM STATE ---------------- */
  const [stripSpeed, setStripSpeed] = useState<number>(DEFAULTS.stripspeed);
  const [cardDurationSec, setCardDurationSec] = useState<number>(DEFAULTS.cardduration / 1000);
  const [activeNowIntervalsec, setActiveNowIntervalms] = useState<number>(DEFAULTS.activeNowIntervalms / 1000);
  const [activeTodayIntervalsec, setActiveTodayIntervalms] = useState<number>(DEFAULTS.activeTodayIntervalms / 1000);
  const [videoDisplayTime, setVideoDisplayTime] = useState<number>(DEFAULTS.videoDisplayTime);

  /* ---------------- INITIALIZE FROM CURRENT PARAMS ---------------- */
  useEffect(() => {
    if (!currentParams) return;

    setStripSpeed(Number(currentParams.stripspeed) || DEFAULTS.stripspeed);
    setCardDurationSec((Number(currentParams.cardduration) || DEFAULTS.cardduration) / 1000);
    setActiveNowIntervalms((Number(currentParams.activeNowIntervalms) || DEFAULTS.activeNowIntervalms) / 1000);
    setActiveTodayIntervalms((Number(currentParams.activeTodayIntervalms) || DEFAULTS.activeTodayIntervalms) / 1000);
    setVideoDisplayTime(Number(currentParams.videoDisplayTime) || DEFAULTS.videoDisplayTime);
  }, [currentParams]);

  /* ---------------- SAVE ---------------- */
  const handleSave = () => {
    const params: Record<string, string> = {};

    if (stripSpeed !== DEFAULTS.stripspeed) params.stripspeed = String(stripSpeed);
    const cardMs = Math.max(cardDurationSec, 2) * 1000;
    if (cardMs !== DEFAULTS.cardduration) params.cardduration = String(cardMs);

    const activeTodayMs = Math.max(activeTodayIntervalsec, 10) * 1000;
    if (activeTodayMs !== DEFAULTS.activeTodayIntervalms) params.activeTodayIntervalms = String(activeTodayMs);

    const activeNowMs = Math.max(activeNowIntervalsec, 5) * 1000;
    if (activeNowMs !== DEFAULTS.activeNowIntervalms) params.activeNowIntervalms = String(activeNowMs);

    if (videoDisplayTime !== DEFAULTS.videoDisplayTime) params.videoDisplayTime = String(videoDisplayTime);

    onSave?.(params);
    onClose();
  };

  const handleRestoreDefaults = () => {
    setStripSpeed(DEFAULTS.stripspeed);
    setCardDurationSec(DEFAULTS.cardduration / 1000);
    setActiveNowIntervalms(DEFAULTS.activeNowIntervalms / 1000);
    setActiveTodayIntervalms(DEFAULTS.activeTodayIntervalms / 1000);
    setVideoDisplayTime(DEFAULTS.videoDisplayTime);
  };

  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 text-gray-900">
      <div className="w-full max-w-lg bg-white rounded-lg shadow p-6 space-y-6">
        <h1 className="text-xl font-bold">Editorial Brand Dashboard Settings</h1>

        <Stepper label="Exclusives Duration" value={cardDurationSec} min={2} max={120} step={1} suffix="sec" onChange={setCardDurationSec} />
        <Stepper label="Latest News Speed" value={stripSpeed} min={10} max={1000} step={10} onChange={setStripSpeed} />
        <Stepper label="Active Today Refresh Interval" value={activeTodayIntervalsec} min={10} max={120} step={10} suffix="sec" onChange={setActiveTodayIntervalms} />
        <Stepper label="Active Now Refresh Interval" value={activeNowIntervalsec} min={5} max={120} step={5} suffix="sec" onChange={setActiveNowIntervalms} />
        <Stepper label="Video Duration" value={videoDisplayTime} min={5} max={60} step={5} suffix="sec" onChange={setVideoDisplayTime} />

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded border">Cancel</button>
          <button onClick={handleRestoreDefaults} className="px-4 py-2 rounded border bg-gray-200 hover:bg-gray-300">Restore Defaults</button>
          <button onClick={handleSave} className="px-2 py-2 rounded bg-black text-white">Save & Close</button>
        </div>
      </div>
    </div>
  );
}
