// [수정] static/js/order.js

// [추가] 페이징을 위한 상태 객체
let state = { page: 1, per_page: 20 };

// [추가] 페이징을 위한 헬퍼 함수
function readURL(){
  const p = new URLSearchParams(location.search);
  state.page = parseInt(p.get('page')) || 1;
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

// --- 원본 코드 시작 ---
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("orderTableBody")) {
    // [수정] 페이지 로드 시 페이징 상태 읽고 데이터 로드
    const app = initOrderList();
    readURL();
    app.loadOrders();
    // [추가] 뒤로가기 버튼 처리
    window.addEventListener('popstate', () => {
        readURL();
        app.loadOrders();
    });
  }
  if (document.getElementById("order-detail-root")) {
    initOrderDetail();
  }
});

function toStatusClass(status) {
  if (!status) return "";
  const normalized = status.trim();
  const map = {
    "완료": "납품",
  };
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
    writeURL(true); // [수정] URL 업데이트
    
    // [수정] 검색 조건과 페이징 조건을 함께 보냄
    const params = new URLSearchParams(location.search);

    try {
      const res = await fetch(`/order/api/orders?${params.toString()}`);
      const json = await res.json(); // [수정] 백엔드 응답 구조 변경됨
      orderTableBody.innerHTML = "";

      if (json.data && json.data.length > 0) {
        json.data.forEach(row => {
          const tr = document.createElement("tr");
          const statusHtml = `<div class="status-cell"><span class="status-dot ${toStatusClass(row.progress_status)}"></span><span>${row.progress_status || ''}</span></div>`;

          // 원본 컬럼 순서 유지
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
      
      // [수정] 총 건수 및 페이저 생성
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
      const url = new URL(window.location);
      url.searchParams.forEach((v,k) => {
          if (k !== 'page' && k !== 'per_page') url.searchParams.delete(k);
      });
      history.pushState({}, '', url);
      state.page = 1;
      loadOrders();
    });
  }
  
  // 외부에서 loadOrders를 호출할 수 있도록 반환
  return { loadOrders };
}

async function initOrderDetail() {
    // (이 부분은 사용자님이 주신 원본 파일에 내용이 없었으므로 비워둡니다)
}