import { describe, it, expect } from 'vitest';
import { parseZucchettiTableRows, parseZucchettiHtmlTable } from './zucchettiParser';

describe('Zucchetti Cartellino Parser', () => {
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
