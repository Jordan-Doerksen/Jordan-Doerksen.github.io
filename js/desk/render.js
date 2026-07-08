/* render.js — Tool Desk: merge data into a model, build pins + both tables.
   No fetches here; pure data-in, DOM-out. Search/filter reads the data-*
   attributes stamped on each row. */

const STATUS_ORDER = ['active', 'building', 'live', 'built', 'private', 'frozen', 'shelved', 'superseded', 'retired'];

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* short lowercase handle for a toolkit category title, e.g.
   "Networking & Diagnostics" -> "networking" */
function shortCat(title) {
  const m = String(title || '').toLowerCase().match(/[a-z0-9]+/);
  return m ? m[0] : String(title || '').toLowerCase();
}

export function buildModel(registry, desk, toolkit) {
  const nameBySlug = {};
  registry.projects.forEach(p => { nameBySlug[p.slug] = p.name; });

  const mine = registry.projects.map(p => {
    const d = desk.mine[p.slug] || {};
    return {
      slug: p.slug, name: p.name, category: p.category,
      status: p.status, url: p.url, repo: p.repo,
      tags: p.tags || [], supersededBy: p.supersededBy,
      supersededByName: p.supersededBy ? (nameBySlug[p.supersededBy] || p.supersededBy) : null,
      note: d.note || p.blurb || '',
      port: d.port, path: d.path, launch: d.launch,
      pinned: desk.pinned.includes(p.slug),
    };
  });
  // desk-only entries with no registry row (e.g. it-toolkit) live in desk.extra
  (desk.extra || []).forEach(e => mine.push({
    tags: [], note: '', ...e, pinned: desk.pinned.includes(e.slug),
  }));
  mine.sort((a, b) => {
    const sa = STATUS_ORDER.indexOf(a.status), sb = STATUS_ORDER.indexOf(b.status);
    if (sa !== sb) return (sa < 0 ? 99 : sa) - (sb < 0 ? 99 : sb);
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const catById = {};
  (toolkit.categories || []).forEach(c => { catById[c.id] = c.title; });
  const kit = (toolkit.tools || []).map(t => {
    const d = desk.toolkit[t.name] || {};
    return {
      name: t.name, url: t.url, desc: t.desc,
      catTitle: catById[t.cat] || t.cat, cat: shortCat(catById[t.cat] || t.cat),
      platform: t.platform, license: t.license,
      star: !!d.star, install: d.install, snippet: d.snippet,
    };
  });
  kit.sort((a, b) => (a.star === b.star ? a.name.localeCompare(b.name) : (a.star ? -1 : 1)));

  return {
    mine, toolkit: kit, pinned: desk.pinned,
    registryCats: registry.categories.map(c => c.slug),
    toolkitCats: [...new Set(kit.map(t => t.cat))],
  };
}

function mineRow(r) {
  const status = `<span class="status s-${esc(r.status)}">${esc(r.status)}</span>`;
  const superseded = r.supersededByName
    ? ` <span class="superseded">→ superseded by ${esc(r.supersededByName)}</span>` : '';
  const links = [];
  if (r.repo) links.push(`<a href="${esc(r.repo)}" target="_blank" rel="noopener">repo</a>`);
  if (r.port) links.push(`<a href="http://localhost:${esc(r.port)}" target="_blank" rel="noopener"${r.launch ? ` title="${esc(r.launch)}"` : ''}>local</a>`);
  const text = [r.name, r.status, r.note, r.port, r.path, r.category, ...r.tags].join(' ').toLowerCase();
  return `<tr data-kind="mine" data-status="${esc(r.status)}" data-cat="${esc(r.category)}" data-star="${r.pinned ? 1 : 0}" data-text="${esc(text)}">
    <td class="star">${r.pinned ? '★' : ''}</td>
    <td class="name">${r.url ? `<a href="${esc(r.url)}">${esc(r.name)}</a>` : esc(r.name)}</td>
    <td>${status}</td>
    <td class="note hide-sm">${esc(r.note)}${superseded}</td>
    <td class="mono">${r.port ? `<span class="copy">${esc(r.port)}</span>` : '—'}</td>
    <td class="mono hide-sm">${r.path ? `<span class="copy">${esc(r.path)}</span>` : '—'}</td>
    <td class="links">${links.join('') || '—'}</td>
  </tr>`;
}

function kitRow(t) {
  const snippet = t.snippet ? ` · <span class="copy mono">${esc(t.snippet)}</span>` : '';
  const get = t.install ? `<span class="copy">${esc(t.install)}</span>` : esc(t.license || '—');
  const text = [t.name, t.catTitle, t.cat, t.desc, t.install, t.snippet, t.platform, t.license].join(' ').toLowerCase();
  return `<tr data-kind="toolkit" data-cat="${esc(t.cat)}" data-star="${t.star ? 1 : 0}" data-text="${esc(text)}">
    <td class="star">${t.star ? '★' : ''}</td>
    <td class="name"><a href="${esc(t.url)}" target="_blank" rel="noopener">${esc(t.name)}</a></td>
    <td class="mono">${esc(t.cat)}</td>
    <td class="note hide-sm">${esc(t.desc)}${snippet}</td>
    <td class="mono hide-sm">${get}</td>
    <td class="mono">${esc(t.platform || '—')}</td>
  </tr>`;
}

export function render(model) {
  // pins — one click to what I open every day
  const pinRows = model.pinned
    .map(slug => model.mine.find(r => r.slug === slug))
    .filter(Boolean);
  document.getElementById('pins').innerHTML = pinRows.map(r => {
    const sub = r.port ? `:${r.port}` : r.category;
    const href = r.url || '#';
    return `<a class="pin" href="${esc(href)}"><b>${esc(r.name)}</b> <span class="p">${esc(sub)}</span></a>`;
  }).join('') || '<span class="pin"><span class="p">nothing pinned</span></span>';

  const mineBody = document.querySelector('#mine tbody');
  mineBody.innerHTML = model.mine.map(mineRow).join('') +
    `<tr class="empty" hidden><td colspan="7">nothing matches</td></tr>`;

  const kitBody = document.querySelector('#toolkit tbody');
  kitBody.innerHTML = model.toolkit.map(kitRow).join('') +
    `<tr class="empty" hidden><td colspan="6">nothing matches</td></tr>`;
}
