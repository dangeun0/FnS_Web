document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("orderTableBody")) initOrderList();
  if (document.getElementById("order-detail-root")) initOrderDetail();
});

// 상태값을 CSS 클래스 이름으로 안전하게 변환
//function toStatusClass(status) {
//  if (!status) return "";
//  return "status-" + status.replace(/\s+/g, "").trim();
//}
function toStatusClass(status) {
  if (!status) return "";
  const normalized = status.trim();

  // 상태값 변환 매핑
  const map = {
    "완료": "납품",
    "납품완료": "납품",
    "진행중": "가공", // 필요 시 추가
    "HOLD": "설계"
  };

  const key = map[normalized] || normalized;
  return "status-" + key.replace(/\s+/g, "");
}


// =================== 발주 리스트 ===================
function initOrderList() {
  const orderTableBody = document.getElementById("orderTableBody");
  const searchForm = document.getElementById("searchForm");
  const btnNewOrder = document.getElementById("btnNewOrder");
  const reloadBtn = document.getElementById("reloadBtn");

  async function loadOrders(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`/order/api/orders?${query}`);
      const data = await res.json();
      orderTableBody.innerHTML = "";
      data.forEach(row => {
        const tr = document.createElement("tr");
        const statusClass = toStatusClass(row.progress_status);
        tr.innerHTML = `
          <td class="nowrap sticky-col"><strong>${row.manage_no}</strong></td>
          <td>${row.order_date || ''}</td>
          <td><span class="badge status-badge ${statusClass}">${row.progress_status || ''}</span></td>
          <td>${row.order_kind || ''}</td>
          <td>${row.usage_location || ''}</td>
          <td>${row.order_vendor || ''}</td>
          <td>${row.product_group || ''}</td>
          <td>${row.socket_group || ''}</td>
          <td>${row.ball_type || ''}</td>
          <td>${row.item_name1 || ''}</td>
          <td>${row.item_name2 || ''}</td>
          <td class="text-end">${row.qty_total || 0}</td>
          <td>${row.design_start || ''}</td>
          <td>${row.design_end || ''}</td>
          <td>${row.supply_in1 || ''}</td>
          <td>${row.supply_in2 || ''}</td>
          <td>${row.supply_in3 || ''}</td>
          <td>${row.process_in1 || ''}</td>
          <td>${row.process_in_final || ''}</td>
          <td>${row.assembly_start || ''}</td>
          <td>${row.assembly_end || ''}</td>
          <td>${row.ship_date || ''}</td>
          <td>${row.remarks || ''}</td>`;
        tr.addEventListener("click", () => {
          window.location.href = `/order/detail/${row.manage_no}`;
        });
        orderTableBody.appendChild(tr);
      });
      const info = document.getElementById("tableInfo");
      if (info) info.textContent = `총 ${data.length}건`;
    } catch (err) {
      console.error("데이터 로드 실패", err);
    }
  }

  if (searchForm) {
    searchForm.addEventListener("submit", e => {
      e.preventDefault();
      const params = Object.fromEntries(new FormData(searchForm).entries());
      loadOrders(params);
    });
  }

  if (btnNewOrder) {
    btnNewOrder.addEventListener("click", () => {
      const modalEl = document.getElementById("orderFormModal");
      if (modalEl && window.bootstrap) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      }
    });
  }

  if (reloadBtn) reloadBtn.addEventListener("click", () => loadOrders());
  loadOrders();
}

// =================== 발주 상세 ===================
async function initOrderDetail() {
  const root = document.getElementById("order-detail-root");
  const manageNo = root?.dataset.manageNo || window.__ORDER_DETAIL_MANAGE_NO__;
  if (!manageNo) return;
  try {
    const res = await fetch(`/order/api/order/${manageNo}`);
    if (!res.ok) return;
    const data = await res.json();

    const info = document.querySelector(".section-card .card-body");
    const statusClass = toStatusClass(data.progress_status);
    if (info) {
      info.innerHTML = `
        <h5 class="card-title text-primary"><i class="bi bi-info-circle"></i> 발주 기본 정보</h5>
        <p>관리번호: <strong>${data.manage_no}</strong></p>
        <p>발주일자: <strong>${data.order_date || ''}</strong></p>
        <p>진행상태: <span class="badge status-badge ${statusClass}">${data.progress_status || ''}</span>
           &nbsp;&nbsp; 고객사: <strong>${data.customer || ''}</strong></p>
        <p>제품군: <strong>${data.product_group || ''}</strong> &nbsp;&nbsp; 수량: <strong>${data.qty_total || 0}</strong></p>
        <p>비고: <strong>${data.remarks || ''}</strong></p>`;
    }

    const timeline = document.querySelector(".timeline");
    if (timeline) {
      timeline.innerHTML = `
        <div class="timeline-step completed"><h6 class="design-color"><i class="bi bi-pencil-square"></i> 설계</h6><p>시작일: ${data.design_start || '-'} / 종료일: ${data.design_end || '-'}</p></div>
        <div class="timeline-step completed"><h6 class="supply-color"><i class="bi bi-truck"></i> 사급</h6><p>최근 납품일: ${data.supply_date || '-'}</p></div>
        <div class="timeline-step completed"><h6 class="process-color"><i class="bi bi-gear"></i> 가공</h6><p>입고1차: ${data.process_in1 || '-'} / 최종: ${data.process_in_final || '-'}</p></div>
        <div class="timeline-step completed"><h6 class="assembly-color"><i class="bi bi-hammer"></i> 조립</h6><p>시작일: ${data.assembly_start || '-'} / 종료일: ${data.assembly_end || '-'}</p></div>
        <div class="timeline-step in-progress"><h6 class="delivery-color"><i class="bi bi-box-arrow-up"></i> 납품</h6><p>출고일: ${data.delivery_date || '-'}</p></div>`;
    }
  } catch (err) {
    console.error("상세 데이터 로드 실패", err);
  }
}
