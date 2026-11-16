import { beforeAll, afterAll, it, expect } from "vitest";
import {
  signUp,
  cleanupUsers,
  admin,
  anon,
  buildQuiz,
  simpleQuestion,
  type TestUser,
} from "./helpers";
import { seedAdmin, localSql } from "./admin-fixtures";
let root: TestUser,
  teacher: TestUser,
  source: string,
  version: string,
  job: string,
  lease: string;
const vector = JSON.stringify([1, ...Array(767).fill(0)]);
beforeAll(async () => {
  root = await signUp("jobs-admin");
  teacher = await signUp("jobs-teacher");
  seedAdmin(root);
});
afterAll(async () => {
  if (source)
    localSql("delete from private.rag_sources where id='" + source + "';");
  await cleanupUsers();
});
it("concurrent reservations cannot exceed the document cap", async () => {
  const existing = Number(
    localSql(
      "select count(*) from private.rag_sources where kind='document' and deleted_at is null;",
    ).trim(),
  );
  const seeded = Array.from({ length: Math.max(0, 49 - existing) }, () =>
      crypto.randomUUID(),
    ),
    created: string[] = [];
  try {
    if (seeded.length)
      localSql(
        "insert into private.rag_sources(id,kind,title) values " +
          seeded
            .map((id) => "('" + id + "','document','Capacity fixture')")
            .join(",") +
          ";",
      );
    const results = await Promise.all(
      [1, 2].map(() =>
        root.client.rpc("admin_reserve_document", {
          p_title: "Concurrent capacity fixture",
          p_format: "pdf",
          p_bytes: 100,
        }),
      ),
    );
    for (const result of results)
      if (result.data?.id) created.push(result.data.id);
    expect(results.filter((r) => !r.error)).toHaveLength(
      existing >= 50 ? 0 : 1,
    );
    expect(results.some((r) => r.error?.code === "PT409")).toBe(true);
  } finally {
    const ids = [...seeded, ...created];
    if (ids.length)
      localSql(
        "delete from private.rag_sources where id in (" +
          ids.map((id) => "'" + id + "'").join(",") +
          ");",
      );
  }
});
it("private bucket and reservations deny teacher; one worker gets the lease", async () => {
  const args = { p_title: "Hướng dẫn kiểm thử", p_format: "pdf", p_bytes: 100 };
  expect(
    (await teacher.client.rpc("admin_reserve_document", args)).error?.code,
  ).toBe("42501");
  expect(
    (
      await teacher.client.storage
        .from("rag-documents")
        .upload("forbidden.pdf", new Uint8Array([1, 2]), {
          contentType: "application/pdf",
        })
    ).error,
  ).not.toBeNull();
  expect((await anon.storage.from("rag-documents").list()).data).toEqual([]);
  const reserved = await root.client.rpc("admin_reserve_document", args);
  expect(reserved.error).toBeNull();
  source = reserved.data.id;
  version = reserved.data.versionId;
  expect(
    (
      await admin.rpc("rag_complete_upload", {
        p_version: version,
        p_hash: "fixture",
      })
    ).error,
  ).toBeNull();
  localSql(
    "update private.rag_jobs set next_run_at=now()-interval '100 days' where version_id='" +
      version +
      "';",
  );
  const claims = await Promise.all(
    [1, 2].map(() => admin.rpc("rag_claim_job")),
  );
  expect(claims.map((x) => x.error).filter(Boolean)).toEqual([]);
  expect(claims.filter((x) => x.data)).toHaveLength(1);
  const claimed = claims.find((x) => x.data)!.data;
  expect(claimed.version.id).toBe(version);
  job = claimed.job.id;
  lease = claimed.job.lease_token;
  expect((await root.client.rpc("rag_claim_job")).error?.code).toBe("42501");
});
it("checkpoint fences stale token, persists chunks and activates only after embedding", async () => {
  const args = {
    p_job: job,
    p_lease: lease,
    p_chunks: [{ body: "Hướng dẫn tạo quiz", locator: { page: 1 } }],
    p_cursor: 1,
    p_done: true,
    p_chars: 19,
  };
  expect(
    (
      await admin.rpc("rag_checkpoint", {
        ...args,
        p_lease: crypto.randomUUID(),
      })
    ).error?.code,
  ).toBe("PT409");
  expect((await admin.rpc("rag_checkpoint", args)).error).toBeNull();
  expect((await admin.rpc("rag_checkpoint", args)).error?.code).toBe("PT409");
  const docs = (await root.client.rpc("admin_rag_documents")).data.items.find(
    (d: { id: string }) => d.id === source,
  );
  expect(docs.activeVersion).toBeNull();
  const claim = await admin.rpc("rag_claim_job");
  expect(claim.error).toBeNull();
  expect(claim.data.job.kind).toBe("embed");
  const pending = await admin.rpc("rag_pending_chunks", { p_version: version });
  expect(pending.data).toHaveLength(1);
  const final = await admin.rpc("rag_checkpoint", {
    p_job: job,
    p_lease: claim.data.job.lease_token,
    p_chunks: [{ id: pending.data[0].id, embedding: vector }],
    p_cursor: 1,
    p_done: true,
    p_chars: 0,
  });
  expect(final.error).toBeNull();
  expect(
    (await teacher.client.rpc("rag_source", { p_id: pending.data[0].id })).data
      .body,
  ).toContain("tạo quiz");
});
it("replacement retains old version; delete invalidates it and cancels stale worker", async () => {
  const replacement = await root.client.rpc("admin_reserve_document", {
    p_source: source,
    p_title: "Phiên bản 2",
    p_format: "pdf",
    p_bytes: 120,
  });
  expect(replacement.error).toBeNull();
  const docs = (await root.client.rpc("admin_rag_documents")).data.items.find(
    (d: { id: string }) => d.id === source,
  );
  expect(docs.activeVersion).toBe(version);
  expect(docs.generation).toBe(2);
  await admin.rpc("rag_complete_upload", {
    p_version: replacement.data.versionId,
    p_hash: "fixture-2",
  });
  localSql(
    "update private.rag_jobs set next_run_at=now()-interval '101 days' where version_id='" +
      replacement.data.versionId +
      "';",
  );
  const claim = await admin.rpc("rag_claim_job");
  expect(claim.data.version.id).toBe(replacement.data.versionId);
  expect(
    (
      await root.client.rpc("admin_delete_document", {
        p_id: source,
        p_generation: 2,
      })
    ).error,
  ).toBeNull();
  const stale = await admin.rpc("rag_checkpoint", {
    p_job: claim.data.job.id,
    p_lease: claim.data.job.lease_token,
    p_chunks: [{ body: "Must not publish", locator: { page: 1 } }],
    p_cursor: 1,
    p_done: true,
    p_chars: 16,
  });
  expect(stale.error?.code).toBe("PT409");
  expect(
    (
      await teacher.client.rpc("rag_retrieve", { p_embedding: vector })
    ).data.some((c: { sourceId: string }) => c.sourceId === source),
  ).toBe(false);
});
it("library sync excludes answers and current status immediately fences stale vectors", async () => {
  const quiz = await buildQuiz(teacher.client, "CANARY_PRIVATE", [
    simpleQuestion("Câu hỏi công khai"),
  ]);
  const submitted = await teacher.client.rpc("submit_quiz_publication", {
    p_quiz_id: quiz,
    p_title: "Học liệu",
    p_description: "",
    p_subject: "toan",
    p_grades: ["6"],
  });
  expect(submitted.error).toBeNull();
  expect(
    (
      await root.client.rpc("admin_moderate_publication", {
        p_id: submitted.data,
        p_status: "approved",
        p_reason: "Đã kiểm",
        p_expected_version: 1,
      })
    ).error,
  ).toBeNull();
  // Consume all prior outbox revisions, without committing any unrelated job work.
  localSql(
    "do $$ begin for i in 1..20 loop perform private.rag_sync_publications(); exit when exists(select 1 from private.rag_sources where publication_id='" +
      submitted.data +
      "');end loop;end;$$;",
  );
  const rows = JSON.parse(
    localSql(
      "select coalesce(json_agg(v),'[]') from private.rag_versions v join private.rag_sources s on s.id=v.source_id where s.publication_id='" +
        submitted.data +
        "';",
    ).trim(),
  );
  expect(rows.length).toBeGreaterThan(0);
  const section = await admin.rpc("rag_library_sections", {
    p_version: rows.at(-1).id,
  });
  expect(section.error).toBeNull();
  expect(JSON.stringify(section.data)).not.toContain("is_correct");
  expect(JSON.stringify(section.data)).not.toContain("CANARY_PRIVATE");
  expect(JSON.stringify(section.data)).toContain("Câu hỏi công khai");
});
