export type AccountFile = { bucket: string; path: string };

export function groupStoragePaths(files: readonly AccountFile[]): Map<string, string[]> {
  const grouped = new Map<string, Set<string>>();
  for (const file of files) {
    const bucket = file.bucket.trim();
    const path = file.path.trim();
    if (!bucket || !path) continue;
    const paths = grouped.get(bucket) ?? new Set<string>();
    paths.add(path);
    grouped.set(bucket, paths);
  }
  return new Map([...grouped].map(([bucket, paths]) => [bucket, [...paths]]));
}
