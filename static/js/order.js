/* ======================= order.js ======================= */
document.addEventListener("DOMContentLoaded", () => {
const page = document.body.dataset.page;
if (page === "order-list") initOrderList();
if (page === "order-detail") initOrderDetail();
});


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
tr.innerHTML = `
<td class="nowrap sticky-col"><strong>${row.manage_no}</strong></td>
<td>${row.order_date || ''}</td>
<td><span class="badge status-badge status-${row.progress_status}">${row.progress_status || ''}</span></td>
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
document.getElementById("tableInfo").textContent = `총 ${data.length}건`;
} catch (err) {
console.error("데이터 로드 실패", err);
}
}


searchForm.addEventListener("submit", e => {
e.preventDefault();
const params = Object.fromEntries(new FormData(searchForm).entries());
loadOrders(params);
});


btnNewOrder.addEventListener("click", () => {
const modal = new bootstrap.Modal(document.getElementById("orderFormModal"));
modal.show();
});


reloadBtn.addEventListener("click", () => loadOrders());
loadOrders();
}


// =================== 발주 상세 ===================
async function initOrderDetail() {
const manageNo = document.body.dataset.manageNo;
try {
const res = await fetch(`/order/api/order_detail/${manageNo}`);
if (!res.ok) return;
const data = await res.json();


const info = document.querySelector(".section-card .card-body");
info.innerHTML = `
<h5 class="card-title text-primary"><i class="bi bi-info-circle"></i> 발주 기본 정보</h5>
<p>관리번호: <strong>${data.order_no}</strong></p>
<p>진행상태: <span class="badge bg-danger">${data.order_status}</span> &nbsp;&nbsp; 고객사: <strong>${data.customer_name}</strong></p>
<p>제품군: <strong>${data.product_group}</strong> &nbsp;&nbsp; 수량: <strong>${data.qty_total}</strong></p>`;


const timeline = document.querySelector(".timeline");
timeline.innerHTML = `
<div class="timeline-step completed"><h6 class="design-color"><i class="bi bi-pencil-square"></i> 설계</h6><p>시작일: ${data.design_start || '-'} / 종료일: ${data.design_end || '-'}</p></div>
<div class="timeline-step completed"><h6 class="supply-color"><i class="bi bi-truck"></i> 사급</h6><p>최근 납품일: ${data.supply_date || '-'}</p></div>
<div class="timeline-step completed"><h6 class="process-color"><i class="bi bi-gear"></i> 가공</h6><p>입고1차: ${data.process_in1 || '-'} / 최종: ${data.process_in_final || '-'}</p></div>
<div class="timeline-step completed"><h6 class="assembly-color"><i class="bi bi-hammer"></i> 조립</h6><p>시작일: ${data.assembly_start || '-'} / 종료일: ${data.assembly_end || '-'}</p></div>
<div class="timeline-step in-progress"><h6 class="delivery-color"><i class="bi bi-box-arrow-up"></i> 납품</h6><p>출고일: ${data.delivery_date || '-'}</p></div>`;
} catch (err) {
console.error("상세 데이터 로드 실패", err);
}
}