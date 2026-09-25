"""Build the competency catalog (src/data/catalog.json) and the Supabase content migration
from the PDF templates in public/forms.

The questionnaire text is taken from the templates themselves (or, for the regenerated
specific forms, from the same transcription used to draw them), so the web questionnaire
and the printed form can never drift apart.

Usage: python3 scripts/forms/build_catalog.py
Requires: pymupdf
"""
import json, os, re, sys
import pymupdf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
FORMS_DIR = os.path.join(ROOT, 'public', 'forms')
sys.path.insert(0, HERE)
from specific import FORMS as SPECIFIC  # noqa: E402

MIGRATION = os.path.join(ROOT, 'supabase', 'migrations', '20260925090000_005_all_competency_forms.sql')

# Mandatory forms keep the order and codes already used in production.
MANDATORY = [
    ('patient-assessment-reassessment-and-vital-signs', 'PAVS'),
    ('early-warning-signs-and-shock-emergencies', 'EWS'),
    ('medication-administration', 'MED'),
    ('sbar-endorsement-and-handover-communication', 'SBAR'),
    ('infection-control', 'IC'),
    ('hazardous-materials', 'HAZ'),
    ('environmental-safety-and-quality-improvement', 'ENV'),
    ('care-of-medical-equipment', 'EQUIP'),
    ('code-red', 'CRED'),
    ('disaster-preparedness', 'DIS'),
]
GENERAL = [
    ('standards-of-admission', 'ADM'),
    ('routine-discharge-process', 'DISCH'),
    ('transferring-patient', 'TRF'),
    ('nursing-documentation', 'DOC'),
    ('medication-administration-and-calculation', 'MEDC'),
    ('administration-of-blood-and-blood-products', 'BLOOD'),
    ('exchange-transfusion', 'EXT'),
    ('blood-glucose-monitoring-by-finger-prick', 'BGM'),
    ('pulse-oximeter', 'SPO2'),
    ('completing-12-lead-ecg', 'ECG'),
    ('pain-and-discomfort-patient-management-guidelines', 'PAIN'),
    ('preventing-pressure-sores', 'PPS'),
    ('moving-and-handling', 'MOVE'),
    ('hand-rubbing', 'HAND'),
    ('fire-response-procedure', 'FIRE'),
    ('end-of-life', 'EOL'),
    ('equipment-checklist', 'EQCHK'),
]
SPECIFIC_CODES = {
    'specific-end-of-life-care': 'LS-EOL', 'specific-basic-cardiac-monitoring': 'LS-BCM',
    'specific-enteral-feeding': 'LS-EF', 'specific-diabetes-melitus-education': 'LS-DM',
    'specific-ambulance-transport': 'LS-AMB', 'specific-tracheostomy': 'LS-TRACH',
    'specific-infection-control': 'LS-IC', 'specific-admission-of-pediatric-patient': 'LS-PEDS',
    'specific-anticoagulant-therapy': 'LS-ANTI', 'specific-care-of-closed-chest-drainage': 'LS-CCD',
    'specific-neurological-deficit': 'LS-NEURO', 'specific-completing-12-lead-ecg': 'LS-ECG',
    'specific-therapeutic-immobilization': 'LS-TIM', 'specific-oxygen-administration': 'LS-O2',
    'specific-urinary-catheterization': 'LS-UC', 'specific-fluid-balance': 'LS-FB',
}
SECTIONS = [('knowledge', 'I.', 'KNOWLEDGE'), ('skills', 'II.', 'SKILLS'), ('attitude', 'III.', 'ATTITUDE')]


def horizontal_rules(page):
    ys = set()
    for dr in page.get_drawings():
        for it in dr['items']:
            if it[0] == 'l' and abs(it[1].y - it[2].y) < 0.5 and abs(it[1].x - it[2].x) > 30:
                ys.add(round(it[1].y, 1))
            if it[0] == 're' and it[1].width > 30:
                ys.add(round(it[1].y0, 1)); ys.add(round(it[1].y1, 1))
    return sorted(ys)


def row_text(page, top, bottom, right):
    """Rebuild the statement text inside one table row.

    Visual lines are joined with spaces when the text simply wrapped, and kept on their own
    line when the form breaks them on purpose (bullets, numbered sub-items, or a line that ends
    although the next word would still have fitted).
    """
    label = page.get_text('text', clip=pymupdf.Rect(36, top, 58, bottom)).strip()
    lines = []
    for block in page.get_text('dict', clip=pymupdf.Rect(58, top, right, bottom), sort=True)['blocks']:
        for line in block.get('lines', []):
            s = ''.join(span['text'] for span in line['spans']).strip()
            if s:
                lines.append((s, line['bbox'][2]))
    text, prev_right = '', 0
    for s, line_right in lines:
        if not text:
            text = s
        elif (re.match(r'^([\u2022\-\u2013*]|\d+\.\s)', s) or text.endswith(':')
              or prev_right + pymupdf.get_text_length(' ' + s.split(' ')[0], 'helv', 8.5) < right - 12):
            text += '\n' + s
        else:
            text += ' ' + s
        prev_right = line_right
    return label, text


def digital_form(slug):
    doc = pymupdf.open(os.path.join(FORMS_DIR, slug + '.pdf'))
    category = doc[0].get_text().split('\n')[2].strip()
    title = doc.metadata['title'].split(' — ')[0].strip()
    rows = {}
    for page in doc:
        ys = horizontal_rules(page)
        for w in page.widgets():
            m = re.fullmatch(r'(knowledge|skills|attitude|eq)_(\d+)_(m|vt)', w.field_name)
            if not m:
                continue
            top = max([v for v in ys if v < w.rect.y0 - 1], default=0)
            bottom = min([v for v in ys if v > w.rect.y1 + 1], default=9999)
            label, text = row_text(page, top, bottom, w.rect.x0 - 8)
            key = 'equipment' if m.group(1) == 'eq' else m.group(1)
            rows.setdefault(key, []).append((int(m.group(2)), label, text))
    return title, category, rows


def build():
    forms = []

    def add(slug, code, title, category, department, sections, scale):
        forms.append({
            'id': slug, 'code': code, 'title': title, 'category': category, 'department': department,
            'file': slug + '.pdf', 'scale': scale, 'sections': sections,
        })

    for group in (MANDATORY, GENERAL):
        for slug, code in group:
            title, category, rows = digital_form(slug)
            if 'equipment' in rows:
                items = [{'id': f'{slug}::eq_{n}', 'field': f'eq_{n}', 'n': n, 'label': str(n), 'text': t}
                         for n, _, t in sorted(rows['equipment'])]
                add(slug, code, title, category, None,
                    [{'key': 'equipment', 'numeral': '', 'title': 'EQUIPMENT', 'items': items}], 'equipment')
                continue
            sections = []
            for key, numeral, stitle in SECTIONS:
                items = [{'id': f'{slug}::{key}_{n}', 'field': f'{key}_{n}', 'n': n, 'label': label or f'{n}.', 'text': t}
                         for n, label, t in sorted(rows.get(key, []))]
                sections.append({'key': key, 'numeral': numeral, 'title': stitle, 'items': items})
            add(slug, code, title, category, None, sections, 'mnmna')

    for spec in SPECIFIC:
        slug = spec['slug']
        sections = []
        for key, numeral, stitle in SECTIONS:
            items = [{'id': f'{slug}::{key}_{i + 1}', 'field': f'{key}_{i + 1}', 'n': i + 1, 'label': label,
                      'text': re.sub(r'\^(\w+)', r'\1', text)}
                     for i, (label, text) in enumerate(spec[key])]
            sections.append({'key': key, 'numeral': numeral, 'title': stitle, 'items': items})
        add(slug, SPECIFIC_CODES[slug], spec['title'], 'SPECIFIC COMPETENCY', 'Long stay Department', sections, 'mnmna')

    # sanity: every questionnaire item must have its three answer boxes on the template
    for f in forms:
        doc = pymupdf.open(os.path.join(FORMS_DIR, f['file']))
        names = {w.field_name for p in doc for w in p.widgets()}
        opts = ['vt', 'rd', 'uec'] if f['scale'] == 'equipment' else ['m', 'nm', 'na']
        for s in f['sections']:
            for it in s['items']:
                missing = [o for o in opts if f"{it['field']}_{o}" not in names]
                assert not missing, (f['id'], it['field'], missing)
                assert it['text'].strip(), (f['id'], it['field'])
        f['pages'] = doc.page_count
    return forms


def sql_str(s):
    return "'" + s.replace("'", "''") + "'" if s is not None else 'null'


def migration(forms):
    old_prefix = {slug: code for slug, code in MANDATORY}
    out = [
        '-- Load all 43 competency forms (mandatory, general, long-stay specific) and',
        '-- extend the nurse workflow for the full questionnaire. Generated by',
        '-- scripts/forms/build_catalog.py from the PDF templates in public/forms.',
        '',
        "alter table public.competencies add column if not exists rating_options text[] not null default '{M,NM,NA}';",
        'alter table public.competencies add column if not exists department text;',
        'alter table public.competency_sections drop constraint if exists competency_sections_section_key_check;',
        "alter table public.competency_sections add constraint competency_sections_section_key_check check (section_key in ('knowledge','skills','attitude','equipment'));",
        'alter table public.assessment_answers drop constraint if exists assessment_answers_answer_check;',
        "alter table public.assessment_answers add constraint assessment_answers_answer_check check (answer in ('M','NM','NA','VT','RD','UEC'));",
        '',
    ]
    comp_rows, sec_rows, q_rows = [], [], []
    for order, f in enumerate(forms, 1):
        opts = "'{VT,RD,UEC}'" if f['scale'] == 'equipment' else "'{M,NM,NA}'"
        count = sum(len(s['items']) for s in f['sections'])
        comp_rows.append(f"({sql_str(f['id'])},{sql_str(f['code'])},{sql_str(f['title'])},{order},{sql_str(f['file'])},"
                         f"{f['pages']},{count},{sql_str(f['category'])},{sql_str(f['department'])},{opts},true)")
        for so, s in enumerate(f['sections'], 1):
            sid = f"{f['id']}:{s['key']}"
            sec_rows.append(f"({sql_str(sid)},{sql_str(f['id'])},{sql_str(s['key'])},{sql_str(s['numeral'])},{sql_str(s['title'])},{so})")
            for it in s['items']:
                q_rows.append(f"({sql_str(it['id'])},{sql_str(f['id'])},{sql_str(sid)},{it['n']},{sql_str(it['text'])},{so * 1000 + it['n']},false)")
    out.append('insert into public.competencies (id, code, title, sort_order, template_file, page_count, question_count, competency_type, department, rating_options, is_active) values')
    out.append(',\n'.join(comp_rows))
    out.append('on conflict (id) do update set code = excluded.code, title = excluded.title, sort_order = excluded.sort_order,'
               ' template_file = excluded.template_file, page_count = excluded.page_count, question_count = excluded.question_count,'
               ' competency_type = excluded.competency_type, department = excluded.department, rating_options = excluded.rating_options, is_active = true;')
    out.append('')
    out.append('insert into public.competency_sections (id, competency_id, section_key, numeral, title, sort_order) values')
    out.append(',\n'.join(sec_rows))
    out.append('on conflict (id) do update set section_key = excluded.section_key, numeral = excluded.numeral, title = excluded.title, sort_order = excluded.sort_order;')
    out.append('')
    out.append('-- Previous question ids (e.g. EQUIP-K-01) share (section_id, number) with the new ones: park them first.')
    out.append("update public.competency_questions set number = number + 10000 where id !~ '::';")
    out.append('insert into public.competency_questions (id, competency_id, section_id, number, text, sort_order, needs_source_review) values')
    out.append(',\n'.join(q_rows))
    out.append('on conflict (id) do update set competency_id = excluded.competency_id, section_id = excluded.section_id, number = excluded.number,'
               ' text = excluded.text, sort_order = excluded.sort_order, needs_source_review = false;')
    out.append('')
    out.append('-- Move answers saved against the previous question ids (e.g. EQUIP-K-01) to the new ids.')
    out.append('alter table public.assessment_answers disable trigger guard_answers;')
    for slug, code in old_prefix.items():
        for letter, key in (('K', 'knowledge'), ('S', 'skills'), ('A', 'attitude')):
            out.append(f"update public.assessment_answers a set question_id = '{slug}::{key}_' || (substring(a.question_id from '{code}-{letter}-(\\d+)$'))::int"
                       f" where a.question_id ~ '^{code}-{letter}-\\d+$' and a.competency_id = '{slug}';")
    out.append('alter table public.assessment_answers enable trigger guard_answers;')
    ids = ','.join(sql_str(it['id']) for f in forms for s in f['sections'] for it in s['items'])
    out.append(f'delete from public.competency_questions where id not in ({ids});')
    out.append('')
    out.append(open(os.path.join(HERE, 'workflow.sql')).read())
    return '\n'.join(out) + '\n'


if __name__ == '__main__':
    forms = build()
    catalog = {'forms': forms}
    with open(os.path.join(ROOT, 'src', 'data', 'catalog.json'), 'w') as fh:
        json.dump(catalog, fh, ensure_ascii=False, indent=1)
    os.makedirs(os.path.dirname(MIGRATION), exist_ok=True)
    with open(MIGRATION, 'w') as fh:
        fh.write(migration(forms))
    total = sum(len(s['items']) for f in forms for s in f['sections'])
    print(f'{len(forms)} forms, {total} statements')
    for f in forms:
        print(f"  {f['code']:9} {f['category'][:9]:9} {sum(len(s['items']) for s in f['sections']):3}  {f['title']}")
