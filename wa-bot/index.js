const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const pino = require("pino");
const mysql = require('mysql');
require('dotenv').config();

// Database connection
const dbConn = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'surat_desa'
});

dbConn.connect(err => {
    if (err) {
        console.error('❌ Error connecting to database:', err);
        throw err;
    }
    console.log('✅ Database Connected!');
});

// Improved notification function
async function sendBotNotification(sock, jenisSurat, nomorSurat, nama, nomorWaPengirim) {
    try {
        // Get the bot's own number (the number that scanned the QR code)
        const botNumber = sock.user.id.split('@')[0] + '@s.whatsapp.net';
        
        // Format the notification message
        const currentDate = new Date();
        const formattedDate = currentDate.toLocaleString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const message = `📢 *NOTIFIKASI SURAT BARU* 📢

📄 *Jenis Surat*: ${jenisSurat}
🆔 *Nomor Surat*: ${nomorSurat}
👤 *Nama Pemohon*: ${nama}
📱 *Nomor WA*: ${nomorWaPengirim}
⏰ *Waktu Pembuatan*: ${formattedDate}

ℹ️ *Tindakan*: 
1. Cek kelengkapan data di database
2. Verifikasi dokumen pendukung
3. Proses cetak surat

🔍 *Untuk memeriksa*:
- Login ke admin dashboard
- Atau cek langsung di database`;

        // Send message to the bot's own number
        await sock.sendMessage(botNumber, { text: message });
        console.log(`📤 Notification sent to bot: ${jenisSurat} - ${nomorSurat}`);
        
    } catch (error) {
        console.error('❌ Failed to send bot notification:', error);
        // You might want to implement a retry mechanism here
    }
}


async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`✅ Menggunakan versi Baileys: ${version}, Latest: ${isLatest}`);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: "silent" }),
        browser: ["Bot-KKN", "Chrome", "1.0"]
    });

    sock.ev.on("creds.update", saveCreds);

    const userStates = {};

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
            console.log(`❌ Koneksi terputus, mencoba menghubungkan kembali: ${shouldReconnect}`);
            if (shouldReconnect) startBot();
        } else if (connection === "open") {
            console.log("✅ Bot berhasil terkoneksi!");
        } else if (qr) {
            console.log("📌 Scan QR di atas untuk login!");
        }
    });

    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return; 

        const senderNumber = msg.key.remoteJid;
        const messageText = msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            "";

        console.log(`📩 Pesan masuk dari ${senderNumber}: ${messageText || "(Bukan teks)"}`);

        if (!userStates[senderNumber]) {
            userStates[senderNumber] = { step: 0, data: {} };
        }

        const currentState = userStates[senderNumber];

        try {
            if (currentState.step === 0) {
                // Simple case-insensitive check for common greetings
                const greeting = messageText.trim().toLowerCase();
                const validGreetings = ['halo', 'hai', 'hi', 'hello'];
                
                if (validGreetings.includes(greeting)) {
                    // Send welcome message
                    await sock.sendMessage(senderNumber, {
                        text: `👋 *Halo! Saya BonKidBot!*\n\nTerima kasih telah menghubungi kami. Saya siap membantu pengurusan surat Anda.\n\nKetik *menu* untuk melihat layanan yang tersedia.`
                    });
                    
                    // Move to next step
                    currentState.step = 1;
                } else {
                    // Friendly prompt for invalid input
                    await sock.sendMessage(senderNumber, {
                        text: `Hai! Untuk memulai, silakan ketik *halo* atau *hai* ya.\n\nContoh:\n"halo"\n"hai"`
                    });
                }
            
            }else if (currentState.step === 1) {
                if (messageText.toLowerCase() === "menu") {
                    const menuText = `*Menu Layanan Surat:*
                    1. Surat Keterangan Tidak Mampu
                    2. Surat Keterangan Usaha
                    3. Surat Keterangan Beda Identitas
                    4. Surat Pengantar
                    5. Cek Status Surat

                    Ketik angka *1, 2, 3, 4, atau 5* untuk melanjutkan.`;
                    await sock.sendMessage(senderNumber, { text: menuText });
                    currentState.step = 2;
                }
            } else if (currentState.step === 2) {
                if (messageText === '1') {
                    await sock.sendMessage(senderNumber, { text: "Silakan isi formulir berikut untuk keperluan Surat Keterangan Tidak Mampu:" });
                    await sock.sendMessage(senderNumber, { text: "1. Nama Lengkap:" });
                    currentState.step = 200; // SKTM
                } else if (messageText === '2') {
                    await sock.sendMessage(senderNumber, { text: " Silakan isi formulir berikut untuk keperluan Surat Keterangan Usaha:" });
                    await sock.sendMessage(senderNumber, { text: "1. Nama Lengkap:" });
                    currentState.step = 100; // SKU
                } else if (messageText === '3') {
                    await sock.sendMessage(senderNumber, { text: "Silakan isi formulir berikut untuk keperluan Surat Keterangan Beda Identitas:" });
                    await sock.sendMessage(senderNumber, { text: "1. Nama Lengkap:" });
                    currentState.step = 300; // SKBI
                } else if (messageText === '4') {
                    await sock.sendMessage(senderNumber, { text: " Silakan isi formulir berikut untuk keperluan Surat Pengantar:" });
                    await sock.sendMessage(senderNumber, { text: "1. Nama Lengkap:" });
                    currentState.step = 3; // Surat Pengantar
                } else if (messageText === '5') {
                    await sock.sendMessage(senderNumber, { text: "Silakan masukkan nomor surat Anda:" });
                    currentState.step = 400; // Cek Status Surat
                } else if (messageText.toLowerCase() === 'menu') {
                    const menuText = `*Menu Layanan Surat:*
                    1. Surat Keterangan Tidak Mampu
                    2. Surat Keterangan Usaha
                    3. Surat Keterangan Beda Identitas
                    4. Surat Pengantar
                    5. Cek Status Surat

                    Ketik angka *1, 2, 3, 4, atau 5* untuk melanjutkan.`;
                  
                  await sock.sendMessage(senderNumber, { text: menuText });
                } else {
                    await sock.sendMessage(senderNumber, { text: "Pilihan tidak valid. Silakan ketik angka 1, 2, 3, 4, atau 5, atau ketik 'menu'." });
                }
            }else if (currentState.step === 3) { // Langkah Surat Pengantar - Nama
                if (/\d/.test(messageText)) {
                    await sock.sendMessage(senderNumber, { 
                        text: "⚠️ *Format Nama Tidak Valid*\nNama tidak boleh mengandung angka. Contoh nama yang benar:\n- Budi Santoso\n- Siti Aminah" 
                    });
                } else if (messageText.length < 3) {
                    await sock.sendMessage(senderNumber, { 
                        text: "⚠️ *Nama Terlalu Pendek*\nNama harus minimal 3 karakter. Silakan masukkan nama lengkap Anda." 
                    });
                } else if (!/^[a-zA-Z\s]+$/.test(messageText)) {
                    await sock.sendMessage(senderNumber, { 
                        text: "⚠️ *Format Nama Tidak Valid*\nNama hanya boleh mengandung huruf dan spasi. Contoh:\n- Ahmad Fauzi\n- Dewi Lestari" 
                    });
                } else {
                    currentState.data.nama = messageText.toUpperCase();
                    await sock.sendMessage(senderNumber, { 
                        text: "📝 *Tempat, Tanggal Lahir*\nFormat: [Kota], [Tanggal] [Bulan] [Tahun]\nContoh:\nGarut, 15 September 2001\nJakarta, 5 Mei 1990" 
                    });
                    currentState.step = 4;
                }
            } else if (currentState.step === 4) {
                const ttlRegex = /^[A-Za-z\s]+, \d{1,2} [A-Za-z]+ \d{4}$/;
                if (ttlRegex.test(messageText)) {
                    currentState.data.tempat_tanggal_lahir = messageText;
                    await sock.sendMessage(senderNumber, { text: "3. Kewarganegaraan dan Agama (Format: Indonesia / Islam):" });
                    currentState.step = 5;
                } else {
                    await sock.sendMessage(senderNumber, { text: "Format tempat dan tanggal lahir salah. Contoh: Garut, 15 September 2001" });
                }
            } else if (currentState.step === 5) {
                const kewarganegaraanAgamaRegex = /^[A-Za-z\s]+\s\/\s[A-Za-z\s]+$/;
                if (kewarganegaraanAgamaRegex.test(messageText)) {
                    currentState.data.kewarganegaraan_agama = messageText;
                    await sock.sendMessage(senderNumber, { text: "4. Pekerjaan:" });
                    currentState.step = 6;
                } else {
                    await sock.sendMessage(senderNumber, { text: "Format kewarganegaraan dan agama salah. Contoh: Indonesia / Islam" });
                }
            } else if (currentState.step === 6) { // Pekerjaan
                if (/\d/.test(messageText)) {
                    await sock.sendMessage(senderNumber, { 
                        text: "⚠️ *Format Pekerjaan Tidak Valid*\nPekerjaan tidak boleh mengandung angka. Contoh:\n- Pedagang\n- Guru\n- PNS" 
                    });
                } else {
                    currentState.data.pekerjaan = messageText;
                    await sock.sendMessage(senderNumber, { 
                        text: "🏠 *Tempat Domisili*\nMasukkan alamat tempat tinggal Anda saat ini.\nContoh:\nJl. Merdeka No. 10, RT 01/RW 05, Desa Kebondalem" 
                    });
                    currentState.step = 7;
                }
            } else if (currentState.step === 7) {
                currentState.data.tempat_domisili = messageText;
                await sock.sendMessage(senderNumber, { text: "6. Daerah Asal:" });
                currentState.step = 8;
            } else if (currentState.step === 8) {
                currentState.data.daerah_asal = messageText;
                await sock.sendMessage(senderNumber, { text: "7. Surat Bukti Diri / NIK (16 digit):" });
                currentState.step = 9;
            } else if (currentState.step === 9) {
                const nikRegex = /^\d{16}$/;
                if (nikRegex.test(messageText)) {
                    currentState.data.surat_bukti_diri = messageText;
                    await sock.sendMessage(senderNumber, { text: "8. Keperluan / Maksud:" });
                    currentState.step = 10;
                } else {
                    await sock.sendMessage(senderNumber, { text: "NIK harus 16 digit angka." });
                }
            } else if (currentState.step === 10) {
                currentState.data.keperluan = messageText;
                await sock.sendMessage(senderNumber, { text: "9. Tujuan:" });
                currentState.step = 11;
            } else if (currentState.step === 11) {
                currentState.data.tujuan = messageText;
            
                const dataPreview = `✅ *Konfirmasi Data Anda:*
            1. *Nama Lengkap* : ${currentState.data.nama}
            2. *Tempat, Tanggal Lahir* : ${currentState.data.tempat_tanggal_lahir}
            3. *Kewarganegaraan & Agama* : ${currentState.data.kewarganegaraan_agama}
            4. *Pekerjaan* : ${currentState.data.pekerjaan}
            5. *Tempat Domisili* : ${currentState.data.tempat_domisili}
            6. *Daerah Asal* : ${currentState.data.daerah_asal}
            7. *NIK* : ${currentState.data.surat_bukti_diri}
            8. *Keperluan* : ${currentState.data.keperluan}
            9. *Tujuan* : ${currentState.data.tujuan}
            
            Apakah data sudah benar?
            Ketik:
            *ya* - Untuk melanjutkan
            *tidak* - Untuk membatalkan
            *edit* - Untuk mengubah data tertentu`;
            
                await sock.sendMessage(senderNumber, { text: dataPreview });
                currentState.step = 12;
            } else if (currentState.step === 12) {
                const pilihan = messageText.toLowerCase();
            
                if (pilihan === 'ya') {
                    // Simpan ke database
                    const { nama, tempat_tanggal_lahir, kewarganegaraan_agama, pekerjaan, tempat_domisili, daerah_asal, surat_bukti_diri, keperluan, tujuan } = currentState.data;
                    const jenisSurat = 'Percobaan';
                    const tanggalPermohonan = new Date().toISOString().slice(0, 10);
                    const status = 'Diproses';
                    const tahunSekarang = new Date().getFullYear();
            
                    const sql = 'INSERT INTO surat (nama, tempat_tanggal_lahir, kewarganegaraan_agama, pekerjaan, tempat_domisili, daerah_asal, surat_bukti_diri, keperluan, tujuan, jenis_surat, tanggal_permohonan, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                    dbConn.query(sql, [nama, tempat_tanggal_lahir, kewarganegaraan_agama, pekerjaan, tempat_domisili, daerah_asal, surat_bukti_diri, keperluan, tujuan, jenisSurat, tanggalPermohonan, status], (err, results) => {
                        if (err) {
                            console.error('Error menyimpan data ke database:', err);
                            sock.sendMessage(senderNumber, { text: '⚠️ Terjadi kesalahan saat menyimpan data. Silakan coba lagi nanti.' });
                        } else {
                            const newId = results.insertId;
                            const nomorSurat = `SP/${String(newId).padStart(3, '0')}/${tahunSekarang}`;
                            const updateNomorSuratSql = 'UPDATE surat SET nomor_surat = ?, nomor_wa = ? WHERE id = ?';
                            dbConn.query(updateNomorSuratSql, [nomorSurat, senderNumber, newId], (errUpdate) => {
                                if (errUpdate) {
                                    console.error('Error memperbarui nomor surat:', errUpdate);
                                    sock.sendMessage(senderNumber, { text: '⚠️ Terjadi kesalahan saat memperbarui nomor surat.' });
                                } else {
                                    sock.sendMessage(senderNumber, { text: `✅ Data berhasil disimpan! Nomor surat Anda: *${nomorSurat}*. Anda akan diberi tahu jika surat sudah selesai.` });
                                    console.log(`Data surat pengantar berhasil disimpan untuk ${senderNumber} dengan ID: ${newId} dan Nomor Surat: ${nomorSurat}`);
                                    
                                    // Send notification to bot
                                    sendBotNotification(sock, jenisSurat, nomorSurat, nama, senderNumber);
                                }
                            });
                        }
                        delete userStates[senderNumber];
                    });
            
                } else if (pilihan === 'tidak') {
                    await sock.sendMessage(senderNumber, { text: '❌ Proses pengisian formulir dibatalkan. Ketik "halo" untuk memulai kembali.' });
                    delete userStates[senderNumber];
                    
                } else if (pilihan === 'edit') {
                    const editMenu = `✏️ *Pilih data yang ingin diedit:*
            1. Nama Lengkap
            2. Tempat, Tanggal Lahir
            3. Kewarganegaraan dan Agama
            4. Pekerjaan
            5. Tempat Domisili
            6. Daerah Asal
            7. NIK
            8. Keperluan
            9. Tujuan
            
            Ketik nomor yang ingin diedit (contoh : 1)`;
                    await sock.sendMessage(senderNumber, { text: editMenu });
                    currentState.step = 13;
            
                } else {
                    await sock.sendMessage(senderNumber, { text: '⚠️ Pilihan tidak valid. Balas dengan "ya", "tidak", atau "edit".' });
                }
            
            } else if (currentState.step === 13) {
                const nomorEdit = parseInt(messageText);
                currentState.dataFieldToEdit = nomorEdit;
            
                if (nomorEdit >= 1 && nomorEdit <= 9) {
                    let fieldLabel = '';
                    switch (nomorEdit) {
                        case 1: fieldLabel = `Nama : ${currentState.data.nama}`; break;
                        case 2: fieldLabel = `Tempat, Tanggal Lahir : ${currentState.data.tempat_tanggal_lahir}`; break;
                        case 3: fieldLabel = `Kewarganegaraan dan Agama : ${currentState.data.kewarganegaraan_agama}`; break;
                        case 4: fieldLabel = `Pekerjaan : ${currentState.data.pekerjaan}`; break;
                        case 5: fieldLabel = `Tempat Domisili : ${currentState.data.tempat_domisili}`; break;
                        case 6: fieldLabel = `Daerah Asal : ${currentState.data.daerah_asal}`; break;
                        case 7: fieldLabel = `NIK : ${currentState.data.surat_bukti_diri}`; break;
                        case 8: fieldLabel = `Keperluan : ${currentState.data.keperluan}`; break;
                        case 9: fieldLabel = `Tujuan : ${currentState.data.tujuan}`; break;
                    }
                    await sock.sendMessage(senderNumber, { text: `Data saat ini:\n${fieldLabel}\n\nMasukkan data baru:` });
                    currentState.step = 14;
                } else {
                    await sock.sendMessage(senderNumber, { text: '⚠️ Nomor tidak valid. Silakan pilih dari 1 sampai 9.' });
                }
            
            } else if (currentState.step === 14) {
                const field = currentState.dataFieldToEdit;
            
                switch (field) {
                    case 1: currentState.data.nama = messageText.toUpperCase(); break;
                    case 2: currentState.data.tempat_tanggal_lahir = messageText; break;
                    case 3: currentState.data.kewarganegaraan_agama = messageText; break;
                    case 4: currentState.data.pekerjaan = messageText; break;
                    case 5: currentState.data.tempat_domisili = messageText; break;
                    case 6: currentState.data.daerah_asal = messageText; break;
                    case 7: currentState.data.surat_bukti_diri = messageText; break;
                    case 8: currentState.data.keperluan = messageText; break;
                    case 9: currentState.data.tujuan = messageText; break;
                }
            
                await sock.sendMessage(senderNumber, { text: '✅ Data berhasil diperbarui.\n\nKetik *edit* untuk mengedit data lain, atau ketik *selesai* untuk melanjutkan konfirmasi.' });
                currentState.step = 15;
            
            } else if (currentState.step === 15) {
                const pilihanEdit = messageText.toLowerCase();
                if (pilihanEdit === 'edit') {
                    const editMenu = `✏️ *Pilih data yang ingin diedit:*
            1. Nama Lengkap
            2. Tempat, Tanggal Lahir
            3. Kewarganegaraan dan Agama
            4. Pekerjaan
            5. Tempat Domisili
            6. Daerah Asal
            7. NIK
            8. Keperluan
            9. Tujuan
            
            Ketik nomor yang ingin diedit (contoh: 1)`;
                    await sock.sendMessage(senderNumber, { text: editMenu });
                    currentState.step = 13;
            
                } else if (pilihanEdit === 'selesai') {
                    // Balik ke konfirmasi data
                    const dataPreview = `✅ *Konfirmasi Data Anda:*
                
                1. *Nama Lengkap* : ${currentState.data.nama}
                2. *Tempat, Tanggal Lahir* : ${currentState.data.tempat_tanggal_lahir}
                3. *Kewarganegaraan & Agama* : ${currentState.data.kewarganegaraan_agama}
                4. *Pekerjaan* : ${currentState.data.pekerjaan}
                5. *Tempat Domisili* : ${currentState.data.tempat_domisili}
                6. *Daerah Asal* : ${currentState.data.daerah_asal}
                7. *NIK* : ${currentState.data.surat_bukti_diri}
                8. *Keperluan* : ${currentState.data.keperluan}
                9. *Tujuan* : ${currentState.data.tujuan}
                
                Apakah data sudah benar?
                Ketik:
                *ya* - Untuk melanjutkan
                *tidak* - Untuk membatalkan
                *edit* - Untuk mengubah data tertentu`;
                
                    await sock.sendMessage(senderNumber, { text: dataPreview });
                    currentState.step = 12;
                } else {
                    await sock.sendMessage(senderNumber, { text: '⚠️ Pilihan tidak valid. Balas dengan "edit" untuk ubah data lain atau "selesai" untuk konfirmasi.' });
                }
            
            } else if (currentState.step === 100) { // Langkah SKU
                if (/\d/.test(messageText)) {
                    await sock.sendMessage(senderNumber, { text: "Nama tidak boleh mengandung angka. Silakan masukkan nama yang valid." });
                } else {
                    currentState.data.nama = messageText.toUpperCase();
                    await sock.sendMessage(senderNumber, { text: "2. Tempat, Tanggal Lahir (Format: Jakarta, 11 Desember 2003):" });
                    currentState.step = 101;
                }
            } else if (currentState.step === 101) {
                const ttlRegex = /^[A-Za-z\s]+, \d{1,2} [A-Za-z]+ \d{4}$/;
                if (ttlRegex.test(messageText)) {
                    currentState.data.tempat_tanggal_lahir = messageText;
                    await sock.sendMessage(senderNumber, { text: "3. No. KTP (16 digit):" });
                    currentState.step = 102;
                } else {
                    await sock.sendMessage(senderNumber, { text: "Format tempat dan tanggal lahir salah. Contoh: Jakarta, 11 Desember 2003" });
                }
            } else if (currentState.step === 102) {
                const nikRegex = /^\d{16}$/;
                if (nikRegex.test(messageText)) {
                    currentState.data.no_ktp = messageText;
                    await sock.sendMessage(senderNumber, { text: "4. Alamat KTP:" });
                    currentState.step = 103;
                } else {
                    await sock.sendMessage(senderNumber, { text: "No. KTP harus 16 digit angka." });
                }
            } else if (currentState.step === 103) {
                currentState.data.alamat_ktp = messageText;
                await sock.sendMessage(senderNumber, { text: "5. Jenis Usaha:" });
                currentState.step = 104;
            } else if (currentState.step === 104) {
                currentState.data.jenis_usaha = messageText;
                await sock.sendMessage(senderNumber, { text: "6. Alamat Usaha:" });
                currentState.step = 105;
            } else if (currentState.step === 105) {
                currentState.data.alamat_usaha = messageText;
                await sock.sendMessage(senderNumber, { text: "7. Lama Usaha:" });
                currentState.step = 106;
            } else if (currentState.step === 106) {
                currentState.data.lama_usaha = messageText;
                await sock.sendMessage(senderNumber, { text: "8. Nama Bank:" });
                currentState.step = 107;
            }  else if (currentState.step === 107) { // Nama Bank
                if (/\d/.test(messageText)) {
                    await sock.sendMessage(senderNumber, { 
                        text: "⚠️ *Format Nama Bank Tidak Valid*\nNama bank tidak boleh mengandung angka. Contoh:\n- BRI\n- BCA\n- Bank Mandiri\n- BNI" 
                    });
                } else if (messageText.length < 2) {
                    await sock.sendMessage(senderNumber, { 
                        text: "⚠️ *Nama Bank Terlalu Pendek*\nMasukkan nama bank yang valid (minimal 2 karakter)." 
                    });
                } else {
                    currentState.data.nama_bank = messageText;
                    await sock.sendMessage(senderNumber, { 
                        text: "📍 *Alamat Bank*\nMasukkan alamat lengkap bank tempat Anda memiliki rekening.\nContoh:\nJl. Sudirman No. 45, Jakarta Pusat" 
                    });
                    currentState.step = 108;
                }
            } else if (currentState.step === 108) {
                currentState.data.alamat_bank = messageText;
            
                const dataPreview = `✅ *Konfirmasi Data Anda:*
            
            1. *Nama Lengkap* : ${currentState.data.nama}
            2. *Tempat, Tanggal Lahir* : ${currentState.data.tempat_tanggal_lahir}
            3. *No. KTP* : ${currentState.data.no_ktp}
            4. *Alamat KTP* : ${currentState.data.alamat_ktp}
            5. *Jenis Usaha* : ${currentState.data.jenis_usaha}
            6. *Alamat Usaha* : ${currentState.data.alamat_usaha}
            7. *Lama Usaha* : ${currentState.data.lama_usaha}
            8. *Nama Bank* : ${currentState.data.nama_bank}
            9. *Alamat Bank* : ${currentState.data.alamat_bank}
            
            Apakah data sudah benar?
            Ketik:
            *ya* - Untuk melanjutkan
            *tidak* - Untuk membatalkan
            *edit* - Untuk mengubah data tertentu`;
            
                await sock.sendMessage(senderNumber, { text: dataPreview });
                currentState.step = 109;
            } else if (currentState.step === 109) {
                const pilihan = messageText.toLowerCase();
            
                if (pilihan === 'ya') {
                    // Simpan ke database
                    const { nama, tempat_tanggal_lahir, no_ktp, alamat_ktp, jenis_usaha, alamat_usaha, lama_usaha, nama_bank, alamat_bank } = currentState.data;
                    const jenis_surat = 'Surat Keterangan Usaha';
                    const tanggal_permohonan = new Date().toISOString().slice(0, 10);
                    const status = 'Diproses';
                    const tahunSekarang = new Date().getFullYear();
            
                    const sql = 'INSERT INTO surat_ku (nama, tempat_tanggal_lahir, no_ktp, alamat_ktp, jenis_usaha, alamat_usaha, lama_usaha, nama_bank, alamat_bank, jenis_surat, tanggal_permohonan, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                    dbConn.query(sql, [nama, tempat_tanggal_lahir, no_ktp, alamat_ktp, jenis_usaha, alamat_usaha, lama_usaha, nama_bank, alamat_bank, jenis_surat, tanggal_permohonan, status], (err, results) => {
                        if (err) {
                            console.error('Error menyimpan data ke database:', err);
                            sock.sendMessage(senderNumber, { text: '⚠️ Terjadi kesalahan saat menyimpan data. Silakan coba lagi nanti.' });
                        } else {
                            const newId = results.insertId;
                            const nomorSurat = `SKU/${String(newId).padStart(3, '0')}/${tahunSekarang}`;
                            const updateNomorSuratSql = 'UPDATE surat_ku SET nomor_surat = ?, nomor_wa = ? WHERE id = ?';
                                dbConn.query(updateNomorSuratSql, [nomorSurat, senderNumber, newId], (errUpdate) => {
                                    if (errUpdate) {
                                        console.error('Error memperbarui nomor surat:', errUpdate);
                                        sock.sendMessage(senderNumber, { text: '⚠️ Terjadi kesalahan saat memperbarui nomor surat.' });
                                    } else {
                                        sock.sendMessage(senderNumber, { text: `✅ Data berhasil disimpan! Nomor surat Anda: *${nomorSurat}*. Anda akan diberi tahu jika surat sudah selesai.` });
                                        console.log(`Data surat SKU berhasil disimpan untuk ${senderNumber} dengan ID: ${newId} dan Nomor Surat: ${nomorSurat}`);
                                        
                                        // Send notification to bot
                                        sendBotNotification(sock, jenis_surat, nomorSurat, nama, senderNumber);
                                    }
                                });
                        }
                        delete userStates[senderNumber];
                    });
            
                } else if (pilihan === 'tidak') {
                    await sock.sendMessage(senderNumber, { text: '❌ Proses pengisian formulir dibatalkan. Ketik "halo" untuk memulai kembali.' });
                    delete userStates[senderNumber];
                    
                } else if (pilihan === 'edit') {
                    const editMenu = `✏️ *Pilih data yang ingin diedit:*
            1. Nama Lengkap
            2. Tempat, Tanggal Lahir
            3. No. KTP
            4. Alamat KTP
            5. Jenis Usaha
            6. Alamat Usaha
            7. Lama Usaha
            8. Nama Bank
            9. Alamat Bank
            
            Ketik nomor yang ingin diedit (contoh: 1)`;
                    await sock.sendMessage(senderNumber, { text: editMenu });
                    currentState.step = 110;
            
                } else {
                    await sock.sendMessage(senderNumber, { text: '⚠️ Pilihan tidak valid. Balas dengan "ya", "tidak", atau "edit".' });
                }
            
            } else if (currentState.step === 110) {
                const nomorEdit = parseInt(messageText);
                currentState.dataFieldToEdit = nomorEdit;
            
                if (nomorEdit >= 1 && nomorEdit <= 9) {
                    let fieldLabel = '';
                    switch (nomorEdit) {
                        case 1: fieldLabel = `Nama : ${currentState.data.nama}`; break;
                        case 2: fieldLabel = `Tempat, Tanggal Lahir : ${currentState.data.tempat_tanggal_lahir}`; break;
                        case 3: fieldLabel = `No. KTP : ${currentState.data.no_ktp}`; break;
                        case 4: fieldLabel = `Alamat KTP : ${currentState.data.alamat_ktp}`; break;
                        case 5: fieldLabel = `Jenis Usaha : ${currentState.data.jenis_usaha}`; break;
                        case 6: fieldLabel = `Alamat Usaha : ${currentState.data.alamat_usaha}`; break;
                        case 7: fieldLabel = `Lama Usaha : ${currentState.data.lama_usaha}`; break;
                        case 8: fieldLabel = `Nama Bank : ${currentState.data.nama_bank}`; break;
                        case 9: fieldLabel = `Alamat Bank : ${currentState.data.alamat_bank}`; break;
                    }
                    await sock.sendMessage(senderNumber, { text: `Data saat ini:\n${fieldLabel}\n\nMasukkan data baru:` });
                    currentState.step = 111;
                } else {
                    await sock.sendMessage(senderNumber, { text: '⚠️ Nomor tidak valid. Silakan pilih dari 1 sampai 9.' });
                }
            
            } else if (currentState.step === 111) {
                const field = currentState.dataFieldToEdit;
            
                switch (field) {
                    case 1: 
                        if (/\d/.test(messageText)) {
                            await sock.sendMessage(senderNumber, { text: "Nama tidak boleh mengandung angka. Silakan masukkan nama yang valid." });
                            return;
                        }
                        currentState.data.nama = messageText.toUpperCase(); 
                        break;
                    case 2: 
                        const ttlRegex = /^[A-Za-z\s]+, \d{1,2} [A-Za-z]+ \d{4}$/;
                        if (!ttlRegex.test(messageText)) {
                            await sock.sendMessage(senderNumber, { text: "Format tempat dan tanggal lahir salah. Contoh: Jakarta, 11 Desember 2003" });
                            return;
                        }
                        currentState.data.tempat_tanggal_lahir = messageText; 
                        break;
                    case 3: 
                        const nikRegex = /^\d{16}$/;
                        if (!nikRegex.test(messageText)) {
                            await sock.sendMessage(senderNumber, { text: "No. KTP harus 16 digit angka." });
                            return;
                        }
                        currentState.data.no_ktp = messageText; 
                        break;
                    case 4: currentState.data.alamat_ktp = messageText; break;
                    case 5: currentState.data.jenis_usaha = messageText; break;
                    case 6: currentState.data.alamat_usaha = messageText; break;
                    case 7: currentState.data.lama_usaha = messageText; break;
                    case 8: currentState.data.nama_bank = messageText; break;
                    case 9: currentState.data.alamat_bank = messageText; break;
                }
            
                await sock.sendMessage(senderNumber, { text: '✅ Data berhasil diperbarui.\n\nKetik *edit* untuk mengedit data lain, atau ketik *selesai* untuk melanjutkan konfirmasi.' });
                currentState.step = 112;
            
            } else if (currentState.step === 112) {
                const pilihanEdit = messageText.toLowerCase();
                if (pilihanEdit === 'edit') {
                    const editMenu = `✏️ *Pilih data yang ingin diedit:*
            1. Nama Lengkap
            2. Tempat, Tanggal Lahir
            3. No. KTP
            4. Alamat KTP
            5. Jenis Usaha
            6. Alamat Usaha
            7. Lama Usaha
            8. Nama Bank
            9. Alamat Bank
            
            Ketik nomor yang ingin diedit (contoh: 1)`;
                    await sock.sendMessage(senderNumber, { text: editMenu });
                    currentState.step = 110;
            
                } else if (pilihanEdit === 'selesai') {
                    // Balik ke konfirmasi data
                    const dataPreview = `✅ *Konfirmasi Data Anda:*
                
                1. *Nama Lengkap* : ${currentState.data.nama}
                2. *Tempat, Tanggal Lahir* : ${currentState.data.tempat_tanggal_lahir}
                3. *No. KTP* : ${currentState.data.no_ktp}
                4. *Alamat KTP* : ${currentState.data.alamat_ktp}
                5. *Jenis Usaha* : ${currentState.data.jenis_usaha}
                6. *Alamat Usaha* : ${currentState.data.alamat_usaha}
                7. *Lama Usaha* : ${currentState.data.lama_usaha}
                8. *Nama Bank* : ${currentState.data.nama_bank}
                9. *Alamat Bank* : ${currentState.data.alamat_bank}
                
                Apakah data sudah benar?
                Ketik:
                *ya* - Untuk melanjutkan
                *tidak* - Untuk membatalkan
                *edit* - Untuk mengubah data tertentu`;
                
                    await sock.sendMessage(senderNumber, { text: dataPreview });
                    currentState.step = 109;
                } else {
                    await sock.sendMessage(senderNumber, { text: '⚠️ Pilihan tidak valid. Balas dengan "edit" untuk ubah data lain atau "selesai" untuk konfirmasi.' });
                }
            }
            else if (currentState.step === 200) { // Langkah SKTM
                if (/\d/.test(messageText)) {
                    await sock.sendMessage(senderNumber, { 
                        text: "⚠️ Nama tidak boleh mengandung angka.\nSilakan masukkan nama lengkap yang valid (hanya huruf).\nContoh: ANDI SETIAWAN" 
                    });
                } else if (messageText.length < 3) {
                    await sock.sendMessage(senderNumber, { 
                        text: "⚠️ Nama terlalu pendek.\nSilakan masukkan nama lengkap minimal 3 karakter." 
                    });
                } else {
                    currentState.data.nama = messageText.toUpperCase();
                    await sock.sendMessage(senderNumber, { 
                        text: "2. No. KK (16 digit angka):\nContoh: 3273010101010001" 
                    });
                    currentState.step = 201;
                }
            } else if (currentState.step === 201) {
                const kkRegex = /^\d{16}$/;
                if (!kkRegex.test(messageText)) {
                    await sock.sendMessage(senderNumber, { 
                        text: "⚠️ Format No. KK tidak valid.\nHarus terdiri dari 16 digit angka.\nContoh: 3273010101010001" 
                    });
                } else {
                    currentState.data.no_kk = messageText;
                    await sock.sendMessage(senderNumber, { 
                        text: "3. NIK (16 digit angka):\nContoh: 3273010101010001" 
                    });
                    currentState.step = 202;
                }
            } else if (currentState.step === 202) {
                const nikRegex = /^\d{16}$/;
                if (!nikRegex.test(messageText)) {
                    await sock.sendMessage(senderNumber, { 
                        text: "⚠️ Format NIK tidak valid.\nHarus terdiri dari 16 digit angka.\nContoh: 3273010101010001" 
                    });
                } else {
                    currentState.data.nik = messageText;
                    await sock.sendMessage(senderNumber, { 
                        text: "4. Tempat, Tanggal Lahir (Format: Kota/Kabupaten, Tanggal Bulan Tahun):\nContoh: Garut, 15 September 2001\n\nPastikan:\n- Nama tempat diawali huruf kapital\n- Tanggal tanpa angka 0 di depan (1 bukan 01)\n- Nama bulan lengkap" 
                    });
                    currentState.step = 203;
                }
            } else if (currentState.step === 203) {
                const ttlRegex = /^[A-Z][a-zA-Z\s]+, \d{1,2} [A-Z][a-z]+ \d{4}$/;
                if (!ttlRegex.test(messageText)) {
                    await sock.sendMessage(senderNumber, { 
                        text: "⚠️ Format tempat dan tanggal lahir salah.\nPastikan format:\n- Nama tempat diawali huruf kapital\n- Tanggal tanpa angka 0 di depan (1 bukan 01)\n- Nama bulan lengkap diawali huruf kapital\n\nContoh yang benar:\nGarut, 15 September 2001\n\nContoh yang salah:\nGarut, 15 sept 2001\ngarut, 15 September 2001\nGarut, 05 September 2001" 
                    });
                } else {
                    currentState.data.tempat_tanggal_lahir = messageText;
                    await sock.sendMessage(senderNumber, { 
                        text: "5. Jenis Kelamin:\nKetik *L* untuk Laki-laki\nKetik *P* untuk Perempuan" 
                    });
                    currentState.step = 204;
                }
            } else if (currentState.step === 204) {
                const jkInput = messageText.toUpperCase();
                if (jkInput !== 'L' && jkInput !== 'P') {
                    await sock.sendMessage(senderNumber, { 
                        text: "⚠️ Jenis kelamin tidak valid.\nSilakan ketik:\n*L* untuk Laki-laki\n*P* untuk Perempuan\n\nContoh: L" 
                    });
                } else {
                    currentState.data.jenis_kelamin = jkInput;
                    await sock.sendMessage(senderNumber, { 
                        text: "6. Alamat lengkap (RT/RW, Desa/Kelurahan, Kecamatan):\nContoh: RT 01 RW 05, Desa Sukamulya, Kecamatan Tarogong" 
                    });
                    currentState.step = 205;
                }
            } else if (currentState.step === 205) {
                if (messageText.length < 10) {
                    await sock.sendMessage(senderNumber, { 
                        text: "⚠️ Alamat terlalu pendek.\nSilakan masukkan alamat lengkap minimal 10 karakter termasuk RT/RW, Desa/Kelurahan, dan Kecamatan.\nContoh: RT 01 RW 05, Desa Sukamulya, Kecamatan Tarogong" 
                    });
                } else {
                    currentState.data.alamat = messageText;
                    await sock.sendMessage(senderNumber, { 
                        text: "7. Nomor HP (awali dengan 08 atau 62, 10-13 digit):\nContoh: 081234567890 atau 6281234567890" 
                    });
                    currentState.step = 206;
                }
            } else if (currentState.step === 206) {
                const hpRegex = /^(08\d{8,11}|62\d{9,12})$/;
                if (!hpRegex.test(messageText)) {
                    await sock.sendMessage(senderNumber, { 
                        text: "⚠️ Format nomor HP tidak valid.\nPastikan:\n- Awali dengan 08 (10-13 digit) atau 62 (11-14 digit)\n- Hanya mengandung angka\n\nContoh yang benar:\n081234567890\n6281234567890\n\nContoh yang salah:\n81234567890 (tanpa 0/62)\n0812345678 (terlalu pendek)\n0812-3456-7890 (ada tanda -)" 
                    });
                } else {
                    currentState.data.nomor_hp = messageText.startsWith('62') ? '62' + messageText.substring(2) : '62' + messageText.substring(1);
                    
                    const dataPreview = `✅ *Konfirmasi Data Anda:*
                        
            1. *Nama Lengkap* : ${currentState.data.nama}
            2. *No. KK* : ${currentState.data.no_kk}
            3. *NIK* : ${currentState.data.nik}
            4. *Tempat, Tanggal Lahir* : ${currentState.data.tempat_tanggal_lahir}
            5. *Jenis Kelamin* : ${currentState.data.jenis_kelamin}
            6. *Alamat* : ${currentState.data.alamat}
            7. *Nomor HP* : ${currentState.data.nomor_hp}
            
            Apakah data sudah benar?
            Ketik:
            *ya* - Untuk melanjutkan
            *tidak* - Untuk membatalkan
            *edit* - Untuk mengubah data tertentu`;
                    
                    await sock.sendMessage(senderNumber, { text: dataPreview });
                    currentState.step = 207;
                }
            } else if (currentState.step === 207) {
                const pilihan = messageText.toLowerCase();
            
                if (pilihan === 'ya') {
                    const { nama, no_kk, nik, tempat_tanggal_lahir, jenis_kelamin, alamat, nomor_hp } = currentState.data;
                    const jenis_surat = 'Surat Keterangan Tidak Mampu';
                    const tanggal_permohonan = new Date().toISOString().slice(0, 10);
                    const status = 'Diproses';
                    const tahunSekarang = new Date().getFullYear();
            
                    const sql = 'INSERT INTO surat_sktm (nama, no_kk, nik, tempat_tanggal_lahir, jenis_kelamin, alamat, nomor_hp, jenis_surat, tanggal_permohonan, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                    dbConn.query(sql, [nama, no_kk, nik, tempat_tanggal_lahir, jenis_kelamin, alamat, nomor_hp, jenis_surat, tanggal_permohonan, status], (err, results) => {
                        if (err) {
                            console.error('Error menyimpan data ke database:', err);
                            sock.sendMessage(senderNumber, { text: '⚠️ Terjadi kesalahan saat menyimpan data. Silakan coba lagi nanti.' });
                        } else {
                            const nomorSurat = `SKTM/${String(results.insertId).padStart(3, '0')}/${tahunSekarang}`;
                            const updateNomorSuratSql = 'UPDATE surat_sktm SET nomor_surat = ?, nomor_wa = ? WHERE id = ?';
                            dbConn.query(updateNomorSuratSql, [nomorSurat, senderNumber, results.insertId], (errUpdate) => {
                                if (errUpdate) {
                                    console.error('Error memperbarui nomor surat:', errUpdate);
                                    sock.sendMessage(senderNumber, { text: '⚠️ Terjadi kesalahan saat memperbarui nomor surat.' });
                                } else {
                                    sock.sendMessage(senderNumber, { text: `✅ Data berhasil disimpan! Nomor surat Anda: *${nomorSurat}*. Anda akan diberi tahu jika surat sudah selesai.` });
                                    console.log(`Data surat SKTM berhasil disimpan untuk ${senderNumber} dengan ID: ${results.insertId}`);
                                    
                                    // Send notification to bot
                                    sendBotNotification(sock, jenis_surat, nomorSurat, nama, senderNumber);
                                }
                            });
                        }
                        delete userStates[senderNumber];
                    });
            
                } else if (pilihan === 'tidak') {
                    await sock.sendMessage(senderNumber, { text: '❌ Proses pengisian formulir dibatalkan. Ketik "halo" untuk memulai kembali.' });
                    delete userStates[senderNumber];
                    
                } else if (pilihan === 'edit') {
                    const editMenu = `✏️ *Pilih data yang ingin diedit:*
            1. Nama Lengkap
            2. No. KK
            3. NIK
            4. Tempat, Tanggal Lahir
            5. Jenis Kelamin
            6. Alamat
            7. Nomor HP
            
            Ketik nomor yang ingin diedit (contoh: 1)`;
                    await sock.sendMessage(senderNumber, { text: editMenu });
                    currentState.step = 208;
            
                } else {
                    await sock.sendMessage(senderNumber, { text: '⚠️ Pilihan tidak valid. Balas dengan "ya", "tidak", atau "edit".' });
                }
            
            } else if (currentState.step === 208) {
                const nomorEdit = parseInt(messageText);
                currentState.dataFieldToEdit = nomorEdit;
            
                if (nomorEdit >= 1 && nomorEdit <= 7) {
                    let fieldLabel = '';
                    switch (nomorEdit) {
                        case 1: fieldLabel = `Nama : ${currentState.data.nama}`; break;
                        case 2: fieldLabel = `No. KK : ${currentState.data.no_kk}`; break;
                        case 3: fieldLabel = `NIK : ${currentState.data.nik}`; break;
                        case 4: fieldLabel = `Tempat, Tanggal Lahir : ${currentState.data.tempat_tanggal_lahir}`; break;
                        case 5: fieldLabel = `Jenis Kelamin : ${currentState.data.jenis_kelamin}`; break;
                        case 6: fieldLabel = `Alamat : ${currentState.data.alamat}`; break;
                        case 7: fieldLabel = `Nomor HP : ${currentState.data.nomor_hp}`; break;
                    }
                    await sock.sendMessage(senderNumber, { text: `Data saat ini:\n${fieldLabel}\n\nMasukkan data baru:` });
                    currentState.step = 209;
                } else {
                    await sock.sendMessage(senderNumber, { text: '⚠️ Nomor tidak valid. Silakan pilih dari 1 sampai 7.' });
                }
            
            } else if (currentState.step === 209) {
                const field = currentState.dataFieldToEdit;
            
                switch (field) {
                    case 1: 
                        if (/\d/.test(messageText)) {
                            await sock.sendMessage(senderNumber, { text: "Nama tidak boleh mengandung angka. Silakan masukkan nama yang valid." });
                            return;
                        }
                        currentState.data.nama = messageText.toUpperCase(); 
                        break;
                    case 2: currentState.data.no_kk = messageText; break;
                    case 3: 
                        const nikRegex = /^\d{16}$/;
                        if (!nikRegex.test(messageText)) {
                            await sock.sendMessage(senderNumber, { text: "NIK harus 16 digit angka." });
                            return;
                        }
                        currentState.data.nik = messageText; 
                        break;
                    case 4: 
                        const ttlRegex = /^[A-Za-z\s]+, \d{1,2} [A-Za-z]+ \d{4}$/;
                        if (!ttlRegex.test(messageText)) {
                            await sock.sendMessage(senderNumber, { text: "Format tempat dan tanggal lahir salah. Contoh: Garut, 15 September 2001" });
                            return;
                        }
                        currentState.data.tempat_tanggal_lahir = messageText; 
                        break;
                    case 5: 
                        if (!['L', 'P'].includes(messageText.toUpperCase())) {
                            await sock.sendMessage(senderNumber, { text: "Jenis kelamin harus L atau P." });
                            return;
                        }
                        currentState.data.jenis_kelamin = messageText.toUpperCase(); 
                        break;
                    case 6: currentState.data.alamat = messageText; break;
                    case 7: currentState.data.nomor_hp = messageText; break;
                }
            
                await sock.sendMessage(senderNumber, { text: '✅ Data berhasil diperbarui.\n\nKetik *edit* untuk mengedit data lain, atau ketik *selesai* untuk melanjutkan konfirmasi.' });
                currentState.step = 210;
            
            } else if (currentState.step === 210) {
                const pilihanEdit = messageText.toLowerCase();
                if (pilihanEdit === 'edit') {
                    const editMenu = `✏️ *Pilih data yang ingin diedit:*
            1. Nama Lengkap
            2. No. KK
            3. NIK
            4. Tempat, Tanggal Lahir
            5. Jenis Kelamin
            6. Alamat
            7. Nomor HP
            
            Ketik nomor yang ingin diedit (contoh: 1)`;
                    await sock.sendMessage(senderNumber, { text: editMenu });
                    currentState.step = 208;
            
                }else if (pilihanEdit === 'selesai') {
                    // Balik ke konfirmasi data
                    const dataPreview = `✅ *Konfirmasi Data Anda:*
                
                1. *Nama Lengkap* : ${currentState.data.nama}
                2. *No. KK* : ${currentState.data.no_kk}
                3. *NIK* : ${currentState.data.nik}
                4. *Tempat, Tanggal Lahir* : ${currentState.data.tempat_tanggal_lahir}
                5. *Jenis Kelamin* : ${currentState.data.jenis_kelamin}
                6. *Alamat* : ${currentState.data.alamat}
                7. *Nomor HP* : ${currentState.data.nomor_hp}
                
                Apakah data sudah benar?
                Ketik:
                *ya* - Untuk melanjutkan
                *tidak* - Untuk membatalkan
                *edit* - Untuk mengubah data tertentu`;
                
                    await sock.sendMessage(senderNumber, { text: dataPreview });
                    currentState.step = 207;
                } else {
                    await sock.sendMessage(senderNumber, { text: '⚠️ Pilihan tidak valid. Balas dengan "edit" untuk ubah data lain atau "selesai" untuk konfirmasi.' });
                }
            }
            
            // ===================== SURAT KBI (300-315) =====================
            else if (currentState.step === 306) {
                const nikRegex = /^\d{16}$/;
                if (!nikRegex.test(messageText)) {
                    await sock.sendMessage(senderNumber, { 
                        text: "⚠️ Format NIK tidak valid.\nHarus terdiri dari 16 digit angka.\nContoh: 3273010101010001\n\nSilakan masukkan kembali NIK Anda:" 
                    });
                } else {
                    currentState.data.nik = messageText;
                    
                    const dataPreview = `✅ *Konfirmasi Data Anda:*
                        
            1. *Nama Lengkap* : ${currentState.data.nama}
            2. *Tertera* : ${currentState.data.tertera}
            3. *No. Rekening* : ${currentState.data.norek}
            4. *Nama Lagi* : ${currentState.data.nama_lagi}
            5. *Tertera Lagi* : ${currentState.data.tertera_lagi}
            6. *No. KK* : ${currentState.data.no_kk}
            7. *NIK* : ${currentState.data.nik}
            8. *Keperluan Surat* : ${currentState.data.keperluan_surat}
            
            Apakah data sudah benar?
            Ketik:
            *ya* - Untuk melanjutkan
            *tidak* - Untuk membatalkan
            *edit* - Untuk mengubah data tertentu`;
                    
                    await sock.sendMessage(senderNumber, { text: dataPreview });
                    currentState.step = 307;
                } 
            } else if (currentState.step === 307) {
                const pilihan = messageText.toLowerCase();
            
                if (pilihan === 'ya') {
                    const { nama, tertera, norek, nama_lagi, tertera_lagi, no_kk, nik, keperluan_surat } = currentState.data;
                    const jenis_surat = 'Surat Keterangan Beda Identitas';
                    const tanggal_permohonan = new Date().toISOString().slice(0, 10);
                    const status = 'Diproses';
                    const tahunSekarang = new Date().getFullYear();
            
                    const sql = 'INSERT INTO surat_kbi (nama, tertera, norek, nama_lagi, tertera_lagi, no_kk, nik, keperluan_surat, jenis_surat, tanggal_permohonan, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                    dbConn.query(sql, [nama, tertera, norek, nama_lagi, tertera_lagi, no_kk, nik, keperluan_surat, jenis_surat, tanggal_permohonan, status], (err, results) => {
                        if (err) {
                            console.error('Error menyimpan data ke database:', err);
                            sock.sendMessage(senderNumber, { text: '⚠️ Terjadi kesalahan saat menyimpan data. Silakan coba lagi nanti.' });
                        } else {
                            const nomorSurat = `SKBI/${String(results.insertId).padStart(3, '0')}/${tahunSekarang}`;
                            const updateNomorSuratSql = 'UPDATE surat_kbi SET nomor_surat = ?, nomor_wa = ? WHERE id = ?';
                                dbConn.query(updateNomorSuratSql, [nomorSurat, senderNumber, results.insertId], (errUpdate) => {
                                    if (errUpdate) {
                                        console.error('Error memperbarui nomor surat:', errUpdate);
                                        sock.sendMessage(senderNumber, { text: '⚠️ Terjadi kesalahan saat memperbarui nomor surat.' });
                                    } else {
                                        sock.sendMessage(senderNumber, { text: `✅ Data berhasil disimpan! Nomor surat Anda: *${nomorSurat}*. Anda akan diberi tahu jika surat sudah selesai.` });
                                        console.log(`Data surat SKBI berhasil disimpan untuk ${senderNumber} dengan ID: ${results.insertId}`);
                                        
                                        // Send notification to bot
                                        sendBotNotification(sock, jenis_surat, nomorSurat, nama, senderNumber);
                                    }
                                });
                        }
                        delete userStates[senderNumber];
                    });
            
                } else if (pilihan === 'tidak') {
                    await sock.sendMessage(senderNumber, { text: '❌ Proses pengisian formulir dibatalkan. Ketik "halo" untuk memulai kembali.' });
                    delete userStates[senderNumber];
                    
                } else if (pilihan === 'edit') {
                    const editMenu = `✏️ *Pilih data yang ingin diedit:*
            1. Nama Lengkap
            2. Tertera
            3. No. Rekening
            4. Nama Lagi
            5. Tertera Lagi
            6. No. KK
            7. NIK
            8. Keperluan Surat
            
            Ketik nomor yang ingin diedit (contoh: 1)`;
                    await sock.sendMessage(senderNumber, { text: editMenu });
                    currentState.step = 308;
            
                } else {
                    await sock.sendMessage(senderNumber, { text: '⚠️ Pilihan tidak valid. Balas dengan "ya", "tidak", atau "edit".' });
                }
            
            } else if (currentState.step === 308) {
                const nomorEdit = parseInt(messageText);
                currentState.dataFieldToEdit = nomorEdit;
            
                if (nomorEdit >= 1 && nomorEdit <= 8) {
                    let fieldLabel = '';
                    switch (nomorEdit) {
                        case 1: fieldLabel = `Nama : ${currentState.data.nama}`; break;
                        case 2: fieldLabel = `Tertera : ${currentState.data.tertera}`; break;
                        case 3: fieldLabel = `No. Rekening : ${currentState.data.norek}`; break;
                        case 4: fieldLabel = `Nama Lagi : ${currentState.data.nama_lagi}`; break;
                        case 5: fieldLabel = `Tertera Lagi : ${currentState.data.tertera_lagi}`; break;
                        case 6: fieldLabel = `No. KK : ${currentState.data.no_kk}`; break;
                        case 7: fieldLabel = `NIK : ${currentState.data.nik}`; break;
                        case 8: fieldLabel = `Keperluan Surat : ${currentState.data.keperluan_surat}`; break;
                    }
                    await sock.sendMessage(senderNumber, { text: `Data saat ini:\n${fieldLabel}\n\nMasukkan data baru:` });
                    currentState.step = 309;
                } else {
                    await sock.sendMessage(senderNumber, { text: '⚠️ Nomor tidak valid. Silakan pilih dari 1 sampai 8.' });
                }
            
            } else if (currentState.step === 309) {
                const field = currentState.dataFieldToEdit;
            
                switch (field) {
                    case 1: 
                        if (/\d/.test(messageText)) {
                            await sock.sendMessage(senderNumber, { text: "Nama tidak boleh mengandung angka. Silakan masukkan nama yang valid." });
                            return;
                        }
                        currentState.data.nama = messageText.toUpperCase(); 
                        break;
                    case 2: currentState.data.tertera = messageText; break;
                    case 3: currentState.data.norek = messageText; break;
                    case 4: 
                        if (/\d/.test(messageText)) {
                            await sock.sendMessage(senderNumber, { text: "Nama tidak boleh mengandung angka. Silakan masukkan nama yang valid." });
                            return;
                        }
                        currentState.data.nama_lagi = messageText.toUpperCase(); 
                        break;
                    case 5: currentState.data.tertera_lagi = messageText; break;
                    case 6: currentState.data.no_kk = messageText; break;
                    case 7: 
                        const nikRegex = /^\d{16}$/;
                        if (!nikRegex.test(messageText)) {
                            await sock.sendMessage(senderNumber, { text: "NIK harus 16 digit angka." });
                            return;
                        }
                        currentState.data.nik = messageText; 
                        break;
                    case 8: currentState.data.keperluan_surat = messageText; break;
                }
            
                await sock.sendMessage(senderNumber, { text: '✅ Data berhasil diperbarui.\n\nKetik *edit* untuk mengedit data lain, atau ketik *selesai* untuk melanjutkan konfirmasi.' });
                currentState.step = 310;
            
            } else if (currentState.step === 310) {
                const pilihanEdit = messageText.toLowerCase();
                if (pilihanEdit === 'edit') {
                    const editMenu = `✏️ *Pilih data yang ingin diedit:*
            1. Nama Lengkap
            2. Tertera
            3. No. Rekening
            4. Nama Lagi
            5. Tertera Lagi
            6. No. KK
            7. NIK
            8. Keperluan Surat
            
            Ketik nomor yang ingin diedit (contoh: 1)`;
                    await sock.sendMessage(senderNumber, { text: editMenu });
                    currentState.step = 308;
            
                } else if (pilihanEdit === 'selesai') {
                    // Balik ke konfirmasi data
                    const dataPreview = `✅ *Konfirmasi Data Anda:*
            
            1. *Nama Lengkap*    : ${currentState.data.nama}
            2. *Tertera*         : ${currentState.data.tertera}
            3. *No. Rekening*   : ${currentState.data.norek}
            4. *Nama Lagi*      : ${currentState.data.nama_lagi}
            5. *Tertera Lagi*   : ${currentState.data.tertera_lagi}
            6. *No. KK*        : ${currentState.data.no_kk}
            7. *NIK*           : ${currentState.data.nik}
            8. *Keperluan Surat* : ${currentState.data.keperluan_surat}
            
            Apakah data sudah benar?
            Ketik:
            *ya* - Untuk melanjutkan
            *tidak* - Untuk membatalkan
            *edit* - Untuk mengubah data tertentu`;
                    await sock.sendMessage(senderNumber, { text: dataPreview });
                    currentState.step = 307;
            
                } else {
                    await sock.sendMessage(senderNumber, { text: '⚠️ Pilihan tidak valid. Balas dengan "edit" untuk ubah data lain atau "selesai" untuk konfirmasi.' });
                }
            }

            else if (currentState.step === 400) { // Langkah Cek Status
                const nomorSurat = messageText.trim().toUpperCase();
                
                // Validate the input first
                if (!nomorSurat || nomorSurat.length < 5) {
                    await sock.sendMessage(senderNumber, { 
                        text: `⚠️ *Format Nomor Surat Tidak Valid*\n\nNomor surat harus mengandung:\n- Kode surat (SKTM/SKBI/dll)\n- Nomor registrasi\n- Tahun\n\nContoh: *SKTM/012/2023*\n\nSilakan masukkan kembali nomor surat Anda:`
                    });
                    return; // Stay on step 400 for re-entry
                }
            
                const query = `
                    SELECT nama, status, jenis_surat, tanggal_permohonan, 
                           CASE 
                               WHEN table_name = 'surat' THEN nomor_surat
                               WHEN table_name = 'surat_ku' THEN nomor_surat
                               WHEN table_name = 'surat_sktm' THEN nomor_surat
                               WHEN table_name = 'surat_kbi' THEN nomor_surat
                           END AS nomor_surat
                    FROM (
                        SELECT 'surat' as table_name, nama, status, jenis_surat, tanggal_permohonan, nomor_surat
                        FROM surat
                        WHERE nomor_surat LIKE ?
                        UNION
                        SELECT 'surat_ku' as table_name, nama, status, jenis_surat, tanggal_permohonan, nomor_surat
                        FROM surat_ku
                        WHERE nomor_surat LIKE ?
                        UNION
                        SELECT 'surat_sktm' as table_name, nama, status, jenis_surat, tanggal_permohonan, nomor_surat
                        FROM surat_sktm
                        WHERE nomor_surat LIKE ?
                        UNION
                        SELECT 'surat_kbi' as table_name, nama, status, jenis_surat, tanggal_permohonan, nomor_surat
                        FROM surat_kbi
                        WHERE nomor_surat LIKE ?
                    ) AS combined_tables
                    LIMIT 1
                `;
            
                // Use LIKE with wildcards for more flexible matching
                const searchPattern = `%${nomorSurat}%`;
                
                dbConn.query(query, [searchPattern, searchPattern, searchPattern, searchPattern], async (err, results) => {
                    if (err) {
                        console.error('Error saat mengecek status surat:', err);
                        await sock.sendMessage(senderNumber, { 
                            text: `🛑 *Gagal Memeriksa Status*\n\nTerjadi kesalahan sistem saat memeriksa status surat Anda.\n\nSilakan coba lagi nanti atau hubungi admin desa.`
                        });
                    } else if (results.length > 0) {
                        const { nama, status, jenis_surat, tanggal_permohonan, nomor_surat } = results[0];
                        
                        // Format the request date nicely
                        const formattedDate = new Date(tanggal_permohonan).toLocaleDateString('id-ID', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        });
                        
                        // Status details with emojis and actions
                        let statusDetails = {
                            'Diproses': {
                                emoji: '⏳',
                                message: 'masih dalam proses pembuatan',
                                action: 'Harap menunggu 1-3 hari kerja\nAnda bisa ke Balai Desa untuk mengecek langsung'
                            },
                            'Selesai': {
                                emoji: '✅',
                                message: 'sudah siap diambil',
                                action: 'Silakan ambil di Balai Desa pada jam kerja (08:00-15:00)'
                            },
                            'Ditolak': {
                                emoji: '❌',
                                message: 'tidak dapat diproses',
                                action: 'Hubungi admin desa untuk informasi lebih lanjut'
                            }
                        };
                        
                        const statusInfo = statusDetails[status] || {
                            emoji: '❓',
                            message: 'tidak diketahui',
                            action: 'Hubungi admin desa untuk konfirmasi'
                        };
            
                        await sock.sendMessage(senderNumber, {
                            text: `✨ *INFORMASI STATUS SURAT* ✨
            
            📄 *Nomor Surat*: ${nomor_surat}
            👤 *Atas Nama*: ${nama}
            📋 *Jenis Surat*: ${jenis_surat}
            📅 *Tanggal Permohonan*: ${formattedDate}
            🔄 *Status*: ${statusInfo.emoji} ${statusInfo.message}
            ℹ️ *Keterangan*: ${statusInfo.action}
            
            ${status === 'Selesai' ? '✅ *SURAT SUDAH SIAP* ✅\nPastikan anda mengambil di jam kerja.' : ''}
            
            🏡 *Lokasi Pengambilan*:
            Balai Desa
            Jam Kerja: Senin-Jumat, 08:00-15:00
            
            📌 *Untuk kembali ke menu utama*, ketik: *menu*`
                        });
            
                    } else {
                        await sock.sendMessage(senderNumber, { 
                            text: `🔍 *Nomor Surat Tidak Ditemukan*\n\nNomor surat *${nomorSurat}* tidak terdaftar dalam sistem.\n\nPeriksa kembali nomor surat Anda atau hubungi admin desa jika Anda yakin ini kesalahan sistem.\n\nUntuk mencoba lagi, ketik: *cek status*\nUntuk kembali ke menu, ketik: *menu*`
                        });
                    }
                    
                    // Reset to main menu but keep track they came from status check
                    currentState.lastAction = 'status_check';
                    currentState.step = 1;
                });
            }
            } catch (error) {
                console.error('Error saat memproses pesan:', error);
                await sock.sendMessage(senderNumber, { text: '⚠️ Terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi nanti.' });
                delete userStates[senderNumber];
            }
    });

    return sock;
}

startBot();