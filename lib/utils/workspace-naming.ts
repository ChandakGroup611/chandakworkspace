/**
 * Utility for enterprise hierarchical workspace and sub-workspace naming.
 * Follows the governance rule:
 * Level 1 (WS -> SW): WS "A", SW "B" -> "A - B"
 * Level 2 (SW -> Sub-SW): Parent "A - D" (or "D"), Sub-SW "E" -> "D - E"
 */

export function formatHierarchicalWorkspaceName(inputName: string, parentWorkspaceName?: string | null): string {
  const trimmedInput = (inputName || "").trim();
  if (!trimmedInput) return "";
  if (!parentWorkspaceName || !parentWorkspaceName.trim()) {
    return trimmedInput;
  }

  const trimmedParent = parentWorkspaceName.trim();
  // Extract immediate base name (e.g. if parent is "A - D", base is "D"; if parent is "SFDC", base is "SFDC")
  const parentParts = trimmedParent.split(/\s*[-–—]\s*/);
  const baseParent = parentParts[parentParts.length - 1].trim() || trimmedParent;

  const escapeRegex = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const fullParentEscaped = escapeRegex(trimmedParent);
  const baseParentEscaped = escapeRegex(baseParent);

  // Check if inputName already begins with full parent name or base parent name
  const fullPrefixRegex = new RegExp(`^${fullParentEscaped}\\s*[-–—:/]?\\s*`, 'i');
  const basePrefixRegex = new RegExp(`^${baseParentEscaped}\\s*[-–—:/]?\\s*`, 'i');

  let pureName = trimmedInput;
  if (fullPrefixRegex.test(pureName)) {
    pureName = pureName.replace(fullPrefixRegex, '').trim();
  } else if (basePrefixRegex.test(pureName)) {
    pureName = pureName.replace(basePrefixRegex, '').trim();
  }

  if (!pureName) {
    pureName = trimmedInput;
  }

  return `${baseParent} - ${pureName}`;
}

