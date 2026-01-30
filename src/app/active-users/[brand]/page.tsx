// app/active-users/[brand]/page.tsx
import React from "react";
import OdometerLast from "@/src/components/OdometerLast";

interface SearchParams {
  fontSize?: string;
  field?: string;
  bold?: string;
  color?: string;
  backgroundColor?: string;
  intervalms?: string;
}

interface Props {
  params: Promise<{ brand: string }>;        // 🔴 Promise
  searchParams: Promise<SearchParams>;       // 🔴 Promise (same as working file)
}

const RealtimeActiveBrand = async ({ params, searchParams }: Props) => {
  // ✅ unwrap BOTH, same pattern as your working page
  const { brand } = await params;
  const sp = await searchParams;

  const fontSize = sp.fontSize || "3rem";
  const field = "activeUsers";
  const bold = sp.bold === "true";
  const color = sp.color || "#010101";
  const backgroundColor = sp.backgroundColor || "#ffffff";
  const intervalms = sp.intervalms
    ? Number(sp.intervalms)
    : Number(process.env.ACTIVE_USERS_CACHE_MS) || 60000;

  return (
    <div
      style={{ backgroundColor }}
      className="bg-transparent min-h-screen flex items-center justify-center"
    >
      <OdometerLast
        fetchUrl={`/api/active-now/${brand}`}
        field={field}
        bold={bold}
        color={color}
        backgroundColor={backgroundColor}
        intervalms={intervalms}
      />
    </div>
  );
};

export default RealtimeActiveBrand;
