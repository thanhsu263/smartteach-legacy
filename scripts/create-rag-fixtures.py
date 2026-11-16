"""Rebuild the self-authored Unicode PDF fixture (reportlab, local embeddable font)."""
from pathlib import Path
import argparse
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

parser = argparse.ArgumentParser()
parser.add_argument("--font", default="C:/Windows/Fonts/arial.ttf")
args = parser.parse_args()
font_path = Path(args.font)
if not font_path.is_file():
    raise SystemExit("Pass --font pointing to an embeddable Unicode TTF.")
root = Path(__file__).resolve().parents[1]
output = root / "tests/fixtures/rag/smartteach-vietnamese.pdf"
pdfmetrics.registerFont(TTFont("FixtureUnicode", str(font_path)))
document = canvas.Canvas(str(output), pagesize=(595, 842), invariant=1)
document.setAuthor("SmartTeach test fixtures")
document.setTitle("Hướng dẫn SmartTeach — kiểm thử trích chữ")
document.setFont("FixtureUnicode", 19)
document.drawString(48, 780, "Hướng dẫn SmartTeach")
document.setFont("FixtureUnicode", 12)
for index, text in enumerate([
    "Giáo viên chọn Quiz của tôi để tạo và mở lại quiz đã lưu.",
    "Học sinh tham gia buổi chơi bằng mã PIN do giáo viên cung cấp.",
    "Tài liệu tự biên soạn cho kiểm thử parser; không có dữ liệu cá nhân.",
]):
    document.drawString(48, 740-index*27, text)
document.showPage()
document.save()
