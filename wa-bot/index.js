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
        if (!msg.message || msg.key.fromMe) return; // Abaikan pesan yang dikirim oleh bot sendiri

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
                    await sock.sendMessage(senderNumber, { text: "Halo! Ini tampan! 👋\nKetik \"menu\" untuk melihat daftar menu layanan." });
                    currentState.step = 1;
                }
            } else if (currentState.step === 1) {
                if (messageText.toLowerCase() === "menu") {
                    const menuText = `📌 *Menu Layanan Surat:*
1️⃣ Surat Keterangan Domisili
2️⃣ Surat Keterangan Usaha
3️⃣ Surat Keterangan Belum Pernah Kawin
4️⃣ Percobaan

Ketik angka *1, 2, 3, atau 4* untuk melanjutkan.`;
                    await sock.sendMessage(senderNumber, { text: menuText });
                    currentState.step = 2;
                } else {
                    await sock.sendMessage(senderNumber, { text: 'Ketik "menu" untuk melihat daftar layanan.' });
                }
            } else if (currentState.step === 2) {
                if (['1', '2', '3'].includes(messageText)) {
                    await sock.sendMessage(senderNumber, { text: "⚠️ Layanan ini masih dalam pengembangan." });
                    currentState.step = 1; // Kembali ke menu utama setelah pesan pengembangan
                } else if (messageText === '4') {
                    await sock.sendMessage(senderNumber, { text: "📝 Silakan isi formulir berikut untuk keperluan surat percobaan:" });
                    await sock.sendMessage(senderNumber, { text: "1. Nama Lengkap:" });
                    currentState.step = 3;
                } else if (messageText.toLowerCase() === 'menu') {
                    const menuText = `📌 *Menu Layanan Surat:*
1️⃣ Surat Keterangan Domisili
2️⃣ Surat Keterangan Usaha
3️⃣ Surat Keterangan Belum Pernah Kawin
4️⃣ Percobaan

Ketik angka *1, 2, 3, atau 4* untuk melanjutkan.`;
                    await sock.sendMessage(senderNumber, { text: menuText });
                    // Tetap di step 2
                } else {
                    await sock.sendMessage(senderNumber, { text: "Pilihan tidak valid. Silakan ketik angka 1, 2, 3, atau 4, atau ketik 'menu'." });
                    // Tetap di step 2
                }
            } else if (currentState.step === 3) {
                currentState.data.nama = messageText.toUpperCase(); // Nama diubah ke CAPSLOCK
                await sock.sendMessage(senderNumber, { text: "2. Tempat, Tanggal Lahir (Format: Garut, 15 September 2001):" });
                currentState.step = 4;
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

                *Nama Lengkap:*
                ${currentState.data.nama}
                
                *Tempat, Tanggal Lahir:*
                ${currentState.data.tempat_tanggal_lahir}
                
                *Kewarganegaraan dan Agama:*
                ${currentState.data.kewarganegaraan_agama}
                
                *Pekerjaan:*
                ${currentState.data.pekerjaan}
                
                *Tempat Domisili:*
                ${currentState.data.tempat_domisili}
                
                *Daerah Asal:*
                ${currentState.data.daerah_asal}
                
                *NIK:*
                ${currentState.data.surat_bukti_diri}
                
                *Keperluan:*
                ${currentState.data.keperluan}
                
                *Tujuan:*
                ${currentState.data.tujuan}
                
                Apakah data sudah benar? (ya / tidak)`;
                
                await sock.sendMessage(senderNumber, { text: dataPreview });
                currentState.step = 12;
            } else if (currentState.step === 12) {
                if (messageText.toLowerCase() === 'ya') {
                    const { nama, tempat_tanggal_lahir, kewarganegaraan_agama, pekerjaan, tempat_domisili, daerah_asal, surat_bukti_diri, keperluan, tujuan } = currentState.data;
                    const jenisSurat = 'Percobaan';
                    const tanggalPermohonan = new Date().toISOString().slice(0, 19).replace('T', ' ');
                    const status = 'Diproses';

                    const sql = 'INSERT INTO surat (nama, tempat_tanggal_lahir, kewarganegaraan_agama, pekerjaan, tempat_domisili, daerah_asal, surat_bukti_diri, keperluan, tujuan, jenis_surat, tanggal_permohonan, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                    dbConn.query(sql, [nama, tempat_tanggal_lahir, kewarganegaraan_agama, pekerjaan, tempat_domisili, daerah_asal, surat_bukti_diri, keperluan, tujuan, jenisSurat, tanggalPermohonan, status], (err, results) => {
                        if (err) {
                            console.error('Error menyimpan data ke database:', err);
                            sock.sendMessage(senderNumber, { text: '⚠️ Terjadi kesalahan saat menyimpan data. Silakan coba lagi nanti.' });
                        } else {
                            const nomorSurat = `P-${results.insertId.toString().padStart(4, '0')}`;
                            const updateNomorSuratSql = 'UPDATE surat SET nomor_surat = ? WHERE id = ?';
                            dbConn.query(updateNomorSuratSql, [nomorSurat, results.insertId], (errUpdate) => {
                                if (errUpdate) {
                                    console.error('Error memperbarui nomor surat:', errUpdate);
                                    sock.sendMessage(senderNumber, { text: '⚠️ Terjadi kesalahan saat memperbarui nomor surat.' });
                                } else {
                                    sock.sendMessage(senderNumber, { text: `✅ Data berhasil disimpan! Nomor surat Anda: *${nomorSurat}*. Anda akan diberi tahu jika surat sudah selesai.` });
                                    console.log(`Data surat percobaan berhasil disimpan untuk ${senderNumber} dengan ID: ${results.insertId}`);
                                }
                            });
                        }
                        delete userStates[senderNumber];
                    });
                } else if (messageText.toLowerCase() === 'tidak') {
                    await sock.sendMessage(senderNumber, { text: '❌ Proses pengisian formulir dibatalkan. Ketik "menu" untuk memulai kembali.' });
                    delete userStates[senderNumber];
                    currentState.step = 1; // Kembali ke langkah 1 untuk memicu menu lagi
                } else {
                    await sock.sendMessage(senderNumber, { text: 'Pilihan tidak valid. Silakan balas dengan "ya" atau "tidak".' });
                }
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