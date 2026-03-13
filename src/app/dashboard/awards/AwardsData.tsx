"use client";

import { useEffect, useState } from "react";
import AwardsGridClient from "./AwardsGridClient";
import { Award } from "@/lib/GetAwards";

export default function AwardsData() {
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const params = new URLSearchParams(window.location.search);
        const cacheParam = params.get("cache") === "false" ? "?cache=false" : "";
        const res = await fetch(`/api/awards${cacheParam}`);
        const data: Award[] = await res.json();
        setAwards(data);
      } catch (err) {
        console.error("Failed to fetch awards:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading)
    return <div className="flex justify-center items-center h-screen text-xl">Loading Awards...</div>;

  return <AwardsGridClient awards={awards} />;
}
