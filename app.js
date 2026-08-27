// Import Firebase SDK (Modular v9+)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// KONFIGURASI FIREBASE ANDA (Sesuaikan dengan project Anda)
const firebaseConfig = {
    apiKey: "API_KEY_ANDA",
    authDomain: "PROJECT_ID.firebaseapp.com",
    databaseURL: "https://PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "PROJECT_ID",
    storageBucket: "PROJECT_ID.appspot.com",
    messagingSenderId: "SENDER_ID",
    appId: "APP_ID"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Referensi DOM
const form = document.getElementById('meter-form');
const customerIdInput = document.getElementById('customer-id');
const meterValueInput = document.getElementById('meter-value');
const logContainer = document.getElementById('log-container');
const connectionStatus = document.getElementById('connection-status');

// Indikator Status Koneksi Realtime
connectionStatus.textContent = "Terhubung";
connectionStatus.className = "text-xs bg-green-500 px-2 py-1 rounded text-white font-semibold";

// 1. Kirim Data ke Firebase Realtime Database
form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const customerId = customerIdInput.value.trim();
    const meterValue = parseFloat(meterValueInput.value);

    const meterDataRef = ref(db, 'water_meters');
    
    push(meterDataRef, {
        customerId: customerId,
        meterValue: meterValue,
        timestamp: serverTimestamp()
    })
    .then(() => {
        form.reset();
        alert('Data berhasil disimpan secara realtime!');
    })
    .catch((error) => {
        console.error('Gagal menyimpan data: ', error);
        alert('Terjadi kesalahan saat menyimpan data.');
    });
});

// 2. Ambil & Pantau Data secara Realtime (Listener)
const meterDataRef = ref(db, 'water_meters');
onValue(meterDataRef, (snapshot) => {
    logContainer.innerHTML = ''; // Bersihkan kontainer
    
    if (snapshot.exists()) {
        const data = snapshot.val();
        const logs = Object.entries(data).reverse(); // Urutkan dari yang terbaru

        logs.forEach(([key, record]) => {
            const dateStr = record.timestamp ? new Date(record.timestamp).toLocaleString('id-ID') : 'Baru saja';
            
            const logItem = document.createElement('div');
            logItem.className = "p-3 bg-gray-50 border border-gray-200 rounded-md flex justify-between items-center text-sm";
            logItem.innerHTML = `
                <div>
                    <span class="font-bold text-gray-700">${record.customerId}</span>
                    <div class="text-xs text-gray-500">${dateStr}</div>
                </div>
                <div class="text-right">
                    <span class="text-sky-600 font-semibold">${record.meterValue} m³</span>
                </div>
            `;
            logContainer.appendChild(logItem);
        });
    } else {
        logContainer.innerHTML = '<p class="text-sm text-gray-400 text-center">Belum ada data tercatat.</p>';
    }
});