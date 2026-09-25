"""Regenerate the scanned Long-stay SPECIFIC COMPETENCY forms as clean vector, fillable PDFs.

Layout metrics mirror the existing digital competency forms so every template in the
set shares the same geometry and the same AcroForm field names.
"""
import os, re, sys
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import Color, black
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase.pdfmetrics import stringWidth

sys.path.insert(0, os.path.dirname(__file__))
from specific import FORMS

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)

W, H = A4
L, R = 36.0, 559.3
C_NUM, C_TXT, C_M, C_NM, C_NA = 36.0, 60.0, 451.3, 487.3, 523.3
LW = 0.7
FIELD_BG = Color(0.933, 0.953, 1)
BOTTOM = 770.0  # lowest y (top-down) usable for body content
LOGO_HOSP = os.path.join(HERE, 'logo-hospital.png')
LOGO_CLUSTER = os.path.join(HERE, 'logo-cluster.png')

TEXT = ParagraphStyle('t', fontName='Helvetica', fontSize=8.5, leading=10.6)
TEXT_I = ParagraphStyle('ti', parent=TEXT, fontName='Helvetica-Oblique')


def y(top):
    """Convert top-down coordinate to ReportLab bottom-up."""
    return H - top


class Form:
    def __init__(self, spec):
        self.spec = spec
        self.path = os.path.join(OUT, spec['slug'] + '.pdf')
        self.c = canvas.Canvas(self.path, pagesize=A4)
        self.c.setTitle(f"{spec['title']} — SPECIFIC COMPETENCY")
        self.c.setAuthor('Al Hadeethah General Hospital — Nursing Service Department')
        self.c.setSubject('Nursing competency assessment form (fillable)')
        self.page = 0

    # ---------- primitives ----------
    def rect(self, x0, t0, x1, t1, lw=LW):
        self.c.setLineWidth(lw)
        self.c.setStrokeColor(black)
        self.c.rect(x0, y(t1), x1 - x0, t1 - t0, stroke=1, fill=0)

    def line(self, x0, t0, x1, t1, lw=LW):
        self.c.setLineWidth(lw)
        self.c.line(x0, y(t0), x1, y(t1))

    def text(self, x, base, s, font='Helvetica', size=9):
        self.c.setFont(font, size)
        self.c.setFillColor(black)
        self.c.drawString(x, y(base), s)

    def ctext(self, cx, base, s, font='Helvetica-Bold', size=9):
        self.c.setFont(font, size)
        self.c.drawCentredString(cx, y(base), s)

    def tfield(self, name, x0, t0, x1, t1):
        self.c.acroForm.textfield(name=name, tooltip=name, x=x0, y=y(t1), width=x1 - x0, height=t1 - t0,
                                  fontName='Helvetica', fontSize=9, borderWidth=0, fillColor=FIELD_BG,
                                  textColor=black, forceBorder=False, maxlen=100)

    def cfield(self, name, x0, t0, size=10):
        self.c.acroForm.checkbox(name=name, tooltip=name, x=x0, y=y(t0 + size), size=size, buttonStyle='check',
                                 borderWidth=0, fillColor=FIELD_BG, borderColor=Color(.1, .1, .1),
                                 textColor=black, forceBorder=False)

    # ---------- page furniture ----------
    def new_page(self):
        if self.page:
            self.c.showPage()
        self.page += 1
        for i, s in enumerate(['Alhadithah General Hospital', 'Nursing Service Department', 'Long stay Department']):
            self.text(L, 41.7 + 12 * i, s, 'Helvetica', 10.5)
        self.text(L, 41.7 + 36, 'SPECIFIC COMPETENCY', 'Helvetica-Bold', 10.5)
        self.c.drawImage(LOGO_HOSP, 407.3, y(89.3), 152.0, 57.3, mask='auto')
        self.c.drawImage(LOGO_CLUSTER, 447.3, y(811.9), 112.0, 24.0, mask='auto')
        return 104.0  # first free y on a continuation page

    def first_page(self):
        top = self.new_page()
        title = self.spec['title']
        tw = stringWidth(title, 'Helvetica-Bold', 12.5)
        self.ctext((L + R) / 2, 104.5, title, 'Helvetica-Bold', 12.5)
        self.line((L + R) / 2 - tw / 2, 107.2, (L + R) / 2 + tw / 2, 107.2, 0.9)
        o = 16.0  # header block sits lower than on the digital forms because of the 4-line letterhead
        # identity grid
        self.rect(36.0, 108 + o, 200.8, 125 + o); self.rect(36.0, 125 + o, 200.8, 142 + o); self.rect(36.0, 142 + o, 200.8, 159 + o)
        self.rect(200.8, 108 + o, 418.0, 125 + o); self.rect(200.8, 125 + o, 418.0, 142 + o); self.rect(200.8, 142 + o, 418.0, 159 + o)
        self.rect(418.0, 108 + o, R, 159 + o)
        self.text(40, 119.2 + o, 'Name:', 'Helvetica-Bold', 9)
        self.text(40, 136.2 + o, 'Unit:', 'Helvetica-Bold', 9)
        self.text(40, 153.2 + o, 'Contract Date:', 'Helvetica-Bold', 9)
        self.text(204.8, 119.2 + o, 'Job Number:', 'Helvetica-Bold', 9)
        self.text(204.8, 136.2 + o, 'Job Title:', 'Helvetica-Bold', 9)
        self.text(422.0, 119.2 + o, 'Rating:', 'Helvetica-Bold', 9)
        self.line(424.0, 149.4 + o, 553.3, 149.4 + o)
        self.tfield('staff_name', 71.5, 110 + o, 196.8, 122 + o)
        self.tfield('unit', 64.5, 127 + o, 196.8, 139 + o)
        self.tfield('contract_date', 106.0, 144 + o, 196.8, 156 + o)
        self.tfield('job_number', 264.3, 110 + o, 414.0, 122 + o)
        self.tfield('job_title', 248.8, 127 + o, 414.0, 139 + o)
        self.tfield('rating', 424.0, 134.9 + o, 553.3, 147.9 + o)
        # evaluation key / method
        self.rect(36.0, 159 + o, 200.8, 180 + o); self.rect(200.8, 159 + o, R, 180 + o)
        self.text(40, 168.2 + o, 'Evaluation Key:', 'Helvetica-Bold', 8.6)
        self.text(40, 176.6 + o, 'M- Met  NM- Not Met  NA- Not Applicable', 'Helvetica-Bold', 7.2)
        self.text(204.8, 168.2 + o, 'Method of Evaluation:', 'Helvetica-Bold', 8.6)
        x = 204.8
        for s, f in [('Knowledge:', 'Helvetica-Bold'), (' Exam(Written/Oral)   ', 'Helvetica'), ('Skills:', 'Helvetica-Bold'),
                     (' Demonstration/Discussion   ', 'Helvetica'), ('Attitude:', 'Helvetica-Bold'), (' Observation', 'Helvetica')]:
            self.text(x, 176.6 + o, s, f, 7.2); x += stringWidth(s, f, 7.2)
        # rating scale
        self.rect(36.0, 180 + o, R, 192 + o)
        s1 = 'Rating Scale:  Met: 90% - 100%    Not Met: 89% & below and remedial once  NA-( Not applicable)'
        self.text(40, 188.1 + o, s1, 'Helvetica-Bold', 7.0)
        self.text(40 + stringWidth(s1, 'Helvetica-Bold', 7.0), 188.1 + o,
                  ' – entries to be deducted from the total score', 'Helvetica', 7.0)
        return self.table_head(192 + o)

    def table_head(self, t):
        self.rect(36.0, t, C_M, t + 30); self.rect(C_M, t, R, t + 15)
        self.rect(C_M, t + 15, C_NM, t + 30); self.rect(C_NM, t + 15, C_NA, t + 30); self.rect(C_NA, t + 15, R, t + 30)
        self.ctext((36 + C_M) / 2, t + 22.8, 'COMPETENCIES', 'Helvetica-Bold', 11.5)
        self.ctext((C_M + R) / 2, t + 10.0, 'EVALUATOR ASSESSMENT', 'Helvetica-Bold', 7.4)
        self.ctext((C_M + C_NM) / 2, t + 20.6, 'M', 'Helvetica-Bold', 8.2)
        self.ctext((C_M + C_NM) / 2, t + 28.4, '(1)', 'Helvetica-Bold', 7.4)
        self.ctext((C_NM + C_NA) / 2, t + 20.6, 'NM', 'Helvetica-Bold', 8.2)
        self.ctext((C_NM + C_NA) / 2, t + 28.4, '(0)', 'Helvetica-Bold', 7.4)
        self.ctext((C_NA + R) / 2, t + 20.6, 'NA', 'Helvetica-Bold', 8.2)
        return t + 30

    def cells(self, t0, t1, lw=LW):
        for a, b in [(C_NUM, C_TXT), (C_TXT, C_M), (C_M, C_NM), (C_NM, C_NA), (C_NA, R)]:
            self.rect(a, t0, b, t1, lw)

    def section_row(self, t, numeral, title):
        self.cells(t, t + 16)
        self.text(39.0, t + 9.6, numeral, 'Helvetica', 7.2)
        self.ctext((C_TXT + C_M) / 2, t + 12.7, title, 'Helvetica-Bold', 11)
        return t + 16

    def para(self, text, italic=False):
        markup = re.sub(r'\^(\w+)', r'<super>\1</super>', text.replace('&', '&amp;'))
        p = Paragraph(markup, TEXT_I if italic else TEXT)
        _, h = p.wrap(C_M - C_TXT - 8.4, 1000)
        return p, h

    def item_row(self, t, label, text, key, n, italic=False):
        p, h = self.para(text, italic)
        rh = max(17.0, round(h + 6.4, 1))
        self.cells(t, t + rh)
        self.text(39.0, t + 10.1, label, 'Helvetica', 7.4)
        p.drawOn(self.c, 63.2, y(t + 3.2 + h))
        cy = t + rh / 2
        for col, suffix in [(C_M, 'm'), (C_NM, 'nm'), (C_NA, 'na')]:
            self.cfield(f'{key}_{n}_{suffix}', col + 13.0, cy - 5)
        return t + rh

    def row_height(self, text, italic=False):
        return max(17.0, round(self.para(text, italic)[1] + 6.4, 1))

    # ---------- body ----------
    def build(self):
        t = self.first_page()
        italic = set(self.spec.get('italic_attitude', []))
        for key, numeral, title in [('knowledge', 'I.', 'KNOWLEDGE'), ('skills', 'II.', 'SKILLS'), ('attitude', 'III.', 'ATTITUDE')]:
            items = self.spec[key]
            first_h = self.row_height(items[0][1]) if items else 0
            if t + 16 + first_h > BOTTOM:
                t = self.new_page()
            t = self.section_row(t, numeral, title)
            for i, (label, text) in enumerate(items):
                it = key == 'attitude' and i in italic
                if t + self.row_height(text, it) > BOTTOM:
                    t = self.new_page()
                t = self.item_row(t, label, text, key, i + 1, it)
        # raw score row + footer blocks need ~ 20 + 10 + 30 + 6 + 98 = 164pt
        if t + 164 > BOTTOM:
            t = self.new_page()
        self.cells(t, t + 20, 1.1)
        self.text(63.2, t + 12.4, 'Raw Score', 'Helvetica-Bold', 9)
        for col, suffix in [(C_M, 'm'), (C_NM, 'nm'), (C_NA, 'na')]:
            self.tfield(f'rawscore_{suffix}', col + 3, t + 4, col + 33, t + 16)
        t += 30
        self.footer_blocks(t)
        self.c.save()

    def footer_blocks(self, t):
        # formula
        self.rect(36.0, t, 291.6, t + 30)
        self.text(42.0, t + 11.8, 'Formula:', 'Helvetica-Bold', 8.6)
        self.text(81.2, t + 10.6, 'Raw Score', 'Helvetica-Bold', 8.0)
        self.line(81.2, t + 13.6, 122.1, t + 13.6)
        self.text(81.2, t + 21.6, 'Total Score', 'Helvetica-Bold', 8.0)
        self.text(123.1, t + 10.6, '× 100%  = ', 'Helvetica-Bold', 8.0)
        self.text(203.8, t + 10.6, '% Rating', 'Helvetica-Bold', 8.0)
        self.tfield('percent_rating', 161.8, t + 3, 199.8, t + 15)
        # remedial
        self.rect(303.6, t, R, t + 30)
        self.text(309.6, t + 12.0, 'NEEDS REMEDIAL:', 'Helvetica-Bold', 8.4)
        self.text(406.2, t + 12.0, 'YES', 'Helvetica-Bold', 8.4)
        self.text(444.1, t + 12.0, 'NO', 'Helvetica-Bold', 8.4)
        self.rect(392.2, t + 5, 403.2, t + 16, 0.6)
        self.rect(430.1, t + 5, 441.1, t + 16, 0.6)
        self.cfield('needs_remedial_yes', 392.2, t + 5, 11)
        self.cfield('needs_remedial_no', 430.1, t + 5, 11)
        self.text(309.6, t + 24.0, 'REMEDIAL DATE:', 'Helvetica-Bold', 8.4)
        self.line(386.2, t + 27, 551.3, t + 27, 0.5)
        self.tfield('remedial_date', 386.2, t + 16, 551.3, t + 27)
        t += 36
        # comments / signatures
        self.rect(36.0, t, 291.6, t + 98); self.rect(303.6, t, R, t + 98)
        self.text(42.0, t + 12.0, 'Evaluators Comments/Recommendations:', 'Helvetica-Bold', 8.4)
        self.text(309.6, t + 12.0, 'Staff Nurse Comments:', 'Helvetica-Bold', 8.4)
        for i in range(3):
            tt = t + 17 + 13 * i
            self.line(44.0, tt + 11, 279.6, tt + 11, 0.5)
            self.line(311.6, tt + 11, 547.3, tt + 11, 0.5)
            self.tfield(f'evaluator_comment_{i + 1}', 44.0, tt, 279.6, tt + 11)
            self.tfield(f'staff_comment_{i + 1}', 311.6, tt, 547.3, tt + 11)
        self.text(42.0, t + 69.4, 'Evaluated By:', 'Helvetica-Bold', 9)
        self.text(309.6, t + 69.4, 'Conformed By:', 'Helvetica-Bold', 9)
        self.line(44.0, t + 85.5, 228.1, t + 85.5)
        self.line(311.6, t + 85.5, 452.2, t + 85.5)
        self.line(462.1, t + 85.5, 538.8, t + 85.5)
        self.tfield('evaluated_by', 44.0, t + 72, 228.1, t + 84)
        self.tfield('staff_signature', 311.6, t + 72, 452.2, t + 84)
        self.tfield('staff_sign_date', 462.1, t + 72, 538.8, t + 84)
        self.text(42.0, t + 93.9, "Evaluator's Name/Signature/Job Number", 'Helvetica-Bold', 7.8)
        self.text(309.6, t + 93.9, 'Staff Name/Signature', 'Helvetica-Bold', 7.8)
        self.text(532.4, t + 93.9, 'Date', 'Helvetica-Bold', 7.8)


if __name__ == '__main__':
    for spec in FORMS:
        Form(spec).build()
        print('built', spec['slug'])
