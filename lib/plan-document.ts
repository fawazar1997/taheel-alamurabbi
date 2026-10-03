export const MAX_PLAN_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const PLAN_DOCUMENT_CHUNK_BYTES = 1024 * 1024;

export type PlanDocument = { id: string; name: string; size: number };

export function validPlanDocumentSize(size: number) {
  return (
    Number.isSafeInteger(size) && size > 0 && size < MAX_PLAN_DOCUMENT_BYTES
  );
}

export function expectedChunkSize(size: number, index: number) {
  const count = Math.ceil(size / PLAN_DOCUMENT_CHUNK_BYTES);
  if (!Number.isInteger(index) || index < 0 || index >= count) return 0;
  return Math.min(
    PLAN_DOCUMENT_CHUNK_BYTES,
    size - index * PLAN_DOCUMENT_CHUNK_BYTES,
  );
}
