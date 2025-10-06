// [수정] static/js/inventory.js

// ===== State & Helpers =====
let state = { page:1, per_page:20, sort_col:'STOCK', sort_dir:'DESC', q:'' };
const $ = (s)=>document.querySelector(s);
// ✅ [제거] const tbody = document.querySelector('#grid tbody'); -> 타이밍 문제 해결을 위해 load() 함수 내부로 이동합니다.
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
  // ✅ [수정] tbody 변수를 DOM이 확실히 로드된 후인 load() 함수 내에서 찾도록 변경
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

  document.getElementById('pageInfo').textContent = `페이지 ${json.page} / ${json.total_pages} · 총 ${