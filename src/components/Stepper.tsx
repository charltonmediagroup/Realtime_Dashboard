"use client";

interface StepperProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (v: number) => void;
    suffix?: string;
}

export default function Stepper({
    label,
    value,
    min,
    max,
    step,
    onChange,
    suffix,
}: StepperProps) {
    const dec = () => onChange(Math.max(min, value - step));
    const inc = () => onChange(Math.min(max, value + step));

    return (
        <div className="flex justify-center">
            <div className="w-sm">
                <label className="block text-sm font-medium mb-1">
                    {label}
                </label>

                <div className="flex items-center justify-between gap-4 rounded px-3 py-2">

                    <div className="text-lg font-semibold tabular-nums w-full text-center bg-gray-100 rounded px-2 py-1">
                        {value}{suffix && <span className="text-sm ml-1">{suffix}</span>}
                    </div>
                    <button
                        type="button"
                        onClick={dec}
                        className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-lg font-bold"
                    >
                        −
                    </button>

                    <button
                        type="button"
                        onClick={inc}
                        className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-lg font-bold"
                    >
                        +
                    </button>
                </div>
            </div>
        </div>
    );
}
