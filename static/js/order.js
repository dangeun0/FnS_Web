// [추가] 페이징을 위한 상태 객체
let state = { page: 1, per_page: 20 };

// [추가] 페이징을 위한 헬퍼 함수
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
        const app = initOrderList(); // Get the loadOrders function
        app.loadOrders();
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


// --- 기존 코드 시작 ---
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("orderTableBody")) {
    const app = initOrderList();
    state.page = new URLSearchParams(window.location.search).get('page') || 1; // 페이지 로드 시 URL에서 페이지 읽기
    app.loadOrders();
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

  async function loadOrders() {
    const searchParams = new FormData(searchForm);
    const params = new URLSearchParams(searchParams);
    params.set('page', state.page);
    params.set('per_page', state.per_page);
    
    // URL 업데이트
    history.replaceState(null, '', `${location.pathname}?${params.toString()}`);

    try {
      const res = await fetch(`/order/api/orders?${params.toString()}`);
      const json = await res.json();
      orderTableBody.innerHTML = "";

      // ✅ [수정] 사용자님의 원본 컬럼 순서 완벽하게 유지
      const headers = [
        "진행상태", "관리번호", "오더구분", "사용처", "발주처", "제품군", "소켓군", "Ball type",
        "수량", "품명1", "품명2", "발주일자", "설계 시작", "설계 종료", "사급 1차", "사급 2차", "사급 3차",
        "가공 1차", "가공 최종", "조립 시작", "조립 종료", "출고일자", "비고"
      ];

      if (json.data && json.data.length > 0) {
        json.data.forEach(row => {
          const tr = document.createElement("tr");
          const statusHtml = `<div class="status-cell"><span class="status-dot ${toStatusClass(row.progress_status)}"></span><span>${row.progress_status || ''}</span></div>`;

          const cells = [
            statusHtml,
            `<strong>${row.manage_no}</strong>`,
            row.order_kind || '',
            row.usage_location || '',
            row.order_vendor || '',
            row.product_group || '',
            row.socket_group || '',
            row.ball_type || '',
            `<strong class="text-end d-block">${(row.qty_total || 0).toLocaleString()}</strong>`,
            row.item_name1 || '',
            row.item_name2 || '',
            formatDate(row.order_date),
            formatDate(row.design_start),
            formatDate(row.design_end),
            formatDate(row.supply_in1),
            formatDate(row.supply_in2),
            formatDate(row.supply_in3),
            formatDate(row.process_in1),
            formatDate(row.process_in_final),
            formatDate(row.assembly_start),
            formatDate(row.assembly_end),
            formatDate(row.ship_date),
            row.remarks || ''
          ];

          tr.innerHTML = cells.map((val, i) => `<td data-label='${headers[i]}'>${val}</td>`).join('');
          
          const firstTd = tr.querySelector('td');
          if (firstTd) firstTd.classList.add('sticky-col');

          tr.addEventListener("click", () => window.location.href = `/order/detail/${row.manage_no}`);
          orderTableBody.appendChild(tr);
        });
      } else {
        orderTableBody.innerHTML = `<tr><td colspan="23" class="text-center py-5">표시할 데이터가 없습니다.</td></tr>`;
      }
      
      document.getElementById("tableInfo").textContent = `총 ${json.total_count}건`;
      buildPager(json.page, json.total_pages);

    } catch (err) {
      console.error("데이터 로드 실패", err);
      orderTableBody.innerHTML = `<tr><td colspan="23" class="text-center py-5 text-danger">데이터 로드에 실패했습니다.</td></tr>`;
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
      loadOrders();
    });
  }
  
  return { loadOrders };
}

async function initOrderDetail() {
    // (원본 코드에 내용이 없었으므로 비워둠)
}