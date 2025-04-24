const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const pino = require("pino");
const mysql = require('mysql');
require('dotenv').config();

// Koneksi ke database
const dbConn = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'surat_desa'
});

dbConn.connect(err => {
    if (err) {
        console.error('❌ Error menghubungkan ke database:', err);
        throw err;
    }
    console.log('✅ Database Terhubung!');
});

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
                if (messageText.toLowerCase() === "halo" || messageText.toLowerCase() === "hai") {
                    await sock.sendMessage(senderNumber, { text: "Halo! Saya SojiwanBot! Terimakasih telah menghubungi saya via WhatsApp, Saya siap membantu kebutuhan surat Anda!" });
                    await sock.sendMessage(senderNumber, { text: "Ketik \"menu\" untuk melihat daftar menu layanan." });
                    currentState.step = 1;
                }
            } else if (currentState.step === 1) {
                if (messageText.toLowerCase() === "menu") {
                    const menuText = ` *Menu Layanan Surat:*
                    1️⃣ Surat Keterangan Tidak Mampu
                    2️⃣ Surat Keterangan Usaha
                    3️⃣ Surat Keterangan Beda Identitas
                    4️⃣ Surat Pengantar
                    5️⃣ Cek Status Surat

                    Ketik angka *1, 2, 3, 4, atau 5* untuk melanjutkan.`;
                    await sock.sendMessage(senderNumber, { text: menuText });
                    currentState.step = 2;
                } else {
                    await sock.sendMessage(senderNumber, { text: 'Ketik "menu" untuk melihat daftar layanan.' });
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
                    const menuText = `* Layanan Surat Kami *\n\n` +
                    `- 1️⃣ *Surat Keterangan Tidak Mampu*\n` +
                    `- 2️⃣ *Surat Keterangan Usaha*\n` +
                    `- 3️⃣ 🆔 *Surat Keterangan Beda Identitas*\n` +
                    `- 4️⃣ *Surat Pengantar*\n` +
                    `- 5️⃣ *Cek Status Surat*\n\n` +
                    `Ketik angka *1, 2, 3, 4, atau 5* untuk melanjutkan.`;
                  
                  await sock.sendMessage(senderNumber, { text: menuText });
                } else {
                    await sock.sendMessage(senderNumber, { text: "Pilihan tidak valid. Silakan ketik angka 1, 2, 3, 4, atau 5, atau ketik 'menu'." });
                }
            } else if (currentState.step === 3) { // Langkah Surat Pengantar
                if (/\d/.test(messageText)) {
                    await sock.sendMessage(senderNumber, { text: "Nama tidak boleh mengandung angka. Silakan masukkan nama yang valid." });
                } else {
                    currentState.data.nama = messageText.toUpperCase();
                    await sock.sendMessage(senderNumber, { text: "2. Tempat, Tanggal Lahir (Format: Garut, 15 September 2001):" });
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
            } else if (currentState.step === 6) {
                currentState.data.pekerjaan = messageText;
                await sock.sendMessage(senderNumber, { text: "5. Tempat Domisili:" });
                currentState.step = 7;
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

*Nama Lengkap                  :* ${currentState.data.nama}
*Tempat, Tanggal Lahir         :* ${currentState.data.tempat_tanggal_lahir}
*Kewarganegaraan dan Agama     :* ${currentState.data.kewarganegaraan_agama}
*Pekerjaan                     :* ${currentState.data.pekerjaan}
*Tempat Domisili               :* ${currentState.data.tempat_domisili}
*Daerah Asal                   :* ${currentState.data.daerah_asal}
*NIK                           :* ${currentState.data.surat_bukti_diri}
*Keperluan                     :* ${currentState.data.keperluan}
*Tujuan                        :* ${currentState.data.tujuan}

Apakah data sudah benar? (ya / tidak)`;

                await sock.sendMessage(senderNumber, { text: dataPreview });
                currentState.step = 12;
            } else if (currentState.step === 12) { // Konfirmasi Percobaan
                if (messageText.toLowerCase() === 'ya') {
                    const { nama, tempat_tanggal_lahir, kewarganegaraan_agama, pekerjaan, tempat_domisili, daerah_asal, surat_bukti_diri, keperluan, tujuan } = currentState.data;
                    const jenisSurat = 'Percobaan';
                    const tanggalPermohonan = new Date().toISOString().slice(0, 10);
                    const status = 'Diproses';
                    const tahunSekarang = new Date().getFullYear(); // Mendapatkan tahun saat ini
                
                    const sql = 'INSERT INTO surat (nama, tempat_tanggal_lahir, kewarganegaraan_agama, pekerjaan, tempat_domisili, daerah_asal, surat_bukti_diri, keperluan, tujuan, jenis_surat, tanggal_permohonan, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                    dbConn.query(sql, [nama, tempat_tanggal_lahir, kewarganegaraan_agama, pekerjaan, tempat_domisili, daerah_asal, surat_bukti_diri, keperluan, tujuan, jenisSurat, tanggalPermohonan, status], (err, results) => {
                        if (err) {
                            console.error('Error menyimpan data ke database:', err);
                            sock.sendMessage(senderNumber, { text: '⚠️ Terjadi kesalahan saat menyimpan data. Silakan coba lagi nanti.' });
                        } else {
                            const newId = results.insertId;
                            const nomorSurat = `SP/${String(newId).padStart(3, '0')}/${tahunSekarang}`; // Format nomor surat yang baru
                            const updateNomorSuratSql = 'UPDATE surat SET nomor_surat = ? WHERE id = ?';
                            dbConn.query(updateNomorSuratSql, [nomorSurat, results.insertId], (errUpdate) => {
                                if (errUpdate) {
                                    console.error('Error memperbarui nomor surat:', errUpdate);
                                    sock.sendMessage(senderNumber, { text: '⚠️ Terjadi kesalahan saat memperbarui nomor surat.' });
                                } else {
                                    sock.sendMessage(senderNumber, { text: `✅ Data berhasil disimpan! Nomor surat Anda: *${nomorSurat}*. Anda akan diberi tahu jika surat sudah selesai.` });
                                    console.log(`Data surat percobaan berhasil disimpan untuk ${senderNumber} dengan ID: ${results.insertId} dan Nomor Surat: ${nomorSurat}`);
                                }
                            });
                        }
                        delete userStates[senderNumber];
                    });
                } else if (messageText.toLowerCase() === 'tidak') {
                    await sock.sendMessage(senderNumber, { text: '❌ Proses pengisian formulir dibatalkan. Ketik "menu" untuk memulai kembali.' });
                    delete userStates[senderNumber];
                    currentState.step = 1;
                } else {
                    await sock.sendMessage(senderNumber, { text: 'Pilihan tidak valid. Silakan balas dengan "ya" atau "tidak".' });
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
            } else if (currentState.step === 107) {
                currentState.data.nama_bank = messageText;
                await sock.sendMessage(senderNumber, { text: "9. Alamat Bank:" });
                currentState.step = 108;
            } else if (currentState.step === 108) {
                currentState.data.alamat_bank = messageText;

                const dataPreview = `✅ *Konfirmasi Data Anda:*

*Nama Lengkap                   :* ${currentState.data.nama}
*Tempat, Tanggal Lahir          :* ${currentState.data.tempat_tanggal_lahir}
*No. KTP                        :* ${currentState.data.no_ktp}
*Alamat KTP                     :* ${currentState.data.alamat_ktp}
*Jenis Usaha                    :* ${currentState.data.jenis_usaha}
*Alamat Usaha                   :* ${currentState.data.alamat_usaha}
*Lama Usaha                     :* ${currentState.data.lama_usaha}
*Nama Bank                      :* ${currentState.data.nama_bank}
*Alamat Bank                    :* ${currentState.data.alamat_bank}

                Apakah data sudah benar? (ya / tidak)`;

                await sock.sendMessage(senderNumber, { text: dataPreview });
                currentState.step = 109;
            } else if (currentState.step === 109) { // Konfirmasi SKU
                if (messageText.toLowerCase() === 'ya') {
                    const { nama, tempat_tanggal_lahir, no_ktp, alamat_ktp, jenis_usaha, alamat_usaha, lama_usaha, nama_bank, alamat_bank } = currentState.data;
                    const jenis_surat = 'Surat Keterangan Usaha';
                    const tanggal_permohonan = new Date().toISOString().slice(0, 10);
                    const status = 'Diproses';

                    const sql = 'INSERT INTO surat_ku (nama, tempat_tanggal_lahir, no_ktp, alamat_ktp, jenis_usaha, alamat_usaha, lama_usaha, nama_bank, alamat_bank, jenis_surat, tanggal_permohonan, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                    dbConn.query(sql, [nama, tempat_tanggal_lahir, no_ktp, alamat_ktp, jenis_usaha, alamat_usaha, lama_usaha, nama_bank, alamat_bank, jenis_surat, tanggal_permohonan, status], (err, results) => {
                        if (err) {
                            console.error('Error menyimpan data ke database:', err);
                            sock.sendMessage(senderNumber, { text: '⚠️ Terjadi kesalahan saat menyimpan data. Silakan coba lagi nanti.' });
                        } else {
                            const nomorSurat = `SKU/${results.insertId.toString().padStart(3, '0')}/${new Date().getFullYear()}`;
                            const updateNomorSuratSql = 'UPDATE surat_ku SET nomor_surat = ? WHERE id = ?';
                            dbConn.query(updateNomorSuratSql, [nomorSurat, results.insertId], (errUpdate) => {
                                if (errUpdate) {
                                    console.error('Error memperbarui nomor surat:', errUpdate);
                                    sock.sendMessage(senderNumber, { text: '⚠️ Terjadi kesalahan saat memperbarui nomor surat.' });
                                } else {
                                    sock.sendMessage(senderNumber, { text: `✅ Data berhasil disimpan! Nomor surat Anda: *${nomorSurat}*. Anda akan diberi tahu jika surat sudah selesai.` });
                                    console.log(`Data surat SKU berhasil disimpan untuk ${senderNumber} dengan ID: ${results.insertId}`);
                                }
                            });
                        }
                        delete userStates[senderNumber];
                    });
                } else if (messageText.toLowerCase() === 'tidak') {
                    await sock.sendMessage(senderNumber, { text: '❌ Proses pengisian formulir dibatalkan. Ketik "menu" untuk memulai kembali.' });
                    delete userStates[senderNumber];
                    currentState.step = 1;
                } else {
                    await sock.sendMessage(senderNumber, { text: 'Pilihan tidak valid. Silakan balas dengan "ya" atau "tidak".' });
                }
            }
            else if (currentState.step === 200) { // Langkah SKTM
                if (/\d/.test(messageText)) {
                    await sock.sendMessage(senderNumber, { text: "Nama tidak boleh mengandung angka. Silakan masukkan nama yang valid." });
                } else {
                    currentState.data.nama = messageText.toUpperCase();
                    await sock.sendMessage(senderNumber, { text: "2. No. KK:" });
                    currentState.step = 201;
                }
            } else if (currentState.step === 201) {
                currentState.data.no_kk = messageText;
                await sock.sendMessage(senderNumber, { text: "3. NIK:" });
                currentState.step = 202;
            } else if (currentState.step === 202) {
                const nikRegex = /^\d{16}$/;
                if (nikRegex.test(messageText)) {
                    currentState.data.nik = messageText;
                    await sock.sendMessage(senderNumber, { text: "4. Tempat, Tanggal Lahir (Format: Garut, 15 September 2001):" });
                    currentState.step = 203;
                } else {
                    await sock.sendMessage(senderNumber, { text: "NIK harus 16 digit angka." });
                }
            } else if (currentState.step === 203) {
                const ttlRegex = /^[A-Za-z\s]+, \d{1,2} [A-Za-z]+ \d{4}$/;
                if (ttlRegex.test(messageText)) {
                    currentState.data.tempat_tanggal_lahir = messageText;
                    await sock.sendMessage(senderNumber, { text: "5. Jenis Kelamin (L/P):" });
                    currentState.step = 204;
                } else {
                    await sock.sendMessage(senderNumber, { text: "Format tempat dan tanggal lahir salah. Contoh: Garut, 15 September 2001" });
                }
            } else if (currentState.step === 204) {
                if (messageText.toLowerCase() === 'l' || messageText.toLowerCase() === 'p') {
                    currentState.data.jenis_kelamin = messageText.toUpperCase();
                    await sock.sendMessage(senderNumber, { text: "6. Alamat:" });
                    currentState.step = 205;
                } else {
                    await sock.sendMessage(senderNumber, { text: "Jenis kelamin harus L atau P." });
                }
            } else if (currentState.step === 205) {
                currentState.data.alamat = messageText;
                await sock.sendMessage(senderNumber, { text: "7. Nomor HP:" });
                currentState.step = 206;
            } else if (currentState.step === 206) {
                currentState.data.nomor_hp = messageText;
            
                const dataPreview = `✅ *Konfirmasi Data Anda:*
            
            Nama Lengkap                  : ${currentState.data.nama}
            No. KK                       : ${currentState.data.no_kk}
            NIK                           : ${currentState.data.nik}
            Tempat, Tanggal Lahir      : ${currentState.data.tempat_tanggal_lahir}
            Jenis Kelamin                 : ${currentState.data.jenis_kelamin}
            Alamat                        : ${currentState.data.alamat}
            Nomor HP                      : ${currentState.data.nomor_hp}
            
            Apakah data sudah benar? (ya / tidak)`;
            
                await sock.sendMessage(senderNumber, { text: dataPreview });
                currentState.step = 207;
            } else if (currentState.step === 207) { // Konfirmasi SKTM
                if (messageText.toLowerCase() === 'ya') {
                    const { nama, no_kk, nik, tempat_tanggal_lahir, jenis_kelamin, alamat, nomor_hp } = currentState.data;
                    const jenis_surat = 'Surat Keterangan Tidak Mampu';
                    const tanggal_permohonan = new Date().toISOString().slice(0, 10);
                    const status = 'Diproses';
            
                    const sql = 'INSERT INTO surat_sktm (nama, no_kk, nik, tempat_tanggal_lahir, jenis_kelamin, alamat, nomor_hp, jenis_surat, tanggal_permohonan, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                    dbConn.query(sql, [nama, no_kk, nik, tempat_tanggal_lahir, jenis_kelamin, alamat, nomor_hp, jenis_surat, tanggal_permohonan, status], (err, results) => {
                        if (err) {
                            console.error('Error menyimpan data ke database:', err);
                            sock.sendMessage(senderNumber, { text: '⚠️ Terjadi kesalahan saat menyimpan data. Silakan coba lagi nanti.' });
                        } else {
                            const nomorSurat = `SKTM/${results.insertId.toString().padStart(3, '0')}/${new Date().getFullYear()}`;
                            const updateNomorSuratSql = 'UPDATE surat_sktm SET nomor_surat = ? WHERE id = ?';
                            dbConn.query(updateNomorSuratSql, [nomorSurat, results.insertId], (errUpdate) => {
                                if (errUpdate) {
                                    console.error('Error memperbarui nomor surat:', errUpdate);
                                    sock.sendMessage(senderNumber, { text: '⚠️ Terjadi kesalahan saat memperbarui nomor surat.' });
                                } else {
                                    sock.sendMessage(senderNumber, { text: `✅ Data berhasil disimpan! Nomor surat Anda: *${nomorSurat}*. Anda akan diberi tahu jika surat sudah selesai.` });
                                    console.log(`Data surat SKTM berhasil disimpan untuk ${senderNumber} dengan ID: ${results.insertId}`);
                                }
                            });
                        }
                        delete userStates[senderNumber];
                    });
                } else if (messageText.toLowerCase() === 'tidak') {
                    await sock.sendMessage(senderNumber, { text: '❌ Proses pengisian formulir dibatalkan. Ketik "menu" untuk memulai kembali.' });
                    delete userStates[senderNumber];
                    currentState.step = 1;
                } else {
                    await sock.sendMessage(senderNumber, { text: 'Pilihan tidak valid. Silakan balas dengan "ya" atau "tidak".' });
                }
            }
            else if (currentState.step === 300) { // Langkah SKBI
                if (/\d/.test(messageText)) {
                    await sock.sendMessage(senderNumber, { text: "Nama tidak boleh mengandung angka. Silakan masukkan nama yang valid." });
                } else {
                    currentState.data.nama = messageText.toUpperCase();
                    await sock.sendMessage(senderNumber, { text: "2. Tertera:" });
                    currentState.step = 301;
                }
            } else if (currentState.step === 301) {
                currentState.data.tertera = messageText;
                await sock.sendMessage(senderNumber, { text: "3. No. Rekening:" });
                currentState.step = 302;
            } else if (currentState.step === 302) {
                currentState.data.norek = messageText;
                await sock.sendMessage(senderNumber, { text: "4. Nama Lagi:" });
                currentState.step = 303;
            } else if (currentState.step === 303) {
                currentState.data.nama_lagi = messageText;
                await sock.sendMessage(senderNumber, { text: "5. Tertera Lagi:" });
                currentState.step = 304;
            } else if (currentState.step === 304) {
                currentState.data.tertera_lagi = messageText;
                await sock.sendMessage(senderNumber, { text: "6. No. KK:" });
                currentState.step = 305;
            } else if (currentState.step === 305) {
                currentState.data.no_kk = messageText;
                await sock.sendMessage(senderNumber, { text: "7. NIK:" });
                currentState.step = 306;
            } else if (currentState.step === 306) {
                const nikRegex = /^\d{16}$/;
                if (nikRegex.test(messageText)) {
                    currentState.data.nik = messageText;
            
                    const dataPreview = `✅ *Konfirmasi Data Anda:*
            
            Nama Lengkap                  : ${currentState.data.nama}
            Tertera                       : ${currentState.data.tertera}
            No. Rekening                 : ${currentState.data.norek}
            Nama Lagi                     : ${currentState.data.nama_lagi}
            Tertera Lagi                  : ${currentState.data.tertera_lagi}
            No. KK                       : ${currentState.data.no_kk}
            NIK                           : ${currentState.data.nik}
            
            Apakah data sudah benar? (ya / tidak)`;
            
                    await sock.sendMessage(senderNumber, { text: dataPreview });
                    currentState.step = 307;
                } else {
                    await sock.sendMessage(senderNumber, { text: "NIK harus 16 digit angka." });
                }
            } else if (currentState.step === 307) { // Konfirmasi SKBI
                if (messageText.toLowerCase() === 'ya') {
                    const { nama, tertera, norek, nama_lagi, tertera_lagi, no_kk, nik } = currentState.data;
                    const jenis_surat = 'Surat Keterangan Beda Identitas';
                    const tanggal_permohonan = new Date().toISOString().slice(0, 10);
                    const status = 'Diproses';
            
                    const sql = 'INSERT INTO surat_kbi (nama, tertera, norek, nama_lagi, tertera_lagi, no_kk, nik, jenis_surat, tanggal_permohonan, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                    dbConn.query(sql, [nama, tertera, norek, nama_lagi, tertera_lagi, no_kk, nik, jenis_surat, tanggal_permohonan, status], (err, results) => {
                        if (err) {
                            console.error('Error menyimpan data ke database:', err);
                            sock.sendMessage(senderNumber, { text: '⚠️ Terjadi kesalahan saat menyimpan data. Silakan coba lagi nanti.' });
                        } else {
                            const nomorSurat = `SKBI/${results.insertId.toString().padStart(3, '0')}/${new Date().getFullYear()}`;
                            const updateNomorSuratSql = 'UPDATE surat_KBI SET nomor_surat = ? WHERE id = ?';
                            dbConn.query(updateNomorSuratSql, [nomorSurat, results.insertId], (errUpdate) => {
                                if (errUpdate) {
                                    console.error('Error memperbarui nomor surat:', errUpdate);
                                    sock.sendMessage(senderNumber, { text: '⚠️ Terjadi kesalahan saat memperbarui nomor surat.' });
                                } else {
                                    sock.sendMessage(senderNumber, { text: `✅ Data berhasil disimpan! Nomor surat Anda: *${nomorSurat}*. Anda akan diberi tahu jika surat sudah selesai.` });
                                    console.log(`Data surat SKBI berhasil disimpan untuk ${senderNumber} dengan ID: ${results.insertId}`);
                                }
                            });
                        }
                        delete userStates[senderNumber];
                    });
                } else if (messageText.toLowerCase() === 'tidak') {
                    await sock.sendMessage(senderNumber, { text: '❌ Proses pengisian formulir dibatalkan. Ketik "menu" untuk memulai kembali.' });
                    delete userStates[senderNumber];
                    currentState.step = 1;
                } else {
                    await sock.sendMessage(senderNumber, { text: 'Pilihan tidak valid. Silakan balas dengan "ya" atau "tidak".' });
                }
            }

            else if (currentState.step === 400) { // Langkah Cek Status
                const nomorSurat = messageText;
            
                const query = `
                    SELECT nama, status, jenis_surat
                    FROM surat
                    WHERE nomor_surat = ?
                    UNION
                    SELECT nama, status, jenis_surat
                    FROM surat_ku
                    WHERE nomor_surat = ?
                    UNION
                    SELECT nama, status, jenis_surat
                    FROM surat_sktm
                    WHERE nomor_surat = ?
                    UNION
                    SELECT nama, status, jenis_surat
                    FROM surat_kbi
                    WHERE nomor_surat = ?
                `;
            
                dbConn.query(query, [nomorSurat, nomorSurat, nomorSurat, nomorSurat], async (err, results) => {
                    if (err) {
                        console.error('Error saat mengecek status surat:', err);
                        await sock.sendMessage(senderNumber, { text: '⚠️ Terjadi kesalahan saat mengecek status surat. Silakan coba lagi nanti.' });
                    } else if (results.length > 0) {
                        const { nama, status, jenis_surat } = results[0];
                        let statusText = '';
                        let emoji = '';
            
                        if (status === 'Diproses') {
                            emoji = '⏳';
                            statusText = `*${emoji} Diproses*. Harap menunggu atau Anda bisa ke Balai Desa untuk mengecek langsung.`;
                        } else if (status === 'Selesai') {
                            emoji = '✅';
                            statusText = `*${emoji} Selesai*. Anda bisa mengambilnya di Balai Desa pada jam kerja.`;
                        } else if (status === 'Ditolak') {
                            emoji = '❌';
                            statusText = `*${emoji} Ditolak*. Kami tidak dapat membuat surat Anda karena alasan tertentu.`;
                        }
            
                        await sock.sendMessage(senderNumber, {
                            text: `
            *Nomor Surat Ditemukan!*
            
            Nama\t\t: ${nama}
            Jenis Surat\t: ${jenis_surat}
            Status\t\t: ${statusText}
                            `,
                        });
                    } else {
                        await sock.sendMessage(senderNumber, { text: 'Nomor surat tidak ditemukan. Harap masukkan nomor surat yang valid.' });
                    }
                    currentState.step = 1; // Kembali ke menu utama
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