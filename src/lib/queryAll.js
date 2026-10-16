// Supabase limits unpaginated reads. Keep pages small and preserve query errors:
// callers must never replace a complete list with a partially loaded result.
export async function queryAll(buildPage, pageSize = 500) {
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await buildPage(offset, offset + pageSize - 1);
    if (error) return { data: null, error };
    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) return { data: rows, error: null };
  }
}
