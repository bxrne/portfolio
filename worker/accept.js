export function parseAccept(header) {
  if (!header) return [];
  return header.split(",").map((raw) => {
    const parts = raw.trim().split(";").map((s) => s.trim());
    const type = parts[0].toLowerCase();
    let q = 1;
    for (const param of parts.slice(1)) {
      const [name, value] = param.split("=").map((s) => s.trim());
      if (name === "q") {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) q = Math.max(0, Math.min(1, parsed));
      }
    }
    const specificity = type === "*/*"
      ? 0
      : type.endsWith("/*")
        ? 1
        : 2;
    return { type, q, specificity };
  });
}

export function matches(entry, candidate) {
  if (entry.type === "*/*") return true;
  if (entry.type.endsWith("/*")) return candidate.startsWith(entry.type.slice(0, -1));
  return entry.type === candidate;
}

export function preferredType(header, candidates) {
  if (!header) return candidates?.[0] ?? null;
  const entries = parseAccept(header);
  if (entries.length === 0) return candidates?.[0] ?? null;

  let best = null;
  let bestQ = -1;
  let bestPosition = Infinity;

  for (const candidate of candidates) {
    let matched = null;
    let matchedPosition = Infinity;
    for (let idx = 0; idx < entries.length; idx++) {
      const e = entries[idx];
      if (!matches(e, candidate)) continue;
      if (
        matched === null ||
        e.specificity > matched.specificity ||
        (e.specificity === matched.specificity && idx < matchedPosition)
      ) {
        matched = e;
        matchedPosition = idx;
      }
    }
    if (matched === null) continue;
    const matchedQ = matched.q;
    if (matchedQ <= 0) continue;

    if (matchedQ > bestQ || (matchedQ === bestQ && matchedPosition < bestPosition)) {
      bestQ = matchedQ;
      bestPosition = matchedPosition;
      best = candidate;
    }
  }

  return best;
}

export function mergeVary(headers) {
  if (!(headers instanceof Headers)) {
    headers = new Headers(headers);
  }
  const existing = headers.get("Vary");
  if (!existing) {
    headers.set("Vary", "Accept, Accept-Encoding");
    return headers;
  }
  const tokens = existing.split(",").map((s) => s.trim().toLowerCase());
  if (!tokens.includes("accept")) {
    headers.set("Vary", `${existing}, Accept`);
  }
  if (!tokens.includes("accept-encoding")) {
    headers.set("Vary", `${existing}, Accept-Encoding`);
  }
  return headers;
}