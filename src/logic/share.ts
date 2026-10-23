/**
 * Shares text (+ optional image) with the Web Share API. Falls back to copying the
 * text and downloading the image when sharing files isn't supported (most desktops).
 * Returns how it was delivered so the UI can say so.
 */
export async function shareTextAndImage(
  title: string,
  text: string,
  image?: { blob: Blob; filename: string },
): Promise<'shared' | 'copied' | 'cancelled'> {
  const files = image ? [new File([image.blob], image.filename, { type: image.blob.type || 'image/jpeg' })] : [];
  const withFiles: ShareData = { title, text, files };
  try {
    if (navigator.share && (!files.length || navigator.canShare?.(withFiles))) {
      await navigator.share(files.length ? withFiles : { title, text });
      return 'shared';
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
    // Otherwise fall through to the copy/download fallback.
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard blocked: the download below still gives the user the image.
  }
  if (image) {
    const url = URL.createObjectURL(image.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = image.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return 'copied';
}
