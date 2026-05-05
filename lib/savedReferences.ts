import "server-only";
import { getCollection } from "@/lib/db";
import {
  normalizeReference,
  type PublishParent,
  type SavedReference,
} from "@/lib/savedReferencesShared";

export {
  DEFAULT_PRIMARY_COLOR,
  PUBLISH_PARENTS,
  PUBLISH_PARENT_LABEL,
  TEMPLATES,
  extractSpreadsheetId,
  isHexColor,
  makeUniqueId,
  slugify,
} from "@/lib/savedReferencesShared";

export type {
  PublishParent,
  ReferenceColumn,
  ReferenceTemplate,
  SavedReference,
} from "@/lib/savedReferencesShared";

const COLLECTION = "dashboard-config";
const DOC_UID = "saved-references";

export async function listSavedReferences(): Promise<SavedReference[]> {
  const col = await getCollection<{ uid: string; data: unknown }>(COLLECTION);
  const doc = await col.findOne({ uid: DOC_UID });
  const arr = Array.isArray(doc?.data) ? (doc!.data as unknown[]) : [];
  return arr.map((x) => normalizeReference(x as Partial<SavedReference>));
}

export async function getSavedReference(id: string): Promise<SavedReference | null> {
  const all = await listSavedReferences();
  return all.find((r) => r.id === id) ?? null;
}

export async function findPublishedReference(
  parent: PublishParent,
  slug: string,
): Promise<SavedReference | null> {
  if (!slug) return null;
  const all = await listSavedReferences();
  return (
    all.find(
      (r) =>
        r.published &&
        r.publishParent === parent &&
        r.publishSlug === slug,
    ) ?? null
  );
}

export async function writeSavedReferences(list: SavedReference[]): Promise<void> {
  const col = await getCollection(COLLECTION);
  await col.updateOne(
    { uid: DOC_UID },
    { $set: { data: list.map(normalizeReference) } },
    { upsert: true },
  );
}
