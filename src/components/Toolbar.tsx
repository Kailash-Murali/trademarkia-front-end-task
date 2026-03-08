"use client";

import { CellFormat } from "@/lib/types";
import { Bold, Italic, Download, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Props {
  activeFormat?: CellFormat;
  onFormat: (key: keyof CellFormat, value: boolean | string) => void;
  onExport: (type: "csv" | "xlsx") => void;
}

const COLORS = [
  "#000000", "#EF4444", "#F97316", "#F59E0B",
  "#22C55E", "#3B82F6", "#8B5CF6", "#EC4899",
];

export function Toolbar({ activeFormat, onFormat, onExport }: Props) {
  const [showColors, setShowColors] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const colorRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setShowColors(false);
      }
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExport(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div className="flex items-center gap-1 border-b border-gray-200 px-3 py-1">
      <button
        onClick={() => onFormat("bold", !activeFormat?.bold)}
        className={cn(
          "rounded p-1.5 text-gray-500 transition hover:bg-gray-100",
          activeFormat?.bold && "bg-gray-200 text-black"
        )}
        title="Bold"
      >
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onFormat("italic", !activeFormat?.italic)}
        className={cn(
          "rounded p-1.5 text-gray-500 transition hover:bg-gray-100",
          activeFormat?.italic && "bg-gray-200 text-black"
        )}
        title="Italic"
      >
        <Italic className="h-3.5 w-3.5" />
      </button>

      {/* Color picker */}
      <div ref={colorRef} className="relative">
        <button
          onClick={() => setShowColors(!showColors)}
          className="flex items-center gap-0.5 rounded p-1.5 text-gray-500 transition hover:bg-gray-100"
          title="Text color"
        >
          <span
            className="h-3.5 w-3.5 rounded-sm border border-gray-300"
            style={{ backgroundColor: activeFormat?.color || "#000000" }}
          />
          <ChevronDown className="h-3 w-3" />
        </button>
        {showColors && (
          <div className="absolute left-0 top-full z-30 mt-1 grid grid-cols-4 gap-1 rounded-md border border-gray-200 bg-white p-2 shadow-lg">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  onFormat("color", c);
                  setShowColors(false);
                }}
                className="h-5 w-5 rounded-sm border border-gray-200 transition hover:scale-110"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mx-1 h-4 w-px bg-gray-200" />

      {/* Export */}
      <div ref={exportRef} className="relative">
        <button
          onClick={() => setShowExport(!showExport)}
          className="flex items-center gap-1 rounded p-1.5 text-gray-500 transition hover:bg-gray-100"
          title="Export"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="text-xs">Export</span>
          <ChevronDown className="h-3 w-3" />
        </button>
        {showExport && (
          <div className="absolute left-0 top-full z-30 mt-1 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
            <button
              onClick={() => {
                onExport("csv");
                setShowExport(false);
              }}
              className="block w-full px-4 py-1.5 text-left text-sm hover:bg-gray-50"
            >
              CSV (.csv)
            </button>
            <button
              onClick={() => {
                onExport("xlsx");
                setShowExport(false);
              }}
              className="block w-full px-4 py-1.5 text-left text-sm hover:bg-gray-50"
            >
              Excel (.xlsx)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
