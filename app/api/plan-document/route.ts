import { getSql } from "@/db";
import { ensurePlanDocumentSchema } from "@/lib/plan-document-db";
import { expectedChunkSize, validPlanDocumentSize } from "@/lib/plan-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const fail = (error: string, status = 400) =>
  Response.json({ error }, { status });

export async function POST(request: Request) {
  try {
    await ensurePlanDocumentSchema();
    const sql = getSql();
    const url = new URL(request.url);
    const token = request.headers.get("x-organization-token") || "";
    const orgs =
      await sql`SELECT id FROM organizations WHERE access_token=${token} AND archived=FALSE`;
    if (!orgs[0]) return fail("رابط الجهة غير صالح", 404);
    const orgId = String(orgs[0].id);
    if (url.searchParams.get("action") === "start") {
      const body = await request.json();
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name || name.length > 255 || /[\x00-\x1f]/.test(name))
        return fail("اسم الملف غير صالح");
      if (!validPlanDocumentSize(body.size))
        return fail(
          "يجب أن يكون الملف غير فارغ وبحجم أقل من ٥ ميجابايت. اضغط الملف قبل رفعه.",
        );
      const settings = await sql`SELECT year FROM project_settings WHERE id=1`;
      if (!settings[0]) return fail("تعذر تحميل إعدادات المشروع", 503);
      // Discard expired, unlinked uploads; never remove a document attached to a plan.
      await sql`DELETE FROM plan_documents d WHERE d.organization_id=${orgId} AND d.created_at < NOW() - INTERVAL '1 day' AND NOT EXISTS (SELECT 1 FROM annual_plans p WHERE p.document_id=d.id)`;
      const id = crypto.randomUUID();
      await sql`INSERT INTO plan_documents (id,organization_id,year,name,size) VALUES (${id},${orgId},${Number(settings[0].year)},${name},${body.size})`;
      return Response.json({ id, name, size: body.size });
    }
    const id = url.searchParams.get("id") || "";
    const docs =
      await sql`SELECT id,size,complete FROM plan_documents WHERE id=${id} AND organization_id=${orgId} AND year=(SELECT year FROM project_settings WHERE id=1) AND created_at > NOW() - INTERVAL '1 day'`;
    if (!docs[0])
      return fail("انتهت صلاحية الرفع. اختر الملف وأعد المحاولة.", 404);
    const doc = docs[0];
    if (url.searchParams.get("action") === "finish") {
      const chunks =
        await sql`SELECT chunk_index,octet_length(content) AS size FROM plan_document_chunks WHERE document_id=${id} ORDER BY chunk_index`;
      const count = Math.ceil(Number(doc.size) / (1024 * 1024));
      if (
        chunks.length !== count ||
        chunks.some(
          (c, i) =>
            Number(c.chunk_index) !== i ||
            Number(c.size) !== expectedChunkSize(Number(doc.size), i),
        )
      )
        return fail("رفع الملف غير مكتمل. أعد المحاولة.");
      await sql`UPDATE plan_documents SET complete=TRUE WHERE id=${id} AND organization_id=${orgId}`;
      return Response.json({ ok: true });
    }
    if (url.searchParams.get("action") !== "chunk" || doc.complete)
      return fail("طلب الرفع غير صالح");
    const index = Number(url.searchParams.get("index"));
    const expected = expectedChunkSize(Number(doc.size), index);
    if (!expected) return fail("جزء الملف غير صالح");
    const declared = Number(request.headers.get("content-length"));
    if (declared > 1024 * 1024)
      return fail("حجم جزء الملف أكبر من المسموح", 413);
    // Bound actual bytes too, including clients that omit Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return fail("جزء الملف فارغ");
    const parts: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > expected) {
        await reader.cancel();
        return fail("حجم جزء الملف غير صالح", 413);
      }
      parts.push(value);
    }
    if (length !== expected) return fail("جزء الملف غير مكتمل");
    const bytes = Buffer.concat(parts);
    await sql`INSERT INTO plan_document_chunks (document_id,chunk_index,content) SELECT ${id},${index},decode(${bytes.toString("base64")},'base64') FROM plan_documents WHERE id=${id} AND complete=FALSE ON CONFLICT (document_id,chunk_index) DO UPDATE SET content=EXCLUDED.content`;
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Plan document upload failed", error);
    return fail(
      "تعذر رفع مستند الخطة. بيانات الخطة محفوظة في النموذج؛ أعد المحاولة.",
      500,
    );
  }
}

export async function GET(request: Request) {
  try {
    const sql = getSql();
    const url = new URL(request.url);
    const token = request.headers.get("x-organization-token") || "";
    const id = url.searchParams.get("id") || "";
    const index = Number(url.searchParams.get("index"));
    if (!Number.isInteger(index) || index < 0 || index >= 5)
      return fail("طلب التنزيل غير صالح");
    const rows =
      await sql`SELECT encode(c.content,'base64') AS content FROM plan_document_chunks c JOIN plan_documents d ON d.id=c.document_id JOIN organizations o ON o.id=d.organization_id WHERE d.id=${id} AND c.chunk_index=${index} AND d.complete=TRUE AND o.access_token=${token} AND o.archived=FALSE`;
    if (!rows[0]) return fail("المستند غير موجود أو الرابط غير صالح", 404);
    return Response.json(
      { content: rows[0].content },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Plan document download failed", error);
    return fail("تعذر تنزيل مستند الخطة. أعد المحاولة.", 500);
  }
}
