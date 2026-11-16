// Run from the repository root with Node 24:
// node --conditions=react-server rag-documents/validate-corpus.mjs
// Calls the actual production extractor/chunker; no provider, DB or network.
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { extractDocx, MAX_BYTES } from "../src/lib/rag/extract.ts";
import { chunkSections } from "../src/lib/rag/chunking.ts";

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.dirname(root);
const readJson = async (name) => JSON.parse(await readFile(path.join(root, name), "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const normalize = (value) => value.normalize("NFC").replace(/\s+/g, " ").trim();
const corpus = await readJson("source/corpus.json");
const manifest = await readJson("manifest.json");
assert.equal(manifest.corpusSourceSha256, sha256(await readFile(path.join(root, "source/corpus.json"))));
assert.equal(corpus.documents.length, manifest.documents.length);
const output = [];
for (const item of manifest.documents) {
  const source = corpus.documents.find((d) => d.id === item.id);
  assert.ok(source, `Missing source ${item.id}`);
  const bytes = await readFile(path.join(root, item.uploadFile));
  assert.ok(bytes.byteLength < MAX_BYTES);
  assert.equal(sha256(bytes), item.sha256, `File changed ${item.id}`);
  for (const evidence of item.evidence) {
    assert.equal(sha256(await readFile(path.join(repo, evidence.path))), evidence.sha256,
      `Source changed; review and rebuild corpus: ${evidence.path}`);
  }
  const sections = await extractDocx(bytes);
  const chunks = chunkSections(sections);
  assert.equal(sections.length, 3 + source.blocks.length, `Unexpected paragraph splitting ${item.id}`);
  assert.equal(chunks.length, sections.length, `A complete answer was split ${item.id}`);
  for (const block of source.blocks) {
    const body = normalize(block.question.replace(/[ ?]+$/, "") + "? " + block.answer);
    const chunk = chunks.find((candidate) => normalize(candidate.body) === body);
    assert.ok(chunk, `Missing intact answer ${item.id}/${block.id}`);
    assert.ok(Number.isInteger(chunk.locator.paragraph) && chunk.locator.paragraph > 0);
  }
  assert.ok(chunks.every((chunk) => chunk.body.length <= 1200));
  assert.ok(!/[\uFFFD\u0000]/.test(sections.map((s) => s.text).join(" ")), "Unicode corruption");
  output.push({ id: item.id, bytes: bytes.length, sections: sections.length, chunks: chunks.length,
    answerBlocks: source.blocks.length, maxChunkCharacters: Math.max(...chunks.map((x) => x.body.length)) });
}
const evaluation = await readJson("evaluation/questions.json");
for (const test of evaluation.cases) {
  assert.ok(test.question.trim() && test.expected.length);
  for (const reference of test.sourceBlocks) {
    const [documentId, blockId] = reference.split("/");
    assert.ok(corpus.documents.find((d) => d.id === documentId)?.blocks.some((b) => b.id === blockId), reference);
  }
}
const report = { status: "passed", method: "production extractDocx + chunkSections; no Gemini calls",
  version: manifest.version, documents: output, totalChunks: output.reduce((s, d) => s + d.chunks, 0),
  evaluationCases: evaluation.cases.length, liveGeminiEvaluation: "not_run" };
await mkdir(path.join(root, "qa"), { recursive: true });
await writeFile(path.join(root, "qa/validation.json"), JSON.stringify(report, null, 2) + "\n");
process.stdout.write(JSON.stringify(report, null, 2) + "\n");
