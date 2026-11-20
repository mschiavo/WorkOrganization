const sampleText = `1 Dom FES
2 Lun 08:0012:0512:3716:47 0:15ORE POSITIVE S25
3 Mar 07:5412:0112:4016:28 0:05ORE NEGATIVE FULL-TIME dalle 16:28 alle 16:33 S25
4 Mer 08:0311:5912:3316:53 0:16ORE POSITIVE S25
5 Gio 08:1512:0012:3016:47 0:02ORE POSITIVE S25
6 Ven 8:001SW - SMART WORKING/LAVORO AGILE dalle 07:30 alle 11:30 1SW - SMART WORKING/LAVORO AGILE dalle 12:00 alle 16:00 S25
7 Sab SAB
8 Dom DOM
9 Lun 8:00FERIE dalle 07:30 alle 11:30 FERIE dalle 12:00 alle 16:00 FERIE S25
10 Mar 8:001SW - SMART WORKING/LAVORO AGILE dalle 07:30 alle 11:30 1SW - SMART WORKING/LAVORO AGILE dalle 12:00 alle 16:00 S25
11 Mer 07:5612:1012:4316:50 0:21ORE POSITIVE S25
12 Gio 8:001SW - SMART WORKING/LAVORO AGILE dalle 07:30 alle 11:30 1SW - SMART WORKING/LAVORO AGILE dalle 12:00 alle 16:00 S25
13 Ven 8:001SW - SMART WORKING/LAVORO AGILE dalle 07:30 alle 11:30 1SW - SMART WORKING/LAVORO AGILE dalle 12:00 alle 16:00 S25
14 Sab SAB
15 Dom DOM
16 Lun 8:00PAR GIORNO dalle 07:30 alle 11:30 PAR GIORNO dalle 12:00 alle 16:00 PAR GIORNO S25
17 Mar 08:1112:0212:4816:44 0:13ORE NEGATIVE FULL-TIME dalle 16:44 alle 16:57 S25
18 Mer 8:001SW - SMART WORKING/LAVORO AGILE dalle 07:30 alle 11:30 1SW - SMART WORKING/LAVORO AGILE dalle 12:00 alle 16:00 S25
19 Gio 8:001SW - SMART WORKING/LAVORO AGILE dalle 07:30 alle 11:30 1SW - SMART WORKING/LAVORO AGILE dalle 12:00 alle 16:00 S25
20 Ven 1SW - SMART WORKING/LAVORO AGILE S25
21 Sab SAB
22 Dom DOM
23 Lun PAR GIORNO S25
24 Mar S25
25 Mer S25
26 Gio S25
27 Ven S25
28 Sab SAB
29 Dom DOM
30 Lun S25`;

const dayRegex = /(\d{1,2})\s+(Lun|Mar|Mer|Gio|Ven|Sab|Dom)\b([\s\S]*?)(?=(?:(?:\r?\n)\s*\d{1,2}\s+(?:Lun|Mar|Mer|Gio|Ven|Sab|Dom)\b)|$)/gi;
let match;
let count = 0;

while ((match = dayRegex.exec(sampleText)) !== null) {
  const dayNum = parseInt(match[1], 10);
  const weekday = match[2];
  const content = match[3].replace(/\s+/g, ' ').trim();

  // Find 4 times: 08:0012:0512:3716:47
  const timesMatch = content.match(/(\d{2}:\d{2})\s*(\d{2}:\d{2})\s*(\d{2}:\d{2})\s*(\d{2}:\d{2})/);
  let status = 'presenza';
  let in1, out1, in2, out2;

  if (timesMatch) {
    in1 = timesMatch[1];
    out1 = timesMatch[2];
    in2 = timesMatch[3];
    out2 = timesMatch[4];
  } else if (/SMART WORKING/i.test(content) || /\b1SW\b/.test(content)) {
    status = 'smart';
  } else if (/FERIE/i.test(content)) {
    status = 'ferie';
  } else if (/PAR/i.test(content) || /ROL/i.test(content)) {
    status = 'par';
  } else if (weekday === 'Sab' || weekday === 'Dom' || /FES/i.test(content)) {
    status = 'non_lavorativo';
  }

  count++;
  console.log(`Day ${String(dayNum).padStart(2, '0')} (${weekday}): status=${status.padEnd(14)} ${in1 ? `| ${in1} - ${out1} / ${in2} - ${out2}` : ''}`);
}

console.log('Total days matched:', count);
