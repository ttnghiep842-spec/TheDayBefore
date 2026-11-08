const STORAGE_KEY = 'ngay-mai-plans-v1';
const typeNames = { countdown: 'Đếm ngược', elapsed: 'Đếm ngày', monthly: 'Hàng tháng', yearly: 'Hàng năm', monthday: 'Tháng và ngày', ymd: 'Năm/tháng/ngày' };
const samples = [
  { id: 'sample-1', name: 'Tết Nguyên Đán', type: 'countdown', date: '2027-02-06', image: 'demo.jpg', time: '' },
  { id: 'sample-2', name: 'Ngày cuối cùng ở công ty', type: 'countdown', date: '2027-03-24', image: 'demo1.jpg', time: '' },
  { id: 'sample-3', name: 'Ngày của riêng mình', type: 'countdown', date: '2027-03-28', image: '', time: '' },
  { id: 'sample-4', name: 'Kỷ niệm ngày cưới', type: 'yearly', date: '2026-05-20', image: '', time: '' }
];
let plans = loadPlans(), editingId = null, chosenImage = '', crop = { x: 50, y: 50, zoom: 1 }, toastTimer, activePlanId = null;
let layoutMode = localStorage.getItem('daily-day-layout') || 'cards', sortMode = localStorage.getItem('daily-day-sort') || 'soon';
let themeMode = localStorage.getItem('daily-day-theme') || 'dark';
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
function shortCount(plan, counter) {
  if (plan.type === 'ymd') return counter.label;
  const days = daysBetween(dayStart(), counter.date);
  if (!days) return 'D-Day';
  return days > 0 ? `D-${days}` : `D+${Math.abs(days)}`;
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function setLayout(mode) {
  layoutMode = mode; localStorage.setItem('daily-day-layout', mode); $('planGrid').dataset.layout = mode;
  $('viewToggle').innerHTML = mode === 'cards'
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="5" r="1.6"/><circle cx="12" cy="5" r="1.6"/><circle cx="19" cy="5" r="1.6"/><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/><circle cx="5" cy="19" r="1.6"/><circle cx="12" cy="19" r="1.6"/><circle cx="19" cy="19" r="1.6"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M4 12h16M4 19h16"/></svg>';
  $('viewToggle').title = mode === 'cards' ? 'Hiển thị ảnh tròn' : 'Hiển thị thẻ ảnh';
}
function setTheme(mode) {
  themeMode = mode; document.body.dataset.theme = mode; document.documentElement.style.colorScheme = mode;
  document.querySelector('meta[name="theme-color"]').content = mode === 'light' ? '#f3f3ef' : '#101014';
  $('themeLabel').textContent = mode === 'dark' ? 'Light Mode' : 'Dark Mode';
  try { localStorage.setItem('daily-day-theme', mode); } catch {}
}
function sortedPlans() {
  const result = [...plans];
  result.sort((a, b) => {
    if (sortMode === 'name') return a.name.localeCompare(b.name, 'vi');
    const delta = daysBetween(dayStart(), counterFor(a).date) - daysBetween(dayStart(), counterFor(b).date);
    return sortMode === 'far' ? -delta : delta;
  });
  return result;
}
function render() {
  const grid = $('planGrid'); grid.dataset.layout = layoutMode; grid.innerHTML = '';
  sortedPlans().forEach((plan, index) => {
    const counter = counterFor(plan), card = document.createElement('article'), pos = plan.crop || { x: 50, y: 50, zoom: 1 };
    card.className = 'plan-card';
    card.setAttribute('role', 'button'); card.tabIndex = 0; card.setAttribute('aria-label', `Mở kế hoạch ${plan.name}`);
    card.innerHTML = `${plan.image ? `<span class="plan-photo-frame"><img class="plan-photo" src="${plan.image}" alt="" draggable="false" style="object-position:${pos.x}% ${pos.y}%;transform:scale(${pos.zoom || 1})"></span>` : '<span class="plan-photo-frame circle-fallback"></span>'}
      <span class="card-index">${String(index + 1).padStart(2, '0')}</span>
      <div class="card-content"><div class="card-count">${escapeHtml(shortCount(plan, counter))}</div><div class="card-title">${escapeHtml(plan.name)}</div>
      <div class="card-meta"><span>${dateParts(counter.date)}</span><span class="card-kind">${typeNames[plan.type] || typeNames.countdown}</span></div></div>`;
    card.addEventListener('click', () => openDetails(plan));
    card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDetails(plan); } });
    grid.append(card);
  });
  $('emptyState').classList.toggle('visible', plans.length === 0); grid.style.display = plans.length ? 'grid' : 'none';
}
function openDetails(plan) {
  activePlanId = plan.id; const counter = counterFor(plan), pos = plan.crop || { x: 50, y: 50, zoom: 1 };
  $('detailTitle').textContent = plan.name; $('detailType').textContent = plan.type === 'elapsed' ? 'Day count' : plan.type === 'ymd' ? 'Year / Month / Day' : plan.type === 'monthly' ? 'Monthly' : plan.type === 'yearly' || plan.type === 'monthday' ? 'Annually' : 'D-day';
  $('detailDate').textContent = dateParts(counter.date); $('detailCount').textContent = shortCount(plan, counter); $('detailRelative').textContent = counter.label; $('detailFullDate').textContent = new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' }).format(counter.date); $('detailTypeTag').textContent = typeNames[plan.type] || typeNames.countdown;
  const photo = $('detailPhoto'); photo.src = plan.image || ''; photo.style.display = plan.image ? 'block' : 'none'; photo.style.objectPosition = `${pos.x}% ${pos.y}%`; photo.style.transform = `scale(${pos.zoom || 1})`;
  $('detailCover').classList.toggle('no-photo', !plan.image); $('detailMenu').hidden = true; $('planDetail').classList.add('open'); $('planDetail').setAttribute('aria-hidden', 'false');
}
function closeDetails() { $('planDetail').classList.remove('open'); $('planDetail').setAttribute('aria-hidden', 'true'); $('detailMenu').hidden = true; activePlanId = null; }
function showToast(message) { const el = $('toast'); el.textContent = message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 2600); }
function showWizardStep(step) {
  const choosing = step === 'type';
  $('typeStep').hidden = !choosing; $('detailsStep').hidden = choosing;
  $('typeStep').classList.toggle('active', choosing); $('detailsStep').classList.toggle('active', !choosing);
  $('modalTitle').textContent = choosing ? 'Sự kiện thuộc loại nào?' : (editingId ? 'Chỉnh sửa kế hoạch' : 'Tạo kế hoạch');
  $('wizardBack').hidden = choosing;
  $('selectedTypeName').textContent = typeNames[$('planType').value] || typeNames.countdown;
}
function openModal(plan = null) {
  editingId = plan?.id || null; chosenImage = plan?.image || ''; crop = { x: 50, y: 50, zoom: 1, ...(plan?.crop || {}) }; $('planForm').reset();
  $('savePlan').textContent = plan ? 'LƯU' : 'TẠO';
  const today = new Date();
  $('planName').value = plan?.name || ''; $('planDate').value = plan?.date || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`; $('planTime').value = plan?.time || '';
  $('planType').value = plan?.type || 'countdown'; document.querySelectorAll('.type-option').forEach(button => button.classList.toggle('selected', button.dataset.type === $('planType').value));
  $('imagePreview').src = chosenImage; $('imagePreview').style.display = chosenImage ? 'block' : 'none'; $('uploadLabel').innerHTML = chosenImage ? '<b>Ảnh bìa đã chọn</b><small>Nhấn để thay ảnh</small>' : '<b>Chọn một tấm ảnh</b><small>JPG, PNG hoặc WEBP · tối đa 8 MB</small>';
  updateCropEditor(); showWizardStep(plan ? 'details' : 'type'); $('modalBackdrop').classList.add('open'); $('modalBackdrop').setAttribute('aria-hidden', 'false');
  if (plan) setTimeout(() => $('planName').focus(), 50);
}
function closeModal() { $('modalBackdrop').classList.remove('open'); $('modalBackdrop').setAttribute('aria-hidden', 'true'); editingId = null; }
function toggleMenu(menuId) {
  const menu = $(menuId), willOpen = menu.hidden; document.querySelectorAll('.toolbar-menu').forEach(item => item.hidden = true); menu.hidden = !willOpen;
}
$('viewToggle').addEventListener('click', () => { setLayout(layoutMode === 'cards' ? 'circle' : 'cards'); render(); });
$('sortButton').addEventListener('click', event => { event.stopPropagation(); toggleMenu('sortMenu'); });
$('moreButton').addEventListener('click', event => { event.stopPropagation(); toggleMenu('createMenu'); });
$('themeToggle').addEventListener('click', () => { setTheme(themeMode === 'dark' ? 'light' : 'dark'); $('createMenu').hidden = true; });
document.querySelectorAll('[data-sort]').forEach(button => button.addEventListener('click', () => { sortMode = button.dataset.sort; localStorage.setItem('daily-day-sort', sortMode); $('sortMenu').hidden = true; render(); }));
$('createFromMenu').addEventListener('click', () => { $('createMenu').hidden = true; openModal(); }); $('emptyCreate').addEventListener('click', () => openModal());
document.addEventListener('click', event => {
  if (!event.target.closest('.toolbar-item')) document.querySelectorAll('.toolbar-menu').forEach(menu => menu.hidden = true);
  if (!event.target.closest('.detail-more,.detail-menu')) $('detailMenu').hidden = true;
});
$('closeModal').addEventListener('click', closeModal); $('cancelModal').addEventListener('click', closeModal);
$('modalBackdrop').addEventListener('click', event => { if (event.target === $('modalBackdrop')) closeModal(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeModal(); closeDetails(); document.querySelectorAll('.toolbar-menu').forEach(menu => menu.hidden = true); } });
document.querySelectorAll('.type-option').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('.type-option').forEach(item => item.classList.remove('selected')); button.classList.add('selected'); $('planType').value = button.dataset.type; $('selectedTypeName').textContent = typeNames[button.dataset.type]; }));
$('stepContinue').addEventListener('click', () => showWizardStep('details'));
$('typeSummary').addEventListener('click', () => showWizardStep('type'));
$('wizardBack').addEventListener('click', () => showWizardStep('type'));
$('detailClose').addEventListener('click', closeDetails);
$('detailMore').addEventListener('click', event => { event.stopPropagation(); $('detailMenu').hidden = !$('detailMenu').hidden; });
$('detailEdit').addEventListener('click', () => { const plan = plans.find(item => item.id === activePlanId); if (plan) { closeDetails(); openModal(plan); } });
$('detailDelete').addEventListener('click', () => {
  const plan = plans.find(item => item.id === activePlanId); if (!plan) return;
  if (confirm(`Xóa kế hoạch “${plan.name}”?`)) { const previous = plans; plans = plans.filter(item => item.id !== activePlanId); if (!persist()) plans = previous; else { closeDetails(); render(); showToast('Đã xóa kế hoạch.'); } }
});

async function compressImage(file) {
  const image = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = reader.result; }; reader.onerror = reject; reader.readAsDataURL(file); });
  const scale = Math.min(1, 1600 / Math.max(image.width, image.height)), canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height); return canvas.toDataURL('image/jpeg', 0.82);
}
function updateCropEditor() {
  const visible = Boolean(chosenImage); $('cropEditor').hidden = !visible; if (!visible) return;
  if ($('cropImage').getAttribute('src') !== chosenImage) $('cropImage').src = chosenImage;
  $('cropImage').style.objectPosition = `${crop.x}% ${crop.y}%`; $('cropImage').style.transform = `scale(${crop.zoom})`; $('cropZoom').value = String(Math.round(crop.zoom * 100));
}
$('planImage').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  if (file.size > 8 * 1024 * 1024) { showToast('Ảnh vượt quá 8 MB. Vui lòng chọn ảnh khác.'); event.target.value = ''; return; }
  try { chosenImage = await compressImage(file); crop = { x: 50, y: 50, zoom: 1 }; $('imagePreview').src = chosenImage; $('imagePreview').style.display = 'block'; updateCropEditor(); $('uploadLabel').innerHTML = `<b>${escapeHtml(file.name)}</b><small>Đã tối ưu ảnh · nhấn để thay</small>`; }
  catch { showToast('Không đọc được ảnh này. Hãy thử JPG hoặc PNG.'); }
});
let cropDrag = null;
$('cropFrame').addEventListener('pointerdown', event => {
  if (!chosenImage) return; const rect = $('cropFrame').getBoundingClientRect(), img = $('cropImage');
  const fitScale = Math.max(rect.width / img.naturalWidth, rect.height / img.naturalHeight) * crop.zoom;
  cropDrag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, overflowX: Math.max(0, img.naturalWidth * fitScale - rect.width), overflowY: Math.max(0, img.naturalHeight * fitScale - rect.height) };
  $('cropFrame').setPointerCapture(event.pointerId); event.preventDefault();
});
$('cropFrame').addEventListener('pointermove', event => {
  if (!cropDrag || event.pointerId !== cropDrag.pointerId) return;
  if (cropDrag.overflowX) crop.x = Math.max(0, Math.min(100, crop.x - (event.clientX - cropDrag.x) / cropDrag.overflowX * 100));
  if (cropDrag.overflowY) crop.y = Math.max(0, Math.min(100, crop.y - (event.clientY - cropDrag.y) / cropDrag.overflowY * 100));
  cropDrag.x = event.clientX; cropDrag.y = event.clientY; updateCropEditor();
});
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => $('cropFrame').addEventListener(type, () => { cropDrag = null; }));
$('cropZoom').addEventListener('input', event => { crop.zoom = Number(event.target.value) / 100; updateCropEditor(); });
$('planForm').addEventListener('submit', event => {
  event.preventDefault(); const name = $('planName').value.trim(); if (!name) return;
  const previousPlans = plans.map(plan => ({ ...plan })), previousId = editingId;
  const item = { id: editingId || `plan-${Date.now()}`, name, type: $('planType').value, date: $('planDate').value, time: $('planTime').value, image: chosenImage, crop: { ...crop } };
  if (editingId) plans = plans.map(plan => plan.id === editingId ? item : plan); else plans.unshift(item);
  if (!persist()) { plans = previousPlans; return; }
  render(); closeModal(); showToast(previousId ? 'Đã cập nhật kế hoạch.' : 'Đã lưu kế hoạch của bạn.');
});

setTheme(themeMode); setLayout(layoutMode); render(); setInterval(render, 60000);
