import { strToU8, zipSync } from "fflate";
export function samplePdf(pages = 1) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [" +
      Array.from({ length: pages }, (_, i) => 4 + i * 2 + " 0 R").join(" ") +
      "] /Count " +
      pages +
      " >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  for (let i = 0; i < pages; i++) {
    const text =
      "BT /F1 16 Tf 40 700 Td (SmartTeach teacher guide page " +
      (i + 1) +
      ") Tj ET";
    objects.push(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents " +
        (5 + i * 2) +
        " 0 R >>",
      "<< /Length " + text.length + " >>\nstream\n" + text + "\nendstream",
    );
  }
  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((o, i) => {
    offsets.push(body.length);
    body += i + 1 + " 0 obj\n" + o + "\nendobj\n";
  });
  const xref = body.length;
  body +=
    "xref\n0 " +
    offsets.length +
    "\n0000000000 65535 f \n" +
    offsets
      .slice(1)
      .map((n) => String(n).padStart(10, "0") + " 00000 n \n")
      .join("") +
    "trailer\n<< /Size " +
    offsets.length +
    " /Root 1 0 R >>\nstartxref\n" +
    xref +
    "\n%%EOF";
  return strToU8(body);
}
export function sampleDocx() {
  return zipSync({
    "[Content_Types].xml": strToU8(
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    ),
    "word/document.xml": strToU8(
      '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hướng dẫn tạo quiz SmartTeach</w:t></w:r></w:p><w:p><w:r><w:t>Giáo viên chọn Quiz của tôi.</w:t></w:r></w:p></w:body></w:document>',
    ),
  });
}
