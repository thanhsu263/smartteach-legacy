import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { cleanupLive, localConfig, newTeacher } from "./helpers/live";
import { localSql, seedAdmin } from "../tests/db/admin-fixtures";
import { samplePdf, sampleDocx } from "../tests/fixtures/rag/sample-documents";
test.afterAll(cleanupLive);
test("real Cron invokes production parser after browser is closed", async ({
  request,
  baseURL,
}) => {
  test.setTimeout(110000);
  test.skip(
    !process.env.RAG_WORKER_SECRET,
    "Cần secret worker cục bộ cho probe lịch nền thật.",
  );
  const existing = localSql(
    "select count(*) from vault.secrets where name in ('smartteach_rag_worker_url','smartteach_rag_worker_secret');",
  ).trim();
  test.skip(
    existing !== "0",
    "Giữ cấu hình Vault cục bộ đã có; không ghi đè cấu hình của người dùng.",
  );
  const teacher = await newTeacher("cron-fixture");
  seedAdmin(teacher);
  const cfg = localConfig(),
    db = createClient(cfg.url, cfg.serviceRoleKey, {
      auth: { persistSession: false },
    });
  const pdf = samplePdf(2);
  let source = "",
    path = "";
  let docxSource = "",
    docxPath = "";
  try {
    execFileSync(process.execPath, ["scripts/configure-rag-cron.mjs"], {
      env: { ...process.env, APP_BASE_URL: baseURL },
      stdio: "pipe",
    });
    const reserved = await teacher.client.rpc("admin_reserve_document", {
      p_title: "Cron production PDF probe",
      p_format: "pdf",
      p_bytes: pdf.length,
    });
    expect(reserved.error).toBeNull();
    source = reserved.data.id;
    path = reserved.data.path;
    expect(
      (
        await db.storage
          .from("rag-documents")
          .upload(path, pdf, { contentType: "application/pdf" })
      ).error,
    ).toBeNull();
    expect(
      (
        await db.rpc("rag_complete_upload", {
          p_version: reserved.data.versionId,
          p_hash: createHash("sha256").update(pdf).digest("hex"),
        })
      ).error,
    ).toBeNull();
    // No HTTP to the worker. Cron + pg_net must run it independently of page traffic.
    await expect
      .poll(
        async () => {
          const metadata = await teacher.client.rpc("admin_rag_documents");
          const row = metadata.data?.items.find(
            (d: { id: string }) => d.id === source,
          );
          return row?.chunkCount;
        },
        { timeout: 85000, intervals: [1000, 2000, 3000] },
      )
      .toBe(2);
    const row = (
      await teacher.client.rpc("admin_rag_documents")
    ).data.items.find((d: { id: string }) => d.id === source);
    expect(row.status).toBe("embedding");
    expect(row.activeVersion).toBeNull();
    const ops = await teacher.client.rpc("rag_operations");
    expect(ops.data.heartbeat.last_run_at).toBeTruthy();
    const docx = sampleDocx();
    const docxReservation = await teacher.client.rpc("admin_reserve_document", {
      p_title: "Production DOCX probe",
      p_format: "docx",
      p_bytes: docx.length,
    });
    expect(docxReservation.error).toBeNull();
    docxSource = docxReservation.data.id;
    docxPath = docxReservation.data.path;
    expect(
      (
        await db.storage.from("rag-documents").upload(docxPath, docx, {
          contentType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await db.rpc("rag_complete_upload", {
          p_version: docxReservation.data.versionId,
          p_hash: createHash("sha256").update(docx).digest("hex"),
        })
      ).error,
    ).toBeNull();
    localSql(
      "update private.rag_jobs set next_run_at=now()-interval '100 days' where version_id='" +
        docxReservation.data.versionId +
        "';",
    );
    const docxStep = await request.post("/api/internal/rag/jobs/run", {
      data: {},
      headers: { Authorization: "Bearer " + process.env.RAG_WORKER_SECRET },
    });
    expect(docxStep.status()).toBe(200);
    expect((await docxStep.json()).state).toBe("extracted");
    const docxRow = (
      await teacher.client.rpc("admin_rag_documents")
    ).data.items.find((d: { id: string }) => d.id === docxSource);
    expect(docxRow.chunkCount).toBe(2);
    expect(docxRow.status).toBe("embedding");
    expect(
      (
        await request.post("/api/internal/rag/jobs/run", {
          data: {},
          headers: { Authorization: "Bearer wrong" },
        })
      ).status(),
    ).toBe(403);
  } finally {
    localSql(
      "delete from vault.secrets where name in ('smartteach_rag_worker_url','smartteach_rag_worker_secret');",
    );
    if (path) await db.storage.from("rag-documents").remove([path]);
    if (docxPath) await db.storage.from("rag-documents").remove([docxPath]);
    if (docxSource)
      localSql(
        "delete from private.rag_sources where id='" + docxSource + "';",
      );
    if (source)
      localSql("delete from private.rag_sources where id='" + source + "';");
  }
});
