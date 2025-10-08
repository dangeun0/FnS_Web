// [수정] static/js/order.js

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("orderTableBody")) initOrderList();
  if (document.getElementById("order-detail-root")) initOrderDetail();
});

// ===== State & Helper Functions (페이징을 위해 추가) =====
let state = { page: 1, per_page: 20 }; // 기본 페이지 상태

function readURL(){
  const p = new URLSearchParams(location.search);
  state.page = parseInt(p.get('page')) || 1;
  state.per_page = parseInt(p.get('per_page')) || 20;
}

function writeURL(replace = true){
  const params = new URLSearchParams(location.search);
  params.set('page', state.page);
  params.set('per_page', state.per_page);

  const url = `${location.pathname}?${params.toString()}`;
  if(replace) history.replaceState(null, '', url);
  else history.pushState(null, '', url);
}

function buildPager(curr, total){
  const host = document.getElementById('pager');
  if (!host) return;
  host.innerHTML = '';
  if (!total || total <= 1) return;

  const addBtn = (label, page, opts = {}) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.className = `btn btn-sm ${opts.active ? 'btn-primary' : 'btn-outline-secondary'}`;
    b.style.margin = '0 2px';
    if(opts.disabled) b.disabled = true;
    b.addEventListener('click', (e) => {
      e.preventDefault();
      if(!opts.disabled){ 
        state.page = page;
        initOrderList().loadOrders();
      }
    });
    host.appendChild(b);
  };
  
  const addEll = () => { const s = document.createElement('span'); s.textContent = '…'; s.className = 'px-2 align-self-center'; host.appendChild(s); };
  addBtn('«', 1, {disabled: curr === 1});
  addBtn('‹', Math.max(1, curr - 1), {disabled: curr === 1});
  const set = new Set([1, 2, total - 1, total, curr - 2, curr - 1, curr, curr + 1, curr + 2]);
  const pages = Array.from(set).filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
  let last = 0;
  pages.forEach(p => { if (p - last > 1) addEll(); addBtn(String(p), p, {active: p === curr}); last = p; });
  addBtn('›', Math.min(total, curr + 1), {disabled: curr === total});
  addBtn('»', total, {disabled: curr === total});
}

// ===== 기존 Helper Functions =====
function toStatusClass(status) {
  if (!status) return "";
  const normalized = status.trim();
  const map = { "완료": "납품" };
  const key = map[normalized] || normalized;
  return "status-" + key.replace(/\s+/g, "");
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  } catch(e) { return ''; }
}


// =================== 발주 리스트 ===================
function initOrderList() {
  const orderTableBody = document.getElementById("orderTableBody");
  const searchForm = document.getElementById("searchForm");
  const reloadBtn = document.getElementById("reloadBtn");

  async function loadOrders() {
    writeURL(true);
    
    const params = new URLSearchParams(location.search);
    // state의 per_page를 params에 추가
    params.set('per_page', state.per_page);

    try {
      const res = await fetch(`/order/api/orders?${params.toString()}`);
      const json = await res.json();
      orderTableBody.innerHTML = "";

      if (json.data && json.data.length > 0) {
        json.data.forEach(row => {
          const tr = document.createElement("tr");
          const statusKey = (row.progress_status || "").trim();
          const statusHtml = `<div class="status-cell"><span class="status-dot ${toStatusClass(statusKey)}"></span><span>${statusKey}</span></div>`;

          tr.innerHTML = `
            <td class="nowrap sticky-col" data-label="관리번호"><strong>${row.manage_no}</strong></td>
            <td class="nowrap" data-label="고객사">${row.order_vendor || ''}</td>
            <td class="nowrap" data-label="제품군">${row.product_group || ''}</td>
            <td class="nowrap text-end" data-label="수량"><strong>${(row.qty_total || 0).toLocaleString()}</strong></td>
            <td class="nowrap" data-label="진행상태">${statusHtml}</td>
            <td class="nowrap" data-label="오더구분">${row.order_kind || ''}</td>
            <td class="nowrap" data-label="사용처">${row.usage_location || ''}</td>
            <td class="nowrap" data-label="품명1">${row.item_name1 || ''}</td>
            <td class="nowrap" data-label="품명2">${row.item_name2 || ''}</td>
            <td class="nowrap" data-label="발주일자">${formatDate(row.order_date)}</td>
            <td class="nowrap" data-label="설계 시작">${formatDate(row.design_start)}</td>
            <td class="nowrap" data-label="설계 종료">${formatDate(row.design_end)}</td>
            <td class="nowrap" data-label="출고일자">${formatDate(row.ship_date)}</td>
            <td class="nowrap" data-label="비고">${row.remarks || ''}</td>
          `;
          tr.addEventListener("click", () => window.location.href = `/order/detail/${row.manage_no}`);
          orderTableBody.appendChild(tr);
        });
      } else {
        orderTableBody.innerHTML = `<tr><td colspan="14" class="text-center py-5">표시할 데이터가 없습니다.</td></tr>`;
      }
      
      document.getElementById("tableInfo").textContent = `총 ${json.total_count}건`;
      buildPager(json.page, json.total_pages);

    } catch (err) {
      console.error("데이터 로드 실패", err);
      orderTableBody.innerHTML = `<tr><td colspan="14" class="text-center py-5 text-danger">데이터 로드에 실패했습니다.</td></tr>`;
    }
  }

  if (searchForm) {
    searchForm.addEventListener("submit", e => {
      e.preventDefault();
      state.page = 1;
      loadOrders();
    });
  }

  if (reloadBtn) {
    reloadBtn.addEventListener("click", () => {
      if(searchForm) searchForm.reset();
      state.page = 1;
      // URL에서 검색 파라미터 제거
      const url = new URL(window.location);
      url.searchParams.forEach((v, k) => {
        if (k !== 'page' && k !== 'per_page') {
            url.searchParams.delete(k);
        }
      });
      history.pushState({}, '', url);
      loadOrders();
    });
  }
  
  // Return a public API for the pager buttons
  return { loadOrders };
}

// =================== 발주 상세 ===================
async function initOrderDetail() {
    // (기존 코드와 동일)
}

// ===== 최초 페이지 로드 및 뒤로가기 처리 =====
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById("orderTableBody")) {
        const orderListApp = initOrderList();
        readURL();
        orderListApp.loadOrders();
        window.addEventListener('popstate', () => {
            readURL();
            orderListApp.loadOrders();
        });
    }
    if (document.getElementById("order-detail-root")) {
        initOrderDetail();
    }
});