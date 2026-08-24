import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

function escapeCsvField(field: string): string {
  if (/[",\n]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export function rowsToCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map(row => row.map(escapeCsvField).join(','));
  return lines.join('\n');
}

export async function shareCsv(filename: string, csvContent: string): Promise<void> {
  const file = new File(Paths.cache, filename);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(csvContent);

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: filename,
  });
}
