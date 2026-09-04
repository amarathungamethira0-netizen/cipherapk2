/** Clipboard helpers with graceful fallbacks (works on http + inside iframes). */

export async function copyText(text: string): Promise<boolean> {
  if (!text) text = "";
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export async function pasteText(): Promise<string | null> {
  try {
    if (navigator.clipboard?.readText) {
      const t = await navigator.clipboard.readText();
      return t ?? "";
    }
  } catch {
    return null;
  }
  return null;
}
