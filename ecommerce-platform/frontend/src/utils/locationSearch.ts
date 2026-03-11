function normalizeLocationQuery(value: string): string {
  return value.trim().toLowerCase();
}

export function getMatchingLocationOptions(options: string[], query: string, limit = 25): string[] {
  const normalizedQuery = normalizeLocationQuery(query);
  const uniqueOptions = [...new Set(options.map((option) => option.trim()).filter(Boolean))];

  if (!normalizedQuery) {
    return [];
  }

  const startsWithMatches = uniqueOptions.filter((option) => normalizeLocationQuery(option).startsWith(normalizedQuery));
  const containsMatches = uniqueOptions.filter((option) => {
    const normalizedOption = normalizeLocationQuery(option);
    return !normalizedOption.startsWith(normalizedQuery) && normalizedOption.includes(normalizedQuery);
  });

  return [...startsWithMatches, ...containsMatches].slice(0, limit);
}
