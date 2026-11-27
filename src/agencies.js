// Агентства из списка туров: имя, число туров, сайт, логотип; проверенные — первыми.
// Общее для веба (ToursView) и телефона (mobile).
function siteOf(url) {
  try {
    const u = new URL(url);
    return /^https?:$/.test(u.protocol) ? u.origin : null; // javascript: и прочее — не ссылка
  } catch {
    return null;
  }
}

export function agenciesOf(tours) {
  const map = new Map();
  for (const x of tours) {
    if (!x.agencyName) continue;
    const a = map.get(x.agencyName) || { name: x.agencyName, count: 0, site: siteOf(x.url) };
    a.count += 1;
    if (x.agencyVerified) a.verified = true;
    if (x.agencyLogo) a.logo = x.agencyLogo;
    map.set(x.agencyName, a);
  }
  return [...map.values()].sort((x, y) => Number(!!y.verified) - Number(!!x.verified));
}
