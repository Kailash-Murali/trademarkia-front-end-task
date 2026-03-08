"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToDocuments,
  createDocument,
  deleteDocument,
} from "@/lib/firestore";
import { SpreadsheetDocument } from "@/lib/types";
import { Plus, Trash2, FileSpreadsheet, LogOut } from "lucide-react";

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [docs, setDocs] = useState<SpreadsheetDocument[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    return subscribeToDocuments(setDocs);
  }, [user]);

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const id = await createDocument("Untitled Spreadsheet", user.uid, user.displayName);
      router.push(`/doc/${id}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (!confirm("Delete this document?")) return;
    await deleteDocument(docId);
  };

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Sheets Lite</h1>
          <p className="text-sm text-gray-500">
            Welcome, {user.displayName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-1.5 rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            New Sheet
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-8">
        {docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-16 text-gray-400">
            <FileSpreadsheet className="mb-3 h-10 w-10" />
            <p className="text-sm">No documents yet</p>
            <button
              onClick={handleCreate}
              className="mt-3 text-sm font-medium text-black underline"
            >
              Create your first sheet
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {docs.map((d) => (
              <div
                key={d.id}
                onClick={() => router.push(`/doc/${d.id}`)}
                className="flex cursor-pointer items-center justify-between px-4 py-3 transition hover:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {d.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    {d.ownerName} · {formatDate(d.updatedAt)}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDelete(e, d.id)}
                  className="ml-4 rounded p-1 text-gray-300 transition hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return d.toLocaleDateString();
}
