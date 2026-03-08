import { Grid, CellData, parseCellId, colIndexToLetter, letterToColIndex } from "./types";

/**
 * Minimal formula engine.
 * Supports:
 *  - Arithmetic: =A1+B2*3, =(A1-A2)/A3
 *  - SUM: =SUM(A1:A10)
 *  - Cell references: =A1, =B2
 *
 * Recursive-descent parser with max-depth guard (no circular dep detection).
 */

const MAX_DEPTH = 50;

export function evaluateFormula(formula: string, grid: Grid, depth = 0): string {
  if (depth > MAX_DEPTH) return "#DEPTH!";
  if (!formula.startsWith("=")) return formula;

  const expr = formula.slice(1).trim();
  try {
    const result = parseExpression(expr, grid, depth, { pos: 0 });
    if (typeof result === "number" && isNaN(result)) return "#VALUE!";
    if (typeof result === "number") {
      return Number.isInteger(result) ? result.toString() : result.toFixed(4).replace(/\.?0+$/, "");
    }
    return String(result);
  } catch {
    return "#ERROR!";
  }
}

interface ParseState {
  pos: number;
}

function parseExpression(expr: string, grid: Grid, depth: number, state: ParseState): number {
  let result = parseTerm(expr, grid, depth, state);
  while (state.pos < expr.length) {
    skipWhitespace(expr, state);
    const ch = expr[state.pos];
    if (ch === "+") {
      state.pos++;
      result += parseTerm(expr, grid, depth, state);
    } else if (ch === "-") {
      state.pos++;
      result -= parseTerm(expr, grid, depth, state);
    } else {
      break;
    }
  }
  return result;
}

function parseTerm(expr: string, grid: Grid, depth: number, state: ParseState): number {
  let result = parseFactor(expr, grid, depth, state);
  while (state.pos < expr.length) {
    skipWhitespace(expr, state);
    const ch = expr[state.pos];
    if (ch === "*") {
      state.pos++;
      result *= parseFactor(expr, grid, depth, state);
    } else if (ch === "/") {
      state.pos++;
      const divisor = parseFactor(expr, grid, depth, state);
      if (divisor === 0) throw new Error("Division by zero");
      result /= divisor;
    } else {
      break;
    }
  }
  return result;
}

function parseFactor(expr: string, grid: Grid, depth: number, state: ParseState): number {
  skipWhitespace(expr, state);

  // Unary minus
  if (expr[state.pos] === "-") {
    state.pos++;
    return -parseFactor(expr, grid, depth, state);
  }

  // Parenthesized expression
  if (expr[state.pos] === "(") {
    state.pos++; // skip (
    const result = parseExpression(expr, grid, depth, state);
    skipWhitespace(expr, state);
    if (expr[state.pos] === ")") state.pos++; // skip )
    return result;
  }

  // SUM function
  const sumMatch = expr.slice(state.pos).match(/^SUM\s*\(/i);
  if (sumMatch) {
    state.pos += sumMatch[0].length;
    const result = parseSumArgs(expr, grid, depth, state);
    skipWhitespace(expr, state);
    if (expr[state.pos] === ")") state.pos++;
    return result;
  }

  // Cell reference
  const cellMatch = expr.slice(state.pos).match(/^([A-Z]+)(\d+)/i);
  if (cellMatch) {
    state.pos += cellMatch[0].length;
    const cellKey = cellMatch[1].toUpperCase() + cellMatch[2];
    return resolveCellValue(cellKey, grid, depth);
  }

  // Number
  const numMatch = expr.slice(state.pos).match(/^(\d+\.?\d*)/);
  if (numMatch) {
    state.pos += numMatch[0].length;
    return parseFloat(numMatch[1]);
  }

  throw new Error("Unexpected token at " + state.pos);
}

function parseSumArgs(expr: string, grid: Grid, depth: number, state: ParseState): number {
  skipWhitespace(expr, state);

  // Try to parse range like A1:A10
  const rangeMatch = expr.slice(state.pos).match(/^([A-Z]+)(\d+)\s*:\s*([A-Z]+)(\d+)/i);
  if (rangeMatch) {
    state.pos += rangeMatch[0].length;
    const startCol = rangeMatch[1].toUpperCase();
    const startRow = parseInt(rangeMatch[2], 10);
    const endCol = rangeMatch[3].toUpperCase();
    const endRow = parseInt(rangeMatch[4], 10);

    let sum = 0;
    const colStart = letterToColIndex(startCol);
    const colEnd = letterToColIndex(endCol);

    for (let c = Math.min(colStart, colEnd); c <= Math.max(colStart, colEnd); c++) {
      for (let r = Math.min(startRow, endRow); r <= Math.max(startRow, endRow); r++) {
        const key = colIndexToLetter(c) + r;
        sum += resolveCellValue(key, grid, depth);
      }
    }
    return sum;
  }

  // Comma-separated values
  let sum = parseExpression(expr, grid, depth, state);
  while (state.pos < expr.length && expr[state.pos] === ",") {
    state.pos++; // skip comma
    sum += parseExpression(expr, grid, depth, state);
  }
  return sum;
}

function resolveCellValue(cellKey: string, grid: Grid, depth: number): number {
  const cell = grid[cellKey];
  if (!cell) return 0;

  if (cell.formula) {
    const evaluated = evaluateFormula(cell.formula, grid, depth + 1);
    const num = parseFloat(evaluated);
    return isNaN(num) ? 0 : num;
  }

  const num = parseFloat(cell.value);
  return isNaN(num) ? 0 : num;
}

function skipWhitespace(expr: string, state: ParseState) {
  while (state.pos < expr.length && expr[state.pos] === " ") {
    state.pos++;
  }
}

/** Compute display values for all cells that have formulas */
export function computeGrid(grid: Grid): Record<string, string> {
  const display: Record<string, string> = {};
  for (const [key, cell] of Object.entries(grid)) {
    if (cell.formula) {
      display[key] = evaluateFormula(cell.formula, grid);
    } else {
      display[key] = cell.value;
    }
  }
  return display;
}

/** Check if a string looks like a formula */
export function isFormula(value: string): boolean {
  return value.startsWith("=");
}

/** Get all cells that a formula references (for highlighting) */
export function getFormulaRefs(formula: string): string[] {
  if (!formula.startsWith("=")) return [];
  const refs: string[] = [];
  const re = /([A-Z]+)(\d+)/gi;
  let match;
  while ((match = re.exec(formula)) !== null) {
    refs.push(match[1].toUpperCase() + match[2]);
  }
  return refs;
}
