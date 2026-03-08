"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { SpreadsheetEditor } from "@/components/SpreadsheetEditor";

export default function DocPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const docId = params.id as string;

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
      </div>
    );
  }

  return <SpreadsheetEditor docId={docId} />;
}
