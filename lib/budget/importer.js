// Excel import in the browser: a port of budget_tools/excel_import.py for SheetJS workbooks.
// Read a file with XLSX.read(bytes, {type: "array", cellFormula: true, cellNF: true}) and pass the workbook here.
// The payload from toImportPayload() / parseCostSheet() is what budget_import_version() and
// budget_import_incurred() take; tests/test_preview_importer.py checks it matches the Python importer.
(function (root) {
  "use strict";

  const PLACEHOLDERS = new Set(["xyz", "abc", "", "-"]);
  const DEPARTMENTS = {
    "sales & marketing": ["Sales & Marketing", "Sales & Marketing"],
    "admin & it": ["Admin & IT", "Admin & IT"],
    "land": ["Land", "Land"],
    "liasioning": ["Liaisoning", "Liaisoning"],
    "liasoning": ["Liaisoning", "Liaisoning"],
    "liaisoning": ["Liaisoning", "Liaisoning"],
    "finance": ["Finance", "Finance"],
    "contract & billing": ["Contract & Billing", "Construction"],
    "construction": ["Contract & Billing", "Construction"],
    "professional fee": ["Professional Fee", "Professional Fee"],
  };
  const SUBCATEGORY_RULES = [
    ["Construction", ["gst"], "GST on Construction Cost (Sale, Rehab & Other)"],
    ["Sales & Marketing", ["gst"], "GST on Brokerage & Sales"],
    ["Sales & Marketing", ["brokerage"], "Brokerage"],
    ["Sales & Marketing", [""], "Sales (Including Experience Center)"],
    ["Admin & IT", ["gst"], "GST on Admin & IT"],
    ["Admin & IT", ["=it"], "IT"],
    ["Admin & IT", ["other"], "Admin Other"],
    ["Admin & IT", [""], "Admin"],
    ["Professional Fee", ["gst"], "GST on Professional Fee"],
    ["Professional Fee", ["other construction"], "Professional Fee on Other Construction Area"],
    ["Professional Fee", [""], "Professional Fee on Sales Construction Area"],
    ["Land", ["stamp"], "Stamp Duty & Registration"],
    ["Land", ["reloc", "brokerage"], "Relocation / Brokerage Charges"],
    ["Land", ["rent rehab"], "Rent Rehab"],
    ["Land", ["rent"], "Rent Society"],
    ["Land", ["corpus rehab"], "Corpus Rehab"],
    ["Land", ["corpus"], "Corpus Society"],
    ["Land", ["collector"], "Collector NOC"],
    ["Land", ["coordinat"], "Coordinator Fee"],
    ["Land", ["pmc"], "PMC Fee"],
    ["Land", ["dm consideration"], "DM Consideration Cost"],
    ["Land", ["encro"], "Encroachment"],
    ["Land", ["land cost", "revenue"], "Land Cost / Revenue"],
    ["Land", ["infra"], "Infra Other than Site"],
    ["Land", [""], "Other Commitment"],
    ["Liaisoning", ["contingency"], "Infra (Contingency)"],
    ["Liaisoning", ["sra", "mcgm"], "SRA & MCGM Cost"],
    ["Liaisoning", ["tdr", "fungible", "fsi"], "TDR / Fungible / Additional FSI"],
    ["Liaisoning", ["pap"], "PAP Cost"],
    ["Liaisoning", ["ptc"], "PTC Cost"],
    ["Liaisoning", ["title"], "Title Fee"],
    ["Liaisoning", ["infra", "service"], "Infra / Service Cost"],
    ["Liaisoning", [""], "Other Commitment"],
    ["Finance", ["interest"], "Interest Cost (Incl. Loan Process Fee)"],
    ["Finance", ["itc"], "ITC Reversal on Account of Post OC Commercial Sale"],
    ["Finance", ["discount"], "GST Discount Given to Customer"],
    ["Finance", ["coordinator"], "GST on Coordinator Fee / Area"],
    ["Finance", ["transfer of dr", "dr transfer", "unsold"], "GST on DR Transfer / Unsold Inventory"],
    ["Finance", ["redevelopment", "slum", "rehab"], "GST on Redevelopment Slum"],
    ["Finance", ["existing member", "society"], "GST on Existing Member / Society"],
    ["Finance", ["bank guarantee"], "Bank Guarantee Commission & Security"],
    ["Finance", ["refund"], "Refund to Customer"],
    ["Finance", ["redemption"], "Redemption Premium"],
    ["Finance", ["mcgm"], "GST on MCGM Commitment"],
    ["Finance", ["tdr"], "GST on TDR"],
    ["Finance", [""], "GST on Other Commitment"],
  ];

  // Exact decimal text -> integer scaled by 10^places, rounded half away from zero (like Python's Decimal).
  function plain(s) {
    const m = /^(-?)(\d+)(?:\.(\d+))?e([+-]?\d+)$/i.exec(s);
    if (!m) return s;
    const digits = m[2] + (m[3] || ""), point = m[2].length + Number(m[4]);
    if (point <= 0) return `${m[1]}0.${"0".repeat(-point)}${digits}`;
    if (point >= digits.length) return m[1] + digits + "0".repeat(point - digits.length);
    return `${m[1]}${digits.slice(0, point)}.${digits.slice(point)}`;
  }
  function scaled(value, places) {
    const s = plain(String(value).trim());
    const neg = s.startsWith("-");
    const [i, f = ""] = s.replace("-", "").split(".");
    const frac = (f + "0".repeat(places + 1)).slice(0, places + 1);
    let n = BigInt(i || "0") * 10n ** BigInt(places) + BigInt(frac.slice(0, places) || "0");
    if (Number(frac[places]) >= 5) n += 1n;
    return Number(neg ? -n : n);
  }
  const paiseFromCr = (v) => scaled(v, 9);
  const paiseFromInr = (v) => scaled(v, 2);

  function clean(v) {
    if (v == null) return null;
    if (typeof v === "string") {
      const s = v.replace(/\s+/g, " ").trim();
      return PLACEHOLDERS.has(s.toLowerCase()) ? null : s;
    }
    return v;
  }
  const num = (v) => (typeof v === "number" ? v : null);

  function summarySubcategory(summaryCategory, category, subCategory, isTax) {
    if (summaryCategory === "Construction" && !isTax) return null;
    const text = `${category} ${subCategory || ""}`.toLowerCase().trim();
    for (const [cat, keywords, sub] of SUBCATEGORY_RULES) {
      if (cat !== summaryCategory) continue;
      for (const kw of keywords) {
        if (kw.startsWith("=")) { if (category.trim().toLowerCase() === kw.slice(1)) return sub; }
        else if (text.includes(kw)) return sub;
      }
    }
    return null;
  }

  // '=(G36*18%)*74%' in column G -> [[36], 18, 74]; null when not a cell-based % formula.
  function parseTax(formula, col) {
    if (typeof formula !== "string" || !formula.startsWith("=") || !formula.includes("%")) return null;
    const refRe = new RegExp(`\\$?${col}\\$?(\\d+)`, "g");
    const refs = [...formula.matchAll(refRe)].map((m) => Number(m[1]));
    const pcts = [...formula.matchAll(/(\d+(?:\.\d+)?)%/g)].map((m) => Number(m[1]));
    if (!refs.length || !pcts.length) return null;
    const stripped = formula.replace(refRe, "").replace(/\d+(?:\.\d+)?%/g, "");
    if (/\d/.test(stripped)) return null;
    const share = pcts.length > 1 ? pcts.slice(1).reduce((a, b) => a * b, 1) / 100 ** (pcts.length - 2) : 100;
    return [refs, pcts[0], Math.round(share * 1e4) / 1e4];
  }

  function sheetAccess(XLSX, wb, preferredSheetName) {
    let name = preferredSheetName;
    if (!name || !wb.Sheets[name]) {
      const sumSheet = wb.SheetNames.find((s) => s.toLowerCase() === "summary" || s.toLowerCase().startsWith("summary"));
      if (sumSheet && wb.Sheets[sumSheet]) {
        name = sumSheet;
      } else {
        const candidates = [];
        for (const s of wb.SheetNames) {
          const ws = wb.Sheets[s];
          if (!ws || !ws["!ref"]) continue;
          const range = XLSX.utils.decode_range(ws["!ref"]);
          let hasSr = false, hasBudget = false;
          for (let r = range.s.r; r <= Math.min(range.e.r, range.s.r + 20); r++) {
            for (let c = range.s.c; c <= Math.min(range.e.c, range.s.c + 15); c++) {
              const cell = ws[XLSX.utils.encode_cell({ r, c })];
              if (cell && typeof cell.v === "string") {
                const low = cell.v.toLowerCase().trim();
                if (low.startsWith("sr")) hasSr = true;
                if (low.includes("budget") || low.includes("ctc") || low.includes("amount")) hasBudget = true;
              }
            }
          }
          if (hasSr && hasBudget) candidates.push(s);
        }
        if (candidates.length > 0) {
          name = candidates[candidates.length - 1];
        }
      }
    }
    if (!name || !wb.Sheets[name]) name = wb.SheetNames[0];

    const ws = wb.Sheets[name];
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    const cell = (r, c) => ws[XLSX.utils.encode_cell({ r: r - 1, c: c - 1 })];
    const isDate = (x) => x && x.t === "n" && x.z && XLSX.SSF.is_date(x.z);
    const val = (r, c) => {
      const x = cell(r, c);
      if (!x || x.v == null || x.t === "z" || x.t === "e") return null;
      if (isDate(x) || x.t === "d") return { date: dateIso(XLSX, x) };
      if (x.t === "b") return Boolean(x.v);
      return x.v;
    };
    const frm = (r, c) => {
      const x = cell(r, c);
      if (!x) return null;
      if (x.f != null) return "=" + x.f;
      return val(r, c);
    };
    return { name, maxRow: range.e.r + 1, maxCol: range.e.c + 1, val, frm, letter: (c) => XLSX.utils.encode_col(c - 1) };
  }

  function dateIso(XLSX, x) {
    if (x.v instanceof Date) return x.v.toISOString().slice(0, 10);
    const d = XLSX.SSF.parse_date_code(x.v);
    return `${String(d.y).padStart(4, "0")}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const isDateVal = (v) => v && typeof v === "object" && "date" in v;
  const fmtDmy = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

  // Columns of the detail format that are read or recalculated; any other column is a custom field column.
  const STANDARD_HEADERS = [
    "sr", "department", "category", "sub", "psf", "intitial", "initial", "estimated ctc", "cost incurred",
    "balance", "variance", "remark", "budget utili", "util", "carpet area", "engg. construction area", "amount", "total amount"
  ];
  function extraColumns(S, headerRow, keep) {
    const out = [];
    for (let c = 1; c <= S.maxCol; c++) {
      const raw = S.val(headerRow, c);
      const name = raw == null ? "" : String(isDateVal(raw) ? raw.date : raw).replace(/\s+/g, " ").trim();
      if (name && keep(name, c)) out.push([c, name]);
    }
    return out;
  }
  // A custom field cell as sent to the database: dates as YYYY-MM-DD, text cleaned, numbers as they are.
  function extras(S, extraCols, r) {
    const out = {};
    let any = false;
    for (const [c, name] of extraCols) {
      let v = S.val(r, c);
      v = isDateVal(v) ? v.date : clean(v);
      if (v != null && v !== "") { out[name] = v; any = true; }
    }
    return any ? out : null;
  }

  function parseDetailWorkbook(XLSX, wb, fileName, preferredSheetName) {
    const S = sheetAccess(XLSX, wb, preferredSheetName);
    const { val, frm } = S;
    const warnings = [];
    let headerRow = null;
    for (let r = 1; r <= Math.min(S.maxRow, 25); r++) {
      if (String(frm(r, 1) == null ? "" : frm(r, 1)).trim().toLowerCase().startsWith("sr")) { headerRow = r; break; }
    }
    if (headerRow == null) throw new Error("This is not the detail budget format: no 'Sr. No.' header row");

    const cols = {};
    for (let c = 1; c <= S.maxCol; c++) {
      const h = String(frm(headerRow, c) == null ? "" : frm(headerRow, c)).trim().toLowerCase();
      if (h === "department" || h.startsWith("dept")) cols.dept = c;
      else if (h === "category") cols.cat = c;
      else if (h.startsWith("sub")) cols.sub = c;
      else if (h.startsWith("intitial budget") || h.startsWith("initial budget") || h.startsWith("original budget")) cols.initial = c;
      else if (h.startsWith("estimated ctc") || h.startsWith("total budget") || h === "amount (in.cr.)" || h === "amount (in cr.)" || h === "amount") cols.ctc = c;
      else if (h.startsWith("cost incurred") || h.startsWith("total expenses incurred") || h.startsWith("incurred")) cols.inc = c;
      else if (h.startsWith("remark")) cols.remark = c;
      else if (h.startsWith("carpet area")) cols.carpet = c;
      else if (h.includes("construction area") || h.includes("engg")) cols.eng = c;
      else if (h.startsWith("total amount")) cols.tot = c;
    }

    const isSummary = !cols.dept && cols.cat && cols.sub && (cols.ctc || cols.tot);
    if (isSummary) {
      if (!cols.ctc && cols.tot) cols.ctc = cols.tot;
      if (!cols.initial) cols.initial = cols.ctc;
    } else {
      if (!cols.initial && cols.ctc) cols.initial = cols.ctc;
      for (const k of ["dept", "cat", "sub", "ctc"]) {
        if (!cols[k]) throw new Error(`The header row has no ${{ dept: "Department", cat: "Category", sub: "Sub Category", ctc: "Estimated CTC/Total Budget" }[k]} column`);
      }
    }

    const letter = Object.fromEntries(Object.entries(cols).map(([k, c]) => [k, S.letter(c)]));
    const extraCols = extraColumns(S, headerRow, (name) => !STANDARD_HEADERS.some((p) => name.toLowerCase().startsWith(p)));

    // Project Name, As On Date, Revision Number
    let asOn = null, number = 1, name = "Project";
    for (let r = 1; r < headerRow; r++) {
      for (let c = 1; c <= S.maxCol; c++) {
        const cellV = frm(r, c);
        const str = String(cellV || "").trim();
        if (!str) continue;
        if (str.toLowerCase().startsWith("project name :-") || str.toLowerCase().startsWith("project name:")) {
          const valB = clean(val(r, c + 1)) || str.split(/[:-]/)[1];
          if (valB) name = String(valB).trim();
        } else if (str.toLowerCase().includes("_ as on ") || str.toLowerCase().includes(" as on ")) {
          const pName = str.split(/_|\bas on\b/i)[0].replace(/^chandak\b/i, "").replace(/_+/g, " ").trim();
          if (/[A-Za-z]{2,}/.test(pName)) name = pName;
        }
        const mD = /(\d{1,2})[/_-](\d{1,2})[/_-](\d{4})/.exec(str);
        if (mD && !asOn) asOn = `${mD[3]}-${mD[2].padStart(2, "0")}-${mD[1].padStart(2, "0")}`;
        const mR = /[_-]R(\d+)(?:[_\-\.\s]|$)/i.exec(str) || /\bR(\d+)\b/i.exec(str);
        if (mR && number === 1) number = Number(mR[1]);
        if (str.toLowerCase() === "date" && c < S.maxCol) {
          const nxt = val(r, c + 1);
          if (isDateVal(nxt)) asOn = nxt.date;
          else if (typeof nxt === "number" && nxt > 30000 && nxt < 60000) {
            try {
              const d = XLSX.SSF.parse_date_code(nxt);
              asOn = `${String(d.y).padStart(4, "0")}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
            } catch (_) {}
          }
        }
      }
    }

    if (name === "Project") {
      const sheetName = S.name.split("_")[0].trim();
      if (/[A-Za-z]{2,}/.test(sheetName) && sheetName.toLowerCase() !== "summary") name = sheetName;
    }
    if (fileName) {
      const fnR = /[_-]R(\d+)(?:[_\-\.\s]|$)/i.exec(fileName);
      if (fnR) number = Number(fnR[1]);
      const fnD = /(\d{1,2})_(\d{1,2})_(\d{4})/.exec(fileName) || /(\d{1,2})-(\d{1,2})-(\d{4})/.exec(fileName);
      if (fnD && !asOn) asOn = `${fnD[3]}-${fnD[2].padStart(2, "0")}-${fnD[1].padStart(2, "0")}`;
      if (name === "Project") {
        const fnName = fileName.split(/_|-/)[0].trim();
        if (fnName) name = fnName;
      }
    }
    if (!asOn) asOn = new Date().toISOString().slice(0, 10);

    const areas = { commitments: [] };
    const subprojects = [];
    for (let r = 1; r < headerRow; r++) {
      const label = String(frm(r, 1) || "");
      const low = label.toLowerCase();
      let firstNum = null;
      for (let c = 2; c <= S.maxCol; c++) { const n = num(val(r, c)); if (n != null) { firstNum = n; break; } }
      if (low.includes("construction area") && low.includes("engineering")) areas.eng_area = firstNum;
      else if (low.includes("construction area") && low.includes("design")) areas.design_area = firstNum;
      else if (low.includes("total sale value")) areas.sale_value_cr = firstNum;
      else if (low.startsWith("carpet area")) {
        const headsMap = {};
        for (let c = 2; c <= S.maxCol; c++) headsMap[String(frm(r, c) || "").trim().toLowerCase()] = c;
        const cTotal = headsMap["total carpet area"], cSale = headsMap["total carpet area for sale"], cSold = headsMap["sold"];
        if (cTotal) areas.total_carpet = num(val(r + 1, cTotal));
        if (cSold) areas.sold_area = num(val(r + 1, cSold));
        if (cSale) {
          const f = frm(r + 1, cSale);
          const totalRef = cTotal ? `${S.letter(cTotal)}${r + 1}` : null;
          if (typeof f === "string" && totalRef && f.replace(/ /g, "").startsWith(`=${totalRef}`)) {
            const deductions = [...f.slice(totalRef.length + 1).matchAll(/-\s*(\d+(?:\.\d+)?)/g)].map((x) => x[1]);
            deductions.forEach((d, i) => areas.commitments.push({ name: `Commitment ${i + 1}`, area: Number(d) }));
            warnings.push(`Sale carpet area deductions ${deductions.join(", ")} were typed into the formula ${f}; imported as named commitments to be labelled.`);
          } else if (areas.total_carpet && num(val(r + 1, cSale)) != null) {
            const diff = areas.total_carpet - num(val(r + 1, cSale));
            if (diff) areas.commitments.push({ name: "Commitments", area: diff });
          }
        }
      } else if (low.startsWith("oc date")) {
        let when = null;
        for (let c = 2; c <= S.maxCol; c++) {
          const v = val(r, c);
          if (isDateVal(v)) { when = v.date; break; }
          if (typeof v === "number" && v > 30000 && v < 60000) {
            try {
              const d = XLSX.SSF.parse_date_code(v);
              when = `${String(d.y).padStart(4, "0")}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
              break;
            } catch (_) {}
          }
        }
        let tower = label.slice(7).replace(/[_\s]+/g, " ").trim();
        if (!tower || tower.toLowerCase() === "tower") tower = "";
        const n = subprojects.length + 1;
        let remark = null;
        for (let c = S.maxCol; c > 1; c--) { const v = val(r, c); if (typeof v === "string" && clean(v)) { remark = clean(v); break; } }
        // a named tower keeps its name ("OC Date Tower 1", as the app exports it); a blank one becomes Tower n
        let tName = tower || `Tower ${n}`;
        if (subprojects.some((x) => x.name.toLowerCase() === tName.toLowerCase())) tName = `${tName} ${n}`;
        subprojects.push({ key: `s${n}`, name: tName, type: null, oc_date: when, remark, sort: n });
      }
    }
    if (subprojects.some((s) => !/[A-Za-z]{2,}/.test(s.name.replace("Tower", "")))) {
      warnings.push('Tower names in the OC Date rows were blank ("Tower __"); imported as Tower 1, Tower 2 and so on, to be renamed.');
    }

    const departments = [], deptKeys = {};
    const heads = [], lines = [], entries = [];
    const rowHeads = {}, groupChildren = {}, taxRows = [];
    let lastRow = null;
    for (let r = headerRow + 1; r <= S.maxRow; r++) {
      const r1 = String(frm(r, 1) || "").trim().toLowerCase();
      if (r1 === "total" || r1.startsWith("total ")) { lastRow = r; break; }
    }
    if (lastRow == null) lastRow = S.maxRow;

    const deptKey = (raw) => {
      const [canonical, summary] = DEPARTMENTS[raw.trim().toLowerCase()] || [raw.trim(), raw.trim()];
      if (!(canonical in deptKeys)) {
        const key = `d${departments.length + 1}`;
        deptKeys[canonical] = key;
        departments.push({ key, name: canonical, summary_category: summary, sort: departments.length + 1 });
      }
      return deptKeys[canonical];
    };

    if (isSummary) {
      let currentDept = null;
      let totEngArea = 0, totCarpetArea = 0;
      for (let r = headerRow + 1; r < lastRow; r++) {
        const sr = frm(r, cols.sr);
        const catRaw = clean(frm(r, cols.cat));
        const sub = clean(frm(r, cols.sub));
        if (catRaw && (!sub || typeof sr === "number")) {
          currentDept = catRaw;
          continue;
        }
        if (!sub) continue;
        const dk = deptKey(currentDept || "General");
        const key = `h${heads.length + 1}`;
        const ctcFormula = frm(r, cols.ctc);
        const ctcVal = num(val(r, cols.ctc)) || 0;
        const taxRule = parseTax(ctcFormula, letter.ctc);
        const isTax = Boolean(taxRule) || sub.toLowerCase().startsWith("gst");
        const dept = departments.find((d) => d.key === dk);

        const head = {
          key, department: dk, category: sub, sub_category: null, note: null, sort: heads.length + 1,
          is_tax: isTax, tax_rate_pct: taxRule ? taxRule[1] : (isTax ? 18 : null),
          tax_share_pct: taxRule ? taxRule[2] : (isTax ? 100 : null), tax_base: [],
        };
        head.summary_subcategory = summarySubcategory(dept.summary_category, dept.name, sub, isTax);
        heads.push(head);
        rowHeads[r] = [key];

        const line = {
          head: key, subproject: null,
          initial: isTax ? null : paiseFromCr(ctcVal),
          ctc: isTax ? null : paiseFromCr(ctcVal),
          incurred_override: null,
          remark: cols.remark ? clean(frm(r, cols.remark)) : null
        };
        lines.push(line);
        if (isTax && taxRule) taxRows.push([head, taxRule[0]]);

        if (dept.summary_category === "Construction" && !isTax) {
          const cArea = cols.carpet ? num(val(r, cols.carpet)) : null;
          const eArea = cols.eng ? num(val(r, cols.eng)) : null;
          if (cArea) totCarpetArea += cArea;
          if (eArea) totEngArea += eArea;
          if (sub.toLowerCase().includes("building") || sub.toLowerCase().includes("tower")) {
            const sIdx = subprojects.length + 1;
            subprojects.push({ key: `s${sIdx}`, name: sub, type: null, oc_date: null, sort: sIdx });
          }
        }
      }
      if (!areas.eng_area && totEngArea > 0) areas.eng_area = totEngArea;
      if (!areas.total_carpet && totCarpetArea > 0) areas.total_carpet = totCarpetArea;

    } else {
      let group = null;
      for (let r = headerRow + 1; r < lastRow; r++) {
        const sr = frm(r, 1);
        const deptRaw = clean(frm(r, cols.dept));
        const cat = clean(frm(r, cols.cat));
        const sub = clean(frm(r, cols.sub));
        const gFormula = cols.initial ? frm(r, cols.initial) : null;
        let dk, category, subCategory;
        if (typeof sr === "number" && deptRaw) {
          dk = deptKey(deptRaw);
          const g = /^=SUM\(\$?[A-Z]+\$?(\d+):\$?[A-Z]+\$?(\d+)\)$/i.exec(String(gFormula || "").replace(/ /g, ""));
          if (g) {
            group = { dept: dk, category: cat, row: r };
            groupChildren[r] = Array.from({ length: Number(g[2]) - Number(g[1]) + 1 }, (_, i) => Number(g[1]) + i);
            continue;
          }
          group = null;
          category = cat || deptRaw; subCategory = null;
        } else {
          if (!(cat || sub) || group == null) continue;
          dk = group.dept;
          if (cat) { category = cat; subCategory = sub; }
          else { category = group.category || sub; subCategory = group.category ? sub : null; }
        }
        let note = null;
        if (subCategory && subCategory.startsWith("*")) { note = subCategory.replace(/^[*\s]+/, "").trim(); subCategory = null; }

        const key = `h${heads.length + 1}`;
        const tax = {
          initial: cols.initial ? parseTax(frm(r, cols.initial), letter.initial) : null,
          ctc: parseTax(frm(r, cols.ctc), letter.ctc),
          inc: cols.inc ? parseTax(frm(r, cols.inc), letter.inc) : null
        };
        const rule = tax.ctc || tax.initial || tax.inc;
        const dept = departments.find((d) => d.key === dk);
        const head = {
          key, department: dk, category, sub_category: subCategory, note, sort: heads.length + 1, is_tax: Boolean(rule),
          tax_rate_pct: rule ? rule[1] : null, tax_share_pct: rule ? rule[2] : null, tax_base: [],
        };
        head.summary_subcategory = summarySubcategory(dept.summary_category, category, subCategory, head.is_tax);
        heads.push(head);
        rowHeads[r] = [key];

        const line = { head: key, subproject: null, remark: cols.remark ? clean(frm(r, cols.remark)) : null };
        for (const [measure, col] of [["initial", "initial"], ["ctc", "ctc"]]) {
          const cIdx = cols[col];
          const v = cIdx ? num(val(r, cIdx)) || 0 : 0;
          if (head.is_tax && tax[col]) {
            line[measure] = null;
            if (tax[col][1] !== rule[1] || tax[col][2] !== rule[2]) {
              warnings.push(`${letter[col]}${r} (${category}) used ${tax[col][1]}% x ${tax[col][2]}%; standardised to the rule ${rule[1]}% x ${rule[2]}.`);
            }
          } else {
            line[measure] = paiseFromCr(v);
            if (head.is_tax) warnings.push(`${letter[col]}${r} (${category}) was typed as ${frm(r, cols[col])}; kept as a manual amount to review.`);
          }
        }
        const incV = cols.inc ? num(val(r, cols.inc)) || 0 : 0;
        const incF = cols.inc ? frm(r, cols.inc) : null;
        line.incurred_override = null;
        if (head.is_tax && !tax.inc) {
          line.incurred_override = paiseFromCr(incV);
          warnings.push(`${letter.inc}${r} (${category}) was typed as ${incF}; kept as a manual amount to review.`);
        }
        if (!head.is_tax) {
          let ref = `${S.name} as on ${fmtDmy(asOn)}`;
          if (typeof incF === "string" && incF.startsWith("=")) ref += `; Excel ${letter.inc}${r}: ${incF.trim()}`;
          line.incurred_cumulative = paiseFromCr(incV);
          line.incurred_reference = ref;
          if (incV) entries.push({ head: key, subproject: null, month: asOn.slice(0, 8) + "01", amount: paiseFromCr(incV), reference: "Opening balance from " + ref });
        }
        const extra = extras(S, extraCols, r);
        if (extra) line.extra = extra;
        lines.push(line);
        if (head.is_tax && rule) taxRows.push([head, rule[0]]);
      }
    }

    for (const [head, refs] of taxRows) {
      const base = [];
      for (const ref of refs) for (const row of groupChildren[ref] || [ref]) for (const k of rowHeads[row] || []) if (k !== head.key) base.push(k);
      head.tax_base = base;
    }

    const cleanProjectCode = (name.replace(/^Chandak\s+/i, "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 12)) || "PROJECT";
    const totalCtc = isSummary
      ? (cols.tot ? num(val(lastRow, cols.tot)) : (cols.ctc ? num(val(lastRow, cols.ctc)) : null))
      : (cols.ctc ? num(val(lastRow, cols.ctc)) : null);
    const totalInitial = isSummary
      ? totalCtc
      : (cols.initial ? num(val(lastRow, cols.initial)) : totalCtc);
    const totalIncurred = cols.inc ? num(val(lastRow, cols.inc)) : (isSummary ? 0 : null);

    return {
      source: fileName,
      project: { code: cleanProjectCode, name, location: null, fy_start_month: 4 },
      departments, subprojects, cost_heads: heads,
      version: { number, as_on: asOn, status: "approved", reason: `Imported from ${S.name} (revision R${number})`, areas, category_reasons: {} },
      lines, entries, warnings,
      excel_totals_cr: {
        initial: totalInitial,
        ctc: totalCtc,
        incurred: totalIncurred
      },
    };
  }

  function toImportPayload(data) {
    const depts = Object.fromEntries(data.departments.map((d) => [d.key, d]));
    const v = data.version;
    const areas = {};
    for (const [k, x] of Object.entries(v.areas)) if (x != null && !(Array.isArray(x) && !x.length)) areas[k] = x;
    return {
      kind: "detail", file: data.source, project: { name: data.project.name, code: data.project.code },
      as_on: v.as_on, revision: v.number, areas,
      subprojects: data.subprojects.map((s) => ({ name: s.name, oc_date: s.oc_date })),
      cost_heads: data.cost_heads.map((h) => ({
        key: h.key, department: depts[h.department].name, summary_category: depts[h.department].summary_category,
        category: h.category, sub_category: h.sub_category, note: h.note, summary_subcategory: h.summary_subcategory,
        sort: h.sort, is_tax: h.is_tax, tax_rate_pct: h.tax_rate_pct, tax_share_pct: h.tax_share_pct, tax_base: h.tax_base,
      })),
      lines: data.lines.map((l) => ({ head: l.head, initial: l.initial, ctc: l.ctc, incurred_override: l.incurred_override, remark: l.remark, ...(l.extra ? { extra: l.extra } : {}) })),
      incurred: data.lines.filter((l) => "incurred_cumulative" in l).map((l) => ({ head: l.head, amount: l.incurred_cumulative, reference: l.incurred_reference })),
      warnings: data.warnings, sheet_totals_cr: data.excel_totals_cr,
    };
  }

  const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  const COST_HEADERS = [
    ["sub_category", ["sub-category", "sub category", "subcategory"]],
    ["month", ["month", "period"]],
    ["department", ["department", "dept"]],
    ["category", ["category"]],
    ["tower", ["tower", "subproject", "building"]],
    ["amount", ["amount"]],
    ["reference", ["reference", "ref", "bill", "voucher"]],
  ];
  const pad2 = (n) => String(n).padStart(2, "0");
  function toMonth(v) {
    if (isDateVal(v)) return v.date.slice(0, 8) + "01";
    const s = String(v == null ? "" : v).trim().toLowerCase();
    let m = /^(\d{4})-(\d{1,2})(?:-\d{1,2})?(?:[ t].*)?$/.exec(s);
    if (m) return `${m[1]}-${pad2(m[2])}-01`;
    m = /^(?:\d{1,2}[/-])?(\d{1,2})[/-](\d{4})$/.exec(s);
    if (m) return `${m[2]}-${pad2(m[1])}-01`;
    m = /^([a-z]{3})[a-z]*[\s'-]*(\d{2}|\d{4})$/.exec(s);
    if (m && MONTHS[m[1]]) { const y = Number(m[2]); return `${y < 100 ? y + 2000 : y}-${pad2(MONTHS[m[1]])}-01`; }
    return null;
  }
  function amountPaise(v) {
    if (typeof v === "number") return paiseFromInr(v);
    const s = String(v == null ? "" : v).trim().toLowerCase().replace(/[,\s₹]|rs\.?|inr/g, "");
    return /^-?\d+(\.\d+)?$/.test(s) ? paiseFromInr(s) : null;
  }

  function parseCostSheet(XLSX, wb, fileName) {
    let targetSheet = wb.SheetNames[0];
    for (const name of wb.SheetNames) {
      const ws = wb.Sheets[name];
      if (!ws || !ws["!ref"]) continue;
      const range = XLSX.utils.decode_range(ws["!ref"]);
      const texts = [];
      for (let r = range.s.r; r <= Math.min(range.e.r, range.s.r + 15); r++) {
        for (let c = range.s.c; c <= Math.min(range.e.c, range.s.c + 15); c++) {
          const cell = ws[XLSX.utils.encode_cell({ r, c })];
          if (cell && typeof cell.v === "string") texts.push(cell.v.toLowerCase().trim());
        }
      }
      if (texts.includes("month") && texts.some((t) => t.startsWith("amount"))) {
        targetSheet = name;
        break;
      }
    }
    const S = sheetAccess(XLSX, wb, targetSheet);
    let headerRow = null, cols = {};
    for (let r = 1; r <= Math.min(S.maxRow, 15); r++) {
      const found = {};
      for (let c = 1; c <= S.maxCol; c++) {
        const h = String(S.val(r, c) == null ? "" : S.val(r, c)).trim().toLowerCase();
        for (const [field, names] of COST_HEADERS) {
          if (!(field in found) && names.some((n) => h.startsWith(n))) { found[field] = c; break; }
        }
      }
      if (["month", "department", "category", "amount"].every((k) => k in found)) { headerRow = r; cols = found; break; }
    }
    if (headerRow == null) throw new Error("No header row with Month, Department, Category and Amount columns");
    const used = new Set(Object.values(cols));
    const extraCols = extraColumns(S, headerRow, (name, c) => !used.has(c));
    const rows = [], errors = [];
    for (let r = headerRow + 1; r <= S.maxRow; r++) {
      const get = (f) => (f in cols ? S.val(r, cols[f]) : null);
      if (Object.keys(cols).every((f) => get(f) == null || get(f) === "")) continue;
      const month = toMonth(get("month")), amount = amountPaise(get("amount"));
      const dept = clean(get("department")), cat = clean(get("category"));
      let problem = null;
      const shown = (x) => (isDateVal(x) ? x.date : x);
      if (!month) problem = `month '${shown(get("month"))}' not recognised`;
      else if (amount == null || amount === 0) problem = `amount '${get("amount")}' is not a number`;
      else if (!dept || !cat) problem = "department and category are required";
      const row = { row: r, month, department: dept, category: cat, sub_category: clean(get("sub_category")), tower: clean(get("tower")), amount, reference: clean(get("reference")) };
      const extra = extras(S, extraCols, r);
      if (extra) row.extra = extra;
      if (problem) errors.push({ ...row, problem }); else rows.push(row);
    }
    return { kind: "cost", file: fileName, rows, errors };
  }

  function detectKind(XLSX, wb) {
    for (const name of wb.SheetNames) {
      const ws = wb.Sheets[name];
      if (!ws || !ws["!ref"]) continue;
      const range = XLSX.utils.decode_range(ws["!ref"]);
      const texts = [];
      for (let r = range.s.r; r <= Math.min(range.e.r, range.s.r + 30); r++) {
        for (let c = range.s.c; c <= Math.min(range.e.c, range.s.c + 15); c++) {
          const cell = ws[XLSX.utils.encode_cell({ r, c })];
          if (cell && typeof cell.v === "string") texts.push(cell.v.toLowerCase().trim());
        }
      }
      if (texts.includes("month") && texts.some((t) => t.startsWith("amount"))) return "cost";
      const hasSr = texts.some((t) => t.startsWith("sr"));
      const hasBudget = texts.some((t) =>
        t.startsWith("estimated ctc") ||
        t.includes("total budget") ||
        t.includes("amount (in.cr.)") ||
        t.includes("amount (in cr.)") ||
        t.includes("total amount") ||
        t.includes("budget amount")
      );
      if (hasSr && hasBudget) return "detail";
    }
    return null;
  }

  const api = { parseDetailWorkbook, toImportPayload, parseCostSheet, detectKind, paiseFromCr, paiseFromInr };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BudgetImporter = api;
})(typeof window !== "undefined" ? window : globalThis);
