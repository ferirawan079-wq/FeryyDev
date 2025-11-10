// Frontend logic: send base64 zip to /api/deploy
const zipInput = document.getElementById('zipInput');
const deployBtn = document.getElementById('deployBtn');
const resetBtn = document.getElementById('resetBtn');
const status = document.getElementById('status');
const progress = document.getElementById('progress');
const result = document.getElementById('result');
const errorDiv = document.getElementById('error');

deployBtn.addEventListener('click', async () => {
  hide(errorDiv); hide(result);
  const files = zipInput.files;
  if (!files || files.length === 0) return showError('Pilih file .zip terlebih dahulu.');
  const file = files[0];
  const projectName = document.getElementById('projectName').value.trim() || 'FeryyDevv';
  const customDomain = document.getElementById('customDomain').value.trim();
  const projectSlug = document.getElementById('projectSlug').value.trim();

  status.innerText = 'Membaca file...';
  show(progress); progress.value = 5;

  try {
    const base64 = await fileToBase64(file, p => progress.value = 5 + p*40);
    status.innerText = 'Mengirim ke server deploy...';
    progress.value = 50;

    const body = { projectName, customDomain, projectSlug, filename: file.name, zipBase64: base64.replace(/^data:.*;base64,/, '') };
    const res = await fetch('/api/deploy', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });

    progress.value = 80;
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || 'Server error saat deploy.');
    }
    const data = await res.json();
    progress.value = 100;
    status.innerText = 'Selesai — website siap';
    show(result);
    result.innerHTML = '<strong>Website deployed:</strong><br><a href="'+escapeHtml(data.url)+'" target="_blank">'+escapeHtml(data.url)+'</a>';
    if (data.aliasMessage) result.innerHTML += '<br><small>'+escapeHtml(data.aliasMessage)+'</small>';
  } catch (e) {
    showError(String(e));
  } finally {
    hide(progress);
  }
});

resetBtn.addEventListener('click', () => {
  zipInput.value = ''; status.innerText = 'Menunggu tindakan'; hide(progress); hide(result); hide(errorDiv);
});

function fileToBase64(file, onProgress){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onerror = () => reject('Gagal membaca file');
    reader.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded/e.total)*100)); };
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function show(el){ el.style.display = 'block'; }
function hide(el){ el.style.display = 'none'; }
function showError(msg){ errorDiv.style.display='block'; errorDiv.innerText = msg; status.innerText = 'Error'; }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
