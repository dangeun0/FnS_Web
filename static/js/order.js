// [추가] 페이징 상태 관리를 위한 state 객체
let state = { page: 1, per_page: 20 };

// [추가] 페이징 버튼 생성을 위한 헬퍼 함수
function buildPager(curr, total, loadOrdersFunc) {
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
        loadOrdersFunc(); // loadOrders 함수를 직접 호출
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


// --- 이하 원본 코드 구조 유지 ---
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("orderTableBody")) {
    // [수정] loadOrders를 직접 호출하지 않고, initOrderList만 호출
    initOrderList();
  }
  if (document.getElementById("order-detail-root")) {
    initOrderDetail();
  }
});

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
  } catch (e) { return ''; }
}

function initOrderList() {
  const orderTableBody = document.getElementById("orderTableBody");
  const searchForm = document.getElementById("searchForm");
  const reloadBtn = document.getElementById("reloadBtn");

  // [수정] loadOrders 함수가 페이징을 처리하도록 수정
  async function loadOrders() {
    const searchParams = new FormData(searchForm);
    const params = new URLSearchParams(searchParams);
    params.set('page', state.page);
    params.set('per_page', state.per_page);
    
    history.replaceState(null, '', `${location.pathname}?${params.toString()}`);

    try {
      const res = await fetch(`/order/api/orders?${params.toString()}`);
      const json = await res.json();
      orderTableBody.innerHTML = "";

      if (json.data && json.data.length > 0) {
        json.data.forEach(row => {
          const tr = document.createElement("tr");
          const statusHtml = `<div class="status-cell"><span class="status-dot ${toStatusClass(row.progress_status)}"></span><span>${row.progress_status || ''}</span></div>`;

          tr.innerHTML = `
            <td class="nowrap sticky-col">${`<strong>${row.manage_no}</strong>`}</td>
            <td class="nowrap">${row.order_vendor || ''}</td>
            <td class="nowrap">${row.product_group || ''}</td>
            <td class="nowrap text-end"><strong>${(row.qty_total || 0).toLocaleString()}</strong></td>
            <td class="nowrap">${statusHtml}</td>
            <td class="nowrap">${row.order_kind || ''}</td>
            <td class="nowrap">${row.usage_location || ''}</td>
            <td class="nowrap">${row.item_name1 || ''}</td>
            <td class="nowrap">${row.item_name2 || ''}</td>
            <td class="nowrap">${formatDate(row.order_date)}</td>
            <td class="nowrap">${formatDate(row.design_start)}</td>
            <td class="nowrap">${formatDate(row.design_end)}</td>
            <td class="nowrap">${formatDate(row.ship_date)}</td>
            <td class="nowrap">${row.remarks || ''}</td>
          `;
          tr.addEventListener("click", () => window.location.href = `/order/detail/${row.manage_no}`);
          orderTableBody.appendChild(tr);
        });
      } else {
        orderTableBody.innerHTML = `<tr><td colspan="14" class="text-center py-5">표시할 데이터가 없습니다.</td></tr>`;
      }
      
      document.getElementById("tableInfo").textContent = `총 ${json.total_count}건`;
      buildPager(json.page, json.total_pages, loadOrders); // [수정] loadOrders 함수를 콜백으로 전달

    } catch (err) {
      console.error("데이터 로드 실패", err);
      orderTableBody.innerHTML = `<tr><td colspan="14" class="text-center py-5 text-danger">데이터 로드에 실패했습니다.</td></tr>`;
    }
  }

  if (searchForm) {
    searchForm.addEventListener("submit", e => {
      e.preventDefault();
      state.page = 1; // [추가] 검색 시 1페이지로
      loadOrders();
    });
  }

  if (reloadBtn) {
    reloadBtn.addEventListener("click", () => {
      if(searchForm) searchForm.reset();
      state.page = 1; // [추가] 새로고침 시 1페이지로
      loadOrders();
    });
  }
  
  loadOrders(); // [추가] 최초 로드
}

async function initOrderDetail() {
  // (원본 코드에 내용이 없었으므로 비워둠)
}