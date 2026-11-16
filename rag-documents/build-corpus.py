"""Build editable Markdown and uploadable DOCX from the reviewed RAG corpus.

Run with a Python environment containing python-docx. No network or API keys.
Only files inside this directory are written. Source references are read-only.
"""

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    corpus = json.loads((ROOT / "source/corpus.json").read_text(encoding="utf-8"))
    (ROOT / "ready").mkdir(exist_ok=True)
    ids = set()
    entries = []
    for item in corpus["documents"]:
        slug = item["id"]
        assert re.fullmatch(r"\d{2}-[a-z0-9-]+", slug) and slug not in ids, slug
        ids.add(slug)
        for source in item["sources"]:
            path = (REPO / source).resolve()
            assert path.is_relative_to(REPO) and path.is_file(), source
        document = Document()
        # The stock Word template can carry a themed rule below Title.
        for border in list(document.styles.element.iter(qn("w:pBdr"))):
            border.getparent().remove(border)
        section = document.sections[0]
        section.page_width, section.page_height = Inches(8.5), Inches(11)
        section.top_margin = section.bottom_margin = Inches(0.7)
        section.left_margin = section.right_margin = Inches(0.8)
        for style_name in ("Normal", "Title", "Subtitle", "Heading 1", "Heading 2", "Header", "Footer"):
            style = document.styles[style_name]
            style.font.name = "Arial"
            style.font.color.rgb = RGBColor(0, 0, 0)
            style.element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:eastAsia"), "Arial")
        normal = document.styles["Normal"]
        normal.font.size = Pt(11)
        normal.paragraph_format.line_spacing = 1.12
        normal.paragraph_format.space_after = Pt(10)
        normal.paragraph_format.widow_control = True
        document.styles["Title"].font.size = Pt(21)
        document.styles["Title"].paragraph_format.space_after = Pt(10)
        document.styles["Title"].paragraph_format.keep_with_next = True
        document.add_paragraph(item["title"], style="Title")
        document.add_paragraph(item["summary"])
        metadata = document.add_paragraph(
            f"SmartTeach · Hướng dẫn giáo viên · Phiên bản {corpus['version']} \n"
            "Đối chiếu mã nguồn ngày 15/11/2026. Tính sẵn sàng của dịch vụ cần kiểm tra tại môi trường đang sử dụng."
        )
        for run in metadata.runs:
            run.font.size = Pt(9)
        blocks = []
        markdown = [f"# {item['title']}", "", item["summary"], "", f"Phiên bản {corpus['version']} · Đối chiếu mã nguồn 15/11/2026.", ""]
        block_ids = set()
        for block_index, block in enumerate(item["blocks"]):
            assert block["id"] not in block_ids, block["id"]
            block_ids.add(block["id"])
            question = block["question"].rstrip(" ?") + "?"
            text = question + "\n" + block["answer"]
            # A single Word paragraph keeps question + answer together in Mammoth.
            assert 80 < len(text) <= 1100, (slug, block["id"], len(text))
            p = document.add_paragraph()
            p.paragraph_format.keep_together = True
            # Keep two-page guides balanced instead of stranding one answer on page 2.
            if len(item["blocks"]) > 6 and block_index == 4:
                p.paragraph_format.page_break_before = True
            p.add_run(question).bold = True
            # Mammoth raw-text discards soft breaks, so preserve a real separator.
            p.add_run(" \n" + block["answer"])
            blocks.append({"id": block["id"], "question": question, "characters": len(text)})
            markdown.extend([f"## {block['question']}", "", block["answer"], ""])
        markdown.extend(["## Nguồn đối chiếu nội bộ", "", *[f"- `{s}`" for s in item["sources"]], ""])
        footer = section.footer.paragraphs[0]
        footer.alignment = 2
        footer.add_run("SmartTeach · Hướng dẫn giáo viên · ")
        field = OxmlElement("w:fldSimple")
        field.set(qn("w:instr"), "PAGE")
        footer._p.append(field)
        for run in footer.runs:
            run.font.size = Pt(9)
        # Do not add source paths to the ingestion document: provenance belongs in manifest.
        document.core_properties.title = item["title"]
        document.core_properties.subject = "Hướng dẫn sử dụng SmartTeach cho giáo viên"
        document.core_properties.author = "SmartTeach"
        document.core_properties.keywords = "SmartTeach, hướng dẫn, giáo viên, RAG"
        stamp = datetime(2026, 11, 16, tzinfo=timezone.utc)
        document.core_properties.created = stamp
        document.core_properties.modified = stamp
        docx_path = ROOT / "ready" / f"{slug}.docx"
        md_path = ROOT / "source" / f"{slug}.md"
        document.save(docx_path)
        md_path.write_text("\n".join(markdown), encoding="utf-8")
        entries.append({
            "id": slug, "title": item["title"], "version": corpus["version"],
            "uploadFile": f"ready/{slug}.docx", "editableFile": f"source/{slug}.md",
            "bytes": docx_path.stat().st_size, "sha256": digest(docx_path),
            "ragMetadata": {"subject": None, "grades": []},
            "blocks": blocks,
            "evidence": [{"path": source, "sha256": digest(REPO / source)} for source in item["sources"]],
        })
    manifest = {
        "schemaVersion": 1, "version": corpus["version"], "language": corpus["language"],
        "authoredOn": corpus["authoredOn"], "codeSnapshotDate": corpus["codeSnapshotDate"],
        "scope": corpus["scope"], "corpusSourceSha256": digest(ROOT / "source/corpus.json"),
        "status": "authored_local_not_uploaded", "containsSubjectTeachingMaterial": False,
        "liveGeminiEvaluation": "not_run", "documents": entries,
    }
    write_json(ROOT / "manifest.json", manifest)
    print(json.dumps({"documents": len(entries), "answerBlocks": sum(len(x["blocks"]) for x in entries),
                      "totalDocxBytes": sum(x["bytes"] for x in entries)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
