import sys
import os
import re
import json
from datetime import datetime
import pypdf

MONTH_MAP = {
    'gennaio': 1, 'febbraio': 2, 'marzo': 3, 'aprile': 4,
    'maggio': 5, 'giugno': 6, 'luglio': 7, 'agosto': 8,
    'settembre': 9, 'ottobre': 10, 'novembre': 11, 'dicembre': 12
}

def extract_from_pdf(pdf_path):
    if not os.path.exists(pdf_path):
        print(f"❌ File non trovato: {pdf_path}")
        return {}, {}

    try:
        reader = pypdf.PdfReader(pdf_path)
    except Exception as e:
        print(f"❌ Errore lettura PDF {pdf_path}: {e}")
        return {}, {}

    pdf_days = {}
    pdf_entries = {}
    today_str = datetime.now().strftime('%Y-%m-%d')

    for page_idx, page in enumerate(reader.pages):
        text = page.extract_text()
        if not text:
            continue

        # Detect year
        year = 2026
        year_match = re.search(r'\b(202[0-9])\b', text)
        if year_match:
            year = int(year_match.group(1))

        # Detect month from page text or filename
        month = None
        for m_name, m_num in MONTH_MAP.items():
            # Check if page has specific header indicator
            if re.search(rf'(?:Mese|Periodo|Cartellino|Foglio)[\s\S]{{0,60}}\b{m_name}\b', text, re.IGNORECASE):
                month = m_num
                break
            # Or check filename
            if re.search(rf'\b{m_name}\b', os.path.basename(pdf_path), re.IGNORECASE):
                month = m_num
                break

        if not month:
            # Check numeric dates like "01/11/2026" or "11/2026"
            date_match = re.search(r'\b0?([1-9]|1[0-2])/(202[0-9])\b', text)
            if date_match:
                month = int(date_match.group(1))

        if not month:
            # Fallback based on month in filename (e.g. cartellino_11.pdf)
            fn_match = re.search(r'[_-]0?([1-9]|1[0-2])\b', os.path.basename(pdf_path))
            if fn_match:
                month = int(fn_match.group(1))
            else:
                month = page_idx + 1

        padded_m = f"{month:02d}"

        # Parse day lines: "2 Lun 08:00 12:05 ...", "6 Ven 8:00 1SW...", "9 Lun 8:00 FERIE..."
        day_regex = re.compile(
            r'(\d{1,2})\s+(Lun|Mar|Mer|Gio|Ven|Sab|Dom)\b([\s\S]*?)(?=(?:(?:\r?\n)\s*\d{1,2}\s+(?:Lun|Mar|Mer|Gio|Ven|Sab|Dom)\b)|$)',
            re.IGNORECASE
        )

        page_days_count = 0
        for match in day_regex.finditer(text):
            day_num = int(match.group(1))
            weekday = match.group(2)
            content = " ".join(match.group(3).split())

            date_str = f"{year}-{padded_m}-{day_num:02d}"
            is_future = date_str > today_str

            # Extract punches: match all HH:MM (also handles concatenated 08:0012:05)
            times = re.findall(r'\d{2}:\d{2}', content)

            status = 'presenza'
            is_smart = False
            in1, out1, in2, out2 = None, None, None, None

            if len(times) >= 4:
                in1, out1, in2, out2 = times[0], times[1], times[2], times[3]
                status = 'presenza'
            elif len(times) >= 2:
                in1, out2 = times[0], times[1]
                status = 'presenza'
            elif re.search(r'SMART WORKING|\b1SW\b', content, re.IGNORECASE):
                status = 'idea_smart' if is_future else 'smart'
                is_smart = not is_future
            elif re.search(r'\bFERIE\b', content, re.IGNORECASE):
                status = 'idea_ferie' if is_future else 'ferie'
            elif re.search(r'\bPAR\b|\bROL\b', content, re.IGNORECASE):
                status = 'idea_par' if is_future else 'par'
            elif re.search(r'\bFES\b|\bFESTIV', content, re.IGNORECASE):
                status = 'chiusura'
            elif weekday.lower() in ['sab', 'dom']:
                status = 'non_lavorativo'
            else:
                if is_future:
                    status = 'presenza' # pianificato in attesa, zero ore finché non timbri
                else:
                    status = 'non_lavorativo'

            canteen_used = bool(in1 and out2 and status == 'presenza')

            pdf_days[date_str] = {
                'date': date_str,
                'status': status,
                'isConfirmed': status != 'non_lavorativo' and not is_future
            }

            if status in ['smart', 'idea_smart'] or in1 or canteen_used:
                pdf_entries[date_str] = {
                    'date': date_str,
                    'morningIn': in1,
                    'lunchOut': out1,
                    'lunchIn': in2,
                    'eveningOut': out2,
                    'canteenUsed': canteen_used,
                    'isSmartWork': is_smart
                }

            page_days_count += 1

        print(f"  📄 {os.path.basename(pdf_path)} (pag {page_idx + 1}): estratti {page_days_count} giorni per Mese {padded_m}/{year}")

    return pdf_days, pdf_entries

def main():
    target_dir = 'docs/esempi'
    pdf_files = []

    # Check CLI arguments
    if len(sys.argv) > 1:
        arg_path = sys.argv[1]
        if os.path.isdir(arg_path):
            target_dir = arg_path
            pdf_files = [os.path.join(target_dir, f) for f in os.listdir(target_dir) if f.lower().endswith('.pdf')]
        elif os.path.isfile(arg_path):
            pdf_files = [arg_path]
    else:
        # Default scan docs/esempi for all *.pdf
        if os.path.exists(target_dir):
            pdf_files = [os.path.join(target_dir, f) for f in sorted(os.listdir(target_dir)) if f.lower().endswith('.pdf')]

    if not pdf_files:
        print(f"\n⚠️ Nessun file PDF trovato in '{target_dir}'.")
        print("Salva i tuoi file PDF del cartellino Zucchetti dentro 'docs/esempi/' e rilancia lo script.")
        return

    print(f"\n🚀 Avvio elaborazione di {len(pdf_files)} file PDF del cartellino Zucchetti...\n")

    all_days = {}
    all_time_entries = {}

    for pdf_path in sorted(pdf_files):
        days, entries = extract_from_pdf(pdf_path)
        all_days.update(days)
        all_time_entries.update(entries)

    total_days = len(all_days)
    if total_days == 0:
        print("⚠️ Nessun giorno valido estratto dai PDF.")
        return

    # Counts
    presenze = sum(1 for d in all_days.values() if d['status'] == 'presenza')
    smart = sum(1 for d in all_days.values() if d['status'] in ['smart', 'idea_smart'])
    ferie = sum(1 for d in all_days.values() if d['status'] in ['ferie', 'idea_ferie'])
    par = sum(1 for d in all_days.values() if d['status'] in ['par', 'idea_par'])
    mense = sum(1 for e in all_time_entries.values() if e.get('canteenUsed'))

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
            'yearlyFerieHours': 160,
            'prevYearFerieResidualHours': 0,
            'yearlyParHours': 88,
            'prevYearParResidualHours': 0,
            'preferredLayout': 'split',
            'preferredTheme': 'dark'
        },
        'days': all_days,
        'timeEntries': all_time_entries
    }

    output_path = os.path.join(target_dir, 'WorkOrganization_Import_2026.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(f"\n✅ CONVERSIONE COMPLETATA CON SUCCESSO!")
    print(f"📊 Statistiche complessive dell'anno:")
    print(f"   - Giorni totali registrati: {total_days}")
    print(f"   - Giornate di Presenza:     {presenze}")
    print(f"   - Giornate Smart Working:   {smart}")
    print(f"   - Giornate Ferie:           {ferie}")
    print(f"   - Giornate PAR/ROL:         {par}")
    print(f"   - Pasti Mensa utilizzati:   {mense}")
    print(f"\n📁 File master generato: {output_path}")
    print("👉 Vai su WorkOrganizer -> Impostazioni -> 'Ripristina da File JSON' e seleziona questo file!\n")

if __name__ == '__main__':
    main()
