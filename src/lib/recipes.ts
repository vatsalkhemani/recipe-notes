import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { getDb, getStorageInstance } from "./firebase";
import { E2E_MODE } from "./e2e-mode";
import type { Recipe, RecipeDraft } from "./types";

export interface UploadResult {
  url: string;
  path: string;
}

// ---------------------------------------------------------------------------
// E2E / preview backend: keeps everything in localStorage so the UI is fully
// usable without Firebase credentials. Audio + photos become data URLs.
// ---------------------------------------------------------------------------

const e2eKey = (uid: string) => `recipe-notes:e2e:${uid}`;

function e2eRead(uid: string): Recipe[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(e2eKey(uid)) || "[]");
  } catch {
    return [];
  }
}

function e2eWrite(uid: string, recipes: Recipe[]) {
  localStorage.setItem(e2eKey(uid), JSON.stringify(recipes));
  window.dispatchEvent(new CustomEvent("e2e-recipes-changed", { detail: uid }));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const recipesCol = (uid: string) =>
  collection(getDb(), "users", uid, "recipes");

export function subscribeRecipes(
  uid: string,
  cb: (recipes: Recipe[]) => void
): () => void {
  if (E2E_MODE) {
    const emit = () =>
      cb([...e2eRead(uid)].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)));
    emit();
    const handler = () => emit();
    window.addEventListener("e2e-recipes-changed", handler);
    return () => window.removeEventListener("e2e-recipes-changed", handler);
  }

  const q = query(recipesCol(uid), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const recipes = snap.docs.map((d) => {
      const data = d.data();
      const toMs = (t: unknown) =>
        t instanceof Timestamp ? t.toMillis() : null;
      return {
        id: d.id,
        ...data,
        createdAt: toMs(data.createdAt),
        updatedAt: toMs(data.updatedAt),
      } as Recipe;
    });
    cb(recipes);
  });
}

export async function createRecipe(
  uid: string,
  draft: RecipeDraft
): Promise<string> {
  if (E2E_MODE) {
    const id = crypto.randomUUID();
    const now = Date.now();
    const recipes = e2eRead(uid);
    recipes.push({ id, ...draft, createdAt: now, updatedAt: now });
    e2eWrite(uid, recipes);
    return id;
  }

  const docRef = await addDoc(recipesCol(uid), {
    ...draft,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateRecipe(
  uid: string,
  id: string,
  draft: RecipeDraft
): Promise<void> {
  if (E2E_MODE) {
    const recipes = e2eRead(uid).map((r) =>
      r.id === id ? { ...r, ...draft, updatedAt: Date.now() } : r
    );
    e2eWrite(uid, recipes);
    return;
  }

  await updateDoc(doc(getDb(), "users", uid, "recipes", id), {
    ...draft,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteRecipe(uid: string, recipe: Recipe): Promise<void> {
  if (E2E_MODE) {
    e2eWrite(
      uid,
      e2eRead(uid).filter((r) => r.id !== recipe.id)
    );
    return;
  }

  // Best-effort cleanup of stored media before removing the doc.
  await Promise.allSettled(
    [recipe.audioPath, recipe.coverPhotoPath]
      .filter((p): p is string => !!p)
      .map((p) => deleteObject(ref(getStorageInstance(), p)))
  );
  await deleteDoc(doc(getDb(), "users", uid, "recipes", recipe.id));
}

export async function uploadAudio(
  uid: string,
  blob: Blob,
  ext: string
): Promise<UploadResult> {
  if (E2E_MODE) {
    return { url: await blobToDataUrl(blob), path: `e2e/${crypto.randomUUID()}` };
  }
  const path = `recipes/${uid}/audio/${crypto.randomUUID()}.${ext}`;
  const storageRef = ref(getStorageInstance(), path);
  await uploadBytes(storageRef, blob, { contentType: blob.type });
  return { url: await getDownloadURL(storageRef), path };
}

export async function uploadCover(
  uid: string,
  file: File
): Promise<UploadResult> {
  if (E2E_MODE) {
    return { url: await blobToDataUrl(file), path: `e2e/${crypto.randomUUID()}` };
  }
  const ext = file.name.split(".").pop() || "jpg";
  const path = `recipes/${uid}/covers/${crypto.randomUUID()}.${ext}`;
  const storageRef = ref(getStorageInstance(), path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return { url: await getDownloadURL(storageRef), path };
}
