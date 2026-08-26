import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
import os
import re

def clean_xml_text(text):
    if not text:
        return ""
    # Strip XML incompatible control characters
    return re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F]', '', text)

def create_report_docx(filename):
    doc = Document()
    
    # Page Margins: 1 inch
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    def set_cell_background(cell, fill_color):
        tcPr = cell._element.get_or_add_tcPr()
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_color}"/>')
        tcPr.append(shd)

    def add_heading_styled(text, level):
        text = clean_xml_text(text)
        p = doc.add_paragraph()
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.name = 'Arial' if level <= 3 else 'Times New Roman'
        
        if level == 1:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(24)
            p.paragraph_format.space_after = Pt(12)
            run.font.size = Pt(18)
            run.font.color.rgb = RGBColor(30, 58, 138)
        elif level == 2:
            p.paragraph_format.space_before = Pt(16)
            p.paragraph_format.space_after = Pt(8)
            run.font.size = Pt(14)
            run.font.color.rgb = RGBColor(30, 58, 138)
        elif level == 3:
            p.paragraph_format.space_before = Pt(12)
            p.paragraph_format.space_after = Pt(6)
            run.font.size = Pt(12)
            run.font.color.rgb = RGBColor(51, 65, 85)
        else:
            p.paragraph_format.space_before = Pt(10)
            p.paragraph_format.space_after = Pt(4)
            run.font.size = Pt(11)
            run.font.color.rgb = RGBColor(71, 85, 105)
        return p

    def add_p(text, justify=True, space_after=6):
        text = clean_xml_text(text)
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.25
        if justify:
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

        r = p.add_run(text)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(12)
        r.font.color.rgb = RGBColor(15, 23, 42)
        return p

    def add_bullet(text):
        text = clean_xml_text(text)
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

        r = p.add_run(text)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(12)
        r.font.color.rgb = RGBColor(15, 23, 42)
        return p

    def add_table_grid(headers, rows_data):
        tbl = doc.add_table(rows=len(rows_data) + 1, cols=len(headers))
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        
        hdr_cells = tbl.rows[0].cells
        for i, header_text in enumerate(headers):
            hdr_cells[i].text = clean_xml_text(header_text.strip())
            set_cell_background(hdr_cells[i], "1E3A8A")
            p = hdr_cells[i].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for r in p.runs:
                r.bold = True
                r.font.name = 'Arial'
                r.font.size = Pt(9.5)
                r.font.color.rgb = RGBColor(255, 255, 255)

        for r_idx, row_values in enumerate(rows_data):
            row_cells = tbl.rows[r_idx + 1].cells
            bg_color = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
            for c_idx, val in enumerate(row_values):
                if c_idx < len(row_cells):
                    row_cells[c_idx].text = clean_xml_text(str(val).strip())
                    set_cell_background(row_cells[c_idx], bg_color)
                    p = row_cells[c_idx].paragraphs[0]
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    for r in p.runs:
                        r.font.name = 'Times New Roman'
                        r.font.size = Pt(9.5)
                        r.font.color.rgb = RGBColor(15, 23, 42)

        doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # Read markdown and build docx elements
    md_file = r"c:\Users\HomePC\Desktop\job-portal\job-portal\Final_Project_Report.md"
    if os.path.exists(md_file):
        with open(md_file, "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        in_table = False
        table_headers = []
        table_rows = []

        for line in lines:
            line_str = line.strip()
            if not line_str:
                if in_table and table_headers:
                    add_table_grid(table_headers, table_rows)
                    in_table = False
                    table_headers = []
                    table_rows = []
                continue

            if line_str.startswith("|"):
                parts = [p.strip() for p in line_str.split("|")[1:-1]]
                if not parts or all(set(p) <= set("-: ") for p in parts):
                    continue  # Separator line
                if not in_table:
                    in_table = True
                    table_headers = parts
                    table_rows = []
                else:
                    table_rows.append(parts)
                continue
            elif in_table:
                add_table_grid(table_headers, table_rows)
                in_table = False
                table_headers = []
                table_rows = []

            if line_str.startswith("```"):
                continue

            if line_str.startswith("# "):
                add_heading_styled(line_str[2:], 1)
            elif line_str.startswith("## "):
                add_heading_styled(line_str[3:], 2)
            elif line_str.startswith("### "):
                add_heading_styled(line_str[4:], 3)
            elif line_str.startswith("- ") or line_str.startswith("* "):
                add_bullet(line_str[2:])
            elif re.match(r'^\d+\.\s', line_str):
                add_bullet(re.sub(r'^\d+\.\s', '', line_str))
            elif not line_str.startswith("---"):
                add_p(line_str)

        if in_table and table_headers:
            add_table_grid(table_headers, table_rows)

    doc.save(filename)
    print(f"Successfully generated Word document: {filename}")

if __name__ == "__main__":
    out_docx = r"c:\Users\HomePC\Desktop\job-portal\job-portal\Final_Project_Report.docx"
    create_report_docx(out_docx)
