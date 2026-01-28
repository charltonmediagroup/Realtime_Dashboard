// src/app/dashboard/editorial/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const BrandDashboard = dynamic(
  () => import("@/src/components/BrandDashboard"),
  { ssr: false }
);

interface BrandEntry {
  brand: string;
  siteConfig: any;
}

export default function EditorialPage() {
  const [brands, setBrands] = useState<BrandEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const ROTATION_INTERVAL_MS = 60_000;

  const rotationTimer = useRef<NodeJS.Timeout | null>(null);
  const isVisible = useRef(true);

  /* ---------------- FETCH CONFIG ONCE ---------------- */
  useEffect(() => {
    let cancelled = false;

    const fetchBrands = async () => {
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL ||
          process.env.JSON_PROVIDER_URL;

        if (!baseUrl) return;

        const res = await fetch(
          `${baseUrl}/api/json-provider/dashboard-config/brand-all-properties?filter[editorial]=true`,
          { cache: "force-cache" } // 👈 reuse response
        );

        const config = await res.json();
        if (cancelled) return;

        const brandList = Object.entries(config).map(
          ([brand, siteConfig]) => ({
            brand,
            siteConfig,
          })
        );

        setBrands(brandList);
      } catch (err) {
        console.error("Failed to load brands:", err);
      }
    };

    fetchBrands();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------- ROTATION LOGIC ---------------- */
  useEffect(() => {
    if (!brands.length) return;

    const startRotation = () => {
      if (rotationTimer.current) return;

      rotationTimer.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % brands.length);
      }, ROTATION_INTERVAL_MS);
    };

    const stopRotation = () => {
      if (rotationTimer.current) {
        clearInterval(rotationTimer.current);
        rotationTimer.current = null;
      }
    };

    // Start initially
    startRotation();

    // Pause when tab / TV app not visible
    const handleVisibility = () => {
      isVisible.current = !document.hidden;

      if (document.hidden) {
        stopRotation();
      } else {
        startRotation();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopRotation();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [brands]);

  /* ---------------- LOADING STATE ---------------- */
  if (!brands.length) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading…
      </div>
    );
  }

  const currentBrand = brands[currentIndex];

  return (
    <div className="h-screen w-screen overflow-hidden">
      <BrandDashboard
        key={currentBrand.brand} // 👈 forces clean unmount
        brand={currentBrand.brand}
        siteConfig={currentBrand.siteConfig}
        speed={100}
        themeColor={true}
      />
    </div>
  );
}
