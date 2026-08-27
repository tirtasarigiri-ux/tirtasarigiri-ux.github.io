import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// KONFIGURASI FIREBASE ANDA
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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// DOM Referensi
const connectionStatus = document.getElementById('connection-status');
const staffForm = document.getElementById('staff-form');
const usersCardContainer = document.getElementById('users-card-container');
const btnExport = document.getElementById('btn-export');
const btnImport = document.getElementById('btn-import');
const importFile = document.getElementById('import-file');

// Indikator Koneksi
connectionStatus.textContent = "Online";
connectionStatus.className = "text-xs bg-green-500 px-2 py-0.5 rounded text-white font-semibold whitespace-nowrap";

// 1. Tambah Staf Admin Baru
staffForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const staffId = document.getElementById('staff-id').value.trim().toUpperCase();
    const name = document.getElementById('staff-name').value.trim();
    const password = document.getElementById('staff-password').value.trim();

    if (password.length > 5) {
        alert('Sandi maksimal 5 digit!');
        return;
    }

    const staffRef = ref(db, `users/${staffId}`);
    set(staffRef, {
        staffId: staffId,
        name: name,
        role: 'Staf Admin',
        username: staffId.toLowerCase() + '@admin.com',
        password: password,
        createdAt: serverTimestamp()
    }).then(() => {
        staffForm.reset();
        alert('Staf Admin berhasil disimpan!');
        // Pindah otomatis ke tab pengguna
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.getElementById('tab-pengguna').classList.remove('hidden');
    }).catch(err => alert('Gagal menyimpan: ' + err.message));
});

// 2. Realtime Listener: Daftar Pengguna (Format Kartu Vertikal Mobile)
onValue(ref(db, 'users'), (snapshot) => {
    usersCardContainer.innerHTML = '';
    if (snapshot.exists()) {
        const users = snapshot.val();
        Object.entries(users).forEach(([key, user]) => {
            let badgeColor = 'bg-gray-100 text-gray-800';
            if (user.role === 'Staf Admin') badgeColor = 'bg-blue-100 text-blue-800';
            else if (user.role === 'Petugas Lapangan') badgeColor = 'bg-amber-100 text-amber-800';
            else if (user.role === 'Pelanggan') badgeColor = 'bg-green-100 text-green-800';

            const card = document.createElement('div');
            card.className = "p-3 bg-gray-50 border border-gray-200 rounded space-y-1 text-xs";
            card.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="font-bold text-gray-800 text-sm">${user.name || 'Tanpa Nama'}</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${badgeColor}">${user.role || 'User'}</span>
                </div>
                <div class="text-gray-500">ID/User: <span class="text-gray-700">${user.username || user.staffId || '-'}</span></div>
                <div class="flex justify-between items-center pt-1 border-t border-gray-200 mt-1">
                    <span class="text-gray-500">Kata Sandi:</span>
                    <span class="font-mono text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded">${user.password || '-'}</span>
                </div>
            `;
            usersCardContainer.appendChild(card);
        });
    } else {
        usersCardContainer.innerHTML = '<p class="text-xs text-gray-400 text-center py-2">Belum ada data pengguna.</p>';
    }
});

// 3. Fitur Ekspor Data ke JSON
btnExport.addEventListener('click', () => {
    const dbRef = ref(db);
    get(dbRef).snapshot ? null : get(dbRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `water-meter-backup-${new Date().toISOString().slice(0,10)}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        } else {
            alert('Database kosong, tidak ada data untuk diekspor.');
        }
    }).catch(err => alert('Gagal mengekspor data: ' + err.message));
});

// 4. Fitur Impor Data dari JSON
btnImport.addEventListener('click', () => {
    const file = importFile.files[0];
    if (!file) {
        alert('Silakan pilih file JSON terlebih dahulu.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const jsonData = JSON.parse(event.target.result);
            set(ref(db), jsonData)
                .then(() => {
                    alert('Data berhasil diimpor ke Firebase!');
                    importFile.value = '';
                })
                .catch(err => alert('Gagal memasukkan data ke database: ' + err.message));
        } catch (e) {
            alert('File JSON tidak valid!');
        }
    };
    reader.readAsText(file);
});