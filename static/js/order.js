document.addEventListener("DOMContentLoaded", () => {
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
        tr.innerHTML = `
          <td class="nowrap sticky-col"><strong>${row.manage_no}</strong></td>
          <td class="nowrap">${row.order_date || ''}</td>
          <td class="nowrap"><span class="badge status-badge status-${row.progress_status}">${row.progress_status || ''}</span></td>
          <td class="nowrap">${row.order_kind || ''}</td>
          <td class="nowrap">${row.usage_location || ''}</td>
          <td class="nowrap">${row.order_vendor || ''}</td>
          <td class="nowrap">${row.product_group || ''}</td>
          <td class="nowrap">${row.socket_group || ''}</td>
          <td class="nowrap">${row.ball_type || ''}</td>
          <td class="nowrap">${row.item_name1 || ''}</td>
          <td class="nowrap">${row.item_name2 || ''}</td>
          <td class="text-end nowrap">${row.qty_total || 0}</td>
          <td class="nowrap">${row.design_start || ''}</td>
          <td class="nowrap">${row.design_end || ''}</td>
          <td class="nowrap">${row.supply_in1 || ''}</td>
          <td class="nowrap">${row.supply_in2 || ''}</td>
          <td class="nowrap">${row.supply_in3 || ''}</td>
          <td class="nowrap">${row.process_in1 || ''}</td>
          <td class="nowrap">${row.process_in_final || ''}</td>
          <td class="nowrap">${row.assembly_start || ''}</td>
          <td class="nowrap">${row.assembly_end || ''}</td>
          <td class="nowrap">${row.ship_date || ''}</td>
          <td class="nowrap">${row.remarks || ''}</td>
        `;
        //tr.addEventListener("click", () => showOrderDetail(row.manage_no));
          // ✅ 상세 페이지로 이동
        tr.addEventListener("click", () => {
        window.location.href = `/order/detail/${row.manage_no}`;
        });
        orderTableBody.appendChild(tr);
      });
      document.getElementById("tableInfo").textContent = `총 ${data.length}건`;
    } catch (err) {
      console.error("데이터 로드 실패", err);
    }
  }

  async function showOrderDetail(manageNo) {
    try {
      const res = await fetch(`/order/api/order/${manageNo}`);
      if (!res.ok) return;
      const data = await res.json();
      const detailDiv = document.getElementById("orderDetailContent");
      detailDiv.innerHTML = `
        <dl class="row">
          <dt class="col-sm-3">관리번호</dt><dd class="col-sm-9">${data.manage_no}</dd>
          <dt class="col-sm-3">발주일자</dt><dd class="col-sm-9">${data.order_date || ''}</dd>
          <dt class="col-sm-3">진행상태</dt><dd class="col-sm-9">${data.progress_status || ''}</dd>
          <dt class="col-sm-3">고객사</dt><dd class="col-sm-9">${data.customer || ''}</dd>
          <dt class="col-sm-3">제품군</dt><dd class="col-sm-9">${data.product_group || ''}</dd>
          <dt class="col-sm-3">수량</dt><dd class="col-sm-9">${data.qty_total || 0}</dd>
          <dt class="col-sm-3">비고</dt><dd class="col-sm-9">${data.remarks || ''}</dd>
        </dl>
      `;
      const modal = new bootstrap.Modal(document.getElementById("orderDetailModal"));
      modal.show();
    } catch (err) {
      console.error("상세 조회 실패", err);
    }
  }

  // 검색 이벤트
  searchForm.addEventListener("submit", e => {
    e.preventDefault();
    const params = Object.fromEntries(new FormData(searchForm).entries());
    loadOrders(params);
  });

  // 신규 발주 버튼 이벤트
  btnNewOrder.addEventListener("click", () => {
    const modal = new bootstrap.Modal(document.getElementById("orderFormModal"));
    modal.show();
  });

  // 새로고침 버튼 이벤트
  reloadBtn.addEventListener("click", () => loadOrders());

  // 초기 로딩
  loadOrders();
});