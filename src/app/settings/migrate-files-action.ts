'use server';

/**
 * One-time move of files still hosted on Firebase Storage into Supabase Storage.
 * Runs as the signed-in owner (their token), so no secret keys are needed:
 * it downloads each file server-side (no browser CORS limits), uploads it to
 * the "files" bucket, and rewrites the link in the document.
 * Each call handles a few files so it stays within serverless time limits;
 * the settings page calls it repeatedly until nothing is left.
 */
import { supabaseForToken, userForToken } from "@/lib/supabase";
import { collection, dbFor, doc, getDoc, getDocs, updateDoc, type Db } from "@/lib/db";
import { safeSegment } from "@/lib/storage";

const FIREBASE_HOST = "firebasestorage.googleapis.com";

type Target = { coll: string; id: string; field: string; index?: number; url: string; path?: string };

const targetKey = (t: Target) => `${t.coll}/${t.id}/${t.field}${t.index === undefined ? "" : `[${t.index}]`}`;

function isFirebaseUrl(v: unknown): v is string {
    return typeof v === "string" && v.includes(FIREBASE_HOST);
}

/** Storage path inside the old bucket, taken from a Firebase download URL. */
function pathFromUrl(url: string): string {
    const encoded = url.split("/o/")[1]?.split("?")[0] ?? "";
    return decodeURIComponent(encoded);
}

async function findTargets(db: Db): Promise<Target[]> {
    const targets: Target[] = [];
    for (const coll of ["files", "legal_files"]) {
        for (const d of (await getDocs(collection(db, coll))).docs) {
            const data = d.data();
            if (isFirebaseUrl(data.url)) targets.push({ coll, id: d.id, field: "url", url: data.url, path: data.path });
        }
    }
    for (const d of (await getDocs(collection(db, "blog_posts"))).docs) {
        const data = d.data();
        if (isFirebaseUrl(data.imageUrl)) targets.push({ coll: "blog_posts", id: d.id, field: "imageUrl", url: data.imageUrl });
    }
    for (const d of (await getDocs(collection(db, "support_tickets"))).docs) {
        const urls: unknown[] = Array.isArray(d.data().fileUrls) ? d.data().fileUrls : [];
        urls.forEach((u, index) => {
            if (isFirebaseUrl(u)) targets.push({ coll: "support_tickets", id: d.id, field: "fileUrls", index, url: u });
        });
    }
    return targets;
}

/**
 * @param skip keys of files that already failed in this run, so one missing file
 *             can't block the rest.
 */
export async function migrateFirebaseFiles(
    accessToken: string,
    skip: string[] = [],
    max = 5,
): Promise<{ ok: boolean; message?: string; moved: number; remaining: number; failed: { key: string; error: string }[] }> {
    if (!(await userForToken(accessToken))) {
        return { ok: false, message: "لازم تكون مسجّل دخول.", moved: 0, remaining: 0, failed: [] };
    }
    const client = supabaseForToken(accessToken);
    const db = dbFor(client);

    const targets = (await findTargets(db)).filter((t) => !skip.includes(targetKey(t)));
    const batch = targets.slice(0, max);
    const failed: { key: string; error: string }[] = [];
    let moved = 0;

    for (const t of batch) {
        try {
            const res = await fetch(t.url);
            if (!res.ok) throw new Error(`download ${res.status}`);
            const blob = await res.blob();

            const oldPath = (t.path || pathFromUrl(t.url)).replace(/^\/+/, "");
            const key = oldPath.split("/").filter(Boolean).map(safeSegment).join("/");
            const { error } = await client.storage
                .from("files")
                .upload(key, blob, { upsert: true, contentType: res.headers.get("content-type") ?? undefined });
            if (error) throw new Error(`upload: ${error.message}`);
            const newUrl = client.storage.from("files").getPublicUrl(key).data.publicUrl;

            const ref = doc(db, t.coll, t.id);
            if (t.index === undefined) {
                await updateDoc(ref, { [t.field]: newUrl });
            } else {
                // Re-read the array so parallel edits aren't lost, then swap this entry.
                const current = (await getDoc(ref)).data()?.[t.field];
                const arr = Array.isArray(current) ? [...current] : [];
                arr[t.index] = newUrl;
                await updateDoc(ref, { [t.field]: arr });
            }
            moved++;
        } catch (e: any) {
            console.error("migrate file failed", t.coll, t.id, e);
            failed.push({ key: targetKey(t), error: String(e?.message ?? e) });
        }
    }

    return { ok: true, moved, remaining: targets.length - moved - failed.length, failed };
}
