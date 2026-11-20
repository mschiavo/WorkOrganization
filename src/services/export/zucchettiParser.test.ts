import { describe, it, expect } from 'vitest';
import { parseZucchettiTableRows, parseZucchettiHtmlTable, parseZucchettiWorkflowText } from './zucchettiParser';

describe('Zucchetti Cartellino Parser', () => {
  const realZucchettiSample = `
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

  it('parses real Zucchetti Workflow cartellino text directly into BackupPayload', () => {
    const payload = parseZucchettiWorkflowText(realZucchettiSample, 2026, 11);

    expect(Object.keys(payload.days).length).toBe(30);

    // Day 2: Presenza con 4 timbrature
    const d2 = payload.days['2026-11-02'];
    expect(d2?.status).toBe('presenza');
    expect(payload.timeEntries['2026-11-02']?.morningIn).toBe('08:00');
    expect(payload.timeEntries['2026-11-02']?.lunchOut).toBe('12:05');
    expect(payload.timeEntries['2026-11-02']?.lunchIn).toBe('12:37');
    expect(payload.timeEntries['2026-11-02']?.eveningOut).toBe('16:47');
    expect(payload.timeEntries['2026-11-02']?.canteenUsed).toBe(true);

    // Day 6: Smart Working
    const d6 = payload.days['2026-11-06'];
    expect(d6?.status).toBe('smart');
    expect(payload.timeEntries['2026-11-06']?.isSmartWork).toBe(true);

    // Day 9: Ferie
    const d9 = payload.days['2026-11-09'];
    expect(d9?.status).toBe('ferie');

    // Day 16: PAR
    const d16 = payload.days['2026-11-16'];
    expect(d16?.status).toBe('par');

    // Day 1: Festivo (chiusura / non_lavorativo)
    const d1 = payload.days['2026-11-01'];
    expect(d1?.status).toBe('chiusura');
  });
  it('parses typical Zucchetti HTML table rows into WorkOrganizer BackupPayload', () => {
    const htmlTable = `
      <table class="gridCartellino">
        <thead>
          <tr>
            <th>Giorno</th>
            <th>Data</th>
            <th>Entrata 1</th>
            <th>Uscita 1</th>
            <th>Entrata 2</th>
            <th>Uscita 2</th>
            <th>Giustificativo / Causale</th>
            <th>Mensa</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Gio</td>
            <td>01/10/2026</td>
            <td>08:02</td>
            <td>12:05</td>
            <td>12:35</td>
            <td>17:35</td>
            <td></td>
            <td>Si</td>
          </tr>
          <tr>
            <td>Ven</td>
            <td>02/10/2026</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>Smart Working</td>
            <td></td>
          </tr>
          <tr>
            <td>Lun</td>
            <td>05/10/2026</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>Ferie</td>
            <td></td>
          </tr>
          <tr>
            <td>Mar</td>
            <td>06/10/2026</td>
            <td>08:30</td>
            <td>12:30</td>
            <td>13:00</td>
            <td>16:30</td>
            <td>ROL / PAR (1h)</td>
            <td>Si</td>
          </tr>
          <tr>
            <td>Mer</td>
            <td>07/10/2026</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>PAR</td>
            <td></td>
          </tr>
          <tr>
            <td>Sab</td>
            <td>10/10/2026</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    `;

    const payload = parseZucchettiHtmlTable(htmlTable, 2026);

    expect(payload.version).toBe('1.0.0');
    expect(Object.keys(payload.days).length).toBe(6);

    // Day 1: Presenza con Mensa
    const d1 = payload.days['2026-10-01'];
    expect(d1?.status).toBe('presenza');
    expect(d1?.isConfirmed).toBe(true);
    const t1 = payload.timeEntries['2026-10-01'];
    expect(t1?.morningIn).toBe('08:02');
    expect(t1?.lunchOut).toBe('12:05');
    expect(t1?.lunchIn).toBe('12:35');
    expect(t1?.eveningOut).toBe('17:35');
    expect(t1?.canteenUsed).toBe(true);

    // Day 2: Smart Working
    const d2 = payload.days['2026-10-02'];
    expect(d2?.status).toBe('smart');
    expect(payload.timeEntries['2026-10-02']?.isSmartWork).toBe(true);

    // Day 3: Ferie
    const d3 = payload.days['2026-10-05'];
    expect(d3?.status).toBe('ferie');

    // Day 4: Presenza con 1h di ROL / PAR
    const d4 = payload.days['2026-10-06'];
    expect(d4?.status).toBe('presenza');
    const t4 = payload.timeEntries['2026-10-06'];
    expect(t4?.morningIn).toBe('08:30');
    expect(t4?.permissionMinutes).toBe(60);
    expect(t4?.canteenUsed).toBe(true);

    // Day 5: PAR intera giornata
    const d5 = payload.days['2026-10-07'];
    expect(d5?.status).toBe('par');

    // Day 6: Sabato non lavorativo
    const d6 = payload.days['2026-10-10'];
    expect(d6?.status).toBe('non_lavorativo');
  });

  it('parses structured 2D array row data', () => {
    const rows = [
      ['01/11/2026', 'presenza', '08:30', '12:30', '13:00', '17:00', '', 'Si', ''],
      ['02/11/2026', 'smart', '', '', '', '', '', '', 'Da casa'],
    ];

    const payload = parseZucchettiTableRows(rows, 2026);
    expect(payload.days['2026-11-01']?.status).toBe('presenza');
    expect(payload.timeEntries['2026-11-01']?.morningIn).toBe('08:30');
    expect(payload.days['2026-11-02']?.status).toBe('smart');
  });
});
