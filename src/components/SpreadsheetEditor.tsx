"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToDocument,
  updateCell,
  deleteCell,
  setPresence,
  removePresence,
  subscribeToPresence,
  updateDocumentTitle,
  updateColumnOrder,
  updateColWidth,
  updateRowHeight,
} from "@/lib/firestore";
import {
  SpreadsheetDocument,
  CellData,
  PresenceData,
  DEFAULT_COL_WIDTH,
  DEFAULT_ROW_HEIGHT,
  cellId,
  parseCellId,
  CellFormat,
} from "@/lib/types";
import { computeGrid, isFormula } from "@/lib/formula";
import { FormulaBar } from "./FormulaBar";
import { Toolbar } from "./Toolbar";
import { PresenceBar } from "./PresenceBar";
import { SyncIndicator } from "./SyncIndicator";
import { cn } from "@/lib/utils";

interface Props {
  docId: string;
}

export function SpreadsheetEditor({ docId }: Props) {
  const { user } = useAuth();
  const [doc, setDoc] = useState<SpreadsheetDocument | null>(null);
  const [pending, setPending] = useState(false);
  const [presence, setPresenceState] = useState<PresenceData[]>([]);
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleValue, setTitleValue] = useState("");

  // Column drag reorder state
  const [dragCol, setDragCol] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Column resize state
  const [resizingCol, setResizingCol] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);

  // Row resize state
  const [resizingRow, setResizingRow] = useState<number | null>(null);
  const [resizeRowStartY, setResizeRowStartY] = useState(0);
  const [resizeRowStartHeight, setResizeRowStartHeight] = useState(0);

  const gridRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Subscribe to document
  useEffect(() => {
    return subscribeToDocument(docId, (d, p) => {
      setDoc(d);
      setPending(p);
    });
  }, [docId]);

  // Subscribe to presence
  useEffect(() => {
    return subscribeToPresence(docId, setPresenceState);
  }, [docId]);

  // Heartbeat for presence — cleanup only on unmount
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      setPresence(docId, user.uid, user.displayName, user.color, activeCellRef.current);
    }, 10_000);
    setPresence(docId, user.uid, user.displayName, user.color, activeCellRef.current);
    return () => {
      clearInterval(interval);
      removePresence(docId, user.uid);
    };
  }, [docId, user]);

  // Update presence when active cell changes (debounced slightly)
  const activeCellRef = useRef(activeCell);
  activeCellRef.current = activeCell;
  useEffect(() => {
    if (!user) return;
    setPresence(docId, user.uid, user.displayName, user.color, activeCell);
  }, [activeCell, docId, user]);

  // Compute displayed values
  const displayValues = useMemo(() => {
    if (!doc) return {};
    return computeGrid(doc.grid);
  }, [doc]);

  // Presence map: cellId -> presence data (excluding self)
  const presenceMap = useMemo(() => {
    const map: Record<string, PresenceData> = {};
    for (const p of presence) {
      if (p.userId !== user?.uid && p.activeCell) {
        map[p.activeCell] = p;
      }
    }
    return map;
  }, [presence, user]);

  const columns = doc?.columnOrder ?? [];
  const rowCount = doc?.rowCount ?? 100;

  const getColWidth = useCallback(
    (col: string) => doc?.colWidths[col] ?? DEFAULT_COL_WIDTH,
    [doc]
  );
  const getRowHeight = useCallback(
    (row: number) => doc?.rowHeights[row] ?? DEFAULT_ROW_HEIGHT,
    [doc]
  );

  // Commit edit
  const commitEdit = useCallback(() => {
    if (!editingCell || !doc) return;
    const trimmed = editValue.trim();

    if (!trimmed) {
      deleteCell(docId, editingCell);
    } else {
      const existing = doc.grid[editingCell];
      const cellData: CellData = {
        value: isFormula(trimmed) ? "" : trimmed,
        format: existing?.format,
      };
      if (isFormula(trimmed)) {
        cellData.formula = trimmed;
      }
      updateCell(docId, editingCell, cellData);
    }
    setEditingCell(null);
    setEditValue("");
  }, [editingCell, editValue, docId, doc]);

  // Cell click
  const handleCellClick = useCallback(
    (key: string) => {
      if (editingCell && editingCell !== key) {
        commitEdit();
      }
      setActiveCell(key);
    },
    [editingCell, commitEdit]
  );

  // Double-click to edit
  const handleCellDoubleClick = useCallback(
    (key: string) => {
      setActiveCell(key);
      setEditingCell(key);
      const cell = doc?.grid[key];
      setEditValue(cell?.formula || cell?.value || "");
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [doc]
  );

  // Key handler for the grid
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!activeCell) return;
      const parsed = parseCellId(activeCell);
      if (!parsed) return;

      const colIdx = columns.indexOf(parsed.col);
      const row = parsed.row;

      if (editingCell) {
        if (e.key === "Enter") {
          e.preventDefault();
          commitEdit();
          // Move down
          if (row < rowCount) {
            setActiveCell(cellId(parsed.col, row + 1));
          }
        } else if (e.key === "Escape") {
          setEditingCell(null);
          setEditValue("");
        } else if (e.key === "Tab") {
          e.preventDefault();
          commitEdit();
          const nextCol = e.shiftKey ? colIdx - 1 : colIdx + 1;
          if (nextCol >= 0 && nextCol < columns.length) {
            setActiveCell(cellId(columns[nextCol], row));
          }
        }
        return;
      }

      // Navigation when not editing
      if (e.key === "ArrowUp" && row > 1) {
        e.preventDefault();
        setActiveCell(cellId(parsed.col, row - 1));
      } else if (e.key === "ArrowDown" && row < rowCount) {
        e.preventDefault();
        setActiveCell(cellId(parsed.col, row + 1));
      } else if (e.key === "ArrowLeft" && colIdx > 0) {
        e.preventDefault();
        setActiveCell(cellId(columns[colIdx - 1], row));
      } else if (e.key === "ArrowRight" && colIdx < columns.length - 1) {
        e.preventDefault();
        setActiveCell(cellId(columns[colIdx + 1], row));
      } else if (e.key === "Tab") {
        e.preventDefault();
        const nextCol = e.shiftKey ? colIdx - 1 : colIdx + 1;
        if (nextCol >= 0 && nextCol < columns.length) {
          setActiveCell(cellId(columns[nextCol], row));
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleCellDoubleClick(activeCell);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteCell(docId, activeCell);
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        // Start typing in cell
        setEditingCell(activeCell);
        setEditValue(e.key);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    },
    [activeCell, editingCell, columns, rowCount, commitEdit, handleCellDoubleClick, docId]
  );

  // Column drag handlers
  const handleColDragStart = useCallback(
    (col: string) => {
      setDragCol(col);
    },
    []
  );

  const handleColDragOver = useCallback(
    (e: React.DragEvent, col: string) => {
      e.preventDefault();
      setDragOverCol(col);
    },
    []
  );

  const handleColDrop = useCallback(
    (col: string) => {
      if (!dragCol || dragCol === col || !doc) return;
      const newOrder = [...doc.columnOrder];
      const fromIdx = newOrder.indexOf(dragCol);
      const toIdx = newOrder.indexOf(col);
      newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, dragCol);
      updateColumnOrder(docId, newOrder);
      setDragCol(null);
      setDragOverCol(null);
    },
    [dragCol, doc, docId]
  );

  // Column resize handlers
  const handleColResizeStart = useCallback(
    (e: React.MouseEvent, col: string) => {
      e.preventDefault();
      e.stopPropagation();
      setResizingCol(col);
      setResizeStartX(e.clientX);
      setResizeStartWidth(getColWidth(col));
    },
    [getColWidth]
  );

  useEffect(() => {
    if (!resizingCol) return;
    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - resizeStartX;
      const newWidth = Math.max(40, resizeStartWidth + diff);
      // We update locally — will commit on mouseup
      if (doc) {
        setDoc({
          ...doc,
          colWidths: { ...doc.colWidths, [resizingCol]: newWidth },
        });
      }
    };
    const handleMouseUp = (e: MouseEvent) => {
      const diff = e.clientX - resizeStartX;
      const newWidth = Math.max(40, resizeStartWidth + diff);
      updateColWidth(docId, resizingCol, newWidth);
      setResizingCol(null);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingCol, resizeStartX, resizeStartWidth, docId, doc]);

  // Row resize handlers
  const handleRowResizeStart = useCallback(
    (e: React.MouseEvent, row: number) => {
      e.preventDefault();
      e.stopPropagation();
      setResizingRow(row);
      setResizeRowStartY(e.clientY);
      setResizeRowStartHeight(getRowHeight(row));
    },
    [getRowHeight]
  );

  useEffect(() => {
    if (resizingRow === null) return;
    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientY - resizeRowStartY;
      const newHeight = Math.max(20, resizeRowStartHeight + diff);
      if (doc) {
        setDoc({
          ...doc,
          rowHeights: { ...doc.rowHeights, [resizingRow]: newHeight },
        });
      }
    };
    const handleMouseUp = (e: MouseEvent) => {
      const diff = e.clientY - resizeRowStartY;
      const newHeight = Math.max(20, resizeRowStartHeight + diff);
      updateRowHeight(docId, resizingRow, newHeight);
      setResizingRow(null);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingRow, resizeRowStartY, resizeRowStartHeight, docId, doc]);

  // Apply formatting to active cell
  const handleFormat = useCallback(
    (formatKey: keyof CellFormat, value: boolean | string) => {
      if (!activeCell || !doc) return;
      const existing = doc.grid[activeCell];
      const format: CellFormat = { ...existing?.format, [formatKey]: value };
      const cellData: CellData = {
        value: existing?.value || "",
        formula: existing?.formula,
        format,
      };
      updateCell(docId, activeCell, cellData);
    },
    [activeCell, doc, docId]
  );

  // Export
  const handleExport = useCallback(
    async (type: "csv" | "xlsx") => {
      if (!doc) return;
      const rows: string[][] = [];
      // Header
      rows.push(columns);
      for (let r = 1; r <= rowCount; r++) {
        const row: string[] = [];
        let hasData = false;
        for (const col of columns) {
          const key = cellId(col, r);
          const val = displayValues[key] || "";
          if (val) hasData = true;
          row.push(val);
        }
        if (hasData || r <= 20) rows.push(row);
      }

      if (type === "csv") {
        const csv = rows
          .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
          .join("\n");
        downloadBlob(csv, `${doc.title}.csv`, "text/csv");
      } else {
        const XLSX = await import("xlsx");
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, `${doc.title}.xlsx`);
      }
    },
    [doc, columns, rowCount, displayValues]
  );

  // Formula bar edit
  const handleFormulaBarChange = useCallback(
    (value: string) => {
      setEditValue(value);
      if (activeCell && !editingCell) {
        setEditingCell(activeCell);
      }
    },
    [activeCell, editingCell]
  );

  const handleFormulaBarCommit = useCallback(() => {
    commitEdit();
  }, [commitEdit]);

  // Title edit
  const handleTitleDoubleClick = () => {
    if (!doc) return;
    setTitleEditing(true);
    setTitleValue(doc.title);
  };

  const handleTitleCommit = () => {
    if (doc && titleValue.trim()) {
      updateDocumentTitle(docId, titleValue.trim());
    }
    setTitleEditing(false);
  };

  if (!doc) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
      </div>
    );
  }

  const activeCellData = activeCell ? doc.grid[activeCell] : null;

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
        <div className="flex items-center gap-3">
          <a href="/" className="text-sm font-semibold text-gray-400 hover:text-gray-600">
            ←
          </a>
          {titleEditing ? (
            <input
              autoFocus
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleCommit}
              onKeyDown={(e) => e.key === "Enter" && handleTitleCommit()}
              className="border-b border-black text-sm font-medium outline-none"
            />
          ) : (
            <h1
              onDoubleClick={handleTitleDoubleClick}
              className="cursor-pointer text-sm font-medium text-gray-900"
            >
              {doc.title}
            </h1>
          )}
          <SyncIndicator pending={pending} />
        </div>
        <PresenceBar presence={presence} currentUserId={user?.uid ?? ""} />
      </div>

      {/* Toolbar */}
      <Toolbar
        activeFormat={activeCellData?.format}
        onFormat={handleFormat}
        onExport={handleExport}
      />

      {/* Formula bar */}
      <FormulaBar
        activeCell={activeCell}
        value={editingCell ? editValue : activeCellData?.formula || activeCellData?.value || ""}
        editing={!!editingCell}
        onChange={handleFormulaBarChange}
        onCommit={handleFormulaBarCommit}
      />

      {/* Grid */}
      <div
        ref={gridRef}
        className="grid-container flex-1 overflow-auto"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <table className="border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              {/* Corner cell */}
              <th className="sticky left-0 z-20 min-w-[40px] border-b border-r border-gray-200 bg-gray-50" />
              {columns.map((col) => (
                <th
                  key={col}
                  draggable
                  onDragStart={() => handleColDragStart(col)}
                  onDragOver={(e) => handleColDragOver(e, col)}
                  onDrop={() => handleColDrop(col)}
                  onDragEnd={() => {
                    setDragCol(null);
                    setDragOverCol(null);
                  }}
                  style={{ width: getColWidth(col), minWidth: getColWidth(col) }}
                  className={cn(
                    "relative select-none border-b border-r border-gray-200 bg-gray-50 px-1 py-1 text-center text-xs font-medium text-gray-500",
                    dragOverCol === col && "bg-blue-100"
                  )}
                >
                  {col}
                  {/* Resize handle */}
                  <div
                    onMouseDown={(e) => handleColResizeStart(e, col)}
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }, (_, i) => i + 1).map((row) => (
              <tr key={row}>
                {/* Row header */}
                <td
                  className="relative sticky left-0 z-[5] select-none border-b border-r border-gray-200 bg-gray-50 px-2 text-center text-xs text-gray-500"
                  style={{ height: getRowHeight(row) }}
                >
                  {row}
                  {/* Row resize handle */}
                  <div
                    onMouseDown={(e) => handleRowResizeStart(e, row)}
                    className="absolute bottom-0 left-0 h-1 w-full cursor-row-resize hover:bg-blue-400"
                  />
                </td>
                {columns.map((col) => {
                  const key = cellId(col, row);
                  const cell = doc.grid[key];
                  const isActive = activeCell === key;
                  const isEditing = editingCell === key;
                  const presenceUser = presenceMap[key];

                  return (
                    <td
                      key={key}
                      onClick={() => handleCellClick(key)}
                      onDoubleClick={() => handleCellDoubleClick(key)}
                      style={{
                        width: getColWidth(col),
                        minWidth: getColWidth(col),
                        height: getRowHeight(row),
                        borderColor: presenceUser
                          ? presenceUser.color
                          : isActive
                          ? "#2563eb"
                          : undefined,
                        borderWidth: presenceUser || isActive ? 2 : 1,
                      }}
                      className={cn(
                        "relative border border-gray-200 px-1 text-sm",
                        isActive && "z-[1]",
                        cell?.format?.bold && "font-bold",
                        cell?.format?.italic && "italic"
                      )}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          className="absolute inset-0 z-[2] w-full border-none px-1 text-sm outline-none"
                          style={{ color: cell?.format?.color }}
                        />
                      ) : (
                        <span
                          className="block truncate"
                          style={{ color: cell?.format?.color }}
                        >
                          {displayValues[key] || ""}
                        </span>
                      )}
                      {presenceUser && (
                        <span
                          className="absolute -top-4 left-0 z-10 whitespace-nowrap rounded px-1 text-[10px] text-white"
                          style={{ backgroundColor: presenceUser.color }}
                        >
                          {presenceUser.displayName}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
