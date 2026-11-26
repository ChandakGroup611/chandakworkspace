"use client";

import { useEffect } from "react";

/**
 * Gives every cell of a `<table data-cards>` (AppTable with cardsOnPhone) a data-label taken
 * from its column header, so the phone layout in app/styles/table-cards.css can show each row
 * as a card with "Column: value" lines. Mounted once in the workspace shell; watches the page
 * for new or changed tables. Renders nothing and does nothing on pages without such tables.
 */
function labelTables(root: ParentNode) {
  root.querySelectorAll<HTMLTableElement>("table[data-cards]").forEach((table) => {
    const heads = Array.from(table.querySelectorAll<HTMLTableCellElement>("thead tr:first-child th"));
    if (!heads.length) return;
    // column index → header text (respecting colSpan on headers)
    const labels: string[] = [];
    heads.forEach((th) => {
      const text = (th.innerText || th.textContent || "").replace(/\s+/g, " ").trim();
      for (let i = 0; i < (th.colSpan || 1); i++) labels.push(text);
    });
    table.querySelectorAll<HTMLTableRowElement>("tbody tr").forEach((tr) => {
      let col = 0;
      Array.from(tr.cells).forEach((td) => {
        const label = td.colSpan > 1 ? "" : labels[col] ?? "";
        if (td.getAttribute("data-label") !== label) td.setAttribute("data-label", label);
        col += td.colSpan || 1;
      });
    });
  });
}

export function TableCardLabels() {
  useEffect(() => {
    let frame = 0;
    const run = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => labelTables(document));
    };
    run();
    const observer = new MutationObserver((records) => {
      // only react when a cards table might be involved
      if (records.some((r) => r.target instanceof Element && (r.target.closest("table[data-cards]") || r.target.querySelector?.("table[data-cards]")))) run();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
