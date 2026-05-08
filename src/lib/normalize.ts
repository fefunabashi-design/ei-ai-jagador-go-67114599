// Helpers para autocomplete: prefixo, ignorando acentos e maiúsculas/minúsculas.
export const normalizeStr = (s: string | null | undefined): string =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const startsWithNorm = (value: string | null | undefined, query: string): boolean => {
  const q = normalizeStr(query);
  if (!q) return true;
  return normalizeStr(value).startsWith(q);
};

export const includesNorm = (value: string | null | undefined, query: string): boolean => {
  const q = normalizeStr(query);
  if (!q) return true;
  return normalizeStr(value).includes(q);
};
