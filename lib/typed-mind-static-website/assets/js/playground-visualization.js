// Entity diagram for the TypedMind playground Visualization tab.
// Renders a pure SVG from the browser parser's parse() output.

const KIND_COLORS = {
  Program:      '#3B5BFF',
  File:         '#0EA5E9',
  Function:     '#22C55E',
  Class:        '#8B5CF6',
  ClassFile:    '#A855F7',
  Constants:    '#64748B',
  DTO:          '#F97316',
  Asset:        '#EAB308',
  UIComponent:  '#EC4899',
  RunParameter: '#475569',
  Dependency:   '#92400E',
  TypeDef:      '#D97706',
};

const KIND_ORDER = [
  'Program', 'File', 'ClassFile', 'Class', 'Function',
  'DTO', 'TypeDef', 'Constants', 'UIComponent', 'Asset',
  'RunParameter', 'Dependency',
];

const NODE_W = 140;
const NODE_H = 32;
const NODE_PAD = 12;
const GROUP_PAD = 16;
const GROUP_HEADER = 24;
const COLS_PER_GROUP = 3;

function updateVisualizationPanel(result) {
  const container = document.getElementById('visualizationContainer');
  if (!container) return;

  const entities = Array.from(result.entities.values());
  if (entities.length === 0) {
    container.innerHTML =
      '<div class="visualization-placeholder"><p>Write some TypedMind code to see the architecture diagram.</p></div>';
    return;
  }

  const groups = new Map();
  for (const entity of entities) {
    const kind = entity.kind;
    if (!groups.has(kind)) groups.set(kind, []);
    groups.get(kind).push(entity);
  }

  const sortedKinds = KIND_ORDER.filter(k => groups.has(k));

  const positions = new Map();
  let yOffset = GROUP_PAD;

  for (const kind of sortedKinds) {
    const members = groups.get(kind);
    const rows = Math.ceil(members.length / COLS_PER_GROUP);
    const groupH = GROUP_HEADER + rows * (NODE_H + NODE_PAD) + GROUP_PAD;

    for (let i = 0; i < members.length; i++) {
      const col = i % COLS_PER_GROUP;
      const row = Math.floor(i / COLS_PER_GROUP);
      const x = GROUP_PAD + col * (NODE_W + NODE_PAD);
      const y = yOffset + GROUP_HEADER + row * (NODE_H + NODE_PAD);
      positions.set(members[i].name, { x, y, kind, entity: members[i] });
    }

    yOffset += groupH;
  }

  const totalW = GROUP_PAD * 2 + COLS_PER_GROUP * (NODE_W + NODE_PAD) - NODE_PAD;
  const totalH = yOffset + GROUP_PAD;

  const edges = [];
  for (const entity of entities) {
    const src = positions.get(entity.name);
    if (!src) continue;

    const addEdges = (targets, color, dashed) => {
      if (!targets) return;
      for (const t of targets) {
        const dst = positions.get(t);
        if (dst) edges.push({ from: src, to: dst, color, dashed });
      }
    };

    if (entity.kind === 'Program' && entity.entry) {
      const dst = positions.get(entity.entry);
      if (dst) edges.push({ from: src, to: dst, color: '#3B5BFF', dashed: false });
    }

    addEdges(entity.imports, '#0EA5E9', true);
    addEdges(entity.exports, '#22C55E', false);
    addEdges(entity.calls, '#EF4444', true);
    addEdges(entity.methods, '#8B5CF6', true);
    if (entity.extends) {
      const dst = positions.get(entity.extends);
      if (dst) edges.push({ from: src, to: dst, color: '#64748B', dashed: false });
    }
    addEdges(entity.implements, '#64748B', true);
  }

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" class="viz-svg">`;
  svg += `<defs><marker id="viz-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#94A3B8"/></marker></defs>`;

  yOffset = GROUP_PAD;
  for (const kind of sortedKinds) {
    const members = groups.get(kind);
    const rows = Math.ceil(members.length / COLS_PER_GROUP);
    const groupH = GROUP_HEADER + rows * (NODE_H + NODE_PAD) + GROUP_PAD;
    const color = KIND_COLORS[kind] || '#64748B';

    svg += `<rect x="${GROUP_PAD / 2}" y="${yOffset}" width="${totalW - GROUP_PAD}" height="${groupH}" rx="4" fill="${color}08" stroke="${color}30" stroke-width="1"/>`;
    svg += `<text x="${GROUP_PAD}" y="${yOffset + 16}" fill="${color}" font-size="11" font-weight="600" font-family="var(--font-sans, Inter, system-ui, sans-serif)">${kind}</text>`;

    yOffset += groupH;
  }

  for (const [name, pos] of positions) {
    const color = KIND_COLORS[pos.kind] || '#64748B';
    const truncName = name.length > 16 ? name.slice(0, 15) + '…' : name;
    svg += `<rect x="${pos.x}" y="${pos.y}" width="${NODE_W}" height="${NODE_H}" rx="3" fill="${color}18" stroke="${color}" stroke-width="1.5"/>`;
    svg += `<text x="${pos.x + NODE_W / 2}" y="${pos.y + NODE_H / 2 + 4}" text-anchor="middle" fill="var(--text, #E2E8F0)" font-size="12" font-family="var(--font-mono, JetBrains Mono, monospace)">${truncName}</text>`;
  }

  for (const edge of edges) {
    const x1 = edge.from.x + NODE_W / 2;
    const y1 = edge.from.y + NODE_H / 2;
    const x2 = edge.to.x + NODE_W / 2;
    const y2 = edge.to.y + NODE_H / 2;
    const dash = edge.dashed ? ' stroke-dasharray="4 3"' : '';
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${edge.color}" stroke-width="1" opacity="0.6" marker-end="url(#viz-arrow)"${dash}/>`;
  }

  svg += '</svg>';
  container.innerHTML = svg;
}
