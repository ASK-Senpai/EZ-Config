import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { requireAuth } from "@/server/auth/requireAuth";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const decodedUser = await requireAuth();
    const userId = decodedUser.uid;
    const { id } = await params;

    const db = getFirestore();
    const buildRef = db.collection("builds").doc(id);
    const buildSnap = await buildRef.get();

    if (!buildSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Build not found" },
        { status: 404 }
      );
    }

    const savedBuild = buildSnap.data() as any;
    if (savedBuild.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const components = savedBuild.components || {};
    const typeMap = {
      cpu: components.cpuId,
      gpu: components.gpuId,
      motherboard: components.motherboardId,
      ram: components.ramId,
      storage: components.storageId,
      psu: components.psuId,
    } as const;

    const entries = await Promise.all(
      Object.entries(typeMap).map(async ([type, componentId]) => {
        if (!componentId) return [type, null] as const;

        const doc = await db
          .collection("components")
          .doc(type)
          .collection("items")
          .doc(componentId)
          .get();

        if (!doc.exists) return [type, null] as const;

        return [type, { id: doc.id, ...doc.data() }] as const;
      })
    );

    const hydratedBuild = Object.fromEntries(entries);

    return NextResponse.json(
      {
        success: true,
        build: hydratedBuild,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, message: "Missing or invalid session" },
        { status: 401 }
      );
    }

    console.error("Failed to fetch build:", error);
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}