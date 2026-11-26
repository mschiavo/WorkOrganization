import sys
import os
import re
import json
from datetime import datetime
import pdfplumber

def extract_all_cartellini(pdf_dir='docs/esempi'):
    files = sorted([f for f in os.listdir(pdf_dir) if f.lower().endswith('.pdf')])
    if not files:
        print(f"⚠️ Nessun file PDF trovato in '{pdf_dir}'.")
        return None

    print(f"\n🚀 Trovati {len(files)} file PDF del cartellino Zucchetti:")
    for f in files:
        print(f"   - {f}")
    print()

    all_days = {}
    all_time_entries = {}
    today_str = datetime.now().strftime('%Y-%m-%d')

    stats_per_month = []

    for fn in files:
        # Detect month number and name from filename e.g. "01 - Gennaio.pdf"
        month_match = re.search(r'(\d{1,2})\s*-\s*([A-Za-z]+)', fn)
        if month_match:
            month_num = int(month_match.group(1))
            month_name = month_match.group(2)
        else:
            month_num = 1
            month_name = fn

        pdf_path = os.path.join(pdf_dir, fn)
        with pdfplumber.open(pdf_path) as pdf:
            words = pdf.pages[0].extract_words()

            # Find day number words on the left column (x0 < 50, integers 1..31)
            day_words = [w for w in words if w['x0'] < 50 and w['text'].isdigit() and 1 <= int(w['text']) <= 31]

            m_pres = 0
            m_smart = 0
            m_fer = 0
            m_par = 0
            m_non = 0
            m_mense = 0

            for dw in sorted(day_words, key=lambda w: int(w['text'])):
                day_num = int(dw['text'])
                date_str = f"2026-{month_num:02d}-{day_num:02d}"
                is_future = date_str > today_str

                # Collect all words on the same horizontal line
                line_words = [w for w in words if abs(w['top'] - dw['top']) <= 4.5 and w['x0'] >= dw['x0']]
                line_words = sorted(line_words, key=lambda w: w['x0'])
                line_text = " ".join(w['text'] for w in line_words)

                # Find valid time punches (HH:MM where HH is 06..20)
                punches = [w['text'] for w in line_words if re.match(r'^(?:0[6-9]|1\d|20):\d{2}$', w['text'])]

                status = 'non_lavorativo'
                is_smart = False
                in1, out1, in2, out2 = None, None, None, None

                if len(punches) >= 4:
                    in1, out1, in2, out2 = punches[0], punches[1], punches[2], punches[3]
                    status = 'presenza'
                    m_pres += 1
                elif len(punches) >= 2:
                    in1, out2 = punches[0], punches[1]
                    status = 'presenza'
                    m_pres += 1
                elif '1SW' in line_text or 'SMART' in line_text:
                    status = 'idea_smart' if is_future else 'smart'
                    is_smart = not is_future
                    m_smart += 1
                elif 'FER' in line_text:
                    status = 'idea_ferie' if is_future else 'ferie'
                    m_fer += 1
                elif 'PAR' in line_text or 'ROL' in line_text:
                    status = 'idea_par' if is_future else 'par'
                    m_par += 1
                elif 'FES' in line_text:
                    status = 'chiusura'
                    m_non += 1
                elif any(w in line_text for w in ['SAB', 'DOM']):
                    status = 'non_lavorativo'
                    m_non += 1
                else:
                    # Weekday without punches
                    if is_future:
                        status = 'presenza' # pianificato in attesa, zero ore finche non timbri
                    else:
                        status = 'non_lavorativo'
                    m_non += 1

                # Canteen: used on presence days when morning and evening punches exist and lunch duration was taken
                canteen_used = bool(in1 and out2 and status == 'presenza' and not is_future)
                if canteen_used:
                    m_mense += 1

                all_days[date_str] = {
                    'date': date_str,
                    'status': status,
                    'isConfirmed': status != 'non_lavorativo' and not is_future
                }

                if status in ['smart', 'idea_smart'] or in1 or canteen_used:
                    all_time_entries[date_str] = {
                        'date': date_str,
                        'morningIn': in1,
                        'lunchOut': out1,
                        'lunchIn': in2,
                        'eveningOut': out2,
                        'canteenUsed': canteen_used,
                        'isSmartWork': is_smart
                    }

            stats_per_month.append({
                'month': f"{month_name} ({month_num:02d}/2026)",
                'days': len(day_words),
                'presenze': m_pres,
                'smart': m_smart,
                'ferie': m_fer,
                'par': m_par,
                'mense': m_mense,
                'nonLav': m_non
            })

    # Summary Output
    print("=" * 75)
    print(f"{'Mese':<22} {'Giorni':<8} {'Presenze':<10} {'Smart':<8} {'Ferie':<8} {'PAR':<6} {'Mense':<6}")
    print("=" * 75)
    for s in stats_per_month:
        print(f"{s['month']:<22} {s['days']:<8} {s['presenze']:<10} {s['smart']:<8} {s['ferie']:<8} {s['par']:<6} {s['mense']:<6}")
    print("=" * 75)

    tot_days = sum(s['days'] for s in stats_per_month)
    tot_pres = sum(s['presenze'] for s in stats_per_month)
    tot_smart = sum(s['smart'] for s in stats_per_month)
    tot_fer = sum(s['ferie'] for s in stats_per_month)
    tot_par = sum(s['par'] for s in stats_per_month)
    tot_men = sum(s['mense'] for s in stats_per_month)
    print(f"{'TOTALE 2026':<22} {tot_days:<8} {tot_pres:<10} {tot_smart:<8} {tot_fer:<8} {tot_par:<6} {tot_men:<6}")
    print("=" * 75)

    payload = {
        'version': '1.0.0',
        'exportedAt': datetime.now().isoformat(),
        'settings': {
            'maxSmartDaysMonth': 10,
            'minPresenceDaysWeek': 1,
            'maxSmartDaysWeek': 4,
            'ferieCompensatesPresence': False,
            'standardDayHours': 8,
            'reducedDayHours': 7,
            'minLunchBreakMinutes': 30,
            'maxDailyBankRecoveryMinutes': 60,
            'canteenVoucherCost': 1.50,
            'smartVoucherValue': 8.00,
            'yearlyFerieHours': 160.0,
            'prevYearFerieResidualHours': 1.2,
            'yearlyParHours': 104.0,
            'prevYearParResidualHours': 4.1,
            'preferredLayout': 'split',
            'preferredTheme': 'dark'
        },
        'days': all_days,
        'timeEntries': all_time_entries
    }

    out_json = os.path.join(pdf_dir, 'WorkOrganization_Import_2026.json')
    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(f"\n✅ File JSON master generato con successo: {out_json}")

    # Also export CSV
    out_csv = os.path.join(pdf_dir, 'storico_timbrature_2026.csv')
    header = 'Data;Stato;Entrata1;Uscita1;Entrata2;Uscita2;Permesso;Mensa;Note'
    csv_rows = [header]
    for d_str in sorted(all_days.keys()):
        d = all_days[d_str]
        e = all_time_entries.get(d_str, {})
        st = d['status']
        i1 = e.get('morningIn') or ''
        o1 = e.get('lunchOut') or ''
        i2 = e.get('lunchIn') or ''
        o2 = e.get('eveningOut') or ''
        m = 'Si' if e.get('canteenUsed') else ('No' if st == 'presenza' else '')
        csv_rows.append(f"{d_str};{st};{i1};{o1};{i2};{o2};;{m};")

    with open(out_csv, 'w', encoding='utf-8') as f:
        f.write('\n'.join(csv_rows))

    print(f"✅ File CSV aggiornato generato: {out_csv}\n")
    return payload

if __name__ == '__main__':
    extract_all_cartellini()
