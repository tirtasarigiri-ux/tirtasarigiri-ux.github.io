// =====================================
// KONFIGURASI PWA
// =====================================
(function inisialisasiPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }
})();

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyD0y7FSxKxWGuif3dA_-C7RuYhOk5ULygA",
  authDomain: "tirtasarigiri-8a025.firebaseapp.com",
  databaseURL: "https://tirtasarigiri-8a025-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tirtasarigiri-8a025",
  storageBucket: "tirtasarigiri-8a025.firebasestorage.app",
  messagingSenderId: "383408076039",
  appId: "1:383408076039:web:7e4cda3240998e51dac1a2",
  measurementId: "G-3X0Y5YNMQY"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let currentUser = null; 
let currentPlgTagihanData = null; 

function parseDesimal(val) {
    if (val === undefined || val === null || val === '') return 0;
    return parseFloat(String(val).replace(',', '.')) || 0;
}

function formatTanggalIndo(tglInput) {
    if (!tglInput) return '-';
    const parts = String(tglInput).split('T')[0].split('-');
    if (parts.length === 3) {
        const namaBulan = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        return `${parseInt(parts[2], 10)} ${namaBulan[parseInt(parts[1], 10) - 1] || parts[1]} ${parts[0]}`;
    }
    const d = new Date(tglInput);
    if (isNaN(d)) return '-';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTanggalSingkat(tglInput) {
    if (!tglInput) return '-';
    const parts = String(tglInput).split('T')[0].split('-');
    if (parts.length === 3) {
        const namaBulanSingkat = [
            'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
            'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
        ];
        return `${parseInt(parts[2], 10)} ${namaBulanSingkat[parseInt(parts[1], 10) - 1] || parts[1]} ${parts[0]}`;
    }
    const d = new Date(tglInput);
    if (isNaN(d)) return '-';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function setKasTanggalDefault() {
    const kasTanggalEl = document.getElementById('kasTanggal');
    if (kasTanggalEl && !kasTanggalEl.value) {
        kasTanggalEl.value = new Date().toISOString().split('T')[0];
    }
}

// OTOMATISASI DAN REALTIME TEKS BERJALAN DARI FIREBASE
function initTeksBerjalan() {
    db.ref('pengaturan/teks_berjalan').on('value', snapshot => {
        const teks = snapshot.exists() ? snapshot.val() : "Selamat datang di Sistem Informasi Tirta Sari Giri.";
        const runningTextEl = document.getElementById('runningTextDisplay');
        const inputTeksEl = document.getElementById('inputTeksBerjalan');
        
        if (runningTextEl) runningTextEl.textContent = teks;
        if (inputTeksEl) inputTeksEl.value = teks;
    });
}

function simpanTeksBerjalan() {
    const teksInput = document.getElementById('inputTeksBerjalan').value.trim();
    if (!teksInput) {
        alert("Teks pengumuman tidak boleh kosong!");
        return;
    }

    db.ref('pengaturan/teks_berjalan').set(teksInput).then(() => {
        alert("Teks berjalan berhasil diperbarui dan dipublikasikan!");
    }).catch(err => alert("Gagal menyimpan teks: " + err.message));
}

window.addEventListener('DOMContentLoaded', () => {
    setKasTanggalDefault();
    initTeksBerjalan();

    const isRemembered = localStorage.getItem('tirta_remember') === 'true';
    const savedId = localStorage.getItem('tirta_saved_id');
    const savedSandi = localStorage.getItem('tirta_saved_sandi');

    if (isRemembered && savedId && savedSandi) {
        document.getElementById('loginId').value = savedId;
        document.getElementById('loginSandi').value = savedSandi;
        document.getElementById('rememberMe').checked = true;
        deteksiRole(document.getElementById('loginId'));
        prosesLogin();
    }
});

function formatNama(input) {
    let words = input.value.split(' ');
    for (let i = 0; i < words.length; i++) {
        if (words[i].length > 0) {
            words[i] = words[i][0].toUpperCase() + words[i].slice(1).toLowerCase();
        }
    }
    input.value = words.join(' ');
}

function formatSandi(input) {
    input.value = input.value.replace(/\D/g, '').slice(0, 5);
}

function formatRupiah(angka) {
    return "Rp " + Number(angka || 0).toLocaleString('id-ID');
}

function kunciAwalanPlg(input) {
    input.value = input.value.toUpperCase();
    if (!input.value.startsWith('PLG')) {
        input.value = 'PLG' + input.value.replace(/^P?L?G?/g, '');
    }
    document.getElementById('plgSandi').value = input.value;
}

function deteksiRole(input) {
    input.value = input.value.toUpperCase();
    const id = input.value.trim();
    const roleBadge = document.getElementById('roleDetected');
    const roleText = document.getElementById('roleText');
    const sandiInput = document.getElementById('loginSandi');

    if (id.startsWith('STAF') || id.startsWith('ADM')) {
        roleBadge.style.display = 'block';
        roleText.textContent = 'Staf Office';
    } else if (id.startsWith('FO')) {
        roleBadge.style.display = 'block';
        roleText.textContent = 'Petugas Lapangan (FO)';
    } else if (id.startsWith('PLG')) {
        roleBadge.style.display = 'block';
        roleText.textContent = 'Pelanggan';

        if (id.length >= 4 && !document.getElementById('rememberMe').checked) {
            db.ref(`pelanggan/${id}`).once('value').then(snapshot => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    if (data && data.sandi) sandiInput.value = data.sandi;
                }
            });
        }
    } else {
        roleBadge.style.display = 'none';
        roleText.textContent = '-';
    }
}

function prosesLogin() {
    const id = document.getElementById('loginId').value.trim().toUpperCase();
    const sandi = document.getElementById('loginSandi').value.trim();
    const rememberMe = document.getElementById('rememberMe').checked;

    if (!id || !sandi) {
        alert("Harap isi ID dan Kata Sandi!");
        return;
    }

    let nodePath = "";
    let targetView = "";
    let roleTitle = "";

    if (id.startsWith("STAF") || id.startsWith("ADM")) {
        nodePath = "staf_office";
        targetView = "dashOffice";
        roleTitle = "Staf Office";
    } else if (id.startsWith("FO")) {
        nodePath = "staf_fo";
        targetView = "dashFo";
        roleTitle = "Petugas Lapangan (FO)";
    } else if (id.startsWith("PLG")) {
        nodePath = "pelanggan";
        targetView = "dashPelanggan";
        roleTitle = "Pelanggan";
    } else {
        alert("Format ID tidak dikenali!");
        return;
    }

    db.ref(`${nodePath}/${id}`).once('value').then(snapshot => {
        if (!snapshot.exists()) {
            alert(`ID ${id} tidak ditemukan!`);
            return;
        }

        const userData = snapshot.val();

        if (userData && String(userData.sandi) === String(sandi)) {
            currentUser = { ...userData, id: id };

            if (rememberMe) {
                localStorage.setItem('tirta_remember', 'true');
                localStorage.setItem('tirta_saved_id', id);
                localStorage.setItem('tirta_saved_sandi', sandi);
            } else {
                localStorage.removeItem('tirta_remember');
                localStorage.removeItem('tirta_saved_id');
                localStorage.removeItem('tirta_saved_sandi');
            }

            tampilkanDashboard(targetView, userData, id, roleTitle);
        } else {
            alert("Kata sandi salah!");
        }
    }).catch(error => alert("Gagal koneksi DB: " + error.message));
}

function tampilkanDashboard(viewId, userData, id, roleTitle) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('aktif'));
    const targetViewEl = document.getElementById(viewId);
    if (targetViewEl) targetViewEl.classList.add('aktif');

    let profileHtml = `
        <div class="user-info-details">
            <div>ID: <span>${id}</span></div>
            <div>Nama: <span>${(userData && userData.nama) || '-'}</span></div>
            <div>Peran: <span>${roleTitle}</span></div>
            ${(userData && userData.wilayah) ? `<div>Wilayah: <span>${userData.wilayah}</span></div>` : ''}
        </div>
        <button class="btn-logout-top" onclick="logout()">Keluar 🚪</button>
    `;

    kembaliKeLauncher(viewId);

    if (viewId === 'dashOffice') {
        const profOffice = document.getElementById('profOffice');
        if (profOffice) profOffice.innerHTML = profileHtml;
        setKasTanggalDefault();
        loadDataPetugas();
        loadTarif();
        loadRiwayatTagihan();
        loadLaporanKas();
        initAkunForm();
    } else if (viewId === 'dashFo') {
        const profFo = document.getElementById('profFo');
        if (profFo) profFo.innerHTML = profileHtml;
        initFoDashboard();
    } else if (viewId === 'dashPelanggan') {
        const profPelanggan = document.getElementById('profPelanggan');
        if (profPelanggan) profPelanggan.innerHTML = profileHtml;
        initPelangganDashboard();
    }
}

// MANAGEMENT LAUNCHER HUB & SUB-VIEW NAVIGASI
function bukaSubView(dashId, subViewId) {
    const parentDash = document.getElementById(dashId);
    if (!parentDash) return;
    
    const launcherGrid = parentDash.querySelector('.launcher-grid');
    if (launcherGrid) launcherGrid.style.display = 'none';

    parentDash.querySelectorAll('.sub-view').forEach(v => v.classList.remove('aktif'));

    const targetSubView = document.getElementById(subViewId);
    if (targetSubView) targetSubView.classList.add('aktif');
}

function kembaliKeLauncher(dashId) {
    const parentDash = document.getElementById(dashId);
    if (!parentDash) return;
    
    const launcherGrid = parentDash.querySelector('.launcher-grid');
    if (launcherGrid) launcherGrid.style.display = 'grid';

    parentDash.querySelectorAll('.sub-view').forEach(v => v.classList.remove('aktif'));
}

function verifikasiLunas(id) {
    if (confirm(`Verifikasi pembayaran tagihan untuk pelanggan ${id} sebagai LUNAS?`)) {
        db.ref(`pelanggan/${id}`).update({ status_bayar: 'Sudah Bayar' }).then(() => {
            alert(`Tagihan untuk pelanggan ${id} telah berhasil diverifikasi LUNAS!`);
        }).catch(err => alert("Gagal melakukan verifikasi: " + err.message));
    }
}

function initPelangganDashboard() {
    if (!currentUser) return;
    
    const plgAkunIdEl = document.getElementById('plgAkunId');
    if (plgAkunIdEl) plgAkunIdEl.value = currentUser.id;

    const plgAkunNamaEl = document.getElementById('plgAkunNama');
    if (plgAkunNamaEl) plgAkunNamaEl.value = currentUser.nama || '';

    const plgAkunAlamatEl = document.getElementById('plgAkunAlamat');
    if (plgAkunAlamatEl) plgAkunAlamatEl.value = currentUser.alamat || '';

    const plgAkunSandiEl = document.getElementById('plgAkunSandi');
    if (plgAkunSandiEl) plgAkunSandiEl.value = currentUser.sandi || '';

    loadTagihanPelanggan();
    loadLaporanKas();
}

function loadTagihanPelanggan() {
    if (!currentUser) return;
    const plgId = currentUser.id;
    db.ref(`pelanggan/${plgId}`).on('value', snapshot => {
        const container = document.getElementById('strukContainer');
        if (!container) return;

        if (!snapshot.exists()) {
            container.innerHTML = `<div style="text-align:center; padding:12px;">Data pelanggan tidak ditemukan.</div>`;
            return;
        }

        const data = snapshot.val();
        currentPlgTagihanData = { ...data, id: plgId };

        const meterAwal = parseDesimal(data.meter_awal);
        const meterAkhir = data.angka_terakhir !== undefined ? parseDesimal(data.angka_terakhir) : meterAwal;
        const pemakaian = Math.max(0, Math.round((meterAkhir - meterAwal) * 100) / 100);
        const total = data.total_tagihan || 0;
        const isLunas = data.status_bayar === 'Sudah Bayar';
        const tglStr = data.tgl_catat ? formatTanggalIndo(data.tgl_catat) : 'Belum Dicatat';

        container.innerHTML = `
            <div class="struk-card">
                <div class="struk-header">
                    <strong>TIRTA SARI GIRI</strong>
                    <small>STRUK PEMBAYARAN TAGIHAN AIR</small>
                </div>
                <div class="struk-row"><span>ID Pelanggan</span><b>${plgId}</b></div>
                <div class="struk-row"><span>Nama</span><span>${data.nama || '-'}</span></div>
                <div class="struk-row"><span>Alamat</span><span>${data.alamat || '-'}</span></div>
                <div class="struk-row"><span>Tanggal Catat</span><span>${tglStr}</span></div>
                
                <div class="struk-divider"></div>
                
                <div class="struk-row"><span>Meter Awal</span><span>${meterAwal} m³</span></div>
                <div class="struk-row"><span>Meter Akhir</span><span>${meterAkhir} m³</span></div>
                <div class="struk-row" style="font-weight:bold;"><span>Pemakaian Air</span><span>${pemakaian} m³</span></div>
                
                <div class="struk-divider"></div>
                
                <div class="struk-total struk-row">
                    <span>TOTAL TAGIHAN</span>
                    <span>${formatRupiah(total)}</span>
                </div>
                <div class="struk-row" style="margin-top:8px; font-weight:bold;">
                    <span>STATUS</span>
                    <span style="color:${isLunas ? '#16A34A' : '#DC2626'};">
                        ${isLunas ? '✔ LUNAS' : '✘ BELUM BAYAR'}
                    </span>
                </div>
                
                <div class="struk-footer">
                    <div>Simpan struk ini sebagai bukti pembayaran sah.</div>
                    <div style="margin-top:2px;">Terima Kasih - Tirta Sari Giri</div>
                    <div style="margin-top:6px; font-size:9px; color:#94A3B8; text-align:left;">developed by lm</div>
                </div>
            </div>
        `;
    });
}

function buatCanvasStruk(data, callback) {
    if (!data) {
        alert("Data tagihan belum tersedia!");
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 450;
    canvas.height = 620;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "center";
    ctx.fillText("TIRTA SARI GIRI", 225, 45);

    ctx.font = "12px monospace";
    ctx.fillStyle = "#475569";
    ctx.fillText("STRUK PEMBAYARAN TAGIHAN AIR", 225, 68);

    ctx.strokeStyle = "#94A3B8";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(30, 85);
    ctx.lineTo(420, 85);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.textAlign = "left";
    ctx.font = "13px monospace";
    ctx.fillStyle = "#1E293B";

    const tglStr = data.tgl_catat ? formatTanggalIndo(data.tgl_catat) : '-';
    const meterAwal = parseDesimal(data.meter_awal);
    const meterAkhir = data.angka_terakhir !== undefined ? parseDesimal(data.angka_terakhir) : meterAwal;
    const pemakaian = Math.max(0, Math.round((meterAkhir - meterAwal) * 100) / 100);
    const isLunas = data.status_bayar === 'Sudah Bayar';

    let y = 115;
    const addRow = (label, value, bold = false) => {
        ctx.font = bold ? "bold 13px monospace" : "13px monospace";
        ctx.fillText(label, 30, y);
        ctx.textAlign = "right";
        ctx.fillText(value, 420, y);
        ctx.textAlign = "left";
        y += 26;
    };

    addRow("ID Pelanggan", data.id || '-');
    addRow("Nama", data.nama || '-');
    addRow("Alamat", data.alamat || '-');
    addRow("Tanggal Catat", tglStr);

    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(420, y);
    ctx.stroke();
    y += 24;

    ctx.setLineDash([]);
    addRow("Meter Awal", `${meterAwal} m³`);
    addRow("Meter Akhir", `${meterAkhir} m³`);
    addRow("Pemakaian Air", `${pemakaian} m³`, true);

    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(420, y);
    ctx.stroke();
    y += 28;

    ctx.font = "bold 16px monospace";
    ctx.fillStyle = "#0F172A";
    ctx.fillText("TOTAL TAGIHAN", 30, y);
    ctx.textAlign = "right";
    ctx.fillText(formatRupiah(data.total_tagihan || 0), 420, y);
    ctx.textAlign = "left";

    y += 32;
    ctx.font = "bold 14px monospace";
    ctx.fillStyle = isLunas ? "#16A34A" : "#DC2626";
    ctx.fillText("STATUS", 30, y);
    ctx.textAlign = "right";
    ctx.fillText(isLunas ? "LUNAS" : "BELUM BAYAR", 420, y);

    ctx.textAlign = "center";
    ctx.font = "11px monospace";
    ctx.fillStyle = "#64748B";
    ctx.fillText("Simpan struk ini sebagai bukti pembayaran sah.", 225, canvas.height - 35);
    ctx.fillText("Terima Kasih - Tirta Sari Giri", 225, canvas.height - 18);

    ctx.textAlign = "left";
    ctx.font = "10px monospace";
    ctx.fillStyle = "#94A3B8";
    ctx.fillText("developed by lm", 30, canvas.height - 18);

    if (typeof callback === 'function') {
        callback(canvas);
    }
}

async function bagikanStrukKeWhatsApp(canvasElement, namaPelanggan, idPelanggan) {
    const canvas = canvasElement;
    if (!canvas) {
        alert('Gagal memproses gambar struk.');
        return;
    }

    canvas.toBlob(async (blob) => {
        if (!blob) {
            alert('Gagal memproses gambar struk.');
            return;
        }

        const file = new File([blob], `Struk_${idPelanggan}_${namaPelanggan}.png`, { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: 'Struk Pembayaran Tirta Sari Giri',
                    text: `Berikut adalah struk pembayaran air untuk pelanggan ${idPelanggan} - ${namaPelanggan}. Terima kasih.`
                });
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Gagal membagikan struk:', error);
                }
            }
        } else {
            const link = document.createElement('a');
            link.download = `Struk_${idPelanggan}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            alert('Perangkat tidak mendukung direct share. Struk telah diunduh ke penyimpanan.');
        }
    }, 'image/png');
}

function updateProfilPelanggan() {
    if (!currentUser) return;
    const id = currentUser.id;
    const nama = document.getElementById('plgAkunNama').value.trim();
    const sandi = document.getElementById('plgAkunSandi').value.trim();

    if (!nama || !sandi) {
        alert("Isi nama dan sandi!");
        return;
    }

    db.ref(`pelanggan/${id}`).update({ nama, sandi }).then(() => {
        alert("Profil Anda berhasil diperbarui!");
        currentUser.nama = nama;
        currentUser.sandi = sandi;
        tampilkanDashboard('dashPelanggan', currentUser, id, 'Pelanggan');
    }).catch(err => alert("Gagal update profil: " + err.message));
}

function initFoDashboard() {
    if (!currentUser) return;
    const wilayah = currentUser.wilayah || 'RT 1';
    
    const plgAlamatEl = document.getElementById('plgAlamat');
    if (plgAlamatEl) plgAlamatEl.value = `Sambeng ${wilayah}`;

    const plgIdEl = document.getElementById('plgId');
    if (plgIdEl) plgIdEl.value = 'PLG';

    const plgSandiEl = document.getElementById('plgSandi');
    if (plgSandiEl) plgSandiEl.value = 'PLG';

    const foAkunIdEl = document.getElementById('foAkunId');
    if (foAkunIdEl) foAkunIdEl.value = currentUser.id;

    const foAkunNamaEl = document.getElementById('foAkunNama');
    if (foAkunNamaEl) foAkunNamaEl.value = currentUser.nama || '';

    const foAkunWilayahEl = document.getElementById('foAkunWilayah');
    if (foAkunWilayahEl) foAkunWilayahEl.value = currentUser.wilayah || 'RT 1';

    const foAkunSandiEl = document.getElementById('foAkunSandi');
    if (foAkunSandiEl) foAkunSandiEl.value = currentUser.sandi || '';

    loadPelangganFo();
    loadTagihanFo();
    loadLaporanKas();
}

function simpanPelangganByFo() {
    if (!currentUser) return;
    const id = document.getElementById('plgId').value.trim().toUpperCase();
    const nama = document.getElementById('plgNama').value.trim();
    const alamat = document.getElementById('plgAlamat').value.trim();
    const meterAwal = parseDesimal(document.getElementById('plgMeterAwal').value);
    const sandi = document.getElementById('plgSandi').value.trim();
    const wilayah = currentUser.wilayah || 'RT 1';

    if (id.length <= 3) {
        alert("Masukkan ID Pelanggan setelah awalan PLG! Contoh: PLG001");
        return;
    }
    if (!nama || !sandi) {
        alert("Lengkapi nama pelanggan!");
        return;
    }

    const data = {
        nama,
        alamat,
        wilayah,
        sandi,
        meter_awal: meterAwal,
        angka_terakhir: meterAwal,
        total_tagihan: 0,
        status_bayar: 'Belum Bayar',
        didaftarkan_oleh: currentUser.id
    };

    db.ref(`pelanggan/${id}`).set(data).then(() => {
        alert(`Pelanggan ${nama} (${id}) berhasil didaftarkan!\nKata Sandi: ${sandi}`);
        document.getElementById('plgId').value = 'PLG';
        document.getElementById('plgNama').value = '';
        document.getElementById('plgMeterAwal').value = '0';
        document.getElementById('plgSandi').value = 'PLG';
        loadPelangganFo();
    }).catch(err => alert("Gagal mendaftar: " + err.message));
}

function loadPelangganFo() {
    if (!currentUser) return;
    db.ref('pelanggan').on('value', snapshot => {
        if (!currentUser) return;
        const tbody = document.getElementById('tabelPelangganFo');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!snapshot.exists()) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Belum ada data pelanggan.</td></tr>`;
            return;
        }

        let count = 0;
        snapshot.forEach(child => {
            const plg = child.val();
            if (plg && plg.didaftarkan_oleh === currentUser.id) {
                count++;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <b>${child.key}</b><br>
                        <small style="color:var(--text-accent);">${plg.nama || '-'}</small>
                    </td>
                    <td>${plg.alamat || '-'}</td>
                    <td>
                        <code>${plg.sandi || '-'}</code>
                        <div style="margin-top:4px;">
                            <button class="btn btn-merah btn-sm" onclick="hapusPelanggan('${child.key}')">Hapus</button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            }
        });

        if (count === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Belum ada pelanggan yang Anda daftarkan.</td></tr>`;
        }
    });
}

function hapusPelanggan(id) {
    if (confirm(`Hapus pelanggan ${id}?`)) {
        db.ref(`pelanggan/${id}`).remove().then(() => alert("Pelanggan berhasil dihapus!"));
    }
}

function cariPelangganMeter() {
    if (!currentUser) return;
    const query = document.getElementById('cariPlgId').value.trim();
    if (!query) {
        alert("Masukkan ID atau Nama Pelanggan!");
        return;
    }

    db.ref('pelanggan').once('value').then(snapshot => {
        if (!snapshot.exists()) {
            alert("Data pelanggan kosong!");
            return;
        }

        let matchKey = null;
        let matchData = null;
        const queryLower = query.toLowerCase();

        snapshot.forEach(child => {
            const plg = child.val();
            if (plg && plg.didaftarkan_oleh === currentUser.id) {
                if (child.key.toUpperCase() === query.toUpperCase()) {
                    matchKey = child.key;
                    matchData = plg;
                }
            }
        });

        if (!matchData) {
            let matches = [];
            snapshot.forEach(child => {
                const plg = child.val();
                if (plg && plg.didaftarkan_oleh === currentUser.id && plg.nama && plg.nama.toLowerCase().includes(queryLower)) {
                    matches.push({ key: child.key, data: plg });
                }
            });

            if (matches.length > 0) {
                matchKey = matches[0].key;
                matchData = matches[0].data;
            }
        }

        if (!matchData) {
            alert(`Pelanggan "${query}" tidak ditemukan atau Anda tidak memiliki hak akses terhadap pelanggan ini!`);
            document.getElementById('formMeterBox').style.display = 'none';
            return;
        }

        document.getElementById('cariPlgId').value = matchKey;
        document.getElementById('meterNamaPlg').value = matchData.nama || '';
        document.getElementById('meterLalu').value = matchData.angka_terakhir !== undefined ? matchData.angka_terakhir : (matchData.meter_awal || 0);
        document.getElementById('meterSekarang').value = '';
        document.getElementById('formMeterBox').style.display = 'block';
    });
}

function simpanCatatMeter() {
    const id = document.getElementById('cariPlgId').value.trim().toUpperCase();
    const meterLalu = parseDesimal(document.getElementById('meterLalu').value);
    const meterSekarangVal = document.getElementById('meterSekarang').value.trim();

    if (meterSekarangVal === '') {
        alert("Masukkan angka meteran sekarang!");
        return;
    }

    const meterSekarang = parseDesimal(meterSekarangVal);

    if (meterSekarang < meterLalu) {
        alert("Meter sekarang tidak boleh lebih kecil dari meter lalu!");
        return;
    }

    db.ref('pengaturan/tarif').once('value').then(tariffSnap => {
        let hargaM3 = 3000;
        let biayaBeban = 10000;

        if (tariffSnap.exists()) {
            hargaM3 = tariffSnap.val().hargaM3 || hargaM3;
            biayaBeban = tariffSnap.val().biayaBeban || biayaBeban;
        }

        const pakai = Math.round((meterSekarang - meterLalu) * 100) / 100;
        const totalTagihan = Math.round(((pakai * hargaM3) + biayaBeban) * 100) / 100;

        db.ref(`pelanggan/${id}`).update({
            angka_terakhir: meterSekarang,
            total_tagihan: totalTagihan,
            status_bayar: 'Belum Bayar',
            tgl_catat: new Date().toISOString()
        }).then(() => {
            alert(`Catat meter berhasil!\nPemakaian: ${pakai} m³\nTotal Tagihan: ${formatRupiah(totalTagihan)}`);
            document.getElementById('formMeterBox').style.display = 'none';
            document.getElementById('cariPlgId').value = '';
            loadTagihanFo();
        });
    });
}

function loadTagihanFo() {
    if (!currentUser) return;
    db.ref('pengaturan/tarif').once('value').then(tariffSnap => {
        let hargaM3 = 3000;
        let biayaBeban = 10000;

        if (tariffSnap.exists()) {
            hargaM3 = tariffSnap.val().hargaM3 || hargaM3;
            biayaBeban = tariffSnap.val().biayaBeban || biayaBeban;
        }

        db.ref('pelanggan').on('value', snapshot => {
            if (!currentUser) return;
            const tbody = document.getElementById('tabelTagihanFo');
            if (!tbody) return;
            tbody.innerHTML = '';

            if (!snapshot.exists()) {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Belum ada tagihan.</td></tr>`;
                const elSudah = document.getElementById('foTotalSudahBayar');
                const elBelum = document.getElementById('foTotalBelumBayar');
                if (elSudah) elSudah.textContent = formatRupiah(0);
                if (elBelum) elBelum.textContent = formatRupiah(0);
                return;
            }

            let count = 0;
            let totalSudah = 0;
            let totalBelum = 0;

            snapshot.forEach(child => {
                const plg = child.val();
                if (plg && plg.didaftarkan_oleh === currentUser.id) {
                    count++;
                    const meterLalu = parseDesimal(plg.meter_awal);
                    const meterAkhir = plg.angka_terakhir !== undefined ? parseDesimal(plg.angka_terakhir) : meterLalu;
                    const pakai = Math.max(0, Math.round((meterAkhir - meterLalu) * 100) / 100);
                    
                    const totalTagihanCalculated = (plg.total_tagihan !== undefined && plg.total_tagihan > 0) 
                        ? plg.total_tagihan 
                        : Math.round(((pakai * hargaM3) + biayaBeban) * 100) / 100;

                    const isLunas = plg.status_bayar === 'Sudah Bayar';

                    if (isLunas) {
                        totalSudah += totalTagihanCalculated;
                    } else {
                        totalBelum += totalTagihanCalculated;
                    }
                    
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>
                            <b>${plg.nama || '-'}</b><br>
                            <small style="color:var(--text-secondary);">${child.key}</small>
                        </td>
                        <td>
                            ${pakai} m³<br>
                            <b style="color:var(--text-accent);">${formatRupiah(totalTagihanCalculated)}</b>
                        </td>
                        <td>
                            <span style="color:${isLunas ? '#4ade80' : '#f87171'}; font-weight:bold;">
                                ${plg.status_bayar || 'Belum Bayar'}
                            </span>
                            <div style="margin-top:4px;">
                                ${!isLunas 
                                    ? `<button class="btn btn-hijau btn-sm" onclick="verifikasiLunas('${child.key}')">Verifikasi</button>` 
                                    : `<span style="color:#4ade80; font-size:10px;">✔ Terverifikasi</span>`}
                            </div>
                        </td>
                    `;
                    tbody.appendChild(tr);
                }
            });

            if (count === 0) {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Belum ada data tagihan dari pelanggan yang Anda daftarkan.</td></tr>`;
            }

            const elSudah = document.getElementById('foTotalSudahBayar');
            const elBelum = document.getElementById('foTotalBelumBayar');
            if (elSudah) elSudah.textContent = formatRupiah(totalSudah);
            if (elBelum) elBelum.textContent = formatRupiah(totalBelum);
        });
    });
}

function updateProfilFo() {
    if (!currentUser) return;
    const id = currentUser.id;
    const nama = document.getElementById('foAkunNama').value.trim();
    const sandi = document.getElementById('foAkunSandi').value.trim();

    if (!nama || !sandi) {
        alert("Isi nama dan sandi!");
        return;
    }

    db.ref(`staf_fo/${id}`).update({ nama, sandi }).then(() => {
        alert("Profil Anda berhasil diperbarui!");
        currentUser.nama = nama;
        currentUser.sandi = sandi;
        tampilkanDashboard('dashFo', currentUser, id, 'Petugas Lapangan (FO)');
    }).catch(err => alert("Gagal update profil: " + err.message));
}

function simpanPetugas() {
    const id = document.getElementById('foId').value.trim().toUpperCase();
    const nama = document.getElementById('foNama').value.trim();
    const wilayah = document.getElementById('foWilayah').value;
    const sandi = document.getElementById('foSandi').value.trim();

    if (!id || !nama || !sandi) {
        alert("Harap isi semua kolom petugas!");
        return;
    }

    const data = { id, nama, wilayah, sandi, peran: "FO" };

    db.ref(`staf_fo/${id}`).set(data).then(() => {
        alert(`Petugas ${nama} berhasil disimpan!`);
        document.getElementById('foId').value = '';
        document.getElementById('foNama').value = '';
        document.getElementById('foSandi').value = '';
        loadDataPetugas();
    }).catch(err => alert("Gagal menyimpan: " + err.message));
}

function loadDataPetugas() {
    db.ref('staf_fo').on('value', snapshot => {
        const tbody = document.getElementById('tabelPetugas');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!snapshot.exists()) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Belum ada data petugas.</td></tr>`;
            return;
        }

        snapshot.forEach(child => {
            const fo = child.val();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><b>${child.key}</b></td>
                <td>${fo.nama || '-'}</td>
                <td>${fo.wilayah || '-'}</td>
                <td><code>${fo.sandi || '-'}</code></td>
                <td>
                    <button class="btn btn-merah btn-sm" onclick="hapusPetugas('${child.key}')">Hapus</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
}

function hapusPetugas(id) {
    if (confirm(`Apakah Anda yakin ingin menghapus petugas ${id}?`)) {
        db.ref(`staf_fo/${id}`).remove().then(() => alert("Petugas berhasil dihapus!"));
    }
}

function simpanTarif() {
    const hargaM3 = Number(document.getElementById('tarifM3').value);
    const biayaBeban = Number(document.getElementById('biayaBeban').value);

    db.ref('pengaturan/tarif').set({ hargaM3, biayaBeban }).then(() => {
        alert("Pengaturan tarif berhasil diperbarui!");
    }).catch(err => alert("Gagal menyimpan tarif: " + err.message));
}

function loadTarif() {
    db.ref('pengaturan/tarif').once('value').then(snapshot => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            document.getElementById('tarifM3').value = data.hargaM3 || 0;
            document.getElementById('biayaBeban').value = data.biayaBeban || 0;
        }
    });
}

function loadRiwayatTagihan() {
    const filter = document.getElementById('filterWilayahTagihan').value;
    
    db.ref('pengaturan/tarif').once('value').then(tariffSnap => {
        let hargaM3 = 3000;
        let biayaBeban = 10000;

        if (tariffSnap.exists()) {
            hargaM3 = tariffSnap.val().hargaM3 || hargaM3;
            biayaBeban = tariffSnap.val().biayaBeban || biayaBeban;
        }

        db.ref('pelanggan').on('value', snapshot => {
            const tbody = document.getElementById('tabelTagihan');
            if (!tbody) return;
            tbody.innerHTML = '';

            if (!snapshot.exists()) {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Belum ada data tagihan.</td></tr>`;
                return;
            }

            snapshot.forEach(child => {
                const plg = child.val();
                if (filter === "SEMUA" || plg.wilayah === filter) {
                    const meterLalu = parseDesimal(plg.meter_awal);
                    const meterAkhir = plg.angka_terakhir !== undefined ? parseDesimal(plg.angka_terakhir) : meterLalu;
                    
                    const pemakaianM3 = Math.max(0, Math.round((meterAkhir - meterLalu) * 100) / 100);
                    
                    const totalTagihanCalculated = (plg.total_tagihan !== undefined && plg.total_tagihan > 0) 
                        ? plg.total_tagihan 
                        : Math.round(((pemakaianM3 * hargaM3) + biayaBeban) * 100) / 100;

                    const isLunas = plg.status_bayar === "Sudah Bayar";
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>
                            <b>${plg.nama || '-'}</b><br>
                            <small style="color:var(--text-secondary);">${child.key}</small>
                        </td>
                        <td>
                            <b>Wilayah:</b> ${plg.wilayah || '-'}<br>
                            <b>Pemakaian:</b> ${pemakaianM3} m³<br>
                            <b>Total:</b> <span style="color:var(--text-accent); font-weight:bold;">${formatRupiah(totalTagihanCalculated)}</span>
                        </td>
                        <td>
                            <span style="color:${isLunas ? '#4ade80' : '#f87171'}; font-weight:bold;">
                                ${plg.status_bayar || 'Belum Bayar'}
                            </span>
                        </td>
                    `;
                    tbody.appendChild(tr);
                }
            });
        });
    });
}

function simpanKas() {
    const tglInput = document.getElementById('kasTanggal').value;
    const jenis = document.getElementById('kasJenis').value;
    const nominal = Number(document.getElementById('kasNominal').value);
    const keterangan = document.getElementById('kasKet').value.trim();

    if (!tglInput || !nominal || !keterangan) {
        alert("Lengkapi tanggal, nominal, dan keterangan transaksi kas!");
        return;
    }

    const kasRef = db.ref('transaksi_kas').push();
    kasRef.set({
        jenis,
        nominal,
        keterangan,
        tanggal: tglInput
    }).then(() => {
        alert("Transaksi kas berhasil dicatat!");
        document.getElementById('kasNominal').value = '';
        document.getElementById('kasKet').value = '';
        setKasTanggalDefault();
    });
}

function hapusKas(key) {
    if (confirm("Apakah Anda yakin ingin menghapus transaksi kas ini?")) {
        db.ref(`transaksi_kas/${key}`).remove().then(() => {
            alert("Transaksi kas berhasil dihapus!");
        }).catch(err => alert("Gagal menghapus transaksi: " + err.message));
    }
}

function loadTagihanPerWilayahKas() {
    db.ref('pengaturan/tarif').once('value').then(tariffSnap => {
        let hargaM3 = 3000;
        let biayaBeban = 10000;

        if (tariffSnap.exists()) {
            hargaM3 = tariffSnap.val().hargaM3 || hargaM3;
            biayaBeban = tariffSnap.val().biayaBeban || biayaBeban;
        }

        db.ref('pelanggan').on('value', snapshot => {
            const tbodyOffice = document.getElementById('tabelTagihanWilayahKas');
            const tbodyFo = document.getElementById('tabelTagihanWilayahKasFo');

            const renderKeTabel = (tbody) => {
                if (!tbody) return;
                tbody.innerHTML = '';

                if (!snapshot.exists()) {
                    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Belum ada data pelanggan.</td></tr>`;
                    return;
                }

                let rekap = {};

                snapshot.forEach(child => {
                    const plg = child.val();
                    const wil = plg.wilayah || 'Tanpa Wilayah';
                    
                    if (!rekap[wil]) {
                        rekap[wil] = { sudahBayar: 0, belumBayar: 0 };
                    }

                    const meterLalu = parseDesimal(plg.meter_awal);
                    const meterAkhir = plg.angka_terakhir !== undefined ? parseDesimal(plg.angka_terakhir) : meterLalu;
                    const pemakaianM3 = Math.max(0, Math.round((meterAkhir - meterLalu) * 100) / 100);
                    
                    const totalTagihanCalculated = (plg.total_tagihan !== undefined && plg.total_tagihan > 0) 
                        ? plg.total_tagihan 
                        : Math.round(((pemakaianM3 * hargaM3) + biayaBeban) * 100) / 100;

                    if (plg.status_bayar === "Sudah Bayar") {
                        rekap[wil].sudahBayar += totalTagihanCalculated;
                    } else {
                        rekap[wil].belumBayar += totalTagihanCalculated;
                    }
                });

                let keys = Object.keys(rekap).sort();
                if (keys.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Belum ada data pelanggan.</td></tr>`;
                    return;
                }

                keys.forEach(wil => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><b>${wil}</b></td>
                        <td style="color:#4ade80; font-weight:bold;">${formatRupiah(rekap[wil].sudahBayar)}</td>
                        <td style="color:#f87171; font-weight:bold;">${formatRupiah(rekap[wil].belumBayar)}</td>
                    `;
                    tbody.appendChild(tr);
                });
            };

            renderKeTabel(tbodyOffice);
            renderKeTabel(tbodyFo);
        });
    });
}

function loadLaporanKas() {
    loadTagihanPerWilayahKas();

    db.ref('transaksi_kas').on('value', snapshot => {
        let saldoBulanLalu = 0;
        let pemasukanBulanIni = 0;
        let pengeluaranBulanIni = 0;
        let rowsOffice = '';
        let rowsView = '';

        const sekarang = new Date();
        const tahunSekarang = sekarang.getFullYear();
        const bulanSekarang = sekarang.getMonth();

        if (!snapshot.exists()) {
            rowsOffice = `<tr><td colspan="3" style="text-align:center;">Belum ada transaksi kas.</td></tr>`;
            rowsView = `<tr><td colspan="3" style="text-align:center;">Belum ada transaksi kas.</td></tr>`;
        } else {
            snapshot.forEach(child => {
                const kas = child.val();
                const key = child.key;
                const tglKas = new Date(kas.tanggal);
                const thnKas = tglKas.getFullYear();
                const blnKas = tglKas.getMonth();

                const isBulanLalu = (thnKas < tahunSekarang) || (thnKas === tahunSekarang && blnKas < bulanSekarang);
                const isBulanIni = (thnKas === tahunSekarang && blnKas === bulanSekarang);

                if (isBulanLalu) {
                    if (kas.jenis === "PEMASUKAN") saldoBulanLalu += kas.nominal;
                    if (kas.jenis === "PENGELUARAN") saldoBulanLalu -= kas.nominal;
                } else if (isBulanIni) {
                    if (kas.jenis === "PEMASUKAN") pemasukanBulanIni += kas.nominal;
                    if (kas.jenis === "PENGELUARAN") pengeluaranBulanIni += kas.nominal;
                }

                const tglSingkat = formatTanggalSingkat(kas.tanggal);
                const isPemasukan = kas.jenis === "PEMASUKAN";
                const badgeColor = isPemasukan ? '#4ade80' : '#f87171';
                
                rowsOffice += `
                    <tr>
                        <td><b>${tglSingkat}</b></td>
                        <td>
                            <b style="color:${badgeColor}; font-size:11px;">[${kas.jenis}]</b><br>
                            <small style="color:var(--text-secondary);">${kas.keterangan || '-'}</small>
                        </td>
                        <td>
                            <div style="color:${badgeColor}; font-weight:bold;">${formatRupiah(kas.nominal)}</div>
                            <div style="margin-top:4px;">
                                <button class="btn btn-merah btn-sm" onclick="hapusKas('${key}')">Hapus</button>
                            </div>
                        </td>
                    </tr>
                `;

                rowsView += `
                    <tr>
                        <td><b>${tglSingkat}</b></td>
                        <td>
                            <b style="color:${badgeColor}; font-size:11px;">[${kas.jenis}]</b><br>
                            <small style="color:var(--text-secondary);">${kas.keterangan || '-'}</small>
                        </td>
                        <td>
                            <div style="color:${badgeColor}; font-weight:bold;">${formatRupiah(kas.nominal)}</div>
                        </td>
                    </tr>
                `;
            });
        }

        const totalSaldoKas = saldoBulanLalu + pemasukanBulanIni - pengeluaranBulanIni;

        const updateElemText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        const tOffice = document.getElementById('tabelKas');
        if (tOffice) tOffice.innerHTML = rowsOffice;
        updateElemText('kasSaldoLalu', formatRupiah(saldoBulanLalu));
        updateElemText('kasPemasukan', formatRupiah(pemasukanBulanIni));
        updateElemText('kasPengeluaran', formatRupiah(pengeluaranBulanIni));
        updateElemText('kasSaldo', formatRupiah(totalSaldoKas));

        const tFo = document.getElementById('tabelKasFo');
        if (tFo) tFo.innerHTML = rowsView;
        updateElemText('kasSaldoLaluFo', formatRupiah(saldoBulanLalu));
        updateElemText('kasPemasukanFo', formatRupiah(pemasukanBulanIni));
        updateElemText('kasPengeluaranFo', formatRupiah(pengeluaranBulanIni));
        updateElemText('kasSaldoFo', formatRupiah(totalSaldoKas));

        const tPlg = document.getElementById('tabelKasPlg');
        if (tPlg) tPlg.innerHTML = rowsView;
        updateElemText('kasSaldoLaluPlg', formatRupiah(saldoBulanLalu));
        updateElemText('kasPemasukanPlg', formatRupiah(pemasukanBulanIni));
        updateElemText('kasPengeluaranPlg', formatRupiah(pengeluaranBulanIni));
        updateElemText('kasSaldoPlg', formatRupiah(totalSaldoKas));
    });
}

function initAkunForm() {
    if (currentUser) {
        const akunIdEl = document.getElementById('akunId');
        if (akunIdEl) akunIdEl.value = currentUser.id;

        const akunNamaEl = document.getElementById('akunNama');
        if (akunNamaEl) akunNamaEl.value = currentUser.nama || '';

        const akunSandiEl = document.getElementById('akunSandi');
        if (akunSandiEl) akunSandiEl.value = currentUser.sandi || '';
    }
}

function updateProfilOffice() {
    if (!currentUser) return;
    const id = currentUser.id;
    const nama = document.getElementById('akunNama').value.trim();
    const sandi = document.getElementById('akunSandi').value.trim();

    if (!nama || !sandi) {
        alert("Isi nama dan sandi!");
        return;
    }

    db.ref(`staf_office/${id}`).update({ nama, sandi }).then(() => {
        alert("Profil akun berhasil diperbarui!");
        currentUser.nama = nama;
        currentUser.sandi = sandi;
        tampilkanDashboard('dashOffice', currentUser, id, 'Staf Office');
    }).catch(err => alert("Gagal update profil: " + err.message));
}

function logout() {
    currentUser = null;
    currentPlgTagihanData = null;

    localStorage.removeItem('tirta_remember');
    localStorage.removeItem('tirta_saved_id');
    localStorage.removeItem('tirta_saved_sandi');

    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('aktif'));
    const loginView = document.getElementById('loginView');
    if (loginView) loginView.classList.add('aktif');
    
    document.getElementById('loginId').value = '';
    document.getElementById('loginSandi').value = '';
    document.getElementById('rememberMe').checked = false;
    document.getElementById('roleDetected').style.display = 'none';
}