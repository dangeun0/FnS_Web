// alert("--- inventory.js SCRIPT LOADED! ---");
// ===== State & Helpers =====
let state = { page:1, per_page:20, sort_col:'STOCK', sort_dir:'DESC', q:'' };
const $ = (s)=>document.querySelector(s);
//const tbody = document.querySelector('#grid tbody');
const spinner = document.getElementById('spinner');

const COLUMNS = [
  { key:'CATEGORY_NAME', label:'분류' },
  { key:'MAKER_NAME',    label:'제조사' },
  { key:'ITEM_NAME',     label:'부품명' },
  { key:'ITEM_SPEC',     label:'규격' },
  { key:'STOCK',         label:'현재고' },
];

function showBusy(on){ spinner.classList.toggle('hidden', !on); }
function qs(obj){ return new URLSearchParams(obj).toString(); }
function readURL(){
  const p = new URLSearchParams(location.search);
  const n = (k, d)=>{ const v=p.get(k); return v===null? d: v; };
  state.page = parseInt(n('page', state.page))||1;
  state.per_page = parseInt(n('per_page', state.per_page))||20;
  state.sort_col = (n('sort_col', state.sort_col) || 'STOCK').toUpperCase();
  state.sort_dir = (n('sort_dir', state.sort_dir) || 'DESC').toUpperCase();
  state.q = n('q', '');
  $('#q').value = state.q; $('#perPage').value = String(state.per_page);
}
function writeURL(replace=true){
  const url = location.pathname + '?' + qs({
    page: state.page, per_page: state.per_page, sort_col: state.sort_col, sort_dir: state.sort_dir, q: state.q
  });
  if(replace) history.replaceState(null, '', url); else history.pushState(null, '', url);
}

function loadColPrefs(){ try{ return JSON.parse(localStorage.getItem('inv_cols')||'{}'); }catch(e){ return {}; } }
function saveColPrefs(prefs){ localStorage.setItem('inv_cols', JSON.stringify(prefs)); }
function applyVisibility(prefs){
  COLUMNS.forEach(c=>{
    const on = prefs[c.key] !== false; // default: visible
    const th = document.querySelector(`th.col-${c.key}`);
    if(th) th.classList.toggle('hide', !on);
    document.querySelectorAll(`td.col-${c.key}`).forEach(td=> td.classList.toggle('hide', !on));
  });
}
function buildColMenu(){
  const wrap = document.getElementById('colMenu');
  wrap.innerHTML='';
  const prefs = loadColPrefs();
  COLUMNS.forEach(c=>{
    const on = prefs[c.key] !== false;
    const id = 'col_'+c.key;
    const row = document.createElement('label');
    row.innerHTML = `<input type="checkbox" id="${id}" ${on?'checked':''}/> ${c.label}`;
    const input = row.querySelector('input');
    input.addEventListener('change', (e)=>{
      const curr = loadColPrefs();
      const np = Object.assign({}, curr, { [c.key]: e.target.checked });
      saveColPrefs(np); applyVisibility(np); e.stopPropagation();
    });
    wrap.appendChild(row);
  });
}

function buildPager(curr, total){
  const host = document.getElementById('pager');
  host.innerHTML='';
  if(!total || total<=1){ return; }
  const addBtn=(label,page,opts={})=>{
    const b=document.createElement('button');
    b.textContent=label; b.className='num'+(opts.active?' active':'');
    if(opts.disabled){ b.disabled=true; }
    b.addEventListener('click', ()=>{ if(!opts.disabled){ state.page=page; load(); }});
    host.appendChild(b);
  };
  const addEll=()=>{ const s=document.createElement('span'); s.className='ellipsis'; s.textContent='…'; host.appendChild(s); };
  addBtn('«', 1, {disabled: curr===1});
  addBtn('‹', Math.max(1, curr-1), {disabled: curr===1});
  const set=new Set([1,2,total-1,total,curr-2,curr-1,curr,curr+1,curr+2]);
  const pages=Array.from(set).filter(p=>p>=1&&p<=total).sort((a,b)=>a-b);
  let last=0;
  pages.forEach(p=>{ if(p-last>1) addEll(); addBtn(String(p), p, {active:p===curr}); last=p; });
  addBtn('›', Math.min(total, curr+1), {disabled: curr===total});
  addBtn('»', total, {disabled: curr===total});
}

// ===== Data Load =====
async function load(){
  // 이 위치에 위에서 삭제한 라인을 추가합니다.
  const tbody = document.querySelector('#grid tbody');
  if (!tbody) {
    console.error("Critical error: #grid tbody element not found.");
    return;
  }
  
  showBusy(true);
  writeURL(true);
  const params = new URLSearchParams(state);
  let res;
  try{ res = await fetch(`/inventory?${params.toString()}`, { credentials:'same-origin' }); }
  catch(err){ showBusy(false); alert('네트워크 오류'); return; }
  const ct = (res.headers.get('content-type')||'').toLowerCase();
  if(!ct.includes('application/json')){ location.href='/login'; return; }
  let json;
  try{ json = await res.json(); }
  catch(err){ showBusy(false); alert('JSON 파싱 실패'); return; }
  if(json.status==='error'){ showBusy(false); alert('에러: '+json.message); return; }

  tbody.innerHTML = '';
  (json.data||[]).forEach(r=>{
    const tr = document.createElement('tr');
    tr.className='clickable';
    tr.dataset.code = r.item_code; // ✅ 행에서 품목코드 추적
    tr.innerHTML = `
      <td class="col-CATEGORY_NAME">${r.category_name||''}</td>
      <td class="col-MAKER_NAME">${r.maker_name||''}</td>
      <td class="col-ITEM_NAME">${r.item_name||''}</td>
      <td class="col-ITEM_SPEC">${r.item_spec||''}</td>
      <td class="col-STOCK">${r.stock ?? 0}</td>`;
    tr.addEventListener('click', ()=> openDetail(r.item_code));
    tbody.appendChild(tr);
  });

  document.getElementById('pageInfo').textContent = `페이지 ${json.page} / ${json.total_pages} · 총 ${json.total_count}건`;
  document.getElementById('status').textContent = '';
  buildPager(json.page, json.total_pages);

  applyVisibility(loadColPrefs());
  showBusy(false);
}

// ===== Detail =====
async function openDetail(code){
  showBusy(true);
  try{
    const res = await fetch(`/inventory/item/${encodeURIComponent(code)}`, { credentials:'same-origin' });
    const ct = (res.headers.get('content-type')||'').toLowerCase();
    if(!ct.includes('application/json')){ location.href='/login'; return; }
    const d = await res.json();
    renderDetail(d);
  }catch(e){ alert('상세 조회 실패'); }
  finally{ showBusy(false); }
}
function renderDetail(d){
  if(!d || !d.item_code){ alert('데이터 없음'); return; }
  window.currentCode = d.item_code;
  document.getElementById('dTitle').textContent = `${d.item_code} · ${d.item_name||''}`;
  const g = document.getElementById('dGrid');
  g.innerHTML = '';
  const addKV = (k,v,id)=>{
    const kdiv=document.createElement('div'); kdiv.textContent=k;
    const vdiv=document.createElement('div'); vdiv.textContent=(v??'');
    if(id) vdiv.id = id;
    g.appendChild(kdiv); g.appendChild(vdiv);
  };
  addKV('분류', d.category_name);
  addKV('제조사', d.maker_name);
  addKV('규격', d.item_spec);
  addKV('재질', d.material_name);
  addKV('현재고', d.stock, 'dStock'); // ✅ 식별 가능한 현재고 DOM
  addKV('위치', d.item_location);
  if(d.item_note) addKV('비고', d.item_note);

  const hist = d.history||[]; const tb = document.getElementById('dHist'); tb.innerHTML='';
  hist.forEach(h=>{
    const tr = document.createElement('tr');
    const type = (h.inout_type||'').toUpperCase();
    const label = type==='IN' ? '입고' : (type==='OUT' ? '출고' : type);
    const cls = type==='IN' ? 'pill in' : (type==='OUT' ? 'pill out' : '');
    tr.innerHTML = `<td>${h.trans_date? new Date(h.trans_date).toLocaleString():''}</td><td><span class="${cls}">${label}</span></td><td style="text-align:right">${h.qty??0}</td><td>${h.detail_note||''}</td>`;
    tb.appendChild(tr);
  });
  document.getElementById('detailModal').classList.add('open');
}

// ===== Events =====
document.getElementById('btnSearch').addEventListener('click', ()=>{ state.q=document.getElementById('q').value.trim(); state.page=1; load(); });
document.getElementById('q').addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ state.q=document.getElementById('q').value.trim(); state.page=1; load(); }});
document.getElementById('perPage').addEventListener('change', (e)=>{ state.per_page=parseInt(e.target.value,10)||20; state.page=1; load(); });

Array.from(document.querySelectorAll('th.sortable')).forEach(th=>{
  th.addEventListener('click', ()=>{
    const col = th.getAttribute('data-col');
    if(state.sort_col===col){ state.sort_dir = (state.sort_dir==='ASC'?'DESC':'ASC'); }
    else { state.sort_col = col; state.sort_dir='ASC'; }
    state.page = 1; load();
  });
});

const btnLogout = document.getElementById('btnLogout');
if(btnLogout){ btnLogout.addEventListener('click', ()=>{ if(confirm('로그아웃 하시겠습니까?')) location.href='/logout'; }); }

const menuWrap = document.getElementById('colMenuWrap');
document.getElementById('btnCols').addEventListener('click', ()=>{ menuWrap.classList.toggle('open'); });
document.addEventListener('click', (e)=>{ if(!menuWrap.contains(e.target)) menuWrap.classList.remove('open'); });

const dModal = document.getElementById('detailModal');
document.getElementById('dClose').addEventListener('click', ()=> dModal.classList.remove('open'));
dModal.addEventListener('click', (e)=>{ if(e.target===dModal) dModal.classList.remove('open'); });
window.addEventListener('keydown', (e)=>{ if(e.key==='Escape') dModal.classList.remove('open'); });

window.addEventListener('DOMContentLoaded', ()=>{ buildColMenu(); applyVisibility(loadColPrefs()); readURL(); load(); });
window.addEventListener('popstate', ()=>{ readURL(); load(); });

// ===== 입/출고 처리 =====
document.getElementById('txnConfirm').addEventListener('click', async ()=>{
  const type = document.getElementById('txnType').value;
  const qty = parseInt(document.getElementById('txnQty').value, 10);
  const note = document.getElementById('txnNote').value.trim();
  if(!window.currentCode){ alert('품목코드가 없습니다. 다시 시도하세요.'); return; }
  if(!qty || qty <= 0){ alert('수량을 입력하세요'); return; }

  try{
    const res = await fetch('/inventory/txn', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ item_code: window.currentCode, inout_type:type, qty, note })
    });
    const j = await res.json();
    if(!j.success){ alert(j.message || '처리 실패'); return; }

    // 모달 현재고 반영
    const dStock = document.getElementById('dStock');
    if(dStock) dStock.textContent = j.new_stock;

    // 리스트 행 현재고 즉시 반영
    const row = document.querySelector(`tr[data-code="${window.currentCode}"] td.col-STOCK`);
    if(row) row.textContent = j.new_stock;

    // 이력 상단 추가
    const tr = document.createElement('tr');
    const _label = type==='IN' ? '입고' : '출고';
    const _cls = type==='IN' ? 'pill in' : 'pill out';
    tr.innerHTML = `<td>${new Date().toLocaleString()}</td><td><span class="${_cls}">${_label}</span></td><td style=\"text-align:right\">${qty}</td><td>${note||''}</td>`;
    document.getElementById('dHist').prepend(tr);

    // 입력 초기화
    document.getElementById('txnQty').value='';
    document.getElementById('txnNote').value='';
  }catch(e){ alert('에러: '+e); }
});
