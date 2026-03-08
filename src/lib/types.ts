export interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  color?: string;
}

export interface CellData {
  value: string;
  formula?: string;
  format?: CellFormat;
}

export type Grid = Record<string, CellData>;

export interface SpreadsheetDocument {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  createdAt: number;
  updatedAt: number;
  grid: Grid;
  columnOrder: string[];
  colWidths: Record<string, number>;
  rowHeights: Record<number, number>;
  rowCount: number;
  colCount: number;
}

export interface PresenceData {
  userId: string;
  displayName: string;
  color: string;
  activeCell: string | null;
  lastSeen: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  color: string;
  isAnonymous: boolean;
}

export const DEFAULT_COL_WIDTH = 100;
export const DEFAULT_ROW_HEIGHT = 32;
export const DEFAULT_ROW_COUNT = 100;
export const DEFAULT_COL_COUNT = 26;

export function colIndexToLetter(index: number): string {
  let letter = "";
  let n = index;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

export function letterToColIndex(letter: string): number {
  let index = 0;
  for (let i = 0; i < letter.length; i++) {
    index = index * 26 + (letter.charCodeAt(i) - 64);
  }
  return index - 1;
}

export function cellId(col: string, row: number): string {
  return `${col}${row}`;
}

export function parseCellId(id: string): { col: string; row: number } | null {
  const match = id.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  return { col: match[1], row: parseInt(match[2], 10) };
}
