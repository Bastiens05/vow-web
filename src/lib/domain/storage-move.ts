/** The path after the wedding id. Two files of one upload share this tail. */
export function storageTail(path: string): string {
  const slash = path.indexOf("/");
  return slash === -1 ? path : path.slice(slash + 1);
}

/**
 * Where a renamed document row should copy its bytes from.
 * Returns null when the object is already at the recorded path, or when several
 * objects share the tail and the choice would be a guess.
 */
export function orphanSource(target: string, objectNames: string[]): string | null {
  if (!target || objectNames.includes(target)) return null;
  const tail = storageTail(target);
  if (!tail || tail === target) return null;
  const matches = objectNames.filter((name) => name !== target && storageTail(name) === tail);
  return matches.length === 1 ? matches[0] : null;
}

export type RelocationOp = "select" | "insert" | "delete";

export type RelocationRow = { bucket: string; fromPath: string; toPath: string; moved: boolean };

/** Same rule as storage_relocation_allows. A normal upload is not a pending move, so this stays false. */
export function relocationAllows(
  operation: RelocationOp,
  bucket: string,
  name: string,
  rows: RelocationRow[],
  memberOfDestination: boolean,
): boolean {
  if (!memberOfDestination || !name) return false;
  return rows.some((row) => {
    if (row.moved || row.bucket !== bucket) return false;
    if (operation === "select") return row.fromPath === name || row.toPath === name;
    if (operation === "insert") return row.toPath === name;
    return row.fromPath === name;
  });
}

export function relocationPath(keepId: string, dropId: string, path: string): string | null {
  const prefix = `${dropId}/`;
  if (!path.startsWith(prefix) || keepId === dropId) return null;
  return `${keepId}/${path.slice(prefix.length)}`;
}
