// app/active-today/page.tsx
import React from "react";
import OdometerDaily from "@/src/components/OdometerDaily";

interface SearchParams {
  bold?: string;
  color?: string;
  backgroundColor?: string;
}

interface Props {
  searchParams: Promise<SearchParams>; // it's a Promise now
}

const ActiveLast365Days = async ({ searchParams }: Props) => {
  const params = await searchParams; // unwrap the Promise

  const bold = params.bold === "true";
  const color = params.color || "#010101";
  const backgroundColor = params.backgroundColor || "#ffffff";

  return (
    <div
        style={{ backgroundColor }}
        className="bg-transparent min-h-screen flex items-center justify-center">
      <OdometerDaily
        fetchUrl="/api/active-365-days"
        field="activeLast365Days"
        bold={bold}
        color={color}
        backgroundColor={backgroundColor}
      />
    </div>
  );
};

export default ActiveLast365Days;