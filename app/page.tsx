import type { Metadata } from "next";
import { getSql } from "@/db";
import ProjectApp from "./project-app";
import ProjectTools from "./project-tools";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  if (
    !params.assessment ||
    !params.environment ||
    !["pre", "post"].includes(String(params.phase))
  )
    return {};
  const emptyIcon =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E";
  const metadata: Metadata = {
    title: "قياس البيئة التربوية",
    description: "نموذج قياس البيئة التربوية",
    icons: { icon: emptyIcon, shortcut: emptyIcon },
  };
  if (
    typeof params.assessment !== "string" ||
    typeof params.environment !== "string"
  )
    return metadata;
  try {
    const sql = getSql();
    const rows =
      await sql`SELECT e.name AS "environmentName" FROM learning_environments e JOIN organizations o ON o.id=e.organization_id WHERE e.id=${params.environment} AND o.access_token=${params.assessment} AND o.archived=FALSE`;
    if (rows[0]) metadata.title = String(rows[0].environmentName);
  } catch (error) {
    console.error("Assessment page metadata unavailable", error);
  }
  return metadata;
}

export default function Home() {
  return (
    <>
      <ProjectTools />
      <ProjectApp />
    </>
  );
}
