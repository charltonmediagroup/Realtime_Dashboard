"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import BizzconGridClient, { BizzconEvent } from "../BizzconGridClient";
import LoadingPage from "@/src/components/LoadingPage";

export default function BizzconBrandPage() {
  const { brand } = useParams<{ brand: string }>();
  const [events, setEvents] = useState<BizzconEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/bizzcon/${brand}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch events");
        return res.json();
      })
      .then(setEvents)
      .catch((err) => setError(err.message));
  }, [brand]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-800 text-red-400">
        {error}
      </div>
    );
  }

  if (!events) return <LoadingPage loadingText={`Loading ${brand} events...`} />;

  return <BizzconGridClient events={events} />;
}
