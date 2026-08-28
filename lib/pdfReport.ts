import { colors } from './reportTheme';

export type ReportKeyValue = { key: string; value: string };

function infoRowsHtml(rows: ReportKeyValue[]): string {
  return rows.map(r => `
    <div class="info-row"><span class="info-key">${r.key}</span><span class="info-val">${r.value}</span></div>
  `).join('');
}

function summaryRowsHtml(rows: ReportKeyValue[]): string {
  return rows.map(r => `
    <div class="summary-row"><span class="summary-key">${r.key}</span><span class="summary-val">${r.value}</span></div>
  `).join('');
}

export function buildReportHtml(opts: {
  title: string;
  infoRows: ReportKeyValue[];
  tableHeaders: string[];
  tableRowsHtml: string;
  summaryRows: ReportKeyValue[];
}): string {
  const { title, infoRows, tableHeaders, tableRowsHtml, summaryRows } = opts;

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; margin: 0; color: ${colors.textDark}; }
          .sheet { border: 1px solid ${colors.cardBorder}; border-radius: 10px; overflow: hidden; }
          .title-row { background: ${colors.primaryGreen}; color: #fff; padding: 14px 18px; font-size: 18px; font-weight: 600; }
          .info-block { background: ${colors.background}; padding: 14px 18px; border-bottom: 1px solid ${colors.cardBorder}; }
          .info-row { display: flex; gap: 8px; margin-bottom: 4px; font-size: 13px; }
          .info-key { color: ${colors.textMuted}; width: 120px; flex-shrink: 0; }
          .info-val { font-weight: 500; }
          table { width: 100%; border-collapse: collapse; }
          th { background: ${colors.moodSelectedBg}; color: ${colors.textDark}; font-size: 12px; font-weight: 600; padding: 8px 12px; text-align: left; }
          td { padding: 8px 12px; font-size: 12px; border-top: 0.5px solid ${colors.background}; }
          .summary { background: ${colors.pendingAmberBg}; padding: 12px 18px; border-top: 1px solid #E0C090; }
          .summary-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
          .summary-key { color: ${colors.pendingAmberText}; }
          .summary-val { font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="title-row">${title}</div>
          <div class="info-block">${infoRowsHtml(infoRows)}</div>
          <table>
            <thead>
              <tr>${tableHeaders.map(h => `<th>${h}</th>`).join('')}</tr>
            </thead>
            <tbody>${tableRowsHtml}</tbody>
          </table>
          <div class="summary">${summaryRowsHtml(summaryRows)}</div>
        </div>
      </body>
    </html>
  `;
}

export function buildMultiSectionReportHtml(opts: {
  title: string;
  infoRows: ReportKeyValue[];
  sections: {
    heading: string;
    tableHeaders: string[];
    tableRowsHtml: string;
    summaryRows: ReportKeyValue[];
  }[];
}): string {
  const { title, infoRows, sections } = opts;

  const sectionsHtml = sections.map(section => `
    <div class="section-heading">${section.heading}</div>
    ${section.tableRowsHtml ? `
      <table>
        <thead>
          <tr>${section.tableHeaders.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>${section.tableRowsHtml}</tbody>
      </table>
      <div class="summary">${summaryRowsHtml(section.summaryRows)}</div>
    ` : `<div class="no-data">No entries yet.</div>`}
  `).join('');

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; margin: 0; color: ${colors.textDark}; }
          .sheet { border: 1px solid ${colors.cardBorder}; border-radius: 10px; overflow: hidden; }
          .title-row { background: ${colors.primaryGreen}; color: #fff; padding: 14px 18px; font-size: 18px; font-weight: 600; }
          .info-block { background: ${colors.background}; padding: 14px 18px; border-bottom: 1px solid ${colors.cardBorder}; }
          .info-row { display: flex; gap: 8px; margin-bottom: 4px; font-size: 13px; }
          .info-key { color: ${colors.textMuted}; width: 120px; flex-shrink: 0; }
          .info-val { font-weight: 500; }
          .section-heading { background: ${colors.moodSelectedBg}; color: ${colors.textDark}; font-size: 14px; font-weight: 700; padding: 10px 18px; border-top: 1px solid ${colors.cardBorder}; }
          .no-data { padding: 12px 18px; font-size: 12px; color: ${colors.textMuted}; font-style: italic; }
          table { width: 100%; border-collapse: collapse; }
          th { background: ${colors.moodSelectedBg}; color: ${colors.textDark}; font-size: 12px; font-weight: 600; padding: 8px 12px; text-align: left; }
          td { padding: 8px 12px; font-size: 12px; border-top: 0.5px solid ${colors.background}; }
          .summary { background: ${colors.pendingAmberBg}; padding: 12px 18px; }
          .summary-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
          .summary-key { color: ${colors.pendingAmberText}; }
          .summary-val { font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="title-row">${title}</div>
          <div class="info-block">${infoRowsHtml(infoRows)}</div>
          ${sectionsHtml}
        </div>
      </body>
    </html>
  `;
}
