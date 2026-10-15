/**
 * Utility for Web Share API with graceful clipboard copy fallback.
 */
export async function shareGame(customText?: string): Promise<{ success: boolean; method: 'native' | 'clipboard' }> {
  const shareData = {
    title: 'CICATRIZ — Arcade Mutante',
    text:
      customText ||
      'Estou jogando CICATRIZ: um arcade mutante onde dominar uma mecânica faz o mundo abandoná-la e herdar cicatrizes comportamentais! Jogue no navegador:',
    url: window.location.href,
  };

  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
      return { success: true, method: 'native' };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, method: 'native' };
      }
    }
  }

  // Fallback to clipboard
  try {
    const fullText = `${shareData.text}\n${shareData.url}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(fullText);
      return { success: true, method: 'clipboard' };
    }
    // Older fallback
    const textarea = document.createElement('textarea');
    textarea.value = fullText;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return { success: true, method: 'clipboard' };
  } catch {
    return { success: false, method: 'clipboard' };
  }
}
