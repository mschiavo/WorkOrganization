import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Read existing verified Jan-Oct 2026 JSON (304 days)
const jsonPath = path.resolve(__dirname, '../docs/esempi/WorkOrganization_Import_2026.json');
const basePayload = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

// 2. November 2026 real text from Zucchetti InfoCamere
const novText = `
1 Dom  FES 
2 Lun 08:0012:0512:3716:47 0:15ORE POSITIVE  S25 
3 Mar 07:5412:0112:4016:28 0:05ORE NEGATIVE FULL-TIME dalle 16:28 alle 16:33  S25 
4 Mer 08:0311:5912:3316:53 0:16ORE POSITIVE  S25 
5 Gio 08:1512:0012:3016:47 0:02ORE POSITIVE  S25 
6 Ven 8:001SW - SMART WORKING/LAVORO AGILE dalle 07:30 alle 11:30 1SW - SMART WORKING/LAVORO AGILE dalle 12:00 alle 16:00  1SW - SMART WORKING/LAVORO AGILE S25 
7 Sab  SAB 
8 Dom  DOM 
9 Lun 8:00FERIE dalle 07:30 alle 11:30 FERIE dalle 12:00 alle 16:00  FERIE S25 
10 Mar 8:001SW - SMART WORKING/LAVORO AGILE dalle 07:30 alle 11:30 1SW - SMART WORKING/LAVORO AGILE dalle 12:00 alle 16:00  1SW - SMART WORKING/LAVORO AGILE S25 
11 Mer 07:5612:1012:4316:50 0:21ORE POSITIVE  S25 
12 Gio 8:001SW - SMART WORKING/LAVORO AGILE dalle 07:30 alle 11:30 1SW - SMART WORKING/LAVORO AGILE dalle 12:00 alle 16:00  1SW - SMART WORKING/LAVORO AGILE S25 
13 Ven 8:001SW - SMART WORKING/LAVORO AGILE dalle 07:30 alle 11:30 1SW - SMART WORKING/LAVORO AGILE dalle 12:00 alle 16:00  1SW - SMART WORKING/LAVORO AGILE S25 
14 Sab  SAB 
15 Dom  DOM 
16 Lun 8:00PAR GIORNO dalle 07:30 alle 11:30 PAR GIORNO dalle 12:00 alle 16:00  PAR GIORNO S25 
17 Mar 08:1112:0212:4816:44 0:13ORE NEGATIVE FULL-TIME dalle 16:44 alle 16:57  S25 
18 Mer 8:001SW - SMART WORKING/LAVORO AGILE dalle 07:30 alle 11:30 1SW - SMART WORKING/LAVORO AGILE dalle 12:00 alle 16:00  1SW - SMART WORKING/LAVORO AGILE S25 
19 Gio 8:001SW - SMART WORKING/LAVORO AGILE dalle 07:30 alle 11:30 1SW - SMART WORKING/LAVORO AGILE dalle 12:00 alle 16:00  1SW - SMART WORKING/LAVORO AGILE S25 
20 Ven  1SW - SMART WORKING/LAVORO AGILE S25 
21 Sab  SAB 
22 Dom  DOM 
23 Lun  PAR GIORNO S25 
24 Mar  S25 
25 Mer  S25 
26 Gio  S25 
27 Ven  S25 
28 Sab  SAB 
29 Dom  DOM 
30 Lun  S25
`;

const novDays = {};
const novEntries = {};
const dayRegex = /(\d{1,2})\s+(Lun|Mar|Mer|Gio|Ven|Sab|Dom)\b([\s\S]*?)(?=(?:(?:\r?\n)\s*\d{1,2}\s+(?:Lun|Mar|Mer|Gio|Ven|Sab|Dom)\b)|$)/gi;
let match;

while ((match = dayRegex.exec(novText)) !== null) {
  const dayNum = parseInt(match[1], 10);
  const weekday = match[2];
  const content = match[3].replace(/\s+/g, ' ').trim();
  const paddedD = String(dayNum).padStart(2, '0');
  const dateStr = `2026-11-${paddedD}`;

  const times = content.match(/\d{2}:\d{2}/g) || [];
  let status = 'presenza';
  let isSmart = false;
  let in1, out1, in2, out2;

  if (times.length >= 4) {
    in1 = times[0]; out1 = times[1]; in2 = times[2]; out2 = times[3];
    status = 'presenza';
  } else if (times.length >= 2) {
    in1 = times[0]; out2 = times[1];
    status = 'presenza';
  } else if (/SMART WORKING/i.test(content) || /\b1SW\b/.test(content)) {
    status = 'smart'; isSmart = true;
  } else if (/FERIE/i.test(content)) {
    status = 'ferie';
  } else if (/PAR/i.test(content) || /ROL/i.test(content)) {
    status = 'par';
  } else if (/FES/i.test(content)) {
    status = 'chiusura';
  } else if (weekday === 'Sab' || weekday === 'Dom') {
    status = 'non_lavorativo';
  } else {
    // Days 24, 25, 26, 27, 30: in November future days scheduled presence
    status = 'presenza';
  }

  const canteenUsed = Boolean(in1 && out2 && status === 'presenza');

  novDays[dateStr] = {
    date: dateStr,
    status,
    isConfirmed: status !== 'non_lavorativo',
  };

  if (status === 'smart' || in1 || canteenUsed) {
    novEntries[dateStr] = {
      date: dateStr,
      morningIn: in1,
      lunchOut: out1,
      lunchIn: in2,
      eveningOut: out2,
      canteenUsed,
      isSmartWork: isSmart,
    };
  }
}

// Merge base (Jan-Oct) with November
const fullDays = { ...basePayload.days, ...novDays };
const fullEntries = { ...basePayload.timeEntries, ...novEntries };

const fullPayload = {
  version: '1.0.0',
  exportedAt: new Date().toISOString(),
  settings: {
    ...basePayload.settings,
    yearlyFerieHours: 160,
    yearlyParHours: 88,
  },
  days: fullDays,
  timeEntries: fullEntries,
};

const outputPath = path.resolve(__dirname, '../docs/esempi/WorkOrganization_Ripristino_2026_Perfetto.json');
fs.writeFileSync(outputPath, JSON.stringify(fullPayload, null, 2), 'utf-8');

console.log('✅ File di ripristino perfetto generato!');
console.log('Giorni totali (Gennaio-Novembre 2026):', Object.keys(fullDays).length);
console.log('Timbrature totali registrate:', Object.keys(fullEntries).length);
