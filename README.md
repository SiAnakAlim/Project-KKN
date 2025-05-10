# 🏘️ BonkidBot : Otomatisasi Surat Desa dengan WhatsApp Bot & Web 

![Logo](web-display-node/public/image/logokebondalem-fix.png) 
*Aplikasi Pelayanan Surat Desa Digital*

**BonkidBot** adalah solusi digital terintegrasi yang menggabungkan **WhatsApp Bot** dengan **Website Admin** untuk mempermudah proses pembuatan dan pengelolaan surat-surat resmi desa secara otomatis. Dengan BonkidBot, warga bisa mengajukan surat kapan saja melalui WhatsApp, sementara admin desa dapat memproses permohonan melalui dashboard web yang user-friendly.

---

## ✨ Fitur Unggulan

### 🤖 WhatsApp Bot
- 📲 Pengajuan surat langsung via WhatsApp
- ⏳ Tracking status permohonan real-time
- 🔔 Notifikasi otomatis ketika surat selesai
- 📄 Panduan penggunaan melalui menu interaktif

### 💻 Website Admin
- 📊 Dashboard statistik permohonan surat
- 🖨️ Generate surat otomatis (PDF)
- 🔍 Sistem pencarian dan filter data
- 📈 Riwayat aktivitas terperinci
- 👥 Manajemen user dan hak akses

### 📑 Jenis Surat yang Tersedia
- Surat Pengantar
- Surat Keterangan Tidak Mampu (SKTM)
- Surat Keterangan Usaha
- Surat Keterangan Beda Identitas
- Dan lain-lain

---

## 🛠️ Tech Stack

### Backend
![Node.js](https://img.shields.io/badge/-Node.js-339933?logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/-Express.js-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/-MySQL-4479A1?logo=mysql&logoColor=white)

### Frontend
![EJS](https://img.shields.io/badge/-EJS-000000?logo=ejs&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/-Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)

### WhatsApp Integration
![Baileys](https://img.shields.io/badge/-Baileys-25D366?logo=whatsapp&logoColor=white)

---

## 🚀 Panduan Instalasi

### Prasyarat
- Node.js v16+
- MySQL 8+
- XAMPP (untuk server lokal)

Berikut adalah langkah-langkah untuk menjalankan project ini di komputer lokal Anda:

1. **Clone repository**:
   ```bash
   git clone https://github.com/SiAnakAlim/Project-KKN.git
   cd Project-KKN
   ```
2. **Install dependencies**:

     ```bash
    npm install
     ```

3. **Setup Database**:

- Buat database MySQL dengan nama surat_desa.

- Import file SQL dengan nama surat_desa

4. **Konfigurasi environment**:

Buat file .env di root folder dan isi dengan konfigurasi berikut:

  ```bash
  DB_HOST=localhost
  DB_USER=root
  DB_PASSWORD=
  DB_DATABASE=surat_desa
```
5. **Jalankan Aplikasi**:

Untuk menjalankan WhatsApp Bot:

```bash
cd wa-bot
node index.js
```
Untuk menjalankan website display:
```bash
cd web-display-node
node app.js
```
6. **Akses aplikasi**:

- WhatsApp Bot: Scan QR code yang muncul di terminal.

- Website Display: Buka browser dan akses http://localhost:3000.

*pastikan xampp bagian apache dan mysql dalam kondisi start

---

## 🤝 Kontribusi
Jika Anda ingin berkontribusi pada project ini, silakan ikuti langkah-langkah berikut:

- Fork repository ini.

- Buat branch baru (git checkout -b fitur-baru).

- Commit perubahan Anda (git commit -m 'Menambahkan fitur baru').

- Push ke branch (git push origin fitur-baru).

- Buat Pull Request.

---

## 📞 Kontak
Jika Anda memiliki pertanyaan atau masukan, silakan hubungi:

Nama: Aryamukti Satria Hendrayana

Email: aryamuktisatria@gmail.com

---

