const STORAGE_KEY = 'ngay-mai-plans-v1';
const typeNames = { countdown: 'Đếm ngược', elapsed: 'Đếm ngày', monthly: 'Hàng tháng', yearly: 'Hàng năm', monthday: 'Tháng và ngày', ymd: 'Năm/tháng/ngày' };
const samples = [
  { id: 'sample-1', name: 'Tết Nguyên Đán', type: 'countdown', date: '2027-02-06', image: 'demo.jpg', time: '' },
  { id: 'sample-2', name: 'Ngày cuối cùng ở công ty', type: 'countdown', date: '2027-03-24', image: 'demo1.jpg', time: '' },
  { id: 'sample-3', name: 'Ngày của riêng mình', type: 'countdown', date: '2027-03-28', image: '', time: '' },
  { id: 'sample-4', name: 'Kỷ niệm ngày cưới', type: 'yearly', date: '2026-05-20', image: '', time: '' }
];
let plans = loadPlans(), currentFilter = 'all', editingId = null, chosenImage = '', toastTimer;
const $ = id => document.getElementById(id);

function loadPlans() {
  try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); return Array.isArray(saved) ? saved : samples.map(item => ({ ...item })); }
  catch { return samples.map(item => ({ ...item })); }
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(plans)); return true; }
  catch { showToast('Không đủ bộ nhớ để lưu ảnh. Hãy chọn ảnh nhỏ hơn.'); return false; }
}
function localDate(value) { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d); }
function dayStart(date = new Date()) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function daysBetween(a, b) { return Math.round((dayStart(b) - dayStart(a)) / 86400000); }
function dateParts(date) { return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date); }
function nextRepeat(plan) {
  const original = localDate(plan.date), now = dayStart(); let target;
  if (plan.type === 'monthly') {
    const day = original.getDate(); target = new Date(now.getFullYear(), now.getMonth(), Math.min(day, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()));
    if (target < now) target = new Date(now.getFullYear(), now.getMonth() + 1, Math.min(day, new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate()));
  } else {
    target = new Date(now.getFullYear(), original.getMonth(), Math.min(original.getDate(), new Date(now.getFullYear(), original.getMonth() + 1, 0).getDate()));
    if (target < now) target = new Date(now.getFullYear() + 1, original.getMonth(), Math.min(original.getDate(), new Date(now.getFullYear() + 1, original.getMonth() + 1, 0).getDate()));
  }
  return target;
}
function calendarDifference(from, to) {
  let a = new Date(from), b = new Date(to), sign = 1;
  if (b < a) { [a, b] = [b, a]; sign = -1; }
  let years = b.getFullYear() - a.getFullYear(), months = b.getMonth() - a.getMonth(), days = b.getDate() - a.getDate();
  if (days < 0) { months--; days += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); }
  if (months < 0) { years--; months += 12; }
  return [years, months, days].map(number => number * sign);
}
function counterFor(plan) {
  const now = dayStart(), date = localDate(plan.date), diff = daysBetween(now, date);
  if (plan.type === 'elapsed') return { label: diff <= 0 ? `Đã ${Math.abs(diff)} ngày` : `Còn ${diff} ngày`, past: diff < 0, date };
  if (['monthly', 'yearly', 'monthday'].includes(plan.type)) { const target = nextRepeat(plan), delta = daysBetween(now, target); return { label: delta === 0 ? 'Hôm nay' : `Còn ${delta} ngày`, past: false, date: target }; }
  if (plan.type === 'ymd') { const [years, months, days] = calendarDifference(now, date); return { label: diff === 0 ? 'Hôm nay' : diff > 0 ? `${years}n ${months}th ${days}n` : `${Math.abs(years)}n ${Math.abs(months)}th ${Math.abs(days)}n trước`, past: diff < 0, date }; }
  return { label: diff === 0 ? 'Hôm nay' : diff > 0 ? `Còn ${diff} ngày` : `Đã qua ${Math.abs(diff)} ngày`, past: diff < 0, date };
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function render() {
  const grid = $('planGrid');
  const visible = plans.filter(plan => currentFilter === 'all' || (currentFilter === 'past' ? counterFor(plan).past : !counterFor(plan).past));
  $('planCount').textContent = plans.length; $('countAll').textContent = plans.length;
  $('todayText').textContent = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  grid.innerHTML = '';
  visible.forEach((plan, index) => {
    const counter = counterFor(plan), card = document.createElement('article');
    card.className = 'plan-card';
    card.style.setProperty('--cover', plan.image ? `url("${plan.image}")` : 'linear-gradient(145deg,#9caa84,#3f5d50)');
    card.innerHTML = `<span class="card-index">${String(index + 1).padStart(2, '0')} / ĐIỀU ĐANG CHỜ</span>
      <button class="card-menu" aria-label="Tùy chọn kế hoạch" aria-expanded="false">···</button>
      <div class="card-actions" hidden><button data-action="edit">Chỉnh sửa</button><button data-action="delete">Xóa kế hoạch</button></div>
      <div class="card-content"><div class="card-count">${escapeHtml(counter.label)}</div><div class="card-title">${escapeHtml(plan.name)}</div>
      <div class="card-meta"><span>${dateParts(counter.date)}</span><span class="card-kind">${typeNames[plan.type] || typeNames.countdown}</span></div></div>`;
    const menuButton = card.querySelector('.card-menu'), actions = card.querySelector('.card-actions');
    menuButton.addEventListener('click', event => {
      event.stopPropagation();
      document.querySelectorAll('.card-actions').forEach(other => { if (other !== actions) other.hidden = true; });
      actions.hidden = !actions.hidden; menuButton.setAttribute('aria-expanded', String(!actions.hidden));
    });
    actions.addEventListener('click', event => {
      const action = event.target.dataset.action;
      if (action === 'edit') openModal(plan);
      if (action === 'delete') { plans = plans.filter(item => item.id !== plan.id); persist(); render(); showToast('Đã xóa kế hoạch.'); }
    });
    grid.append(card);
  });
  $('emptyState').classList.toggle('visible', visible.length === 0); grid.style.display = visible.length ? 'grid' : 'none';
}
function showToast(message) { const el = $('toast'); el.textContent = message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 2600); }
function openModal(plan = null) {
  editingId = plan?.id || null; chosenImage = plan?.image || ''; $('planForm').reset();
  $('modalTitle').textContent = plan ? 'Chỉnh sửa kế hoạch' : 'Tạo kế hoạch';
  $('savePlan').innerHTML = plan ? 'Cập nhật kế hoạch <span>↗</span>' : 'Lưu kế hoạch <span>↗</span>';
  const today = new Date();
  $('planName').value = plan?.name || ''; $('planDate').value = plan?.date || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`; $('planTime').value = plan?.time || '';
  $('planType').value = plan?.type || 'countdown';
  document.querySelectorAll('.type-option').forEach(button => button.classList.toggle('selected', button.dataset.type === $('planType').value));
  $('imagePreview').src = chosenImage; $('imagePreview').style.display = chosenImage ? 'block' : 'none';
  $('uploadLabel').innerHTML = chosenImage ? '<b>Ảnh bìa đã chọn</b><small>Nhấn để thay ảnh</small>' : '<b>Chọn một tấm ảnh</b><small>JPG, PNG hoặc WEBP · tối đa 8 MB</small>';
  $('modalBackdrop').classList.add('open'); $('modalBackdrop').setAttribute('aria-hidden', 'false'); setTimeout(() => $('planName').focus(), 50);
}
function closeModal() { $('modalBackdrop').classList.remove('open'); $('modalBackdrop').setAttribute('aria-hidden', 'true'); editingId = null; }
document.querySelectorAll('#newPlan,#newPlanSecondary,#emptyCreate').forEach(button => button.addEventListener('click', () => openModal()));
$('closeModal').addEventListener('click', closeModal); $('cancelModal').addEventListener('click', closeModal);
$('modalBackdrop').addEventListener('click', event => { if (event.target === $('modalBackdrop')) closeModal(); });
document.addEventListener('click', event => { if (!event.target.closest('.card-menu,.card-actions')) document.querySelectorAll('.card-actions').forEach(menu => { menu.hidden = true; }); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
document.querySelectorAll('.type-option').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('.type-option').forEach(item => item.classList.remove('selected')); button.classList.add('selected'); $('planType').value = button.dataset.type; }));
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('.filter').forEach(item => item.classList.remove('active')); button.classList.add('active'); currentFilter = button.dataset.filter; render(); }));

async function compressImage(file) {
  const image = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = reader.result; }; reader.onerror = reject; reader.readAsDataURL(file); });
  const scale = Math.min(1, 1600 / Math.max(image.width, image.height)), canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}
$('planImage').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  if (file.size > 8 * 1024 * 1024) { showToast('Ảnh vượt quá 8 MB. Vui lòng chọn ảnh khác.'); event.target.value = ''; return; }
  try {
    chosenImage = await compressImage(file); $('imagePreview').src = chosenImage; $('imagePreview').style.display = 'block';
    $('uploadLabel').innerHTML = `<b>${escapeHtml(file.name)}</b><small>Đã tối ưu ảnh · nhấn để thay</small>`;
  } catch { showToast('Không đọc được ảnh này. Hãy thử định dạng JPG hoặc PNG.'); }
});
$('planForm').addEventListener('submit', event => {
  event.preventDefault(); const name = $('planName').value.trim(); if (!name) return;
  const previousPlans = plans.map(plan => ({ ...plan })), previousId = editingId, item = { id: editingId || `plan-${Date.now()}`, name, type: $('planType').value, date: $('planDate').value, time: $('planTime').value, image: chosenImage };
  if (editingId) plans = plans.map(plan => plan.id === editingId ? item : plan); else plans.unshift(item);
  if (!persist()) { plans = previousPlans; return; }
  currentFilter = 'all'; document.querySelectorAll('.filter').forEach(button => button.classList.toggle('active', button.dataset.filter === 'all'));
  render(); closeModal(); showToast(previousId ? 'Đã cập nhật kế hoạch.' : 'Đã lưu kế hoạch của bạn.');
});
render(); setInterval(render, 60000);
