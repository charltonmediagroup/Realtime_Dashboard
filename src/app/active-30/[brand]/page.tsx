// app/active-today/[brand]/page.tsx
import React from "react";
import OdometerDaily from "@/src/components/OdometerDaily";

interface SearchParams {
  bold?: string;
  color?: string;
  backgroundColor?: string;
}

interface Props {
  params: Promise<{ brand: string }>;        // 🔴 Promise
  searchParams: Promise<SearchParams>;       // 🔴 Promise (same as working file)
}

const DailyActiveBrand = async ({ params, searchParams }: Props) => {
  // ✅ unwrap BOTH, same pattern as your working page
  const { brand } = await params;
  const sp = await searchParams;

  const bold = sp.bold === "true";
  const color = sp.color || "#010101";
  const backgroundColor = sp.backgroundColor || "#ffffff";

  return (
    <div
      style={{ backgroundColor }}
      className="bg-transparent min-h-screen flex items-center justify-center"
    >
      <OdometerDaily
        fetchUrl={`/api/active-30-days/${brand}`}
        field="activeLast30Days"
        bold={bold}
        color={color}
        backgroundColor={backgroundColor}
      />
    </div>
  );
};

export default DailyActiveBrand;
