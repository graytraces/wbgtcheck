/**
 * Compact hour label for the hourly strip and the share card's band.
 *
 * These were hardcoded to the English 12-hour form ("10a", "4p") in every
 * locale, sitting directly under a header that renders through Intl and so
 * reads "A LAS 16:00" in Spanish. One screen, two clock conventions, and the
 * strip's was simply the wrong one for the language.
 *
 * The chips are ~64px wide, which is why this is not just Intl output: the
 * 12-hour form stays compact ("4p", not "4 PM") and the 24-hour form is the
 * bare padded hour. Which of the two applies comes from the locale rather
 * than a hardcoded list.
 */
function usesHour12(lang: string): boolean {
  try {
    return Intl.DateTimeFormat(lang, { hour: 'numeric' }).resolvedOptions().hour12 ?? true
  } catch {
    // Unknown tag — the site's default locale is English.
    return true
  }
}

export function hourLabel(localHour: number, lang: string): string {
  if (!usesHour12(lang)) return String(localHour).padStart(2, '0')
  if (localHour === 0) return '12a'
  if (localHour < 12) return `${localHour}a`
  if (localHour === 12) return '12p'
  return `${localHour - 12}p`
}
