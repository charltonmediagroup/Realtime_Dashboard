import BrandDashboard from "@/src/components/BrandDashboard";

interface BrandPageProps {
  params: Promise<{ brand: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BrandPage({ params, searchParams }: BrandPageProps) {
  // ✅ unwrap params
  const { brand } = await params;

  // ✅ unwrap searchParams safely
  const sp = (await searchParams) ?? {};

  const speed = Number(sp.speed ?? 100);
  const themeColor = sp["theme-color"] === "true" || sp["theme-color"] === "1";

  const baseUrl =
    process.env.JSON_PROVIDER_URL || process.env.NEXT_PUBLIC_BASE_URL;

  if (!baseUrl) {
    throw new Error("JSON_PROVIDER_URL or NEXT_PUBLIC_BASE_URL must be set");
  }

  const apiUrl = `${baseUrl}/api/json-provider/dashboard-config/brand-all-properties?filter[editorial]=true`;
  const res = await fetch(apiUrl, { cache: "no-store" });
  const config = await res.json();

  const siteConfig = config[brand] || config["sbr"];

  return (
    <BrandDashboard
      brand={brand}
      siteConfig={siteConfig}
      speed={speed}
      themeColor={themeColor}
    />
  );
}
