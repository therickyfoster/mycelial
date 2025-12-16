<script>
/* Mycelial Widget — read-only renderer for PRA sitemap.json
   Usage:
   <script src="mycelial-widget.js"></script>
   <mycelial-board
      data-src="/path/to/sitemap.json"
      data-title="Planetary Restoration Archive — Grandmaster Board"
      data-cta="If this moved you, let it move through you."
      data-xmr=""
      data-filter="status:master,grand"
      data-sort="rep|sr|new"
      data-limit="0"
   ></mycelial-board>
*/
(()=>{
  const CSS = `
  :host{all:initial; display:block; font-family:Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial}
  .wrap{max-width:960px; margin:0 auto; padding:22px 16px; color:#eaf3ff; background:#0b0f13}
  h1{margin:0 0 8px; font-weight:800}
  .muted{color:#9fb0c2}
  .row{display:flex; gap:8px; align-items:center; flex-wrap:wrap}
  input,select{all:unset; background:#0d1318; border:1px solid #24313c; color:#eaf3ff; padding:8px 10px; border-radius:10px}
  .pill{border:1px solid #26313b; padding:2px 8px; border-radius:999px; color:#9fb0c2; font-size:12px}
  .card{background:#10161d; border:1px solid #1b2230; border-radius:16px; padding:16px; margin:12px 0}
  .tag{background:#0a1218; border:1px solid #24323f; padding:4px 8px; border-radius:10px; color:#9fb6cc; margin-right:6px}
  .divider{height:1px; background:#1b2230; margin:12px 0}
  code{background:#0a1016; border:1px solid #1b2330; padding:2px 6px; border-radius:8px}
  .good{color:#7ae582} .mid{color:#ffd166} .bad{color:#ff6b6b}
  .grid{display:grid; grid-template-columns:1fr auto auto; gap:8px}
  @media (max-width:720px){ .grid{grid-template-columns:1fr} }
  .footer{margin-top:24px; padding:16px 0 36px; color:#9fb0c2}
  `;

  function escapeHTML(s){return (s||'').toString().replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function ratio(p){const rep=p.metrics?.replications||0;const succ=p.metrics?.success||0;return rep?succ/rep:0;}
  function matches(p,q){ if(!q) return true; q=q.toLowerCase(); const hay=[p.title,(p.tags||[]).join(' '),p.status].join(' ').toLowerCase(); return hay.includes(q); }

  class MycelialBoard extends HTMLElement{
    static get observedAttributes(){ return ['data-src','data-title','data-cta','data-xmr','data-filter','data-sort','data-limit']; }
    constructor(){
      super();
      this._root = this.attachShadow({mode:'open'});
      const style = document.createElement('style'); style.textContent = CSS;
      this._root.appendChild(style);
      this.wrap = document.createElement('div'); this.wrap.className = 'wrap';
      this._root.appendChild(this.wrap);
      this.state = { items:[], fp:'—' };
    }
    attributeChangedCallback(){ this.render(); this.load(); }

    connectedCallback(){ this.render(); this.load(); }

    get src(){ return this.getAttribute('data-src') || '/sitemap.json'; }
    get title(){ return this.getAttribute('data-title') || 'Planetary Restoration Archive — Grandmaster Board'; }
    get cta(){ return this.getAttribute('data-cta') || 'If this moved you, let it move through you.'; }
    get xmr(){ return this.getAttribute('data-xmr') || ''; }
    get filter(){ return (this.getAttribute('data-filter')||'status:master,grand').trim(); }
    get sort(){ return (this.getAttribute('data-sort')||'rep').trim(); }
    get limit(){ const n = parseInt(this.getAttribute('data-limit')||'0',10); return Number.isFinite(n)? n : 0; }

    async load(){
      try{
        const r = await fetch(this.src, {cache:'no-store'});
        if(!r.ok) throw new Error('fetch failed');
        const data = await r.json();
        this.state.fp = data.bankFingerprint || '—';
        let items = (data.items||[]).slice();

        // filter
        const f = this.filter.toLowerCase();
        if(f.startsWith('status:')){
          const allowed = f.replace('status:','').split(',').map(s=>s.trim());
          items = items.filter(x=>allowed.includes((x.status||'').toLowerCase()));
        }

        // sort
        if(this.sort==='rep'){ items.sort((a,b)=>(b.metrics?.replications||0)-(a.metrics?.replications||0)); }
        else if(this.sort==='sr'){ items.sort((a,b)=>((b.metrics?.success||0)/(b.metrics?.replications||1))-((a.metrics?.success||0)/(a.metrics?.replications||1))); }
        else { items.sort((a,b)=> (b.updatedAt||'').localeCompare(a.updatedAt||'')); }

        if(this.limit>0) items = items.slice(0, this.limit);

        this.state.items = items;
        this.render();
      }catch(e){
        this.wrap.innerHTML = `<div class="muted">Failed to load sitemap at <code>${escapeHTML(this.src)}</code></div>`;
      }
    }

    render(){
      const items = this.state.items || [];
      const fp = this.state.fp;

      this.wrap.innerHTML = `
        <header>
          <h1>${escapeHTML(this.title)}</h1>
          <div class="muted">Source fingerprint: <code>${escapeHTML(fp)}</code></div>
          <div class="grid" style="margin-top:8px">
            <input id="q" placeholder="Search title/tags/status…" />
            <select id="sort">
              <option value="rep"${this.sort==='rep'?' selected':''}>Sort: Replications</option>
              <option value="sr"${this.sort==='sr'?' selected':''}>Sort: Success%</option>
              <option value="new"${this.sort==='new'?' selected':''}>Sort: Newest</option>
            </select>
            <select id="status">
              <option value="master,grand"${this.filter.includes('master')?' selected':''}>Master + Grandmaster</option>
              <option value="master">Master only</option>
              <option value="grand">Grandmaster only</option>
            </select>
          </div>
        </header>
        <div id="list"></div>
        <footer class="footer">“If this moved you, let it move through you.” — PRA</footer>
      `;

      const list = this._root.getElementById('list');
      if(!items.length){
        list.innerHTML = `<div class="muted" style="margin-top:12px">No items match the filter.</div>`;
      }else{
        list.innerHTML = items.map(p=>{
          const rep=p.metrics?.replications||0, succ=p.metrics?.success||0, fail=p.metrics?.fail||0;
          const sr = rep? Math.round((succ/rep)*100) : 0;
          const statusBadge = (p.status||'').toLowerCase()==='grand'?'Grandmaster':'Master';
          const tags=(p.tags||[]).map(t=>`<span class="tag">#${escapeHTML(t)}</span>`).join(' ');

          return `
            <article class="card">
              <div class="row" style="justify-content:space-between">
                <h2 style="margin:0">${escapeHTML(p.title||'—')}</h2>
                <span class="pill">${escapeHTML(statusBadge)}</span>
              </div>
              <div class="muted" style="margin-top:4px">ID: <code>${escapeHTML(p.id)}</code> • Updated: ${escapeHTML(p.updatedAt||p.createdAt||'—')}</div>
              <div style="margin-top:6px">${tags}</div>
              ${p.heartbeat? `<div class="divider"></div><p>${escapeHTML(p.heartbeat)}</p>`:''}
              ${p.actions? `<h3 style="margin:10px 0 4px">Actions</h3><pre style="white-space:pre-wrap">${escapeHTML(p.actions)}</pre>`:''}
              ${p.proof? `<h3 style="margin:10px 0 4px">Proof Plan</h3><p>${escapeHTML(p.proof)}</p>`:''}
              <div class="row" style="gap:12px; margin-top:8px">
                <span class="pill">replications: ${rep}</span>
                <span class="pill">success: ${succ}</span>
                <span class="pill">fail: ${fail}</span>
                <span class="pill ${sr>=80?'good':sr>=50?'mid':'bad'}">success ratio: ${sr}%</span>
              </div>
              <div class="divider"></div>
              <p><em>${escapeHTML(this.cta)}</em></p>
              ${this.xmr ? `<p class="muted">XMR: <code>${escapeHTML(this.xmr)}</code></p>`:''}
            </article>
          `;
        }).join('');
      }

      // wire search + filters without reloading JSON
      const qEl = this._root.getElementById('q');
      const sortEl = this._root.getElementById('sort');
      const statusEl = this._root.getElementById('status');

      const applyLocalFilters = ()=>{
        const query = (qEl.value||'').trim().toLowerCase();
        const sort = sortEl.value;
        const statuses = statusEl.value.split(',').map(s=>s.trim());
        const base = (this.state.items||[]);
        let arr = base.filter(p=>statuses.includes((p.status||'').toLowerCase())).filter(p=>matches(p, query));
        if(sort==='rep'){ arr.sort((a,b)=>(b.metrics?.replications||0)-(a.metrics?.replications||0)); }
        else if(sort==='sr'){ arr.sort((a,b)=>((b.metrics?.success||0)/(b.metrics?.replications||1))-((a.metrics?.success||0)/(a.metrics?.replications||1))); }
        else { arr.sort((a,b)=> (b.updatedAt||'').localeCompare(a.updatedAt||'')); }
        // re-render list quickly
        const tmp = document.createElement('div'); tmp.innerHTML = arr.map(p=>{
          const rep=p.metrics?.replications||0, succ=p.metrics?.success||0, fail=p.metrics?.fail||0;
          const sr = rep? Math.round((succ/rep)*100) : 0;
          const statusBadge = (p.status||'').toLowerCase()==='grand'?'Grandmaster':'Master';
          const tags=(p.tags||[]).map(t=>`<span class="tag">#${escapeHTML(t)}</span>`).join(' ');
          return `
            <article class="card">
              <div class="row" style="justify-content:space-between">
                <h2 style="margin:0">${escapeHTML(p.title||'—')}</h2>
                <span class="pill">${escapeHTML(statusBadge)}</span>
              </div>
              <div class="muted" style="margin-top:4px">ID: <code>${escapeHTML(p.id)}</code> • Updated: ${escapeHTML(p.updatedAt||p.createdAt||'—')}</div>
              <div style="margin-top:6px">${tags}</div>
              ${p.heartbeat? `<div class="divider"></div><p>${escapeHTML(p.heartbeat)}</p>`:''}
              ${p.actions? `<h3 style="margin:10px 0 4px">Actions</h3><pre style="white-space:pre-wrap">${escapeHTML(p.actions)}</pre>`:''}
              ${p.proof? `<h3 style="margin:10px 0 4px">Proof Plan</h3><p>${escapeHTML(p.proof)}</p>`:''}
              <div class="row" style="gap:12px; margin-top:8px">
                <span class="pill">replications: ${rep}</span>
                <span class="pill">success: ${succ}</span>
                <span class="pill">fail: ${fail}</span>
                <span class="pill ${sr>=80?'good':sr>=50?'mid':'bad'}">success ratio: ${sr}%</span>
              </div>
              <div class="divider"></div>
              <p><em>${escapeHTML(this.cta)}</em></p>
              ${this.xmr ? `<p class="muted">XMR: <code>${escapeHTML(this.xmr)}</code></p>`:''}
            </article>`;
        }).join('');
        list.innerHTML = tmp.innerHTML;
      };

      qEl?.addEventListener('input', applyLocalFilters);
      sortEl?.addEventListener('change', applyLocalFilters);
      statusEl?.addEventListener('change', applyLocalFilters);
    }
  }
  customElements.define('mycelial-board', MycelialBoard);
})();
</script>!