const TEAM_PREFIX_SKIP = new Set([
  "EC","SC","AC","FC","AA","AD","CR","CA","SE","CE","CD","SD","GE","ABC","CF","RC","CRB","SER","ASA","AE","CSA",
]);

export const getShortTeamName = (name?: string | null) => {
  if (!name) return "";
  const tokens = name.trim().split(/\s+/);
  const main = tokens.find((t) => !TEAM_PREFIX_SKIP.has(t.toUpperCase()) && t.length > 2);
  return main || tokens[0] || "";
};
