/** A very small Java structure reader: client-only regions and method spans, by brace tracking. */

/** Classes that are themselves client classes (renderers, screens, models...) only load on the client. */
export const CLIENT_CLASS_DECL =
  /\bclass\s+\w+[^{]*\b(extends|implements)\s+[^{]*\b(\w*Screen|\w*Renderer|BlockEntityRenderer|EntityRenderer|BlockEntityWithoutLevelRenderer|EntityModel|HierarchicalModel|Model|BakedModel|RenderLayer|Particle|ParticleProvider|AbstractContainerScreen|ClientTooltipComponent)\b/;

const CLIENT_METHODS = new Set(["initializeClient", "registerClient", "onInitializeClient", "clientSetup"]);
const DECL_TYPE = /\b(class|interface|enum|record)\s+(\w+)/;
const DECL_METHOD =
  /^\s*(?:@\w+(?:\([^)]*\))?\s+)*(?:(?:public|protected|private|static|final|abstract|synchronized|default|native)\s+)*(?:<[^>]+>\s*)?[\w.$<>\[\]?, ]+?\s+(\w+)\s*\(/;
const NOT_METHODS = new Set(["if", "for", "while", "switch", "catch", "return", "new", "else", "throw", "synchronized", "try"]);

export function stripLiterals(s) {
  s = s.replace(/"(?:\\.|[^"\\])*"/g, '""');
  s = s.replace(/'(?:\\.|[^'\\])'/g, "''");
  return s.split("//")[0];
}

const count = (s, ch) => s.split(ch).length - 1;

/**
 * Marks lines inside client-only classes/methods (Dist.CLIENT annotations, initializeClient...)
 * and returns method spans as [name, startLine, endLine] (0-based).
 */
export function analyzeStructure(lines) {
  const client = new Array(lines.length).fill(false);
  const methods = [];
  const stack = [];
  let depth = 0;
  let pendingClient = false;
  let pendingDecl = null;
  lines.forEach((raw, i) => {
    const s = stripLiterals(raw);
    const st = s.trim();
    if (st.startsWith("@") && (st.includes("Dist.CLIENT") || (st.includes("OnlyIn") && st.includes("CLIENT")))) {
      pendingClient = true;
    }
    let decl = null;
    if (!["import", "package", "*", "/*", "@"].some((p) => st.startsWith(p))) {
      const t = s.match(DECL_TYPE);
      if (t && !s.split(t[0])[0].includes("new ")) {
        decl = ["type", t[2]];
      } else {
        const m = s.match(DECL_METHOD);
        if (m && !NOT_METHODS.has(m[1]) && !st.endsWith(";") && !s.split("(")[0].includes("=")) decl = ["method", m[1]];
      }
    }
    if (decl === null && pendingDecl !== null && s.includes("{")) {
      decl = pendingDecl;
      pendingDecl = null;
    } else if (decl !== null && !s.includes("{")) {
      pendingDecl = decl;
      decl = null;
    }
    const parentClient = stack.some((e) => e.client);
    if (decl !== null) {
      const isClient = pendingClient || parentClient || (decl[0] === "method" && CLIENT_METHODS.has(decl[1]));
      stack.push({ name: decl[1], kind: decl[0], depth, client: isClient, start: i });
      pendingClient = false;
    }
    client[i] = stack.some((e) => e.client);
    depth += count(s, "{") - count(s, "}");
    while (stack.length && depth <= stack[stack.length - 1].depth) {
      const e = stack.pop();
      if (e.kind === "method") methods.push([e.name, e.start, i]);
    }
  });
  return { client, methods };
}

/** 'client-only' if the imported name is only used in client regions, 'unused' if never used, else 'common'. */
export function clientImportUsage(importLine, lines, clientFlags) {
  const m = importLine.match(/import\s+(?:static\s+)?[\w.]*\.(\w+)\s*;/);
  if (!m || m[1] === "*") return "common";
  const rx = new RegExp(`\\b${m[1]}\\b`);
  const used = [];
  lines.forEach((l, i) => {
    if (!l.trim().startsWith("import") && rx.test(l)) used.push(i);
  });
  if (!used.length) return "unused";
  return used.every((i) => clientFlags[i]) ? "client-only" : "common";
}
