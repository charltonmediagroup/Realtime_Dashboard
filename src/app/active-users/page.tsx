// app/active-users/page.tsx
import React from "react";
import Odometer from "@/src/components/Odometer";

interface SearchParams {
  bold?: string;
  color?: string;
  backgroundColor?: string;
  intervalms?: string;
}

interface Props {
  searchParams: Promise<SearchParams>; // it's a Promise now
}

const RealtimeActive = async ({ searchParams }: Props) => {
  const params = await searchParams; // unwrap the Promise

  const bold = params.bold === "true";
  const color = params.color || "#010101";
  const backgroundColor = params.backgroundColor || "#ffffff";
  const intervalms = params.intervalms
    ? Number(params.intervalms)
    : Number(process.env.ACTIVE_USERS_CACHE_MS) || 60000;

  return (
    <div
        style={{ backgroundColor }}
        className="bg-transparent min-h-screen flex items-center justify-center">
      <Odometer
        fetchUrl="/api/active-now"
        bold={bold}
        color={color}
        backgroundColor={backgroundColor}
        intervalms={intervalms}
      />
    </div>
  );
};

export default RealtimeActive;