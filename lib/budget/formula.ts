// Formula engine for calculated custom fields, e.g. "C = A + B".
//
// - Exact decimals: numbers are held as BigInt scaled by 10^18, so 0.1 + 0.2 is exactly 0.3 and
//   amounts in paise never drift. Results are rounded half away from zero only when shown.
// - Checked before saving: syntax, unknown fields or functions, wrong argument counts, text used in
//   arithmetic, and formulas that depend on each other in a loop.
// - Safe when calculated: division by zero or a bad value gives an error value with a message for
//   that cell only; it never stops the page.
// The same file runs on the server (reports, entry screens) and in the browser (formula designer).

// BigInt() calls rather than 0n literals, so the file also compiles for ES2017 targets.
const ZERO = BigInt(0), ONE = BigInt(1), TWO = BigInt(2);
const SCALE = BigInt(10) ** BigInt(18);

export class Dec {
  readonly n: bigint; // value × 10^18
  constructor(n: bigint) { this.n = n; }
  static parse(text: string): Dec | null {
    const t = text.replace(/[,\s₹]/g, "");
    const m = /^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(t);
    if (!m || (!m[2] && !m[3])) return null;
    let digits = (m[2] || "0") + (m[3] || "");
    let point = (m[2] || "0").length + Number(m[4] || 0);
    if (point < 0) { digits = "0".repeat(-point) + digits; point = 0; }
    const intPart = digits.slice(0, point).padEnd(point, "0") || "0";
    const frac = digits.slice(point);
    const f18 = (frac + "0".repeat(19)).slice(0, 19);
    let n = BigInt(intPart) * SCALE + BigInt(f18.slice(0, 18));
    if (Number(f18[18]) >= 5) n += ONE;
    return new Dec(m[1] === "-" ? -n : n);
  }
  static of(x: number | string | bigint): Dec {
    if (typeof x === "bigint") return new Dec(x * SCALE);
    const d = Dec.parse(typeof x === "number" ? String(x) : x);
    if (!d) throw new Error(`"${x}" is not a number`);
    return d;
  }
  // paise (integer) to crores, exactly
  static fromScaled(n: bigint, places: number): Dec { return new Dec(n * BigInt(10) ** BigInt(18 - places)); }
  add(b: Dec) { return new Dec(this.n + b.n); }
  sub(b: Dec) { return new Dec(this.n - b.n); }
  neg() { return new Dec(-this.n); }
  mul(b: Dec) { return new Dec(divRound(this.n * b.n, SCALE)); }
  div(b: Dec) {
    if (b.n === ZERO) throw new FormulaError("Division by zero");
    return new Dec(divRound(this.n * SCALE, b.n));
  }
  cmp(b: Dec) { return this.n < b.n ? -1 : this.n > b.n ? 1 : 0; }
  isZero() { return this.n === ZERO; }
  round(places: number, mode: "half" | "up" | "down" = "half") {
    const unit = BigInt(10) ** BigInt(18 - Math.max(0, Math.min(18, places)));
    const q = this.n / unit, r = this.n % unit;
    let out = q;
    if (r !== ZERO) {
      const away = mode === "up" || (mode === "half" && (r < ZERO ? -r : r) * TWO >= unit);
      if (away) out += this.n < ZERO ? -ONE : ONE;
    }
    return new Dec(out * unit);
  }
  toNumber() { return Number(this.toString()); }
  toString() {
    const neg = this.n < ZERO, a = neg ? -this.n : this.n;
    const i = a / SCALE, f = (a % SCALE).toString().padStart(18, "0").replace(/0+$/, "");
    return `${neg ? "-" : ""}${i}${f ? "." + f : ""}`;
  }
  toFixed(places: number) {
    const r = this.round(places);
    const neg = r.n < ZERO, a = neg ? -r.n : r.n;
    const i = a / SCALE, f = (a % SCALE).toString().padStart(18, "0").slice(0, places);
    return `${neg && a !== ZERO ? "-" : ""}${i}${places ? "." + f : ""}`;
  }
}
function divRound(a: bigint, b: bigint) {
  const q = a / b, r = a % b;
  if (r === ZERO) return q;
  const twice = (r < ZERO ? -r : r) * TWO, bb = b < ZERO ? -b : b;
  return twice >= bb ? q + ((a < ZERO) !== (b < ZERO) ? -ONE : ONE) : q;
}

export class FormulaError extends Error {}
export interface DateVal { date: string } // YYYY-MM-DD
export type Value = Dec | string | boolean | DateVal | null;
export interface ErrorVal { error: string }
const isErr = (v: unknown): v is ErrorVal => !!v && typeof v === "object" && "error" in (v as object);
const isDate = (v: unknown): v is DateVal => !!v && typeof v === "object" && "date" in (v as object);

// ---------- field types ----------
export const FIELD_TYPES: { type: string; label: string; kind: Kind; hint: string }[] = [
  { type: "text", label: "Text", kind: "text", hint: "One line of text" },
  { type: "long_text", label: "Paragraph", kind: "text", hint: "Several lines of text" },
  { type: "number", label: "Number", kind: "number", hint: "Decimal number; set decimals, min and max" },
  { type: "integer", label: "Whole number", kind: "number", hint: "No decimals" },
  { type: "amount_cr", label: "Amount in crores", kind: "number", hint: "Like Initial and CTC; exact to the paisa" },
  { type: "amount_inr", label: "Amount in rupees", kind: "number", hint: "Rupees and paise" },
  { type: "percent", label: "Percentage", kind: "number", hint: "Typed as 18 for 18%; in formulas it is 18, so use / 100" },
  { type: "date", label: "Date", kind: "date", hint: "DD/MM/YYYY" },
  { type: "month", label: "Month", kind: "date", hint: "MM/YYYY; stored as the 1st of the month" },
  { type: "yes_no", label: "Yes / No", kind: "bool", hint: "Tick box" },
  { type: "dropdown", label: "Dropdown (one choice)", kind: "text", hint: "Pick one from your list" },
  { type: "multi_select", label: "Dropdown (several choices)", kind: "text", hint: "Pick any from your list" },
  { type: "email", label: "Email", kind: "text", hint: "Checked for a valid address" },
  { type: "phone", label: "Phone", kind: "text", hint: "7 to 15 digits" },
  { type: "url", label: "Web link", kind: "text", hint: "Starts with http:// or https://" },
  { type: "user", label: "Workspace user", kind: "text", hint: "Picked from Chandak Workspace users" },
  { type: "department", label: "Department", kind: "text", hint: "Picked from departments" },
  { type: "tower", label: "Tower", kind: "text", hint: "Picked from the project's towers" },
  { type: "formula", label: "Calculated (formula)", kind: "number", hint: "Worked out from other fields, e.g. qty * rate" },
];
export const RESULT_TYPES: [string, string][] = [
  ["number", "Number"], ["integer", "Whole number"], ["amount_cr", "Amount in crores"], ["amount_inr", "Amount in rupees"],
  ["percent", "Percentage"], ["text", "Text"], ["yes_no", "Yes / No"], ["date", "Date"],
];
type Kind = "number" | "text" | "date" | "bool" | "any";
const kindOfType = (t: string): Kind => (FIELD_TYPES.find((x) => x.type === t)?.kind ?? (t === "text" ? "text" : "number"));

export const ENTITIES: { entity: string; label: string; where: string }[] = [
  { entity: "line", label: "Budget line", where: "Extra columns on Budget entry and the Detail report, one value per cost head line" },
  { entity: "version", label: "Budget version", where: "Version details on Budget entry and the Summary report" },
  { entity: "tower", label: "Tower", where: "Extra columns in the Towers table" },
  { entity: "cost_entry", label: "Cost incurred entry", where: "Extra boxes when recording cost, and columns in the entries list" },
  { entity: "project", label: "Project", where: "Project details on the Overview" },
];

// Built-in figures each form's formulas may use (all amounts in crores unless the unit says otherwise).
export const BUILTINS: Record<string, { key: string; label: string; kind: Kind; unit?: string }[]> = {
  line: [
    { key: "initial", label: "Initial budget (a)", kind: "number", unit: "Cr" },
    { key: "ctc", label: "Estimated CTC (b)", kind: "number", unit: "Cr" },
    { key: "incurred", label: "Cost incurred (c)", kind: "number", unit: "Cr" },
    { key: "balance", label: "Balance CTC (b − c)", kind: "number", unit: "Cr" },
    { key: "variance", label: "Variance (a − b)", kind: "number", unit: "Cr" },
    { key: "util_pct", label: "Utilised %", kind: "number", unit: "%" },
    { key: "psf_initial", label: "PSF on initial", kind: "number", unit: "₹/sft" },
    { key: "psf_ctc", label: "PSF on CTC", kind: "number", unit: "₹/sft" },
    { key: "eng_area", label: "Construction area (Engg)", kind: "number", unit: "sft" },
  ],
  version: [
    { key: "total_initial", label: "Total initial budget", kind: "number", unit: "Cr" },
    { key: "total_ctc", label: "Total estimated CTC", kind: "number", unit: "Cr" },
    { key: "total_incurred", label: "Total cost incurred", kind: "number", unit: "Cr" },
    { key: "total_balance", label: "Total balance CTC", kind: "number", unit: "Cr" },
    { key: "total_variance", label: "Total variance", kind: "number", unit: "Cr" },
    { key: "total_carpet", label: "Total carpet area", kind: "number", unit: "sft" },
    { key: "net_sale_carpet", label: "Net sale carpet area", kind: "number", unit: "sft" },
    { key: "sold_area", label: "Sold area", kind: "number", unit: "sft" },
    { key: "eng_area", label: "Construction area (Engg)", kind: "number", unit: "sft" },
    { key: "design_area", label: "Construction area (Design)", kind: "number", unit: "sft" },
    { key: "sale_value_cr", label: "Total sale value", kind: "number", unit: "Cr" },
    { key: "as_on", label: "As-on date", kind: "date" },
  ],
  tower: [
    { key: "carpet_area", label: "Carpet area", kind: "number", unit: "sft" },
    { key: "eng_area", label: "Construction area (Engg)", kind: "number", unit: "sft" },
    { key: "oc_date", label: "OC date", kind: "date" },
  ],
  cost_entry: [
    { key: "amount", label: "Amount", kind: "number", unit: "₹" },
    { key: "month", label: "Month", kind: "date" },
  ],
  project: [{ key: "towers", label: "Number of towers", kind: "number" }],
};

// ---------- functions ----------
interface Fn { args: [number, number]; kind: Kind; help: string; argKinds?: Kind[] }
export const FUNCTIONS: Record<string, Fn> = {
  SUM: { args: [1, 50], kind: "number", help: "SUM(a, b, ...) adds numbers; blanks count as 0" },
  MIN: { args: [1, 50], kind: "number", help: "MIN(a, b, ...) smallest value" },
  MAX: { args: [1, 50], kind: "number", help: "MAX(a, b, ...) largest value" },
  AVERAGE: { args: [1, 50], kind: "number", help: "AVERAGE(a, b, ...) of the values that are filled in" },
  ABS: { args: [1, 1], kind: "number", help: "ABS(x) without the minus sign" },
  ROUND: { args: [1, 2], kind: "number", help: "ROUND(x, places) half away from zero" },
  ROUNDUP: { args: [1, 2], kind: "number", help: "ROUNDUP(x, places) away from zero" },
  ROUNDDOWN: { args: [1, 2], kind: "number", help: "ROUNDDOWN(x, places) towards zero" },
  DIVIDE: { args: [2, 3], kind: "number", help: "DIVIDE(a, b, if_zero) safe division; gives if_zero (or blank) when b is 0" },
  PERCENT: { args: [2, 2], kind: "number", help: "PERCENT(part, whole) = part ÷ whole × 100; blank when whole is 0" },
  IF: { args: [2, 3], kind: "any", help: "IF(condition, then, else)" },
  AND: { args: [1, 20], kind: "bool", help: "AND(c1, c2, ...) all true" },
  OR: { args: [1, 20], kind: "bool", help: "OR(c1, c2, ...) any true" },
  NOT: { args: [1, 1], kind: "bool", help: "NOT(c)" },
  ISBLANK: { args: [1, 1], kind: "bool", help: "ISBLANK(x) true when x is not filled in" },
  IFBLANK: { args: [2, 2], kind: "any", help: "IFBLANK(x, other) x, or other when x is blank" },
  DAYS: { args: [2, 2], kind: "number", help: "DAYS(end, start) days between two dates" },
  MONTHS: { args: [2, 2], kind: "number", help: "MONTHS(end, start) whole months between two dates" },
  ADDDAYS: { args: [2, 2], kind: "date", help: "ADDDAYS(date, n) date n days later" },
  ADDMONTHS: { args: [2, 2], kind: "date", help: "ADDMONTHS(date, n) same day n months later" },
  YEAR: { args: [1, 1], kind: "number", help: "YEAR(date)" },
  MONTH: { args: [1, 1], kind: "number", help: "MONTH(date) 1 to 12" },
  DAY: { args: [1, 1], kind: "number", help: "DAY(date)" },
  FY: { args: [1, 1], kind: "text", help: "FY(date) financial year, April to March, e.g. FY2026-27" },
  TODAY: { args: [0, 0], kind: "date", help: "TODAY() today's date" },
  CONCAT: { args: [1, 20], kind: "text", help: "CONCAT(a, b, ...) joins text; also a & b" },
  LEN: { args: [1, 1], kind: "number", help: "LEN(text) number of characters" },
  UPPER: { args: [1, 1], kind: "text", help: "UPPER(text)" },
  LOWER: { args: [1, 1], kind: "text", help: "LOWER(text)" },
  TEXT: { args: [1, 2], kind: "text", help: "TEXT(number, places) number as text" },
  SUMLINES: { args: [1, 1], kind: "number", help: "SUMLINES(line_field) total of a budget line field over the version (version form only)" },
  COUNTLINES: { args: [1, 1], kind: "number", help: "COUNTLINES(line_field) lines where it is filled in (version form only)" },
};

// ---------- parser ----------
type Node =
  | { t: "num"; v: Dec } | { t: "str"; v: string } | { t: "bool"; v: boolean } | { t: "ref"; name: string; pos: number }
  | { t: "call"; name: string; args: Node[]; pos: number } | { t: "neg"; a: Node } | { t: "pct"; a: Node }
  | { t: "bin"; op: string; a: Node; b: Node; pos: number };

interface Tok { k: "num" | "str" | "id" | "op" | "end"; v: string; pos: number }
function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    const rest = src.slice(i);
    let m: RegExpExecArray | null;
    if ((m = /^(\d+(\.\d*)?|\.\d+)/.exec(rest))) { out.push({ k: "num", v: m[0], pos: i }); i += m[0].length; continue; }
    if ((m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest))) { out.push({ k: "id", v: m[0], pos: i }); i += m[0].length; continue; }
    if (c === '"') {
      const end = src.indexOf('"', i + 1);
      if (end < 0) throw new FormulaError(`Text starting at position ${i + 1} has no closing quote`);
      out.push({ k: "str", v: src.slice(i + 1, end), pos: i }); i = end + 1; continue;
    }
    if ((m = /^(<=|>=|<>|!=|==|[-+*/^%&=<>(),])/.exec(rest))) { out.push({ k: "op", v: m[0] === "!=" ? "<>" : m[0] === "==" ? "=" : m[0], pos: i }); i += m[0].length; continue; }
    throw new FormulaError(`"${c}" at position ${i + 1} is not allowed in a formula`);
  }
  out.push({ k: "end", v: "", pos: src.length });
  return out;
}

export function parse(src: string): Node {
  if (!src.trim()) throw new FormulaError("The formula is empty");
  const toks = tokenize(src.trim().replace(/^=/, ""));
  let p = 0;
  const peek = () => toks[p];
  const take = (v?: string) => {
    const t = toks[p];
    if (v != null && t.v !== v) throw new FormulaError(t.k === "end" ? `Missing "${v}" at the end` : `Expected "${v}" at position ${t.pos + 1}, found "${t.v}"`);
    p++;
    return t;
  };
  const binary = (next: () => Node, ops: string[], right = false): (() => Node) => () => {
    let a = next();
    while (peek().k === "op" && ops.includes(peek().v)) {
      const t = take();
      const b = right ? binary(next, ops, true)() : next();
      a = { t: "bin", op: t.v, a, b, pos: t.pos };
      if (right) break;
    }
    return a;
  };
  const primary = (): Node => {
    const t = peek();
    if (t.k === "num") { take(); return { t: "num", v: Dec.of(t.v) }; }
    if (t.k === "str") { take(); return { t: "str", v: t.v }; }
    if (t.k === "op" && t.v === "(") { take(); const e = comparison(); take(")"); return e; }
    if (t.k === "op" && t.v === "-") { take(); return { t: "neg", a: unary() }; }
    if (t.k === "op" && t.v === "+") { take(); return unary(); }
    if (t.k === "id") {
      take();
      const up = t.v.toUpperCase();
      if (peek().k === "op" && peek().v === "(") {
        take();
        const args: Node[] = [];
        if (!(peek().k === "op" && peek().v === ")")) {
          for (;;) { args.push(comparison()); if (peek().v === ",") { take(); continue; } break; }
        }
        take(")");
        return { t: "call", name: up, args, pos: t.pos };
      }
      if (up === "TRUE" || up === "FALSE") return { t: "bool", v: up === "TRUE" };
      return { t: "ref", name: t.v.toLowerCase(), pos: t.pos };
    }
    if (t.k === "end") throw new FormulaError("The formula ends too early");
    throw new FormulaError(`Unexpected "${t.v}" at position ${t.pos + 1}`);
  };
  const postfix = (): Node => { let a = primary(); while (peek().k === "op" && peek().v === "%") { take(); a = { t: "pct", a }; } return a; };
  const power = binary(postfix, ["^"], true);
  const unary = (): Node => (peek().k === "op" && peek().v === "-" ? (take(), { t: "neg", a: unary() }) : power());
  const product = binary(unary, ["*", "/"]);
  const sum = binary(product, ["+", "-"]);
  const concat = binary(sum, ["&"]);
  const comparison = binary(concat, ["=", "<>", "<", "<=", ">", ">="]);
  const tree = comparison();
  if (peek().k !== "end") throw new FormulaError(`Unexpected "${peek().v}" at position ${peek().pos + 1}`);
  return tree;
}

// ---------- checking a definition ----------
export interface FieldDef {
  id?: number; key: string; label: string; field_type: string; formula?: string | null; result_type?: string | null;
  options?: { decimals?: number | null; choices?: string[]; unit?: string | null } | null; active?: boolean;
}

export function refsOf(node: Node, out = new Set<string>(), lineRefs = new Set<string>()): { refs: Set<string>; lineRefs: Set<string> } {
  const walk = (n: Node) => {
    if (n.t === "ref") out.add(n.name);
    else if (n.t === "call") {
      if ((n.name === "SUMLINES" || n.name === "COUNTLINES") && n.args[0]?.t === "ref") lineRefs.add((n.args[0] as { name: string }).name);
      else n.args.forEach(walk);
    } else if (n.t === "neg" || n.t === "pct") walk(n.a);
    else if (n.t === "bin") { walk(n.a); walk(n.b); }
  };
  walk(node);
  return { refs: out, lineRefs };
}

function fieldKind(f: FieldDef): Kind {
  if (f.field_type === "formula") return f.result_type === "text" ? "text" : f.result_type === "yes_no" ? "bool" : f.result_type === "date" ? "date" : "number";
  return kindOfType(f.field_type);
}

/** Checks a formula field against the other fields of its form. Returns the problem, or null when it is fine. */
export function checkFormula(field: FieldDef, entity: string, fields: FieldDef[], lineFields: FieldDef[] = []): string | null {
  let tree: Node;
  try { tree = parse(field.formula ?? ""); } catch (e) { return (e as Error).message; }
  const kinds = new Map<string, Kind>();
  for (const b of BUILTINS[entity] ?? []) kinds.set(b.key, b.kind);
  for (const f of fields) if (f.key !== field.key && f.active !== false) kinds.set(f.key, fieldKind(f));
  const lineKinds = new Map<string, Kind>(lineFields.filter((f) => f.active !== false).map((f) => [f.key, fieldKind(f)]));
  for (const b of BUILTINS.line) lineKinds.set(b.key, b.kind);

  const typeOf = (n: Node): Kind => {
    switch (n.t) {
      case "num": return "number";
      case "str": return "text";
      case "bool": return "bool";
      case "ref": {
        if (n.name === field.key) throw new FormulaError(`The formula uses its own field "${n.name}"`);
        const k = kinds.get(n.name);
        if (!k) throw new FormulaError(`"${n.name}" is not a field of this form${suggest(n.name, [...kinds.keys()])}`);
        return k;
      }
      case "neg": case "pct": need(typeOf(n.a), "number", n.t === "neg" ? "a minus sign" : "%"); return "number";
      case "bin": {
        const a = typeOf(n.a), b = typeOf(n.b);
        if (n.op === "&") return "text";
        if (["=", "<>"].includes(n.op)) return "bool";
        if (["<", "<=", ">", ">="].includes(n.op)) { if (a !== b && a !== "any" && b !== "any") throw new FormulaError(`Cannot compare ${a} with ${b} at position ${n.pos + 1}`); return "bool"; }
        if (n.op === "-" && a === "date" && b === "date") return "number";
        need(a, "number", `"${n.op}"`); need(b, "number", `"${n.op}"`);
        return "number";
      }
      case "call": {
        const fn = FUNCTIONS[n.name];
        if (!fn) throw new FormulaError(`${n.name} is not a known function${suggest(n.name, Object.keys(FUNCTIONS))}`);
        if (n.args.length < fn.args[0] || n.args.length > fn.args[1]) {
          throw new FormulaError(`${n.name} takes ${fn.args[0] === fn.args[1] ? fn.args[0] : `${fn.args[0]} to ${fn.args[1]}`} value(s), not ${n.args.length}`);
        }
        if (n.name === "SUMLINES" || n.name === "COUNTLINES") {
          if (entity !== "version") throw new FormulaError(`${n.name} works only in the Budget version form`);
          const a = n.args[0];
          if (a.t !== "ref" || !lineKinds.has(a.name)) throw new FormulaError(`${n.name} needs the key of a budget line field, e.g. ${n.name}(ctc)`);
          if (n.name === "SUMLINES" && lineKinds.get(a.name) !== "number") throw new FormulaError(`SUMLINES(${a.name}): ${a.name} is not a number`);
          return "number";
        }
        const ks = n.args.map(typeOf);
        const numeric = ["SUM", "MIN", "MAX", "AVERAGE", "ABS", "ROUND", "ROUNDUP", "ROUNDDOWN", "DIVIDE", "PERCENT"];
        if (numeric.includes(n.name)) ks.forEach((k) => need(k, "number", n.name));
        if (["DAYS", "MONTHS"].includes(n.name)) ks.forEach((k) => need(k, "date", n.name));
        if (["YEAR", "MONTH", "DAY", "FY"].includes(n.name)) need(ks[0], "date", n.name);
        if (["ADDDAYS", "ADDMONTHS"].includes(n.name)) { need(ks[0], "date", n.name); need(ks[1], "number", n.name); }
        if (n.name === "IF") need(ks[0], "bool", "IF's condition");
        if (["AND", "OR", "NOT"].includes(n.name)) ks.forEach((k) => need(k, "bool", n.name));
        if (n.name === "IF" || n.name === "IFBLANK") { const r = ks.slice(n.name === "IF" ? 1 : 0); return r.every((k) => k === r[0]) ? r[0] : "any"; }
        return fn.kind;
      }
    }
  };
  function need(k: Kind, want: Kind, where: string) {
    if (k !== want && k !== "any") throw new FormulaError(`${where} needs ${want === "number" ? "numbers" : want === "bool" ? "a yes/no condition" : want + "s"}, but gets ${k}`);
  }
  try {
    const k = typeOf(tree);
    const want = fieldKind(field);
    if (k !== "any" && k !== want) return `The formula gives ${k === "bool" ? "yes/no" : k}, but the result type is ${want === "bool" ? "yes/no" : want}`;
  } catch (e) {
    return (e as Error).message;
  }
  // loops through other formula fields
  const graph = new Map<string, string[]>();
  for (const f of [...fields.filter((x) => x.key !== field.key), field]) {
    if (f.field_type !== "formula" || f.active === false) continue;
    try { graph.set(f.key, [...refsOf(parse(f.formula ?? "")).refs]); } catch { graph.set(f.key, []); }
  }
  const path: string[] = [];
  const seen = new Set<string>();
  const visit = (k: string): string | null => {
    if (path.includes(k)) return [...path.slice(path.indexOf(k)), k].join(" → ");
    if (seen.has(k) || !graph.has(k)) return null;
    path.push(k);
    for (const d of graph.get(k)!) { const r = visit(d); if (r) return r; }
    path.pop();
    seen.add(k);
    return null;
  };
  const loop = visit(field.key);
  return loop ? `These formulas depend on each other in a loop: ${loop}` : null;
}

function suggest(name: string, options: string[]) {
  const close = options.find((o) => o.toLowerCase() !== name.toLowerCase() && (o.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(o.toLowerCase())));
  return close ? `; did you mean ${close}?` : "";
}

// ---------- calculating ----------
export interface Record_ { values: Record<string, Value>; lines?: Record<string, Value>[] }

/** Calculates every formula field of one record. Inputs: values of the typed/imported fields and built-ins. */
export function calculate(fields: FieldDef[], rec: Record_, today = new Date().toISOString().slice(0, 10)): Record<string, Value | ErrorVal> {
  const byKey = new Map(fields.filter((f) => f.active !== false).map((f) => [f.key, f]));
  const out: Record<string, Value | ErrorVal> = {};
  const parsed = new Map<string, Node | ErrorVal>();
  const stack: string[] = [];
  const get = (key: string): Value => {
    const f = byKey.get(key);
    if (f?.field_type === "formula") {
      const r = calcField(key);
      if (isErr(r)) throw new FormulaError(`${f.label}: ${r.error}`);
      return r;
    }
    if (!(key in rec.values) && !f) throw new FormulaError(`"${key}" is not available`);
    return rec.values[key] ?? null;
  };
  const calcField = (key: string): Value | ErrorVal => {
    if (key in out) return out[key];
    if (stack.includes(key)) return { error: `loop: ${[...stack, key].join(" → ")}` };
    const f = byKey.get(key)!;
    let tree = parsed.get(key);
    if (!tree) { try { tree = parse(f.formula ?? ""); } catch (e) { tree = { error: (e as Error).message }; } parsed.set(key, tree); }
    if (isErr(tree)) return (out[key] = tree);
    stack.push(key);
    let v: Value | ErrorVal;
    try {
      v = shape(evalNode(tree as Node, get, rec, today), f);
    } catch (e) {
      v = { error: (e as Error).message };
    }
    stack.pop();
    return (out[key] = v);
  };
  for (const f of byKey.values()) if (f.field_type === "formula") calcField(f.key);
  return out;
}

// Result as the field's result type, rounded to its decimals.
function shape(v: Value, f: FieldDef): Value {
  if (v == null) return null;
  switch (f.result_type) {
    case "text": return v instanceof Dec ? v.toString() : isDate(v) ? v.date : String(v);
    case "yes_no": if (typeof v !== "boolean") throw new FormulaError("does not give yes/no"); return v;
    case "date": if (!isDate(v)) throw new FormulaError("does not give a date"); return v;
    default: {
      if (!(v instanceof Dec)) throw new FormulaError("does not give a number");
      const places = f.result_type === "integer" ? 0 : f.result_type === "amount_inr" ? 2 : f.result_type === "amount_cr" ? 9 : f.options?.decimals ?? 6;
      return v.round(places);
    }
  }
}

const num = (v: Value, where: string): Dec => {
  if (v == null) return new Dec(ZERO);
  if (v instanceof Dec) return v;
  if (typeof v === "boolean") return new Dec(v ? SCALE : ZERO);
  if (typeof v === "string") { const d = Dec.parse(v); if (d) return d; }
  throw new FormulaError(`${where} needs a number, but got "${isDate(v) ? v.date : v}"`);
};
const truthy = (v: Value) => (v == null ? false : typeof v === "boolean" ? v : v instanceof Dec ? !v.isZero() : isDate(v) ? true : v !== "");
const dateOf = (v: Value, where: string): Date | null => {
  if (v == null) return null;
  if (isDate(v)) return new Date(v.date + "T00:00:00Z");
  throw new FormulaError(`${where} needs a date`);
};
const iso = (d: Date): DateVal => ({ date: d.toISOString().slice(0, 10) });
const text = (v: Value) => (v == null ? "" : v instanceof Dec ? v.toString() : isDate(v) ? v.date : typeof v === "boolean" ? (v ? "Yes" : "No") : v);
const eq = (a: Value, b: Value) => {
  if (a instanceof Dec || b instanceof Dec) { try { return num(a, "=").cmp(num(b, "=")) === 0; } catch { return false; } }
  if (isDate(a) && isDate(b)) return a.date === b.date;
  return text(a).toLowerCase() === text(b).toLowerCase();
};

function evalNode(n: Node, get: (k: string) => Value, rec: Record_, today: string): Value {
  const ev = (x: Node) => evalNode(x, get, rec, today);
  switch (n.t) {
    case "num": return n.v;
    case "str": return n.v;
    case "bool": return n.v;
    case "ref": return get(n.name);
    case "neg": return num(ev(n.a), "a minus sign").neg();
    case "pct": return num(ev(n.a), "%").div(Dec.of(100));
    case "bin": {
      const a = ev(n.a), b = ev(n.b);
      switch (n.op) {
        case "+": return num(a, "+").add(num(b, "+"));
        case "-":
          if (isDate(a) && isDate(b)) return Dec.of(BigInt(Math.round((dateOf(a, "-")!.getTime() - dateOf(b, "-")!.getTime()) / 86400000)));
          return num(a, "-").sub(num(b, "-"));
        case "*": return num(a, "*").mul(num(b, "*"));
        case "/": return num(a, "/").div(num(b, "/"));
        case "^": {
          const e = num(b, "^");
          if (e.round(0).cmp(e) !== 0 || Math.abs(e.toNumber()) > 100) throw new FormulaError("^ needs a whole power between -100 and 100");
          let r = Dec.of(1), base = num(a, "^");
          for (let i = 0; i < Math.abs(e.toNumber()); i++) r = r.mul(base);
          return e.n < ZERO ? Dec.of(1).div(r) : r;
        }
        case "&": return text(a) + text(b);
        case "=": return eq(a, b);
        case "<>": return !eq(a, b);
        default: {
          let c: number;
          if (isDate(a) && isDate(b)) c = a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
          else if (typeof a === "string" && typeof b === "string") c = a.localeCompare(b);
          else c = num(a, n.op).cmp(num(b, n.op));
          return n.op === "<" ? c < 0 : n.op === "<=" ? c <= 0 : n.op === ">" ? c > 0 : c >= 0;
        }
      }
    }
    case "call": return callFn(n.name, n.args, ev, rec, today);
  }
}

function callFn(name: string, args: Node[], ev: (n: Node) => Value, rec: Record_, today: string): Value {
  const vals = () => args.map(ev);
  const nums = (where: string) => vals().map((v) => num(v, where));
  const place = (i: number) => (args[i] ? num(ev(args[i]), name).toNumber() : 0);
  switch (name) {
    case "SUM": return nums("SUM").reduce((s, x) => s.add(x), new Dec(ZERO));
    case "MIN": case "MAX": {
      const xs = vals().filter((v) => v != null).map((v) => num(v, name));
      if (!xs.length) return null;
      return xs.reduce((m, x) => ((name === "MIN" ? x.cmp(m) < 0 : x.cmp(m) > 0) ? x : m));
    }
    case "AVERAGE": {
      const xs = vals().filter((v) => v != null).map((v) => num(v, name));
      return xs.length ? xs.reduce((s, x) => s.add(x), new Dec(ZERO)).div(Dec.of(xs.length)) : null;
    }
    case "ABS": { const x = num(ev(args[0]), "ABS"); return x.n < ZERO ? x.neg() : x; }
    case "ROUND": return num(ev(args[0]), name).round(place(1), "half");
    case "ROUNDUP": return num(ev(args[0]), name).round(place(1), "up");
    case "ROUNDDOWN": return num(ev(args[0]), name).round(place(1), "down");
    case "DIVIDE": { const b = num(ev(args[1]), name); return b.isZero() ? (args[2] ? ev(args[2]) : null) : num(ev(args[0]), name).div(b); }
    case "PERCENT": { const b = num(ev(args[1]), name); return b.isZero() ? null : num(ev(args[0]), name).div(b).mul(Dec.of(100)); }
    case "IF": return truthy(ev(args[0])) ? ev(args[1]) : args[2] ? ev(args[2]) : null;
    case "AND": return vals().every(truthy);
    case "OR": return vals().some(truthy);
    case "NOT": return !truthy(ev(args[0]));
    case "ISBLANK": { const v = ev(args[0]); return v == null || v === ""; }
    case "IFBLANK": { const v = ev(args[0]); return v == null || v === "" ? ev(args[1]) : v; }
    case "DAYS": { const [a, b] = vals().map((v) => dateOf(v, name)); return a && b ? Dec.of(BigInt(Math.round((a.getTime() - b.getTime()) / 86400000))) : null; }
    case "MONTHS": {
      const [a, b] = vals().map((v) => dateOf(v, name));
      if (!a || !b) return null;
      let m = (a.getUTCFullYear() - b.getUTCFullYear()) * 12 + a.getUTCMonth() - b.getUTCMonth();
      if (m > 0 && a.getUTCDate() < b.getUTCDate()) m -= 1;
      if (m < 0 && a.getUTCDate() > b.getUTCDate()) m += 1;
      return Dec.of(BigInt(m));
    }
    case "ADDDAYS": { const d = dateOf(ev(args[0]), name); if (!d) return null; d.setUTCDate(d.getUTCDate() + num(ev(args[1]), name).round(0).toNumber()); return iso(d); }
    case "ADDMONTHS": {
      const d = dateOf(ev(args[0]), name); if (!d) return null;
      const n = num(ev(args[1]), name).round(0).toNumber(), day = d.getUTCDate();
      d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n);
      d.setUTCDate(Math.min(day, new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()));
      return iso(d);
    }
    case "YEAR": case "MONTH": case "DAY": {
      const d = dateOf(ev(args[0]), name); if (!d) return null;
      return Dec.of(BigInt(name === "YEAR" ? d.getUTCFullYear() : name === "MONTH" ? d.getUTCMonth() + 1 : d.getUTCDate()));
    }
    case "FY": { const d = dateOf(ev(args[0]), name); if (!d) return null; const y = d.getUTCMonth() >= 3 ? d.getUTCFullYear() : d.getUTCFullYear() - 1; return `FY${y}-${String((y + 1) % 100).padStart(2, "0")}`; }
    case "TODAY": return { date: today };
    case "CONCAT": return vals().map(text).join("");
    case "LEN": return Dec.of(BigInt(text(ev(args[0])).length));
    case "UPPER": return text(ev(args[0])).toUpperCase();
    case "LOWER": return text(ev(args[0])).toLowerCase();
    case "TEXT": { const v = ev(args[0]); return v == null ? "" : args[1] ? num(v, "TEXT").toFixed(place(1)) : text(v); }
    case "SUMLINES": case "COUNTLINES": {
      const key = (args[0] as { name: string }).name;
      const xs = (rec.lines ?? []).map((l) => l[key] ?? null).filter((v) => v != null && !isErr(v));
      return name === "COUNTLINES" ? Dec.of(BigInt(xs.length)) : xs.reduce<Dec>((s, v) => s.add(num(v as Value, "SUMLINES")), new Dec(ZERO));
    }
  }
  throw new FormulaError(`${name} is not a known function`);
}

// ---------- stored values and display ----------
/** A stored value (jsonb from budget_custom_values) as a formula input. */
export function toValue(field: FieldDef, stored: unknown, names: Record<string, string> = {}): Value {
  if (stored == null) return null;
  const kind = fieldKind(field);
  if (kind === "number") return Dec.parse(String(stored));
  if (kind === "bool") return Boolean(stored);
  if (kind === "date") return { date: String(stored) };
  if (Array.isArray(stored)) return stored.join(", ");
  if (["user", "department", "tower"].includes(field.field_type)) return names[`${field.field_type}:${stored}`] ?? String(stored);
  return String(stored);
}

const inr2 = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Text shown on screens and reports. */
export function display(field: FieldDef, v: Value | ErrorVal | undefined): string {
  if (v == null) return "";
  if (isErr(v)) return "Error";
  const type = field.field_type === "formula" ? field.result_type ?? "number" : field.field_type;
  if (v instanceof Dec) {
    const places = type === "integer" ? 0 : type === "amount_cr" || type === "amount_inr" ? 2 : field.options?.decimals ?? 2;
    const s = v.toFixed(places);
    const [i, f] = s.replace("-", "").split(".");
    const grouped = new Intl.NumberFormat("en-IN").format(BigInt(i)) + (f ? "." + f : "");
    const out = (s.startsWith("-") ? "-" : "") + grouped;
    return type === "percent" ? out + "%" : type === "amount_inr" ? "₹" + out : out + (field.options?.unit ? ` ${field.options.unit}` : "");
  }
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (isDate(v)) {
    const [y, m, d] = v.date.split("-");
    return type === "month" ? new Date(`${y}-${m}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" }) : `${d}/${m}/${y}`;
  }
  return String(v);
}
export const errorOf = (v: unknown) => (isErr(v) ? v.error : null);
export { inr2 };
