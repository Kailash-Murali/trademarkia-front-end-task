import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  SpreadsheetDocument,
  CellData,
  DEFAULT_COL_COUNT,
  DEFAULT_ROW_COUNT,
  colIndexToLetter,
} from "./types";

const DOCS_COLLECTION = "documents";
const PRESENCE_SUBCOLLECTION = "presence";

function defaultColumnOrder(count: number): string[] {
  return Array.from({ length: count }, (_, i) => colIndexToLetter(i));
}

export async function createDocument(
  title: string,
  ownerId: string,
  ownerName: string
): Promise<string> {
  const docRef = doc(collection(db, DOCS_COLLECTION));
  const now = Date.now();
  const data: Omit<SpreadsheetDocument, "id"> = {
    title,
    ownerId,
    ownerName,
    createdAt: now,
    updatedAt: now,
    grid: {},
    columnOrder: defaultColumnOrder(DEFAULT_COL_COUNT),
    colWidths: {},
    rowHeights: {},
    rowCount: DEFAULT_ROW_COUNT,
    colCount: DEFAULT_COL_COUNT,
  };
  await setDoc(docRef, data);
  return docRef.id;
}

export async function deleteDocument(docId: string): Promise<void> {
  // Delete presence subcollection first
  const presenceSnap = await getDocs(
    collection(db, DOCS_COLLECTION, docId, PRESENCE_SUBCOLLECTION)
  );
  const deletePromises = presenceSnap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletePromises);

  await deleteDoc(doc(db, DOCS_COLLECTION, docId));
}

export async function updateDocumentTitle(
  docId: string,
  title: string
): Promise<void> {
  await updateDoc(doc(db, DOCS_COLLECTION, docId), {
    title,
    updatedAt: Date.now(),
  });
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  );
}

export async function updateCell(
  docId: string,
  cellKey: string,
  cellData: CellData
): Promise<void> {
  const clean = stripUndefined({
    value: cellData.value,
    formula: cellData.formula,
    format: cellData.format
      ? stripUndefined(cellData.format as unknown as Record<string, unknown>)
      : undefined,
  });
  await updateDoc(doc(db, DOCS_COLLECTION, docId), {
    [`grid.${cellKey}`]: clean,
    updatedAt: Date.now(),
  });
}

export async function deleteCell(
  docId: string,
  cellKey: string
): Promise<void> {
  // Use dynamic import to get deleteField
  const { deleteField } = await import("firebase/firestore");
  await updateDoc(doc(db, DOCS_COLLECTION, docId), {
    [`grid.${cellKey}`]: deleteField(),
    updatedAt: Date.now(),
  });
}

export async function updateColumnOrder(
  docId: string,
  columnOrder: string[]
): Promise<void> {
  await updateDoc(doc(db, DOCS_COLLECTION, docId), {
    columnOrder,
    updatedAt: Date.now(),
  });
}

export async function updateColWidth(
  docId: string,
  col: string,
  width: number
): Promise<void> {
  await updateDoc(doc(db, DOCS_COLLECTION, docId), {
    [`colWidths.${col}`]: width,
    updatedAt: Date.now(),
  });
}

export async function updateRowHeight(
  docId: string,
  row: number,
  height: number
): Promise<void> {
  await updateDoc(doc(db, DOCS_COLLECTION, docId), {
    [`rowHeights.${row}`]: height,
    updatedAt: Date.now(),
  });
}

export function subscribeToDocument(
  docId: string,
  callback: (doc: SpreadsheetDocument | null, pending: boolean) => void
): () => void {
  return onSnapshot(
    doc(db, DOCS_COLLECTION, docId),
    { includeMetadataChanges: true },
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null, false);
        return;
      }
      const data = snapshot.data() as Omit<SpreadsheetDocument, "id">;
      const hasPendingWrites = snapshot.metadata.hasPendingWrites;
      callback({ ...data, id: snapshot.id }, hasPendingWrites);
    }
  );
}

export function subscribeToDocuments(
  callback: (docs: SpreadsheetDocument[]) => void
): () => void {
  const q = query(
    collection(db, DOCS_COLLECTION),
    orderBy("updatedAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map((d) => ({
      ...(d.data() as Omit<SpreadsheetDocument, "id">),
      id: d.id,
    }));
    callback(docs);
  });
}

// Presence
export async function setPresence(
  docId: string,
  userId: string,
  displayName: string,
  color: string,
  activeCell: string | null
): Promise<void> {
  await setDoc(
    doc(db, DOCS_COLLECTION, docId, PRESENCE_SUBCOLLECTION, userId),
    {
      userId,
      displayName,
      color,
      activeCell,
      lastSeen: Date.now(),
    }
  );
}

export async function removePresence(
  docId: string,
  userId: string
): Promise<void> {
  await deleteDoc(
    doc(db, DOCS_COLLECTION, docId, PRESENCE_SUBCOLLECTION, userId)
  );
}

export function subscribeToPresence(
  docId: string,
  callback: (
    presence: Array<{
      userId: string;
      displayName: string;
      color: string;
      activeCell: string | null;
      lastSeen: number;
    }>
  ) => void
): () => void {
  return onSnapshot(
    collection(db, DOCS_COLLECTION, docId, PRESENCE_SUBCOLLECTION),
    (snapshot) => {
      const now = Date.now();
      const STALE_MS = 30_000; // 30 seconds
      const active = snapshot.docs
        .map((d) => d.data() as {
          userId: string;
          displayName: string;
          color: string;
          activeCell: string | null;
          lastSeen: number;
        })
        .filter((p) => now - p.lastSeen < STALE_MS);
      callback(active);
    }
  );
}
