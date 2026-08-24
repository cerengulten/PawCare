import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export async function shareHtmlAsPdf(filename: string, html: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const destination = new File(Paths.cache, filename);
  if (destination.exists) {
    destination.delete();
  }
  const generated = new File(uri);
  generated.move(destination);

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(destination.uri, {
    mimeType: 'application/pdf',
    dialogTitle: filename,
  });
}
