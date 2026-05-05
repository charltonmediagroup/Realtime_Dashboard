import { redirect } from "next/navigation";

export default async function LegacyJsonEditor({
  params,
}: {
  params: Promise<{ collection: string; document: string }>;
}) {
  const { collection, document } = await params;
  redirect(
    `/admin/docs/${encodeURIComponent(collection)}/${encodeURIComponent(document)}`,
  );
}
