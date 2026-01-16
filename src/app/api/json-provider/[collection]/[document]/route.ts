import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string; document: string }> }
) {
  try {
    // Unwrap the params
    const { collection, document } = await params;

    if (!collection || !document) {
      return NextResponse.json(
        { error: "Missing collection or document" },
        { status: 400 }
      );
    }

    const col = await getCollection(collection);
    const doc = await col.findOne({ uid: document });

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(doc.data ?? doc);
  } catch (err) {
    console.error("Failed to fetch JSON document:", err);
    return NextResponse.json(
      { error: "Internal Server Error", message: (err as Error).message },
      { status: 500 }
    );
  }
}
