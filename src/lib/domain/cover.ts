const COVER_PATH = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/cover-[A-Za-z0-9._-]+$/i;

export function coverObjectPath(weddingId: string, userId: string, extension: string) {
  const ext = extension.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  return `${weddingId}/${userId}/cover-${crypto.randomUUID()}.${ext}`;
}

export function isOwnCoverPath(weddingId: string, userId: string, path: string) {
  if (!COVER_PATH.test(path) || path.length > 240 || path.includes("..")) return false;
  return path.startsWith(`${weddingId}/${userId}/cover-`);
}
