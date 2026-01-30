// app/active-today/page.tsx
import React from "react";
import OdometerLast from "@/src/components/OdometerDaily";

interface SearchParams {
  fontSize?: string;
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
    ? Number(params.intervalms): 600000;

  return (
    <div
        style={{ backgroundColor }}
        className="bg-transparent min-h-screen flex items-center justify-center">
      <OdometerLast
        fetchUrl="/api/active-today"
        bold={bold}
        color={color}
        backgroundColor={backgroundColor}
      />
    </div>
  );
};

export default RealtimeActive;