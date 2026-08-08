export type MathOperation = "evaluate" | "quadratic" | "statistics" | "determinant" | "derivative" | "integral";

export class MathInputError extends Error {}

class ArithmeticParser {
  private index = 0;
  constructor(private readonly source: string) {}
  parse() { const value = this.expression(); this.space(); if (this.index !== this.source.length || !Number.isFinite(value)) throw new MathInputError("invalid_expression"); return value; }
  private space() { while (/\s/.test(this.source[this.index] ?? "")) this.index += 1; }
  private take(character: string) { this.space(); if (this.source[this.index] !== character) return false; this.index += 1; return true; }
  private expression(): number { let value = this.term(); while (true) { if (this.take("+")) value += this.term(); else if (this.take("-")) value -= this.term(); else return value; } }
  private term(): number { let value = this.power(); while (true) { if (this.take("*")) value *= this.power(); else if (this.take("/")) { const divisor = this.power(); if (divisor === 0) throw new MathInputError("division_by_zero"); value /= divisor; } else if (this.take("%")) { const divisor = this.power(); if (divisor === 0) throw new MathInputError("division_by_zero"); value %= divisor; } else return value; } }
  private power(): number { const base = this.unary(); return this.take("^") ? base ** this.power() : base; }
  private unary(): number { if (this.take("+")) return this.unary(); if (this.take("-")) return -this.unary(); return this.primary(); }
  private primary(): number { if (this.take("(")) { const value = this.expression(); if (!this.take(")")) throw new MathInputError("missing_parenthesis"); return value; } this.space(); const match = this.source.slice(this.index).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i); if (!match) throw new MathInputError("number_expected"); this.index += match[0].length; const value = Number(match[0]); if (!Number.isFinite(value)) throw new MathInputError("invalid_number"); return value; }
}

function finite(value: unknown, name: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new MathInputError(`${name}_must_be_finite_number`);
  return value;
}

function numericArray(value: unknown, max = 200) {
  if (!Array.isArray(value) || value.length === 0 || value.length > max) throw new MathInputError("invalid_values");
  return value.map((entry, index) => finite(entry, `value_${index}`));
}

function round(value: number) {
  if (!Number.isFinite(value)) return value;
  return Number(value.toPrecision(12));
}

function coefficientText(value: number, exponent: number, first: boolean) {
  if (Math.abs(value) < 1e-14) return "";
  const sign = value < 0 ? "-" : first ? "" : "+";
  const absolute = Math.abs(value);
  const coefficient = exponent > 0 && Math.abs(absolute - 1) < 1e-14 ? "" : String(round(absolute));
  const variable = exponent === 0 ? "" : exponent === 1 ? "x" : `x^${exponent}`;
  return `${sign}${coefficient}${variable}`;
}

function latexCoefficientText(value: number, exponent: number, first: boolean) {
  if (Math.abs(value) < 1e-14) return "";
  const sign = value < 0 ? "-" : first ? "" : "+";
  const absolute = Math.abs(value);
  const coefficient = exponent > 0 && Math.abs(absolute - 1) < 1e-14 ? "" : String(round(absolute));
  const variable = exponent === 0 ? "" : exponent === 1 ? "x" : `x^{${exponent}}`;
  return `${sign}${coefficient}${variable}`;
}

function parsePolynomial(expression: string) {
  const normalized = expression.replace(/\s+/g, "").replace(/−/g, "-");
  if (!normalized || normalized.length > 300 || /[^0-9xX+\-.*^]/.test(normalized)) throw new MathInputError("unsupported_polynomial");
  const source = normalized.replace(/X/g, "x");
  const terms = source.replace(/-/g, "+-").split("+").filter(Boolean);
  const coefficients = new Map<number, number>();
  for (const term of terms) {
    const variable = term.includes("x");
    if (!variable) {
      const value = Number(term);
      if (!Number.isFinite(value)) throw new MathInputError("invalid_polynomial_term");
      coefficients.set(0, (coefficients.get(0) ?? 0) + value);
      continue;
    }
    const match = term.match(/^([+-]?(?:(?:\d+(?:\.\d*)?|\.\d+)\*?)?)x(?:\^([0-9]+))?$/);
    if (!match) throw new MathInputError("invalid_polynomial_term");
    let rawCoefficient = match[1].replace(/\*$/, "");
    if (rawCoefficient === "" || rawCoefficient === "+") rawCoefficient = "1";
    if (rawCoefficient === "-") rawCoefficient = "-1";
    const coefficient = Number(rawCoefficient);
    const exponent = match[2] ? Number(match[2]) : 1;
    if (!Number.isFinite(coefficient) || !Number.isInteger(exponent) || exponent < 0 || exponent > 12) throw new MathInputError("polynomial_out_of_range");
    coefficients.set(exponent, (coefficients.get(exponent) ?? 0) + coefficient);
  }
  return coefficients;
}

function formatPolynomial(coefficients: Map<number, number>) {
  const ordered = [...coefficients.entries()].filter(([, coefficient]) => Math.abs(coefficient) >= 1e-14).sort((a, b) => b[0] - a[0]);
  if (!ordered.length) return { expression: "0", latex: "0" };
  let first = true;
  let expression = "";
  let latex = "";
  for (const [exponent, coefficient] of ordered) {
    expression += coefficientText(coefficient, exponent, first);
    latex += latexCoefficientText(coefficient, exponent, first);
    first = false;
  }
  return { expression, latex };
}

function determinant(matrixValue: unknown) {
  if (!Array.isArray(matrixValue) || matrixValue.length < 1 || matrixValue.length > 4) throw new MathInputError("invalid_matrix");
  const size = matrixValue.length;
  const matrix = matrixValue.map((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== size) throw new MathInputError("matrix_must_be_square");
    return row.map((entry, colIndex) => finite(entry, `matrix_${rowIndex}_${colIndex}`));
  });
  let sign = 1;
  let product = 1;
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) if (Math.abs(matrix[row][column]) > Math.abs(matrix[pivot][column])) pivot = row;
    if (Math.abs(matrix[pivot][column]) < 1e-14) return 0;
    if (pivot !== column) { [matrix[pivot], matrix[column]] = [matrix[column], matrix[pivot]]; sign *= -1; }
    const pivotValue = matrix[column][column];
    product *= pivotValue;
    for (let row = column + 1; row < size; row += 1) {
      const factor = matrix[row][column] / pivotValue;
      for (let col = column + 1; col < size; col += 1) matrix[row][col] -= factor * matrix[column][col];
    }
  }
  return round(sign * product);
}

export function solveMath(operation: MathOperation, args: Record<string, unknown>) {
  if (operation === "evaluate") {
    const expression = typeof args.expression === "string" ? args.expression.trim() : "";
    if (!expression || expression.length > 180 || !/^[0-9eE+\-*/%^().\s]+$/.test(expression)) throw new MathInputError("unsupported_expression");
    const value = round(new ArithmeticParser(expression).parse());
    return { operation, expression, value, latex: `${expression.replace(/\*/g, "\\cdot ")}=${value}` };
  }

  if (operation === "quadratic") {
    const a = finite(args.a, "a"); const b = finite(args.b, "b"); const c = finite(args.c, "c");
    if (Math.abs(a) < 1e-14) throw new MathInputError("a_must_be_nonzero");
    const discriminant = round(b * b - 4 * a * c);
    const latex = `x=\\frac{-(${b})\\pm\\sqrt{${discriminant}}}{2(${a})}`;
    if (discriminant < 0) {
      const real = round(-b / (2 * a)); const imaginary = round(Math.sqrt(-discriminant) / (2 * Math.abs(a)));
      return { operation, coefficients: { a, b, c }, discriminant, roots: [`${real}+${imaginary}i`, `${real}-${imaginary}i`], latex };
    }
    const root = Math.sqrt(discriminant);
    return { operation, coefficients: { a, b, c }, discriminant, roots: [round((-b + root) / (2 * a)), round((-b - root) / (2 * a))], latex };
  }

  if (operation === "statistics") {
    const values = numericArray(args.values);
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((total, value) => total + value, 0);
    const mean = sum / values.length;
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    const variancePopulation = values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length;
    return { operation, count: values.length, sum: round(sum), mean: round(mean), median: round(median), min: sorted[0], max: sorted[sorted.length - 1], variancePopulation: round(variancePopulation), standardDeviationPopulation: round(Math.sqrt(variancePopulation)), latex: `\\bar{x}=${round(mean)},\\;\\sigma=${round(Math.sqrt(variancePopulation))}` };
  }

  if (operation === "determinant") {
    const value = determinant(args.matrix);
    return { operation, determinant: value, latex: `\\det(A)=${value}` };
  }

  const expression = typeof args.expression === "string" ? args.expression.trim() : "";
  const polynomial = parsePolynomial(expression);
  const result = new Map<number, number>();
  if (operation === "derivative") {
    for (const [exponent, coefficient] of polynomial) if (exponent > 0) result.set(exponent - 1, coefficient * exponent);
    const formatted = formatPolynomial(result);
    return { operation, input: expression, result: formatted.expression, latex: `\\frac{d}{dx}\\left(${formatPolynomial(polynomial).latex}\\right)=${formatted.latex}` };
  }

  for (const [exponent, coefficient] of polynomial) result.set(exponent + 1, coefficient / (exponent + 1));
  const formatted = formatPolynomial(result);
  return { operation: "integral" as const, input: expression, result: `${formatted.expression}+C`, latex: `\\int ${formatPolynomial(polynomial).latex}\\,dx=${formatted.latex}+C` };
}
