// [수정] static/js/inventory.js

// ===== State & Helpers =====
let state = { page:1, per_page:20, sort_col:'STOCK', sort_dir:'DESC', q:'' };
const $ = (s) => document.querySelector(s);
// ✅ [제거] const tbody = document.querySelector('#grid tbody'); -> 타이밍 문제의 원인이므로 삭제

const spinner = document.getElementById('spinner');

// ... (다른 함수들은 기존과 동일) ...
function buildPager(curr, total){
  // ...
}

// ===== Data Load =====
async function load(){
  // ✅ [추가] tbody 변수를 load 함수가 실행될 때 찾도록 위치 변경
  const tbody = document.querySelector('#grid tbody');
  if (!tbody) {
    console.error("Critical error: #grid tbody not found in the DOM.");
    alert("테이블 요소를 찾을 수 없습니다. HTML 구조를 확인해주세요.");
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
  if (json.data && json.data.length > 0) {
    json.data.forEach(r=>{
      const tr = document.createElement('tr');
      tr.className='clickable';
      tr.dataset.code = r.item_code;
      tr.innerHTML = `
        <td class="col-CATEGORY_NAME">${r.category_name||''}</td>
        <td class="col-MAKER_NAME">${r.maker_name||''}</td>
        <td class="col-ITEM_NAME">${r.item_name||''}</td>
        <td class="col-ITEM_SPEC">${r.item_spec||''}</td>
        <td class="col-STOCK">${r.stock ?? 0}</td>`;
      tr.addEventListener('click', ()=> openDetail(r.item_code));
      tbody.appendChild(tr);
    });
  } else {
      // ✅ [개선] 데이터가 없을 때 표시할 메시지
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5; // 현재 컬럼 개수에 맞춤
      td.textContent = '표시할 데이터가 없습니다.';
      td.style.textAlign = 'center';
      td.style.padding = '40px';
      tr.appendChild(td);
      tbody.appendChild(tr);
  }

  document.getElementById('pageInfo').textContent = `페이지 ${json.page} / ${json.total_pages} · 총 ${json.total_count}건`;
  document.getElementById('status').textContent = '';
  buildPager(json.page, json.total_pages);

  applyVisibility(loadColPrefs());
  showBusy(false);
}

// ... (이하 나머지 코드는 기존과 동일) ...

// ===== Detail =====
async function openDetail(code){
  // ...
}
function renderDetail(d){
  // ...
}

// ===== Events =====
document.getElementById('btnSearch').addEventListener('click', ()=>{ state.q=$('#q').value.trim(); state.page=1; load(); });
$('#q').addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ state.q=$('#q').value.trim(); state.page=1; load(); }});
$('#perPage').addEventListener('change', (e)=>{ state.per_page=parseInt(e.target.value,10)||20; state.page=1; load(); });

Array.from(document.querySelectorAll('th.sortable')).forEach(th=>{
  th.addEventListener('click', ()=>{
    const col = th.getAttribute('data-col');
    if(state.sort_col===col){ state.sort_dir = (state.sort_dir==='ASC'?'DESC':'ASC'); }
    else { state.sort_col = col; state.sort_dir='ASC'; }
    state.page = 1; load();
  });
});

const menuWrap = document.getElementById('colMenuWrap');
document.getElementById('btnCols').addEventListener('click', ()=>{ menuWrap.classList.toggle('open'); });
document.addEventListener('click', (e)=>{ if(!menuWrap.contains(e.target)) menuWrap.classList.remove('open'); });

const dModal = document.getElementById('detailModal');
document.getElementById('dClose').addEventListener('click', ()=> dModal.classList.remove('open'));
dModal.addEventListener('click', (e)=>{ if(e.target===dModal) dModal.classList.remove('open'); });
window.addEventListener('keydown', (e)=>{ if(e.key==='Escape') dModal.classList.remove('open'); });

window.addEventListener('DOMContentLoaded', ()=>{ 
    // COLUMNS 상수는 inventory.js 내부에 없으므로, 필요 시 정의해야 합니다.
    // 임시로 하드코딩하거나, 별도 파일로 분리하는 것이 좋습니다.
    const COLUMNS = [
        { key:'CATEGORY_NAME', label:'분류' },
        { key:'MAKER_NAME',    label:'제조사' },
        { key:'ITEM_NAME',     label:'부품명' },
        { key:'ITEM_SPEC',     label:'규격' },
        { key:'STOCK',         label:'현재고' },
    ];
    
    function loadColPrefs(){ try{ return JSON.parse(localStorage.getItem('inv_cols')||'{}'); }catch(e){ return {}; } }
    function saveColPrefs(prefs){ localStorage.setItem('inv_cols', JSON.stringify(prefs)); }
    function applyVisibility(prefs){
      COLUMNS.forEach(c=>{
        const on = prefs[c.key] !== false;
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

    buildColMenu(); 
    applyVisibility(loadColPrefs()); 
    readURL(); 
    load(); 
});
window.addEventListener('popstate', ()=>{ readURL(); load(); });

// ===== 입/출고 처리 =====
document.getElementById('txnConfirm').addEventListener('click', async ()=>{
  // ...
});

// `readURL` 함수가 `inventory.js` 내에 정의되어 있지 않아 추가합니다.
function readURL(){
  const p = new URLSearchParams(location.search);
  const n = (k, d)=>{ const v=p.get(k); return v===null? d: v; };
  state.page = parseInt(n('page', state.page))||1;
  state.per_page = parseInt(n('per_page', state.per_page))||20;
  state.sort_col = (n('sort_col', state.sort_col) || 'STOCK').toUpperCase();
  state.sort_dir = (n('sort_dir', state.sort_dir) || 'DESC').toUpperCase();
  state.q = n('q', '');
  $('#q').value = state.q; 
  $('#perPage').value = String(state.per_page);
}

// `writeURL` 함수가 `inventory.js` 내에 정의되어 있지 않아 추가합니다.
function writeURL(replace=true){
  const url = location.pathname + '?' + new URLSearchParams({
    page: state.page, per_page: state.per_page, sort_col: state.sort_col, sort_dir: state.sort_dir, q: state.q
  }).toString();
  if(replace) history.replaceState(null, '', url); else history.pushState(null, '', url);
}

// `showBusy` 함수가 `inventory.js` 내에 정의되어 있지 않아 추가합니다.
function showBusy(on){ 
    const spinner = document.getElementById('spinner');
    if (spinner) {
        spinner.classList.toggle('hidden', !on); 
    }
}