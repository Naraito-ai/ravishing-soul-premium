/* ============================================================
   RAVISHING SOUL  admin.js
   ============================================================ */

function loadDashboard() {
  const visitor = JSON.parse(localStorage.getItem('rs_visitor') || 'null');
  const allLeads = JSON.parse(localStorage.getItem('rs_leads') || '[]');

  // Combine: current visitor + all leads (deduplicate by id)
  const all = [...allLeads];
  if (visitor && !all.find(l => l.id === visitor.id)) all.push(visitor);

  renderStats(all);
  renderTable(all);
}

function renderStats(data) {
  const total = data.length;
  const leads = data.filter(d => d.leadSubmitted).length;
  const mobile = data.filter(d => d.device === 'Mobile').length;
  const waClicks = data.reduce((acc, d) => acc + (d.ctaClicks||[]).filter(c => c.label === 'wa_redirect_click').length, 0);

  document.getElementById('stat-visitors').textContent = total;
  document.getElementById('stat-leads').textContent = leads;
  document.getElementById('stat-mobile').textContent = mobile;
  document.getElementById('stat-wa').textContent = waClicks;
  document.getElementById('conv-rate').textContent = total ? Math.round((leads/total)*100) + '%' : '0%';
}

function renderTable(data) {
  const tbody = document.getElementById('visitorTable');
  if (!tbody) return;
  if (!data.length) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-dim);">No visitor data yet.</td></tr>'; return; }

  tbody.innerHTML = data.slice().reverse().map(v => {
    const loc = v.location ? `${v.location.city || ''}, ${v.location.country || ''}` : '';
    const actions = (v.ctaClicks||[]).map(c => `<span class="action-tag">${c.label}</span>`).join(' ') || '';
    const leadBadge = v.leadSubmitted
      ? `<span class="badge badge-green"> Lead</span>`
      : `<span class="badge badge-dim"></span>`;
    const phone = v.leadData?.phone || '';
    const name  = v.leadData?.name  || '';
    const first = v.firstVisit ? new Date(v.firstVisit).toLocaleDateString('en-IN') : '';
    return `
      <tr>
        <td><code class="id-code">${v.id?.slice(0,14) || ''}</code></td>
        <td>${v.device || ''}</td>
        <td>${loc}</td>
        <td>${first}</td>
        <td class="actions-cell">${actions}</td>
        <td>${leadBadge}</td>
        <td><span class="phone-val">${phone}</span><br><small style="color:var(--text-dim)">${name}</small></td>
      </tr>`;
  }).join('');
}

function clearData() {
  if (!confirm('Clear all visitor & lead data?')) return;
  localStorage.removeItem('rs_visitor');
  localStorage.removeItem('rs_leads');
  location.reload();
}

document.addEventListener('DOMContentLoaded', () => {
  // Theme
  const stored = localStorage.getItem('rs_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', stored);

  loadDashboard();
  document.getElementById('refreshBtn')?.addEventListener('click', loadDashboard);
  document.getElementById('clearBtn')?.addEventListener('click', clearData);
  document.getElementById('exportBtn')?.addEventListener('click', exportCSV);
});

function exportCSV() {
  const allLeads = JSON.parse(localStorage.getItem('rs_leads') || '[]');
  const visitor = JSON.parse(localStorage.getItem('rs_visitor') || 'null');
  const all = [...allLeads];
  if (visitor && !all.find(l => l.id === visitor.id)) all.push(visitor);

  const rows = [['ID','Device','City','Country','First Visit','Lead?','Phone','Name','Email','CTA Clicks']];
  all.forEach(v => {
    rows.push([
      v.id, v.device,
      v.location?.city || '', v.location?.country || '',
      v.firstVisit || '',
      v.leadSubmitted ? 'Yes' : 'No',
      v.leadData?.phone || '', v.leadData?.name || '', v.leadData?.email || '',
      (v.ctaClicks||[]).map(c => c.label).join('; ')
    ]);
  });

  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'ravishing-soul-leads.csv';
  a.click();
}
