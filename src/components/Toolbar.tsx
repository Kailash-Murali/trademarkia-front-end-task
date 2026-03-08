"use client";

import { CellFormat } from "@/lib/types";
import { Bold, Italic, Download, ChevronDown, HelpCircle } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
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
  const [showHelp, setShowHelp] = useState(false);
  const colorRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);
  const helpPopupRef = useRef<HTMLDivElement>(null);

  const adjustHelpPosition = useCallback(() => {
    const popup = helpPopupRef.current;
    if (!popup) return;
    popup.style.left = '0px';
    const rect = popup.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      popup.style.left = `${window.innerWidth - rect.right - 8}px`;
    }
  }, []);

  useEffect(() => {
    if (showHelp) adjustHelpPosition();
  }, [showHelp, adjustHelpPosition]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setShowColors(false);
      }
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExport(false);
      }
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setShowHelp(false);
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
          <div className="absolute left-0 top-full z-30 mt-1 w-[120px] rounded-md border border-gray-200 bg-white p-2 shadow-lg">
            <div className="grid grid-cols-4 gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    onFormat("color", c);
                    setShowColors(false);
                  }}
                  className={cn(
                    "h-6 w-6 rounded-sm border transition hover:scale-110",
                    activeFormat?.color === c ? "border-gray-800 ring-1 ring-gray-800" : "border-gray-200"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
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

      <div className="mx-1 h-4 w-px bg-gray-200" />

      {/* Help */}
      <div ref={helpRef} className="relative">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="flex items-center gap-1 rounded p-1.5 text-gray-500 transition hover:bg-gray-100"
          title="Help"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span className="text-xs">Help</span>
        </button>
        {showHelp && (
          <div ref={helpPopupRef} className="absolute top-full z-30 mt-1 w-80 rounded-md border border-gray-200 bg-white p-4 shadow-lg">
            <h3 className="mb-2 text-sm font-semibold text-gray-900">Formula Reference</h3>
            <p className="mb-3 text-xs text-gray-500">
              All formulas start with <code className="rounded bg-gray-100 px-1">=</code>
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-1.5 text-left font-medium text-gray-700">Formula</th>
                  <th className="pb-1.5 text-left font-medium text-gray-700">Example</th>
                  <th className="pb-1.5 text-left font-medium text-gray-700">Description</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-50">
                  <td className="py-1.5 font-mono">+  -  *  /</td>
                  <td className="py-1.5 font-mono">=A1+B1*2</td>
                  <td className="py-1.5">Arithmetic</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-1.5 font-mono">( )</td>
                  <td className="py-1.5 font-mono">=(A1+A2)/2</td>
                  <td className="py-1.5">Grouping</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-1.5 font-mono">Cell ref</td>
                  <td className="py-1.5 font-mono">=A1</td>
                  <td className="py-1.5">Reference another cell</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-1.5 font-mono">SUM(range)</td>
                  <td className="py-1.5 font-mono">=SUM(A1:A10)</td>
                  <td className="py-1.5">Sum a range of cells</td>
                </tr>
                <tr>
                  <td className="py-1.5 font-mono">SUM(list)</td>
                  <td className="py-1.5 font-mono">=SUM(A1,B1,5)</td>
                  <td className="py-1.5">Sum individual values</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-3 border-t border-gray-100 pt-2">
              <p className="text-[11px] text-gray-400">
                Errors: <code className="rounded bg-gray-100 px-1">#ERROR!</code> syntax error ·{" "}
                <code className="rounded bg-gray-100 px-1">#VALUE!</code> invalid number ·{" "}
                <code className="rounded bg-gray-100 px-1">#DEPTH!</code> circular reference
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
