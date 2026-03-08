"use client";

interface Props {
  activeCell: string | null;
  value: string;
  editing: boolean;
  onChange: (value: string) => void;
  onCommit: () => void;
}

export function FormulaBar({
  activeCell,
  value,
  editing,
  onChange,
  onCommit,
}: Props) {
  return (
    <div className="flex items-center border-b border-gray-200 px-3 py-1">
      <span className="w-16 text-center text-xs font-medium text-gray-500">
        {activeCell || "—"}
      </span>
      <div className="mx-2 h-4 w-px bg-gray-200" />
      <span className="mr-1 text-xs text-gray-400">fx</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onCommit();
          }
        }}
        className="flex-1 text-sm outline-none"
        placeholder={activeCell ? "Enter value or formula (e.g. =SUM(A1:A10))" : ""}
        readOnly={!activeCell}
      />
    </div>
  );
}
