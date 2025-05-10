const express = require('express');
const app = express();
const path = require('path');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const htmlPdf = require('html-pdf');
const ejs = require('ejs');
const session = require('express-session');
const flash = require('connect-flash');
const bcrypt = require('bcrypt');

// Import koneksi database dari koneksi.js
const db = require('./koneksi');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Konfigurasi Middleware Sesi dan Flash
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));
app.use(flash());

// Array untuk menyimpan clients yang terhubung ke SSE
let notificationClients = [];

// Route untuk menampilkan notifikasi dengan pagination
app.get('/notifikasi', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    // Parameter pagination
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.size) || 10;
    const activeTab = req.query.tab || 'all';

    const query = `
        SELECT n.*, 
               CASE 
                   WHEN n.related_type = 'surat' THEN s.nomor_surat
                   WHEN n.related_type = 'surat_ku' THEN sku.nomor_surat
                   WHEN n.related_type = 'surat_kbi' THEN skbi.nomor_surat
                   WHEN n.related_type = 'surat_sktm' THEN sktm.nomor_surat
               END as nomor_surat,
               CASE 
                   WHEN n.related_type = 'surat' THEN s.nama
                   WHEN n.related_type = 'surat_ku' THEN sku.nama
                   WHEN n.related_type = 'surat_kbi' THEN skbi.nama
                   WHEN n.related_type = 'surat_sktm' THEN sktm.nama
               END as nama
        FROM notifications n
        LEFT JOIN surat s ON n.related_type = 'surat' AND n.related_id = s.id
        LEFT JOIN surat_ku sku ON n.related_type = 'surat_ku' AND n.related_id = sku.id
        LEFT JOIN surat_kbi skbi ON n.related_type = 'surat_kbi' AND n.related_id = skbi.id
        LEFT JOIN surat_sktm sktm ON n.related_type = 'surat_sktm' AND n.related_id = sktm.id
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC
    `;

    db.query(query, [req.session.userId], (err, results) => {
        if (err) {
            console.error('Error fetching notifications:', err);
            return res.status(500).send('Internal Server Error');
        }

        // Filter notifikasi berdasarkan tab
        const filteredNotifications = {
            all: results,
            surat: results.filter(n => n.related_type === 'surat'),
            ku: results.filter(n => n.related_type === 'surat_ku'),
            kbi: results.filter(n => n.related_type === 'surat_kbi'),
            sktm: results.filter(n => n.related_type === 'surat_sktm')
        };

        // Fungsi pagination
        function paginate(array, currentPage, pageSize) {
            const offset = (currentPage - 1) * pageSize;
            return array.slice(offset, offset + pageSize);
        }

        // Fungsi untuk menghitung time ago
        function formatTimeAgo(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);
            
            if (diffInSeconds < 60) return `${diffInSeconds} detik yang lalu`;
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit yang lalu`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam yang lalu`;
            return `${Math.floor(diffInSeconds / 86400)} hari yang lalu`;
        }

        res.render('pemberitahuan/notifikasi', {
            notifications: paginate(filteredNotifications[activeTab], page, pageSize),
            currentPage: page,
            pageSize: pageSize,
            totalPages: Math.ceil(filteredNotifications[activeTab].length / pageSize),
            activeTab: activeTab,
            formatTimeAgo: formatTimeAgo,
            // Untuk filter tab
            suratNotifs: filteredNotifications.surat,
            kuNotifs: filteredNotifications.ku,
            kbiNotifs: filteredNotifications.kbi,
            sktmNotifs: filteredNotifications.sktm
        });
    });
});

// Route untuk menandai notifikasi sebagai dibaca
app.get('/mark-as-read/:id', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    const notificationId = req.params.id;
    const redirectUrl = req.query.redirect || '/notifikasi';

    db.query(
        'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
        [notificationId, req.session.userId],
        (err) => {
            if (err) {
                console.error('Error marking notification as read:', err);
                return res.status(500).send('Internal Server Error');
            }
            res.redirect(redirectUrl);
        }
    );
});

// SSE endpoint untuk notifikasi real-time
// Di SSE endpoint, tambahkan timeout dan heartbeat
app.get('/notifications-stream', (req, res) => {
    if (!req.session.userId) return res.status(403).end();

    // Setup headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    const clientId = Date.now();
    const newClient = { id: clientId, userId: req.session.userId, res };

    // Heartbeat untuk menjaga koneksi
    const heartbeatInterval = setInterval(() => {
        res.write(':heartbeat\n\n');
    }, 30000);

    // Tambahkan client
    notificationClients.push(newClient);

    // Handle cleanup
    req.on('close', () => {
        clearInterval(heartbeatInterval);
        notificationClients = notificationClients.filter(c => c.id !== clientId);
        console.log(`Client ${clientId} disconnected`);
    });
});

// Fungsi untuk mengirim notifikasi ke semua client yang terkoneksi
function sendNotification(userId, data) {
    notificationClients.forEach(client => {
        if (client.userId === userId) {
            client.res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
    });
}
// Route untuk halaman tutorial penggunaan (tutorial-penggunaan.ejs)
app.get('/tutorial-penggunaan', (req, res) => {
    res.render('footer/tutorial-penggunaan'); // Akan mencari file tutorial-penggunaan.ejs di dalam folder 'views/footer'
});

// Route untuk halaman FAQ
app.get('/faq', (req, res) => {
    res.render('footer/faq'); // Merender file faq.ejs dari folder 'footer'
});

// Route untuk halaman kebijakan-privasi
app.get('/kebijakan-privasi', (req, res) => {
    res.render('footer/kebijakan-privasi'); 
});
app.get('/syarat-ketentuan', (req, res) => {
    res.render('footer/syarat_ketentuan');
});


// Dashboard route with notifications
// Dashboard route with notifications and statistics
app.get('/', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    const userId = req.session.userId;
    
    // Query to get user data
    const userSql = "SELECT nama FROM users WHERE id = ?";
    
    // Query to get all surat data
    const suratSql = "SELECT * FROM surat";
    
    // Query to get notifications with related surat/surat_ku data
    const notifQuery = `
        SELECT n.*, 
            CASE 
                WHEN n.related_type = 'surat_ku' THEN sku.nomor_surat
                WHEN n.related_type = 'surat' THEN s.nomor_surat
            END as nomor_surat,
            CASE 
                WHEN n.related_type = 'surat_ku' THEN sku.nama
                WHEN n.related_type = 'surat' THEN s.nama
            END as nama
        FROM notifications n
        LEFT JOIN surat_ku sku ON n.related_type = 'surat_ku' AND n.related_id = sku.id
        LEFT JOIN surat s ON n.related_type = 'surat' AND n.related_id = s.id
        WHERE n.user_id = ? 
        ORDER BY n.created_at DESC 
        LIMIT 5`;
    
    // Queries for statistics
const totalSuratQuery = `
SELECT
    (SELECT COUNT(*) FROM surat) +
    (SELECT COUNT(*) FROM surat_ku) +
    (SELECT COUNT(*) FROM surat_kbi) +
    (SELECT COUNT(*) FROM surat_sktm) AS total`;

const diprosesQuery = `
SELECT
    (SELECT COUNT(*) FROM surat WHERE status = 'Diproses') +
    (SELECT COUNT(*) FROM surat_ku WHERE status = 'Diproses') +
    (SELECT COUNT(*) FROM surat_kbi WHERE status = 'Diproses') +
    (SELECT COUNT(*) FROM surat_sktm WHERE status = 'Diproses') AS diproses`;

const selesaiQuery = `
SELECT
    (SELECT COUNT(*) FROM surat WHERE status = 'Selesai') +
    (SELECT COUNT(*) FROM surat_ku WHERE status = 'Selesai') +
    (SELECT COUNT(*) FROM surat_kbi WHERE status = 'Selesai') +
    (SELECT COUNT(*) FROM surat_sktm WHERE status = 'Selesai') AS selesai`;

const ditolakQuery = `
SELECT
    (SELECT COUNT(*) FROM surat WHERE status = 'Ditolak') +
    (SELECT COUNT(*) FROM surat_ku WHERE status = 'Ditolak') +
    (SELECT COUNT(*) FROM surat_kbi WHERE status = 'Ditolak') +
    (SELECT COUNT(*) FROM surat_sktm WHERE status = 'Ditolak') AS ditolak`;

    // Get user data first
    db.query(userSql, [userId], (userErr, userResult) => {
        if (userErr) {
            console.error('Error fetching user:', userErr);
            return res.status(500).send("Error fetching user data");
        }
        if (userResult.length === 0) {
            return res.status(404).send("User not found");
        }

        const userName = userResult[0].nama;

        // Get all other data in parallel
        const suratPromise = new Promise((resolve, reject) => {
            db.query(suratSql, (err, result) => err ? reject(err) : resolve(result));
        });

        const notifPromise = new Promise((resolve, reject) => {
            db.query(notifQuery, [userId], (err, result) => err ? reject(err) : resolve(result));
        });

        const totalPromise = new Promise((resolve, reject) => {
            db.query(totalSuratQuery, (err, result) => err ? reject(err) : resolve(result[0].total));
        });

        const diprosesPromise = new Promise((resolve, reject) => {
            db.query(diprosesQuery, (err, result) => err ? reject(err) : resolve(result[0].diproses));
        });

        const selesaiPromise = new Promise((resolve, reject) => {
            db.query(selesaiQuery, (err, result) => err ? reject(err) : resolve(result[0].selesai));
        });

        const ditolakPromise = new Promise((resolve, reject) => {
            db.query(ditolakQuery, (err, result) => err ? reject(err) : resolve(result[0].ditolak));
        });

        Promise.all([
            suratPromise,
            notifPromise,
            totalPromise,
            diprosesPromise,
            selesaiPromise,
            ditolakPromise
        ])
        .then(([suratResult, notifResult, total, diproses, selesai, ditolak]) => {
            res.render('index', {
                qrCodeUrl: '',
                surat: suratResult,
                userName: userName,
                totalSurat: total || 0,
                diproses: diproses || 0,
                selesai: selesai || 0,
                ditolak: ditolak || 0,
                notifications: notifResult
            });
        })
        .catch(err => {
            console.error('Error fetching dashboard data:', err);
            res.status(500).send("Internal Server Error");
        });
    });
});

// Rute Profil
app.get('/profil', (req, res) => {
    if (req.session.userId) {
        const userId = req.session.userId;
        const sql = "SELECT * FROM users WHERE id = ?";
        db.query(sql, [userId], (err, result) => {
            if (err) {
                console.error('Error fetching user profile:', err);
                return res.status(500).send("Error fetching profile data");
            }
            if (result.length === 0) {
                return res.status(404).send("User not found");
            }
            res.render('profil', { user: result[0] });
        });
    } else {
        res.redirect('/login');
    }
});

// Rute untuk Update Nama Profil
app.post('/update-nama', (req, res) => {
    if (req.session.userId) {
        const userId = req.session.userId;
        const nama = req.body.nama;
        const sql = "UPDATE users SET nama = ? WHERE id = ?";
        db.query(sql, [nama, userId], (err, result) => {
            if (err) {
                console.error('Error updating name:', err);
                return res.json({ success: false });
            }
            res.json({ success: true });
        });
    } else {
        res.status(401).json({ success: false });
    }
});
// Rute untuk cari surat di index
app.get('/cari-surat', (req, res) => {
    const nomorSurat = req.query.nomor;
    const query = `
        SELECT nomor_surat, nama, status, '/surat-pengantar' AS link FROM surat WHERE nomor_surat = ?
        UNION
        SELECT nomor_surat, nama, status, '/surat-ku' AS link FROM surat_ku WHERE nomor_surat = ?
        UNION
        SELECT nomor_surat, nama, status, '/surat-kbi' AS link FROM surat_kbi WHERE nomor_surat = ?
        UNION
        SELECT nomor_surat, nama, status, '/surat-sktm' AS link FROM surat_sktm WHERE nomor_surat = ?
    `;

    db.query(query, [nomorSurat, nomorSurat, nomorSurat, nomorSurat], (err, result) => {
        if (err) {
            console.error(err);
            return res.json({ success: false });
        }

        if (result.length > 0) {
            res.json({ success: true, result: result[0] });
        } else {
            res.json({ success: true, result: null });
        }
    });
});
// Helper function to log activities
async function logActivity(userId, action, entityType, entityId, details = null) {
    const sql = `INSERT INTO activity_logs 
        (user_id, action, entity_type, entity_id, details, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())`;
    
    return new Promise((resolve, reject) => {
        db.query(sql, [userId, action, entityType, entityId, details], (err) => {
            if (err) {
                // Check if error is because table doesn't exist
                if (err.code === 'ER_NO_SUCH_TABLE') {
                    console.warn('Activity logs table not found. Skipping activity logging.');
                    return resolve(); // Resolve instead of reject to continue execution
                }
                console.error('Error logging activity:', err);
                reject(err);
            } else {
                resolve();
            }
        });
    });
}
app.get('/riwayat', async (req, res) => {
    try {
        const query = (sql, values) => {
            return new Promise((resolve, reject) => {
                db.query(sql, values, (error, results, fields) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve([results, fields]);
                });
            });
        };

        const [riwayatAktivitas] = await query('SELECT * FROM activity_logs ORDER BY created_at DESC');
        res.render('pemberitahuan/riwayat', { riwayatAktivitas: riwayatAktivitas });

    } catch (error) {
        console.error('Gagal mengambil riwayat aktivitas:', error);
        res.status(500).send('Gagal mengambil data riwayat.');
    }
});
app.post('/riwayat/:id/delete', async (req, res) => {
    try {
        const query = (sql, values) => {
            return new Promise((resolve, reject) => {
                db.query(sql, values, (error, results, fields) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve([results, fields]);
                });
            });
        };

        await query('DELETE FROM activity_logs WHERE id = ?', [req.params.id]);
        res.status(200).json({ success: true });

    } catch (error) {
        console.error('Gagal menghapus riwayat aktivitas:', error);
        res.status(500).json({ success: false, message: 'Gagal menghapus data riwayat.' });
    }
});


app.get('/statistik', (req, res) => {
    // Logika untuk menghitung total surat
    const queryTotalSurat = `
        SELECT COUNT(*) AS total FROM surat
        UNION ALL
        SELECT COUNT(*) AS total FROM surat_ku
        UNION ALL
        SELECT COUNT(*) AS total FROM surat_kbi
        UNION ALL
        SELECT COUNT(*) AS total FROM surat_sktm
    `;

    db.query(queryTotalSurat, (errTotalSurat, resultTotalSurat) => {
        if (errTotalSurat) {
            console.error(errTotalSurat);
            return res.status(500).send('Terjadi kesalahan.');
        }

        let totalSurat = 0;
        resultTotalSurat.forEach(row => {
            totalSurat += row.total;
        });

        // Logika untuk menghitung jumlah surat per bulan dan per jenis
        const query = `
            SELECT DATE_FORMAT(tanggal_permohonan, '%Y-%m') AS bulan, 'surat' AS jenis, COUNT(*) AS jumlah FROM surat GROUP BY bulan
            UNION ALL
            SELECT DATE_FORMAT(tanggal_permohonan, '%Y-%m') AS bulan, 'surat_ku' AS jenis, COUNT(*) AS jumlah FROM surat_ku GROUP BY bulan
            UNION ALL
            SELECT DATE_FORMAT(tanggal_permohonan, '%Y-%m') AS bulan, 'surat_kbi' AS jenis, COUNT(*) AS jumlah FROM surat_kbi GROUP BY bulan
            UNION ALL
            SELECT DATE_FORMAT(tanggal_permohonan, '%Y-%m') AS bulan, 'surat_sktm' AS jenis, COUNT(*) AS jumlah FROM surat_sktm GROUP BY bulan
        `;

        db.query(query, (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Terjadi kesalahan.');
            }

            const dataPerBulan = {};
            const dataPerJenis = {};
            result.forEach(row => {
                if (!dataPerBulan[row.bulan]) {
                    dataPerBulan[row.bulan] = 0;
                }
                dataPerBulan[row.bulan] += row.jumlah;

                if (!dataPerJenis[row.jenis]) {
                    dataPerJenis[row.jenis] = 0;
                }
                dataPerJenis[row.jenis] += row.jumlah;
            });

            const labelsBulan = Object.keys(dataPerBulan);
            const dataJumlahBulan = Object.values(dataPerBulan);
            const labelsJenisSurat = Object.keys(dataPerJenis);
            const dataJumlahJenisSurat = Object.values(dataPerJenis);

            res.render('statistik/page_statistik', {
                totalSurat,
                labelsBulan,
                dataJumlahBulan,
                labelsJenisSurat,
                dataJumlahJenisSurat
            });
        });
    });
});

app.get('/pengaturan', (req, res) => {
    res.render('pengaturan/settings');
});

// Rute untuk Halaman Register
app.get('/register', (req, res) => {
    res.render('users/register', { messages: req.flash() });
});

app.post('/register', async (req, res) => {
    const { nama, email, password } = req.body;

    // Validasi
    if (!nama || !email || !password) {
        req.flash('error', 'Semua kolom harus diisi.');
        return res.redirect('/register');
    }

    if (!email.includes('@')) {
        req.flash('error', 'Email harus mengandung karakter @.');
        return res.redirect('/register');
    }

    if (nama.match(/\d+/)) {
        req.flash('error', 'Nama tidak boleh mengandung angka.');
        return res.redirect('/register');
    }

    if (password.length < 8 || password.length > 20 || !password.match(/[A-Z]/) || !password.match(/[a-z]/) || !password.match(/\d/) || !password.match(/[^A-Za-z0-9]/)) {
        req.flash('error', 'Password harus 8-20 karakter, mengandung huruf besar, huruf kecil, angka, dan simbol.');
        return res.redirect('/register');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
            if (err) {
                console.error(err);
                req.flash('error', 'Terjadi kesalahan saat memeriksa email.');
                return res.redirect('/register');
            }

            if (results.length > 0) {
                req.flash('error', 'Email sudah terdaftar.');
                return res.redirect('/register');
            }

            db.query('INSERT INTO users (nama, email, password) VALUES (?, ?, ?)', [nama, email, hashedPassword], (err) => {
                if (err) {
                    console.error(err);
                    req.flash('error', 'Terjadi kesalahan saat mendaftar.');
                    return res.redirect('/register');
                }

                req.flash('success', 'Pendaftaran berhasil. Silakan login.');
                res.redirect('/login');
            });
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Terjadi kesalahan saat mendaftar.');
        res.redirect('/register');
    }
});

// Rute untuk Halaman Login
app.get('/login', (req, res) => {
    res.render('users/login', { messages: req.flash() });
});

app.post('/login', async (req, res) => {
    const { email, password, remember } = req.body;
  
    if (!email || !password) {
      req.flash('error', 'Email dan password harus diisi.');
      return res.redirect('/login');
    }
  
    try {
      const results = await new Promise((resolve, reject) => {
        db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        });
      });
  
      if (results.length === 0) {
        req.flash('error', 'Email atau password salah.');
        return res.redirect('/login');
      }
  
      const user = results[0];
      const passwordMatch = await bcrypt.compare(password, user.password);
  
      if (!passwordMatch) {
        req.flash('error', 'Email atau password salah.');
        return res.redirect('/login');
      }
  
      req.session.userId = user.id;
  
      if (remember) {
        // Atur cookie dengan waktu kedaluwarsa yang lebih lama (misalnya, 30 hari)
        res.cookie('user_id', user.id, { maxAge: 30 * 24 * 60 * 60 * 1000 });
      } else {
        // Atur cookie sesi (cookie akan hilang saat browser ditutup)
        res.cookie('user_id', user.id);
      }
  
      res.redirect('/'); // Redirect ke halaman utama setelah login berhasil
    } catch (err) {
      console.error(err);
      req.flash('error', 'Terjadi kesalahan saat login.');
      return res.redirect('/login');
    }
  });

// Rute untuk Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Route untuk mengambil template yang sudah disimpan
app.get("/get-template", (req, res) => {
    const sql = "SELECT content FROM templates ORDER BY created_at DESC LIMIT 1";
    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching template:', err);
            return res.status(500).send("Error fetching template");
        }
        if (result.length > 0 && result[0].content) {
            res.json({ template: result[0].content });
        } else {
            res.json({ template: "" }); // Atau berikan template default jika belum ada
        }
    });
});

// Route untuk menampilkan halaman template
app.get("/kelola-template", (req, res) => {
    res.render("kelola-template", { template: "" }); // Template akan diisi di sisi frontend saat load
});

// Route untuk menyimpan template
app.post("/save-template", (req, res) => {
    const templateContent = req.body.template;
    const sql = "INSERT INTO templates (content) VALUES (?)";
    db.query(sql, [templateContent], (err, result) => {
        if (err) {
            console.error('Error saving template:', err);
            return res.status(500).json({ message: 'Gagal menyimpan template!' });
        }
        res.json({ message: "Template berhasil disimpan!" });
    });
});


app.get('/download-pdf/:id', (req, res) => {
    const suratId = req.params.id;
    const action = req.query.action;
    const sqlSurat = "SELECT * FROM surat WHERE id = ?";

    db.query(sqlSurat, [suratId], (errSurat, resultSurat) => {
        if (errSurat) {
            console.error('Error fetching surat for PDF:', errSurat);
            return res.status(500).send("Error generating PDF");
        }
        if (resultSurat.length === 0) {
            return res.status(404).send("Surat tidak ditemukan");
        }

        const suratData = resultSurat[0];
        const namaFile = `${suratData.nomor_surat || 'surat'}_${suratData.nama ? suratData.nama.replace(/[^a-zA-Z0-9]/g, '_') : 'unknown'}.pdf`;

        // Convert logo to base64 for consistent display
        const logoPath = path.join(__dirname, 'public', 'image', 'logokebondalem-fix.png');
        const logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' });
        suratData.logoData = `data:image/png;base64,${logoBase64}`;

        // Render template EJS
        ejs.renderFile(
            path.join(__dirname, 'views', 'cetak-surat.ejs'),
            { surat: suratData, path: path, mode: 'pdf' },
            (err, html) => {
                if (err) {
                    console.error('Error rendering EJS template:', err);
                    return res.status(500).send("Error generating PDF");
                }

                // Improved CSS for proper alignment
                const pdfStyle = `
<style>
    /* Global Styles */
    body {
        font-family: "Times New Roman", serif;
        margin: 0;
        padding: 0;
        background-color: white;
        display: block;
    }

    /* Kertas A4 */
    .paper {
        width: 794px;
        height: 1123px;
        background-color: white;
        padding: 40px;
        box-sizing: border-box;
        margin: 0 auto;
    }
    
    .garis-bawah {
        border-bottom: 2px solid black;
        margin: 10px 0;
    }

    /* Header */
    .header {
        text-align: center;
        margin-bottom: 30px;
    }

    .logo {
        width: 80px;
        position: absolute;
        left: 40px;
        top: 40px;
    }

    .header h3 {
        margin: 5px 0;
        font-size: 20px;
        font-weight: normal;
    }

    .header h2 {
        font-size: 24px;
        font-weight: bold;
        margin: 5px 0;
        letter-spacing: 1px;
        word-spacing: 5px;
    }

    .header p {
        margin: 2px 0;
        font-size: 13px;
    }

    .kode-desa {
        text-align: left;
        font-size: 14px;
        margin-top: 10px;
    }

    /* Judul Surat */
    .judul-surat {
        text-align: center;
        margin-top: 30px;
        margin-bottom: 20px;
    }

    .judul-surat h3 {
        font-size: 22px;
        font-weight: bold;
        margin-bottom: 5px;
        text-decoration: underline;
    }

    .judul-surat p {
        font-size: 16px;
        font-weight: bold;
    }

    /* Isi Surat */
    .content {
        margin-top: 20px;
        line-height: 1.6;
        font-size: 14px;
        text-align: justify;
        text-indent: 25px;
    }

    .content strong {
        font-weight: bold;
    }

    /* LIST ITEM ALIGNMENT FIXES */
    .list-item {
        margin-bottom: 8px;
        display: flex;
        align-items: baseline; /* Changed to baseline for better vertical alignment */
        position: relative;
        padding-left: 0;
        list-style: none;
    }
    
    .label {
        width: 200px;
        text-align: left;
        flex-shrink: 0;
        padding-right: 5px;
        box-sizing: border-box;
    }
    
    .colon {
        width: 10px;
        text-align: center;
        flex-shrink: 0;
        position: absolute;
        left: 200px; /* Exact position after label */
    }
    
    .value {
        flex-grow: 1;
        padding-left: 15px; /* Space after colon */
        position: relative;
        margin-top: -1px; /* Fine vertical adjustment */
    }
    
    .lk-pr {
        position: absolute;
        right: 10px;
        top: -1px; /* Slightly raised */
        font-weight: normal;
    }

    /* Tanda Tangan */
    .signature-container {
        display: flex;
        justify-content: space-between;
        width: 100%;
        margin-top: -10px;
    }

    .pemegang-ttd, .kepala-desa-ttd {
        flex-basis: 45%;
        text-align: center;
    }

    .ttd-kanan {
        text-align: right; 
        width: 40%;
        margin-left: auto;
        margin-right: 70px;
    }

    .tanggal-ttd {
        text-align: right;
        margin-right: 68px;
    }

    .sekretaris {
        margin-right: 60px;
        margin-top: -12px;
    }

    .daru-purnomo {
        margin-right: 43px;
        text-decoration: underline;
        margin-top: 13px;
    }

    .signature-name {
        text-decoration: underline;
        font-weight: bold;
    }

    /* Sembunyikan elemen no-print */
    .no-print {
        display: none !important;
    }
</style>
`;

                html = html.replace('</head>', pdfStyle + '</head>');

                // Remove unwanted elements
                html = html
                    .replace(/<div class="no-print">[\s\S]*?<\/div>/g, '')
                    .replace(/<script[\s\S]*?<\/script>/g, '')
                    .replace(/<div id="downloadOptionsModal"[\s\S]*?<\/div>/g, '');

                const options = {
                    format: 'A4',
                    border: '0mm',
                    timeout: 60000,
                    type: 'pdf',
                    height: '297mm',
                    width: '210mm',
                    orientation: 'portrait',
                    printBackground: true
                };

                htmlPdf.create(html, options).toBuffer((err, buffer) => {
                    if (err) {
                        console.error('Error generating PDF:', err);
                        return res.status(500).send("Error generating PDF");
                    }

                    res.setHeader('Content-Type', 'application/pdf');
                    let contentDisposition = action === 'download' ? 'attachment' : 'inline';
                    res.setHeader('Content-Disposition', `${contentDisposition}; filename="${namaFile}"`);
                    res.send(buffer);
                });
            }
        );
    });
});

// Fungsi untuk preview PDF
function previewPdf(suratId) {
    // Buka dalam tab baru dengan ukuran yang sesuai
    const previewWindow = window.open(`/download-pdf/${suratId}?action=preview`, '_blank', 
        'width=900,height=1200,scrollbars=yes,resizable=yes');
    
    // Fokuskan window baru
    if (previewWindow) {
        previewWindow.focus();
    }
    
    closeDownloadOptions();
}

// Route untuk menampilkan detail surat
app.get('/surat-pengantar/:id', (req, res) => {
    const suratId = req.params.id;
    const sql = "SELECT * FROM surat WHERE id = ?";
    
    db.query(sql, [suratId], (err, result) => {
        if (err) {
            console.error('Error fetching surat by ID:', err);
            return res.status(500).send("Error fetching data");
        }
        if (result.length === 0) {
            return res.status(404).send("Surat tidak ditemukan");
        }
        
        res.render('detail-surat', { surat: result[0] });
    });
});

// Route Surat Pengantar - Fixed Version
app.get('/surat-pengantar/', (req, res) => {
    const { status, search, page = 1, perPage = 10 } = req.query;
    let sql = "SELECT * FROM surat";
    let whereClauses = [];
    let params = [];
    
    // Filter status
    if (status && status !== 'semua') {
        whereClauses.push("status = ?");
        params.push(status);
    }
    
    // Filter search
    if (search) {
        whereClauses.push("(nomor_surat LIKE ? OR nama LIKE ?)");
        params.push(`%${search}%`, `%${search}%`);
    }
    
    if (whereClauses.length > 0) {
        sql += " WHERE " + whereClauses.join(" AND ");
    }
    
    // Hitung total data
    const countQuery = "SELECT COUNT(*) as total FROM surat" + 
                      (whereClauses.length > 0 ? " WHERE " + whereClauses.join(" AND ") : "");
    
    // Query status counts
    const statusQuery = `
        SELECT 
            SUM(CASE WHEN status = 'Diproses' THEN 1 ELSE 0 END) as diproses,
            SUM(CASE WHEN status = 'Selesai' THEN 1 ELSE 0 END) as selesai,
            SUM(CASE WHEN status = 'Ditolak' THEN 1 ELSE 0 END) as ditolak
        FROM surat
        ${whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : ""}
    `;
    
    // Eksekusi query secara berurutan dengan error handling
    db.query(statusQuery, params, (errStatus, statusResult) => {
        if (errStatus) {
            console.error('Error counting status:', errStatus);
            return res.status(500).send("Error fetching status counts");
        }

        db.query(countQuery, params, (errCount, countResult) => {
            if (errCount) {
                console.error('Error counting data:', errCount);
                return res.status(500).send("Error counting data");
            }

            const totalItems = countResult && countResult[0] ? countResult[0].total : 0;
            const totalPages = Math.ceil(totalItems / perPage);
            const offset = (page - 1) * perPage;

            // Query data utama dengan pagination
            db.query(sql + ` LIMIT ? OFFSET ?`, [...params, parseInt(perPage), offset], (err, dataResult) => {
                if (err) {
                    console.error('Error fetching surat:', err);
                    return res.status(500).send("Error fetching data");
                }

                // Tentukan apakah ini request AJAX atau full page load
                const isAjax = req.xhr || req.headers.accept.indexOf('json') > -1;

                const renderData = {
                    surat: dataResult,
                    statusCounts: statusResult && statusResult[0] ? statusResult[0] : { diproses: 0, selesai: 0, ditolak: 0 },
                    currentPage: parseInt(page),
                    perPage: parseInt(perPage),
                    totalItems: totalItems,
                    totalPages: totalPages,
                    currentStatus: status || 'semua',
                    currentSearch: search || ''
                };

                if (isAjax) {
                    // Untuk AJAX requests, render hanya bagian table
                    res.render('partials/surat-table', renderData);
                } else {
                    // Untuk full page loads
                    res.render('surat-pengantar', renderData);
                }
            });
        });
    });
});

// Route untuk create surat baru
// API endpoint untuk menambahkan surat baru
app.post('/api/surat-pengantar', (req, res) => {
    try {
        // Validasi field yang diperlukan
        const requiredFields = [
            'nama', 'tempat_tanggal_lahir', 'kewarganegaraan_agama',
            'tempat_domisili', 'daerah_asal', 'surat_bukti_diri',
            'keperluan', 'tujuan'
        ];

        const missingFields = requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Field berikut harus diisi: ${missingFields.join(', ')}`,
                error: 'MISSING_REQUIRED_FIELDS',
                missingFields
            });
        }

        // Validasi format NIK (16 digit)
        if (!/^\d{16}$/.test(req.body.surat_bukti_diri)) {
            return res.status(400).json({
                success: false,
                message: 'NIK harus terdiri dari 16 digit angka',
                error: 'INVALID_NIK_FORMAT'
            });
        }

        // Validasi format tempat tanggal lahir
        if (!/^[a-zA-Z\s]+\,\s\d{1,2}\s[a-zA-Z]+\s\d{4}$/.test(req.body.tempat_tanggal_lahir)) {
            return res.status(400).json({
                success: false,
                message: 'Format Tempat, Tanggal Lahir salah. Contoh: Jakarta, 20 Februari 2004',
                error: 'INVALID_DATE_FORMAT'
            });
        }

        // Ekstrak data dari body request
        const {
            nama,
            tempat_tanggal_lahir,
            kewarganegaraan_agama,
            pekerjaan = '',
            tempat_domisili,
            daerah_asal,
            surat_bukti_diri,
            keperluan,
            tujuan
        } = req.body;

        const tanggal_permohonan = new Date().toISOString().split('T')[0];
        const jenis_surat = 'Surat Pengantar';
        const status = 'Diproses';

        // Mulai transaction
        db.beginTransaction((beginErr) => {
            if (beginErr) {
                console.error('Error starting transaction:', beginErr);
                return res.status(500).json({
                    success: false,
                    message: 'Gagal memulai transaksi database',
                    error: beginErr.message
                });
            }

            // 1. Insert data surat pengantar
            const insertSql = `INSERT INTO surat 
                (nama, tempat_tanggal_lahir, kewarganegaraan_agama, pekerjaan, 
                 tempat_domisili, daerah_asal, surat_bukti_diri, keperluan, 
                 tujuan, jenis_surat, status, tanggal_permohonan, file_pdf)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`;
            
            db.query(insertSql, [
                nama,
                tempat_tanggal_lahir,
                kewarganegaraan_agama,
                pekerjaan,
                tempat_domisili,
                daerah_asal,
                surat_bukti_diri,
                keperluan,
                tujuan,
                jenis_surat,
                status,
                tanggal_permohonan
            ], (insertErr, insertResult) => {
                if (insertErr) {
                    return db.rollback(() => {
                        console.error('Error inserting surat:', insertErr);
                        res.status(500).json({
                            success: false,
                            message: 'Gagal menyimpan surat',
                            error: insertErr.message
                        });
                    });
                }

                const newId = insertResult.insertId;
                const tahun = new Date().getFullYear();
                const nomor_surat = `SP/${String(newId).padStart(3, '0')}/${tahun}`;

                // 2. Update nomor surat
                const updateSql = "UPDATE surat SET nomor_surat = ? WHERE id = ?";
                db.query(updateSql, [nomor_surat, newId], (updateErr) => {
                    if (updateErr) {
                        return db.rollback(() => {
                            console.error('Error updating nomor surat:', updateErr);
                            res.status(500).json({
                                success: false,
                                message: 'Gagal mengupdate nomor surat',
                                error: updateErr.message
                            });
                        });
                    }

                    // 3. Buat notifikasi
                    const notificationTitle = 'Surat Pengantar Baru';
                    const notificationMessage = `Surat Pengantar untuk ${nama} (${nomor_surat}) berhasil dibuat`;
                    
                    const notifSql = `INSERT INTO notifications 
                        (user_id, type, title, message, related_id, related_type, is_read, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`;
                    
                    db.query(notifSql, [
                        req.session.userId,
                        'surat',
                        notificationTitle,
                        notificationMessage,
                        newId,
                        'surat'
                    ], (notifErr) => {
                        if (notifErr) {
                            return db.rollback(() => {
                                console.error('Error creating notification:', notifErr);
                                res.status(500).json({
                                    success: false,
                                    message: 'Gagal membuat notifikasi',
                                    error: notifErr.message
                                });
                            });
                        }

                        // Commit transaction
                        db.commit((commitErr) => {
                            if (commitErr) {
                                return db.rollback(() => {
                                    console.error('Error committing transaction:', commitErr);
                                    res.status(500).json({
                                        success: false,
                                        message: 'Gagal menyelesaikan transaksi',
                                        error: commitErr.message
                                    });
                                });
                            }

                            // Kirim notifikasi real-time via SSE
                            sendNotification(req.session.userId, {
                                    id: newId,
                                    type: 'surat',
                                    title: notificationTitle,
                                    message: notificationMessage,
                                    related_id: newId,
                                    nomor_surat: nomor_surat,
                                    nama: nama,
                                    created_at: new Date()
                                });

                            // Respon sukses
                            res.status(201).json({
                                success: true,
                                message: 'Surat Pengantar berhasil dibuat',
                                data: {
                                    id: newId,
                                    nomor_surat,
                                    nama,
                                    tempat_tanggal_lahir,
                                    kewarganegaraan_agama,
                                    pekerjaan,
                                    tempat_domisili,
                                    daerah_asal,
                                    surat_bukti_diri,
                                    keperluan,
                                    tujuan,
                                    jenis_surat,
                                    status,
                                    tanggal_permohonan
                                }
                            });
                        });
                    });
                });
            });
        });
    } catch (error) {
        console.error('Unexpected error:', error);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server yang tidak terduga',
            error: error.message,
            errorCode: 'SERVER_ERROR'
        });
    }
});

// Route untuk update surat (PUT)
// Route untuk update surat (PUT)
app.put('/api/surat-pengantar/:id', express.json(), async (req, res) => {
    const suratId = req.params.id;
    const {
        nama,
        tempat_tanggal_lahir,
        kewarganegaraan_agama,
        pekerjaan,
        tempat_domisili,
        daerah_asal,
        surat_bukti_diri,
        keperluan,
        tujuan,
        status,
        nomor_wa // Tambahkan nomor_wa di sini
    } = req.body;

    try {
        // 1. Validasi Input
        const requiredFields = [
            'nama', 'tempat_tanggal_lahir', 'kewarganegaraan_agama',
            'tempat_domisili', 'daerah_asal', 'surat_bukti_diri',
            'keperluan', 'tujuan', 'status'
        ];

        const missingFields = requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Field berikut harus diisi: ${missingFields.join(', ')}`
            });
        }

        // Validasi format NIK (16 digit)
        if (!/^\d{16}$/.test(surat_bukti_diri)) {
            return res.status(400).json({
                success: false,
                message: 'NIK harus terdiri dari 16 digit angka'
            });
        }

        // Validasi status
        const allowedStatus = ['Diproses', 'Selesai', 'Ditolak'];
        if (!allowedStatus.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status tidak valid"
            });
        }

        // 2. Ambil data saat ini
        const getCurrentData = () => new Promise((resolve, reject) => {
            db.query('SELECT nomor_surat, tanggal_permohonan FROM surat WHERE id = ?', [suratId], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]);
            });
        });

        const currentData = await getCurrentData();
        if (!currentData) {
            return res.status(404).json({
                success: false,
                message: "Surat tidak ditemukan"
            });
        }

        // 3. Update data
        const updateData = () => new Promise((resolve, reject) => {
            const sql = `
                UPDATE surat SET
                    nama = ?,
                    tempat_tanggal_lahir = ?,
                    kewarganegaraan_agama = ?,
                    pekerjaan = ?,
                    tempat_domisili = ?,
                    daerah_asal = ?,
                    surat_bukti_diri = ?,
                    keperluan = ?,
                    tujuan = ?,
                    status = ?,
                    nomor_wa = ?,
                    updated_at = NOW()
                WHERE id = ?
            `;
            db.query(sql, [
                nama,
                tempat_tanggal_lahir,
                kewarganegaraan_agama,
                pekerjaan,
                tempat_domisili,
                daerah_asal,
                surat_bukti_diri,
                keperluan,
                tujuan,
                status,
                nomor_wa,
                suratId
            ], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        const result = await updateData();
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Gagal memperbarui data surat"
            });
        }

        // 4. Catat aktivitas
        try {
            await logActivity(
                req.session.userId,
                'edit',
                'surat',
                suratId,
                `Mengedit surat pengantar ${currentData.nomor_surat}`
            );
        } catch (logError) {
            console.error('Gagal mencatat aktivitas:', logError);
        }

        // 5. Response sukses
        res.json({
            success: true,
            message: "Data surat pengantar berhasil diperbarui",
            data: {
                id: suratId,
                nomor_surat: currentData.nomor_surat,
                tanggal_permohonan: currentData.tanggal_permohonan,
                status: status,
                nomor_wa: nomor_wa
            }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan server",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});


// Route untuk mendapatkan data surat berdasarkan ID (untuk edit)
app.get('/api/surat-pengantar/:id', (req, res) => {
    const suratId = req.params.id;
    const sql = "SELECT * FROM surat WHERE id = ?";
    
    db.query(sql, [suratId], (err, result) => {
        if (err) {
            console.error('Error fetching surat by ID:', err);
            return res.status(500).json({ 
                success: false,
                message: "Error fetching data" 
            });
        }
        if (result.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: "Surat tidak ditemukan" 
            });
        }
        res.json({
            success: true,
            data: result[0] // Pastikan data dikembalikan dalam properti 'data'
        });
    });
});

app.put('/api/surat-pengantar/signatory/:id', express.json(), async (req, res) => {
    try {
        const suratPengantarId = req.params.id;
        const { jabatan_penandatangan, jabatan_sebenarnya, nama_penandatangan } = req.body;

        // Validasi input
        if (!jabatan_penandatangan || !jabatan_sebenarnya || !nama_penandatangan) {
            return res.status(400).json({
                success: false,
                message: "Semua field penandatangan harus diisi"
            });
        }

        // Update database menggunakan callback style untuk konsistensi
        const updateSignatory = () => new Promise((resolve, reject) => {
            const sql = `
                UPDATE surat SET
                    jabatan_penandatangan = ?,
                    jabatan_sebenarnya = ?,
                    nama_penandatangan = ?,
                    updated_at = NOW()
                WHERE id = ?
            `;
            db.query(sql, [
                jabatan_penandatangan,
                jabatan_sebenarnya,
                nama_penandatangan,
                suratPengantarId
            ], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        const result = await updateSignatory();

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Surat tidak ditemukan atau tidak ada perubahan"
            });
        }

        // Catat aktivitas
        try {
            await logActivity(
                req.session.userId,
                'update_signatory',
                'surat',
                suratPengantarId,
                `Memperbarui informasi penandatangan surat pengantar`
            );
        } catch (logError) {
            console.error('Gagal mencatat aktivitas:', logError);
        }

        res.json({
            success: true,
            message: "Informasi penandatangan berhasil diperbarui"
        });

    } catch (error) {
        console.error('Error updating signatory info:', error);
        res.status(500).json({
            success: false,
            message: "Gagal memperbarui informasi penandatangan",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Route Cetak Surat
app.get('/cetak-surat/:id', (req, res) => {
    const suratId = req.params.id;
    const mode = req.query.mode;
    const sqlSurat = "SELECT * FROM surat WHERE id = ?";

    db.query(sqlSurat, [suratId], (errSurat, resultSurat) => {
        if (errSurat) {
            console.error('Error fetching surat by ID:', errSurat);
            return res.status(500).send("Error fetching data");
        }
        if (resultSurat.length === 0) {
            return res.status(404).send("Surat tidak ditemukan");
        }
        const suratData = resultSurat[0];
        res.render('cetak-surat', { surat: suratData,
        mode: mode  });
    });
});


// Route untuk menampilkan detail surat_ku
app.get('/surat-ku/:id', (req, res) => {
    const suratKuId = req.params.id;
    const sql = "SELECT * FROM surat_ku WHERE id = ?";

    db.query(sql, [suratKuId], (err, result) => {
        if (err) {
            console.error('Error fetching surat_ku by ID:', err);
            return res.status(500).send("Error fetching data");
        }
        if (result.length === 0) {
            return res.status(404).send("Surat KU tidak ditemukan");
        }

        // Perbaikan: gunakan 'result' bukan 'results'
        res.render('surat-ku/detail-surat-ku', { surat: result[0] });
    });
});

// Route Surat KU - Fixed Version
app.get('/surat-ku', (req, res) => {
    const { status, search, page = 1, perPage = 10 } = req.query;
    let sql = "SELECT * FROM surat_ku";
    let whereClauses = [];
    let params = [];

    // Filter status
    if (status && status !== 'semua') {
        whereClauses.push("status = ?");
        params.push(status);
    }

    // Filter search
    if (search) {
        whereClauses.push("(nomor_surat LIKE ? OR nama LIKE ?)");
        params.push(`%${search}%`, `%${search}%`);
    }

    if (whereClauses.length > 0) {
        sql += " WHERE " + whereClauses.join(" AND ");
    }

    // Hitung total data
    const countQuery = "SELECT COUNT(*) as total FROM surat_ku" +
        (whereClauses.length > 0 ? " WHERE " + whereClauses.join(" AND ") : "");

    // Query status counts
    const statusQuery = `
        SELECT 
            SUM(CASE WHEN status = 'Diproses' THEN 1 ELSE 0 END) as diproses,
            SUM(CASE WHEN status = 'Selesai' THEN 1 ELSE 0 END) as selesai,
            SUM(CASE WHEN status = 'Ditolak' THEN 1 ELSE 0 END) as ditolak
        FROM surat_ku
        ${whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : ""}
    `;

    // Eksekusi query secara berurutan dengan error handling
    db.query(statusQuery, params, (errStatus, statusResult) => {
        if (errStatus) {
            console.error('Error counting status:', errStatus);
            return res.status(500).send("Error fetching status counts");
        }

        db.query(countQuery, params, (errCount, countResult) => {
            if (errCount) {
                console.error('Error counting data:', errCount);
                return res.status(500).send("Error counting data");
            }

            const totalItems = countResult && countResult[0] ? countResult[0].total : 0;
            const totalPages = Math.ceil(totalItems / perPage);
            const offset = (page - 1) * perPage;

            // Query data utama dengan pagination
            db.query(sql + ` LIMIT ? OFFSET ?`, [...params, parseInt(perPage), offset], (err, dataResult) => {
                if (err) {
                    console.error('Error fetching surat_ku:', err);
                    return res.status(500).send("Error fetching data");
                }

                const renderData = {
                    suratKU: dataResult,
                    statusCountsKU: statusResult && statusResult[0] ? statusResult[0] : { diproses: 0, selesai: 0, ditolak: 0 },
                    currentPageKU: parseInt(page),
                    perPageKU: parseInt(perPage),
                    totalItemsKU: totalItems,
                    totalPagesKU: totalPages,
                    currentStatusKU: status || 'semua',
                    currentSearchKU: search || ''
                };

                res.render('surat-ku/surat-ku', renderData); // Perbarui path ini
            });
        });
    });
});

// API endpoint untuk menambahkan surat_ku baru
app.post('/surat-ku', (req, res) => {
    try {
        // Validasi field yang diperlukan
        const requiredFields = [
            'nama', 'tempat_tanggal_lahir', 'no_ktp', 'alamat_ktp',
            'jenis_usaha', 'alamat_usaha', 'lama_usaha',
            'nama_bank', 'alamat_bank'
        ];

        const missingFields = requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Field berikut harus diisi: ${missingFields.join(', ')}`,
                error: 'MISSING_REQUIRED_FIELDS'
            });
        }

        // Validasi format NIK (16 digit)
        if (!/^\d{16}$/.test(req.body.no_ktp)) {
            return res.status(400).json({
                success: false,
                message: 'NIK harus terdiri dari 16 digit angka',
                error: 'INVALID_NIK_FORMAT'
            });
        }

        // Validasi format tempat tanggal lahir
        if (!/^[a-zA-Z\s]+\,\s\d{1,2}\s[a-zA-Z]+\s\d{4}$/.test(req.body.tempat_tanggal_lahir)) {
            return res.status(400).json({
                success: false,
                message: 'Format Tempat, Tanggal Lahir salah. Contoh: Jakarta, 20 Februari 2004',
                error: 'INVALID_DATE_FORMAT'
            });
        }

        // Ekstrak data dari body request
        const {
            nama,
            tempat_tanggal_lahir,
            no_ktp,
            alamat_ktp,
            jenis_usaha,
            alamat_usaha,
            lama_usaha,
            nama_bank,
            alamat_bank
        } = req.body;

        const tanggal_permohonan = new Date().toISOString().split('T')[0];
        const jenis_surat = 'Keterangan Usaha';
        const status = 'Diproses';

        // Mulai transaction
        db.beginTransaction((beginErr) => {
            if (beginErr) {
                console.error('Error starting transaction:', beginErr);
                return res.status(500).json({
                    success: false,
                    message: 'Gagal memulai transaksi database',
                    error: beginErr.message
                });
            }

            // 1. Insert data surat_ku
            const insertSql = `INSERT INTO surat_ku 
                (nomor_surat, nama, tempat_tanggal_lahir, no_ktp, alamat_ktp,
                 jenis_usaha, alamat_usaha, lama_usaha, nama_bank,
                 alamat_bank, jenis_surat, status, tanggal_permohonan)
                VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            
            db.query(insertSql, [
                nama,
                tempat_tanggal_lahir,
                no_ktp,
                alamat_ktp,
                jenis_usaha,
                alamat_usaha,
                lama_usaha,
                nama_bank,
                alamat_bank,
                jenis_surat,
                status,
                tanggal_permohonan
            ], (insertErr, insertResult) => {
                if (insertErr) {
                    return db.rollback(() => {
                        console.error('Error inserting surat_ku:', insertErr);
                        res.status(500).json({
                            success: false,
                            message: 'Gagal menyimpan surat',
                            error: insertErr.message
                        });
                    });
                }

                const newId = insertResult.insertId;
                const tahun = new Date().getFullYear();
                const nomor_surat = `SKU/${String(newId).padStart(3, '0')}/${tahun}`;

                // 2. Update nomor surat
                const updateSql = "UPDATE surat_ku SET nomor_surat = ? WHERE id = ?";
                db.query(updateSql, [nomor_surat, newId], (updateErr) => {
                    if (updateErr) {
                        return db.rollback(() => {
                            console.error('Error updating nomor surat:', updateErr);
                            res.status(500).json({
                                success: false,
                                message: 'Gagal mengupdate nomor surat',
                                error: updateErr.message
                            });
                        });
                    }

                    // 3. Buat notifikasi
                    const notificationTitle = 'Surat Keterangan Usaha Baru';
                    const notificationMessage = `Surat KU untuk ${nama} (${nomor_surat}) berhasil dibuat`;
                    
                    const notifSql = `INSERT INTO notifications 
                        (user_id, type, title, message, related_id, related_type, is_read, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`;
                    
                    db.query(notifSql, [
                        req.session.userId,
                        'surat_ku',
                        notificationTitle,
                        notificationMessage,
                        newId,
                        'surat_ku'
                    ], (notifErr) => {
                        if (notifErr) {
                            return db.rollback(() => {
                                console.error('Error creating notification:', notifErr);
                                res.status(500).json({
                                    success: false,
                                    message: 'Gagal membuat notifikasi',
                                    error: notifErr.message
                                });
                            });
                        }

                        // Commit transaction
                        db.commit((commitErr) => {
                            if (commitErr) {
                                return db.rollback(() => {
                                    console.error('Error committing transaction:', commitErr);
                                    res.status(500).json({
                                        success: false,
                                        message: 'Gagal menyelesaikan transaksi',
                                        error: commitErr.message
                                    });
                                });
                            }

                          // Kirim notifikasi real-time via SSE
sendNotification(req.session.userId, {
    id: newId,
    type: 'surat_ku',
    title: notificationTitle,
    message: notificationMessage,
    related_id: newId,
    nomor_surat: nomor_surat,
    nama: nama,
    created_at: new Date()
});

                            // Respon sukses
                            res.status(201).json({
                                success: true,
                                message: 'Surat Keterangan Usaha berhasil dibuat',
                                data: {
                                    id: newId,
                                    nomor_surat,
                                    nama,
                                    tempat_tanggal_lahir,
                                    no_ktp,
                                    alamat_ktp,
                                    jenis_usaha,
                                    alamat_usaha,
                                    lama_usaha,
                                    nama_bank,
                                    alamat_bank,
                                    jenis_surat,
                                    status,
                                    tanggal_permohonan
                                }
                            });
                        });
                    });
                });
            });
        });
    } catch (error) {
        console.error('Unexpected error:', error);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server yang tidak terduga',
            error: error.message,
            errorCode: 'SERVER_ERROR'
        });
    }
});


app.put('/api/surat-ku/:id', express.json(), async (req, res) => {
    const suratKuId = req.params.id;
    const { nama, no_ktp, alamat_ktp, jenis_usaha, alamat_usaha, lama_usaha, nama_bank, alamat_bank, status, nomor_wa } = req.body;

    try {
        // Validasi input
        if (!nama || !no_ktp || !alamat_ktp || !jenis_usaha || !alamat_usaha || !lama_usaha || !nama_bank || !alamat_bank || !status) {
            return res.status(400).json({
                success: false,
                message: "Semua field harus diisi"
            });
        }

        // Validasi format NIK
        if (!/^\d{16}$/.test(no_ktp)) {
            return res.status(400).json({
                success: false,
                message: "NIK harus 16 digit angka"
            });
        }

        // Validasi status
        const allowedStatus = ['Diproses', 'Selesai', 'Ditolak'];
        if (!allowedStatus.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status tidak valid"
            });
        }

        // Validasi format nomor WA (opsional, bisa disesuaikan)
        if (nomor_wa && !/^\+?\d+$/.test(nomor_wa)) {
            return res.status(400).json({
                success: false,
                message: "Format Nomor WA tidak valid"
            });
        }

        // 1. Ambil data saat ini untuk mendapatkan nomor_surat
        const getCurrentData = () => new Promise((resolve, reject) => {
            db.query('SELECT nomor_surat FROM surat_ku WHERE id = ?', [suratKuId], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]); // Ambil baris pertama
            });
        });

        const currentData = await getCurrentData();
        if (!currentData) {
            return res.status(404).json({
                success: false,
                message: "Surat KU tidak ditemukan"
            });
        }

        // 2. Lakukan update data
        const updateData = () => new Promise((resolve, reject) => {
            const sql = `
                UPDATE surat_ku SET
                    nama = ?,
                    no_ktp = ?,
                    alamat_ktp = ?,
                    jenis_usaha = ?,
                    alamat_usaha = ?,
                    lama_usaha = ?,
                    nama_bank = ?,
                    alamat_bank = ?,
                    status = ?,
                    nomor_wa = ?,
                    updated_at = NOW()
                WHERE id = ?
            `;
            db.query(sql, [
                nama, no_ktp, alamat_ktp, jenis_usaha, alamat_usaha,
                lama_usaha, nama_bank, alamat_bank, status, nomor_wa, suratKuId
            ], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        const result = await updateData();
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Gagal memperbarui data surat KU"
            });
        }

        // 3. Catat aktivitas (dengan error handling)
        try {
            await logActivity(
                req.session.userId,
                'edit',
                'surat_ku',
                suratKuId,
                `Mengedit surat KU ${currentData.nomor_surat}`
            );
        } catch (logError) {
            console.error('Gagal mencatat aktivitas:', logError);
            // Lanjutkan tanpa menghentikan operasi
        }

        // 4. Kirim response sukses
        res.json({
            success: true,
            message: "Data surat KU berhasil diperbarui",
            data: {
                id: suratKuId,
                nomor_surat: currentData.nomor_surat,
                status: status,
                nomor_wa: nomor_wa
            }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat memperbarui data",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.get('/api/surat-ku/:id', (req, res) => {
    const suratId = req.params.id;

    // Validasi ID
    if (!suratId || isNaN(suratId)) {
        return res.status(400).json({
            success: false,
            message: "ID surat tidak valid"
        });
    }

    const sql = "SELECT *, DATE_FORMAT(tanggal_permohonan, '%Y-%m-%d') as tanggal_permohonan FROM surat_ku WHERE id = ?";

    db.query(sql, [suratId], (err, result) => {
        if (err) {
            console.error('Error fetching surat_ku by ID:', err);
            return res.status(500).json({
                success: false,
                message: "Gagal memuat data surat",
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }

        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Surat KU tidak ditemukan"
            });
        }

        // Format data sebelum dikirim
        let suratData = { ...result[0] };
        try {
            suratData.tanggal_permohonan_formatted = new Date(result[0].tanggal_permohonan).toLocaleDateString('id-ID');
        } catch (dateError) {
            console.error('Error formatting tanggal_permohonan:', dateError);
            suratData.tanggal_permohonan_formatted = "Tanggal tidak valid"; // Atau nilai default lainnya
        }

        res.setHeader('Content-Type', 'application/json');
        res.json({
            success: true,
            data: suratData
        });
    });
});

app.put('/surat-ku/:id', express.json(), async (req, res) => {
    try {
        const suratKUId = req.params.id;
        const { jabatan_penandatangan, jabatan_sebenarnya, nama_penandatangan } = req.body;

        // Update the database
        const [result] = await db.query(`
            UPDATE surat_keterangan_usaha SET
                jabatan_penandatangan = ?,
                jabatan_sebenarnya = ?,
                nama_penandatangan = ?,
                updated_at = NOW()
            WHERE id = ?
        `, [
            jabatan_penandatangan,
            jabatan_sebenarnya,
            nama_penandatangan,
            suratKUId
        ]);

        res.json({
            success: true,
            message: "Informasi penandatangan surat keterangan usaha berhasil diperbarui"
        });

    } catch (error) {
        console.error('Error updating signatory info for surat keterangan usaha:', error);
        res.status(500).json({
            success: false,
            message: "Gagal memperbarui informasi penandatangan surat keterangan usaha"
        });
    }
});

app.put('/api/surat-ku/signatory/:id', express.json(), async (req, res) => {
    try {
        const suratKUId = req.params.id;
        const { jabatan_penandatangan, jabatan_sebenarnya, nama_penandatangan } = req.body;

        // Validasi input
        if (!jabatan_penandatangan || !jabatan_sebenarnya || !nama_penandatangan) {
            return res.status(400).json({
                success: false,
                message: "Semua field penandatangan harus diisi"
            });
        }

        // Update database menggunakan callback style untuk konsistensi
        const updateSignatory = () => new Promise((resolve, reject) => {
            const sql = `
                UPDATE surat_ku SET
                    jabatan_penandatangan = ?,
                    jabatan_sebenarnya = ?,
                    nama_penandatangan = ?,
                    updated_at = NOW()
                WHERE id = ?
            `;
            db.query(sql, [
                jabatan_penandatangan,
                jabatan_sebenarnya,
                nama_penandatangan,
                suratKUId
            ], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        const result = await updateSignatory();

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Surat tidak ditemukan atau tidak ada perubahan"
            });
        }

        // Catat aktivitas
        try {
            await logActivity(
                req.session.userId,
                'update_signatory',
                'surat_ku',
                suratKUId,
                `Memperbarui informasi penandatangan surat keterangan usaha`
            );
        } catch (logError) {
            console.error('Gagal mencatat aktivitas:', logError);
        }

        res.json({
            success: true,
            message: "Informasi penandatangan berhasil diperbarui"
        });

    } catch (error) {
        console.error('Error updating signatory info:', error);
        res.status(500).json({
            success: false,
            message: "Gagal memperbarui informasi penandatangan",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Route Cetak Surat KU
app.get('/cetak-surat-ku/:id', (req, res) => {
    const suratKuId = req.params.id;
    const mode = req.query.mode;
    const sqlSuratKU = "SELECT * FROM surat_ku WHERE id = ?";

    db.query(sqlSuratKU, [suratKuId], (errSuratKU, resultSuratKU) => {
        if (errSuratKU) {
            console.error('Error fetching surat_ku by ID:', errSuratKU);
            return res.status(500).send("Error fetching data");
        }
        if (resultSuratKU.length === 0) {
            return res.status(404).send("Surat KU tidak ditemukan");
        }
        const suratKUData = resultSuratKU[0];
        // Perbaikan: gunakan suratKU bukan surat
        res.render('surat-ku/cetak-surat-ku', { suratKU: suratKUData, mode: mode });
    });
});



app.get('/download-pdf-ku/:id', (req, res) => {
    const suratKuId = req.params.id;
    const action = req.query.action;
    const sqlSuratKu = "SELECT * FROM surat_ku WHERE id = ?";

    db.query(sqlSuratKu, [suratKuId], (errSuratKu, resultSuratKu) => {
        if (errSuratKu) {
            console.error('Error fetching surat_ku for PDF:', errSuratKu);
            return res.status(500).send("Error generating PDF");
        }
        if (resultSuratKu.length === 0) {
            return res.status(404).send("Surat KU tidak ditemukan");
        }

        const suratKuData = resultSuratKu[0];
        const namaFile = `${suratKuData.nomor_surat || 'surat_ku'}_${suratKuData.nama ? suratKuData.nama.replace(/[^a-zA-Z0-9]/g, '_') : 'unknown'}.pdf`;

        const logoPath = path.join(__dirname, 'public', 'image', 'logokebondalem-fix.png');
        const logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' });
        suratKuData.logoData = `data:image/png;base64,${logoBase64}`;

        ejs.renderFile(
            path.join(__dirname, 'views', 'surat-ku', 'cetak-surat-ku.ejs'),
            { surat: suratKuData, path: path, mode: 'pdf' },
            (err, html) => {
                if (err) {
                    console.error('Error rendering EJS template:', err);
                    return res.status(500).send("Error generating PDF");
                }

                const pdfStyle = `
<style>
    /* Global Styles */
    body {
        font-family: "Times New Roman", serif;
        margin: 0;
        padding: 0;
        background-color: white;
        display: block;
    }

    /* Kertas A4 */
    .paper {
        width: 794px;
        height: 1123px;
        background-color: white;
        padding: 40px;
        box-sizing: border-box;
        margin: 0 auto;
    }
    
    .garis-bawah {
        border-bottom: 2px solid black;
        margin: 10px 0;
    }

    /* Header */
    .header {
        text-align: center;
        margin-bottom: 30px;
    }

    .logo {
        width: 80px;
        position: absolute;
        left: 40px;
        top: 40px;
    }

    .header h3 {
        margin: 5px 0;
        font-size: 20px;
        font-weight: normal;
    }

    .header h2 {
        font-size: 24px;
        font-weight: bold;
        margin: 5px 0;
        letter-spacing: 1px;
        word-spacing: 5px;
    }

    .header p {
        margin: 2px 0;
        font-size: 13px;
    }

    .kode-desa {
        text-align: left;
        font-size: 14px;
        margin-top: 10px;
    }

    /* Judul Surat */
    .judul-surat {
        text-align: center;
        margin-top: 30px;
        margin-bottom: 20px;
    }

    .judul-surat h3 {
        font-size: 22px;
        font-weight: bold;
        margin-bottom: 5px;
        text-decoration: underline;
    }

    .judul-surat p {
        font-size: 16px;
        font-weight: bold;
    }

    /* Isi Surat */
    .content {
        margin-top: 20px;
        line-height: 1.6;
        font-size: 14px;
        text-align: justify;
        text-indent: 25px;
    }

    .content strong {
        font-weight: bold;
    }

    /* LIST ITEM ALIGNMENT FIXES */
    .list-item {
        margin-bottom: 8px;
        display: flex;
        align-items: baseline;
        position: relative;
        padding-left: 0;
        list-style: none;
    }
    
    .label {
        width: 200px;
        text-align: left;
        flex-shrink: 0;
        padding-right: 5px;
        box-sizing: border-box;
    }
    
    .colon {
        width: 10px;
        text-align: center;
        flex-shrink: 0;
        position: absolute;
        left: 200px;
    }
    
    .value {
        flex-grow: 1;
        padding-left: 15px;
        position: relative;
        margin-top: -1px;
    }
    
    .lk-pr {
        position: absolute;
        right: 10px;
        top: -1px;
        font-weight: normal;
    }

    /* Tanda Tangan */
    .signature-container {
        display: flex;
        justify-content: space-between;
        width: 100%;
        margin-top: -10px;
    }

    .pemegang-ttd, .kepala-desa-ttd {
        flex-basis: 45%;
        text-align: center;
    }

    .ttd-kanan {
        text-align: right; 
        width: 40%;
        margin-left: auto;
        margin-right: 70px;
    }

    .tanggal-ttd {
        text-align: right;
        margin-right: 68px;
    }

    .sekretaris {
        margin-right: 60px;
        margin-top: -12px;
    }

    .daru-purnomo {
        margin-right: 43px;
        text-decoration: underline;
        margin-top: 13px;
    }

    .signature-name {
        text-decoration: underline;
        font-weight: bold;
    }

    /* Sembunyikan elemen no-print */
    .no-print {
        display: none !important;
    }
</style>
`;

                html = html.replace('</head>', pdfStyle + '</head>');

                html = html
                    .replace(/<div class="no-print">[\s\S]*?<\/div>/g, '')
                    .replace(/<script[\s\S]*?<\/script>/g, '')
                    .replace(/<div id="downloadOptionsModal"[\s\S]*?<\/div>/g, '');

                const options = {
                    format: 'A4',
                    border: '0mm',
                    timeout: 60000,
                    type: 'pdf',
                    height: '297mm',
                    width: '210mm',
                    orientation: 'portrait',
                    printBackground: true
                };

                htmlPdf.create(html, options).toBuffer((err, buffer) => {
                    if (err) {
                        console.error('Error generating PDF:', err);
                        return res.status(500).send("Error generating PDF");
                    }

                    res.setHeader('Content-Type', 'application/pdf');
                    let contentDisposition = action === 'download' ? 'attachment' : 'inline';
                    res.setHeader('Content-Disposition', `${contentDisposition}; filename="${namaFile}"`);
                    res.send(buffer);
                });
            }
        );
    });
});


// Route untuk menampilkan detail surat_kbi
app.get('/surat-kbi/:id', (req, res) => {
    const suratKBIId = req.params.id;
    const sql = "SELECT * FROM surat_kbi WHERE id = ?";

    db.query(sql, [suratKBIId], (err, result) => {
        if (err) {
            console.error('Error fetching surat_kbi by ID:', err);
            return res.status(500).send("Error fetching data");
        }
        if (result.length === 0) {
            return res.status(404).send("Surat Keterangan Beda Identitas tidak ditemukan");
        }

        res.render('surat_kbi/detail-surat-kbi', { suratKBI: result[0] });
    });
});
// Route Surat Keterangan Beda Identitas
app.get('/surat-kbi', (req, res) => {
    const { status, search, page = 1, perPage = 10 } = req.query;
    let sql = "SELECT * FROM surat_kbi";
    let whereClauses = [];
    let params = [];

    // Filter status
    if (status && status !== 'semua') {
        whereClauses.push("status = ?");
        params.push(status);
    }

    // Filter search
    if (search) {
        whereClauses.push("(nomor_surat LIKE ? OR nama LIKE ? OR nik LIKE ?)");
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (whereClauses.length > 0) {
        sql += " WHERE " + whereClauses.join(" AND ");
    }

    // Hitung total data
    const countQuery = "SELECT COUNT(*) as total FROM surat_kbi" +
        (whereClauses.length > 0 ? " WHERE " + whereClauses.join(" AND ") : "");

    // Query status counts
    const statusQuery = `
        SELECT
            SUM(CASE WHEN status = 'Diproses' THEN 1 ELSE 0 END) as diproses,
            SUM(CASE WHEN status = 'Selesai' THEN 1 ELSE 0 END) as selesai,
            SUM(CASE WHEN status = 'Ditolak' THEN 1 ELSE 0 END) as ditolak
        FROM surat_kbi
        ${whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : ""}
    `;

    // Eksekusi query secara berurutan dengan error handling
    db.query(statusQuery, params, (errStatus, statusResult) => {
        if (errStatus) {
            console.error('Error counting status (KBI):', errStatus);
            return res.status(500).send("Error fetching status counts");
        }

        db.query(countQuery, params, (errCount, countResult) => {
            if (errCount) {
                console.error('Error counting data (KBI):', errCount);
                return res.status(500).send("Error counting data");
            }

            const totalItems = countResult && countResult[0] ? countResult[0].total : 0;
            const totalPages = Math.ceil(totalItems / perPage);
            const offset = (page - 1) * perPage;

            // Query data utama dengan pagination
            db.query(sql + ` LIMIT ? OFFSET ?`, [...params, parseInt(perPage), offset], (err, dataResult) => {
                if (err) {
                    console.error('Error fetching surat_kbi:', err);
                    return res.status(500).send("Error fetching data");
                }

                const renderData = {
                    suratKBI: dataResult,
                    statusCountsKBI: statusResult && statusResult[0] ? statusResult[0] : { diproses: 0, selesai: 0, ditolak: 0 },
                    currentPageKBI: parseInt(page),
                    perPageKBI: parseInt(perPage),
                    totalItemsKBI: totalItems,
                    totalPagesKBI: totalPages,
                    currentStatusKBI: status || 'semua',
                    currentSearchKBI: search || ''
                };

                res.render('surat_kbi/surat-kbi', renderData); // Pastikan path ini benar
            });
        });
    });
});

// API endpoint untuk menambahkan surat_kbi baru
app.post('/surat-kbi', (req, res) => {
    try {
        // Validasi field yang diperlukan
        const requiredFields = [
            'nama', 'nik', 'no_kk', 'tertera',
            'nama_lagi', 'tertera_lagi', 'keperluan_surat' // Tambahkan keperluan_surat
        ];

        const missingFields = requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Field berikut harus diisi: ${missingFields.join(', ')}`,
                error: 'MISSING_REQUIRED_FIELDS'
            });
        }

        // Validasi format NIK (16 digit)
        if (!/^\d{16}$/.test(req.body.nik)) {
            return res.status(400).json({
                success: false,
                message: 'NIK harus terdiri dari 16 digit angka',
                error: 'INVALID_NIK_FORMAT'
            });
        }

        // Validasi format Nomor Kartu Keluarga (16 digit)
        if (!/^\d{16}$/.test(req.body.no_kk)) {
            return res.status(400).json({
                success: false,
                message: 'Nomor Kartu Keluarga harus terdiri dari 16 digit angka',
                error: 'INVALID_KK_FORMAT'
            });
        }

        // Ekstrak data dari body request
        const {
            nama,
            nik,
            no_kk,
            tertera,
            nama_lagi,
            tertera_lagi,
            norek,
            jenis_surat, // Mungkin ada di form, jika tidak, set manual
            keperluan_surat // Ambil keperluan_surat dari request body
        } = req.body;

        const tanggal_permohonan = new Date().toISOString().split('T')[0];
        const status = 'Diproses';
        const jenisSuratKBI = jenis_surat || 'Keterangan Beda Identitas'; // Set default jika tidak ada di form

        // Mulai transaction
        db.beginTransaction((beginErr) => {
            if (beginErr) {
                console.error('Error starting transaction (KBI):', beginErr);
                return res.status(500).json({
                    success: false,
                    message: 'Gagal memulai transaksi database',
                    error: beginErr.message
                });
            }

            // 1. Insert data surat_kbi
            const insertSql = `INSERT INTO surat_kbi
                (nomor_surat, nama, nik, no_kk,
                 tertera, nama_lagi, tertera_lagi, norek,
                 jenis_surat, status, tanggal_permohonan, keperluan_surat)
                VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`; // Tambahkan keperluan_surat

            db.query(insertSql, [
                nama,
                nik,
                no_kk,
                tertera,
                nama_lagi,
                tertera_lagi,
                norek,
                jenisSuratKBI,
                status,
                tanggal_permohonan,
                keperluan_surat // Masukkan nilai keperluan_surat
            ], (insertErr, insertResult) => {
                if (insertErr) {
                    return db.rollback(() => {
                        console.error('Error inserting surat_kbi:', insertErr);
                        res.status(500).json({
                            success: false,
                            message: 'Gagal menyimpan surat keterangan Beda Identitas',
                            error: insertErr.message
                        });
                    });
                }

                const newId = insertResult.insertId;
                const tahun = new Date().getFullYear();
                const nomor_surat = `SKBI/${String(newId).padStart(3, '0')}/${tahun}`;

                // 2. Update nomor surat
                const updateSql = "UPDATE surat_kbi SET nomor_surat = ? WHERE id = ?";
                db.query(updateSql, [nomor_surat, newId], (updateErr) => {
                    if (updateErr) {
                        return db.rollback(() => {
                            console.error('Error updating nomor surat (KBI):', updateErr);
                            res.status(500).json({
                                success: false,
                                message: 'Gagal mengupdate nomor surat',
                                error: updateErr.message
                            });
                        });
                    }

                    // 3. Buat notifikasi
                    const notificationTitle = 'Surat Keterangan Beda Identitas Baru';
                    const notificationMessage = `Surat KBi untuk ${nama} (${nomor_surat}) berhasil dibuat`;

                    const notifSql = `INSERT INTO notifications
                        (user_id, type, title, message, related_id, related_type, is_read, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`;

                    db.query(notifSql, [
                        req.session.userId,
                        'surat_kbi',
                        notificationTitle,
                        notificationMessage,
                        newId,
                        'surat_kbi'
                    ], (notifErr) => {
                        if (notifErr) {
                            return db.rollback(() => {
                                console.error('Error creating notification (KBI):', notifErr);
                                res.status(500).json({
                                    success: false,
                                    message: 'Gagal membuat notifikasi',
                                    error: notifErr.message
                                });
                            });
                        }

                        // Commit transaction
                        db.commit((commitErr) => {
                            if (commitErr) {
                                return db.rollback(() => {
                                    console.error('Error committing transaction (KBI):', commitErr);
                                    res.status(500).json({
                                        success: false,
                                        message: 'Gagal menyelesaikan transaksi',
                                        error: commitErr.message
                                    });
                                });
                            }

                            // Kirim notifikasi real-time via SSE
                            sendNotification(req.session.userId, {
                                id: newId,
                                type: 'surat_kbi',
                                title: notificationTitle,
                                message: notificationMessage,
                                related_id: newId,
                                nomor_surat: nomor_surat,
                                nama: nama,
                                created_at: new Date()
                            });

                            // Respon sukses
                            res.status(201).json({
                                success: true,
                                message: 'Surat Keterangan Beda Identitas berhasil dibuat',
                                data: {
                                    id: newId,
                                    nomor_surat,
                                    nama,
                                    nik,
                                    no_kk,
                                    tertera,
                                    nama_lagi,
                                    tertera_lagi,
                                    norek,
                                    jenis_surat: jenisSuratKBI,
                                    status,
                                    tanggal_permohonan,
                                    keperluan_surat
                                }
                            });
                        });
                    });
                });
            });
        });
    } catch (error) {
        console.error('Unexpected error (KBI):', error);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server yang tidak terduga',
            error: error.message,
            errorCode: 'SERVER_ERROR'
        });
    }
});

// PUT endpoint untuk update surat_kbi
app.put('/api/surat-kbi/:id', express.json(), async (req, res) => {
    const suratKBIId = req.params.id;
    const { nama, nik, no_kk, tertera, nama_lagi, tertera_lagi, norek, status, keperluan_surat, nomor_wa } = req.body;

    try {
        // Validasi input
        if (!nama || !nik || !no_kk || !tertera || !nama_lagi || !tertera_lagi || !status || !keperluan_surat) {
            return res.status(400).json({
                success: false,
                message: "Semua field utama harus diisi"
            });
        }

        // Validasi format NIK
        if (!/^\d{16}$/.test(nik)) {
            return res.status(400).json({
                success: false,
                message: "NIK harus 16 digit angka"
            });
        }

        // Validasi format Nomor Kartu Keluarga
        if (!/^\d{16}$/.test(no_kk)) {
            return res.status(400).json({
                success: false,
                message: "Nomor Kartu Keluarga harus 16 digit angka"
            });
        }

        // Validasi status
        const allowedStatus = ['Diproses', 'Selesai', 'Ditolak'];
        if (!allowedStatus.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status tidak valid"
            });
        }

        // 1. Ambil data saat ini untuk mendapatkan nomor_surat
        const getCurrentData = () => new Promise((resolve, reject) => {
            db.query('SELECT nomor_surat FROM surat_kbi WHERE id = ?', [suratKBIId], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]); // Ambil baris pertama
            });
        });

        const currentData = await getCurrentData();
        if (!currentData) {
            return res.status(404).json({
                success: false,
                message: "Surat Keterangan Beda Identitas tidak ditemukan"
            });
        }

        // 2. Lakukan update data
        const updateData = () => new Promise((resolve, reject) => {
            const sql = `
                UPDATE surat_kbi SET
                    nama = ?,
                    nik = ?,
                    no_kk = ?,
                    tertera = ?,
                    nama_lagi = ?,
                    tertera_lagi = ?,
                    norek = ?,
                    status = ?,
                    updated_at = NOW(),
                    keperluan_surat = ?,
                    nomor_wa = ?
                WHERE id = ?
            `;
            db.query(sql, [
                nama, nik, no_kk, tertera, nama_lagi, tertera_lagi, norek, status, keperluan_surat, nomor_wa, suratKBIId
            ], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        const result = await updateData();
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Gagal memperbarui data surat keterangan Beda Identitas"
            });
        }

        // 3. Catat aktivitas (dengan error handling)
        try {
            await logActivity(
                req.session.userId,
                'edit',
                'surat_kbi',
                suratKBIId,
                `Mengedit surat KBI ${currentData.nomor_surat}`
            );
        } catch (logError) {
            console.error('Gagal mencatat aktivitas (KBI):', logError);
            // Lanjutkan tanpa menghentikan operasi
        }

        // 4. Kirim response sukses
        res.json({
            success: true,
            message: "Data surat keterangan Beda Identitas berhasil diperbarui",
            data: {
                id: suratKBIId,
                nomor_surat: currentData.nomor_surat,
                status: status,
                keperluan_surat: keperluan_surat,
                nomor_wa: nomor_wa
            }
        });

    } catch (error) {
        console.error('Error (KBI):', error);
        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat memperbarui data",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app .get('/api/surat-kbi/:id', (req, res) => {
    const suratId = req.params.id;

    // Validasi ID
    if (!suratId || isNaN(suratId)) {
        return res.status(400).json({
            success: false,
            message: "ID surat tidak valid"
        });
    }

    const sql = "SELECT *, DATE_FORMAT(tanggal_permohonan, '%Y-%m-%d') as tanggal_permohonan FROM surat_kbi WHERE id = ?";

    db.query(sql, [suratId], (err, result) => {
        if (err) {
            console.error('Error fetching surat_kbi by ID:', err);
            return res.status(500).json({
                success: false,
                message: "Gagal memuat data surat",
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }

        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Surat Keterangan Beda Identitas tidak ditemukan"
            });
        }

        // Format data sebelum dikirim
        let suratData = { ...result[0] };
        try {
            suratData.tanggal_permohonan_formatted = new Date(result[0].tanggal_permohonan).toLocaleDateString('id-ID');
        } catch (dateError) {
            console.error('Error formatting tanggal_permohonan (KBI):', dateError);
            suratData.tanggal_permohonan_formatted = "Tanggal tidak valid"; // Atau nilai default lainnya
        }

        res.setHeader('Content-Type', 'application/json');
        res.json({
            success: true,
            data: suratData
        });
    });
});

app.put('/surat-kbi/:id', express.json(), async (req, res) => {
    try {
        const suratKBIId = req.params.id;
        const { jabatan_penandatangan, jabatan_sebenarnya, nama_penandatangan } = req.body;

        // Update the database
        const [result] = await db.query(`
            UPDATE surat_keterangan_beda_identitas SET
                jabatan_penandatangan = ?,
                jabatan_sebenarnya = ?,
                nama_penandatangan = ?,
                updated_at = NOW()
            WHERE id = ?
        `, [
            jabatan_penandatangan,
            jabatan_sebenarnya,
            nama_penandatangan,
            suratKBIId
        ]);

        res.json({
            success: true,
            message: "Informasi penandatangan surat keterangan beda identitas berhasil diperbarui"
        });

    } catch (error) {
        console.error('Error updating signatory info for surat keterangan beda identitas:', error);
        res.status(500).json({
            success: false,
            message: "Gagal memperbarui informasi penandatangan surat keterangan beda identitas"
        });
    }
});

app.put('/api/surat-kbi/signatory/:id', express.json(), async (req, res) => {
    try {
        const suratKBIId = req.params.id;
        const { jabatan_penandatangan, jabatan_sebenarnya, nama_penandatangan } = req.body;

        // Validasi input
        if (!jabatan_penandatangan || !jabatan_sebenarnya || !nama_penandatangan) {
            return res.status(400).json({
                success: false,
                message: "Semua field penandatangan harus diisi"
            });
        }

        // Update database menggunakan callback style untuk konsistensi
        const updateSignatory = () => new Promise((resolve, reject) => {
            const sql = `
                UPDATE surat_kbi SET
                    jabatan_penandatangan = ?,
                    jabatan_sebenarnya = ?,
                    nama_penandatangan = ?,
                    updated_at = NOW()
                WHERE id = ?
            `;
            db.query(sql, [
                jabatan_penandatangan,
                jabatan_sebenarnya,
                nama_penandatangan,
                suratKBIId
            ], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        const result = await updateSignatory();

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Surat tidak ditemukan atau tidak ada perubahan"
            });
        }

        // Catat aktivitas
        try {
            await logActivity(
                req.session.userId,
                'update_signatory',
                'surat_kbi',
                suratKBIId,
                `Memperbarui informasi penandatangan surat keterangan beda identitas`
            );
        } catch (logError) {
            console.error('Gagal mencatat aktivitas:', logError);
        }

        res.json({
            success: true,
            message: "Informasi penandatangan berhasil diperbarui"
        });

    } catch (error) {
        console.error('Error updating signatory info:', error);
        res.status(500).json({
            success: false,
            message: "Gagal memperbarui informasi penandatangan",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Route Cetak Surat Keterangan Beda Identitas
app.get('/cetak-surat-kbi/:id', (req, res) => {
    const suratKBIId = req.params.id;
    const mode = req.query.mode;
    const sqlSuratKBI = "SELECT * FROM surat_kbi WHERE id = ?";

    db.query(sqlSuratKBI, [suratKBIId], (errSuratKBI, resultSuratKBI) => {
        if (errSuratKBI) {
            console.error('Error fetching surat_kbi by ID:', errSuratKBI);
            return res.status(500).send("Error fetching data");
        }
        if (resultSuratKBI.length === 0) {
            return res.status(404).send("Surat Keterangan Beda Identitas tidak ditemukan");
        }
        const suratKBIData = resultSuratKBI[0];
        res.render('surat_kbi/cetak-surat-kbi', { suratKBI: suratKBIData, mode: mode });
    });
});

app.get('/download-pdf-kbi/:id', (req, res) => {
    const suratKBIId = req.params.id;
    const action = req.query.action;
    const sqlSuratKBI = "SELECT * FROM surat_kbi WHERE id = ?";

    db.query(sqlSuratKBI, [suratKBIId], (errSuratKBI, resultSuratKBI) => {
        if (errSuratKBI) {
            console.error('Error fetching surat_kbi for PDF:', errSuratKBI);
            return res.status(500).send("Error generating PDF");
        }
        if (resultSuratKBI.length === 0) {
            return res.status(404).send("Surat Keterangan Beda Identitas tidak ditemukan");
        }

        const suratKBIData = resultSuratKBI[0];
        const namaFile = `${suratKBIData.nomor_surat || 'surat_kbi'}_${suratKBIData.nama ? suratKBIData.nama.replace(/[^a-zA-Z0-9]/g, '_') : 'unknown'}.pdf`;

        const logoPath = path.join(__dirname, 'public', 'image', 'logokebondalem-fix.png');
        const logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' });
        suratKBIData.logoData = `data:image/png;base64,${logoBase64}`;

        ejs.renderFile(
            path.join(__dirname, 'views', 'surat-kbi', 'cetak-surat-kbi.ejs'),
            { suratKBI: suratKBIData, path: path, mode: 'pdf' },
            (err, html) => {
                if (err) {
                    console.error('Error rendering EJS template (KBI):', err);
                    return res.status(500).send("Error generating PDF");
                }

                const pdfStyle = `
<style>
    /* Global Styles */
    body {
        font-family: "Times New Roman", serif;
        margin: 0;
        padding: 0;
        background-color: white;
        display: block;
    }

    /* Kertas A4 */
    .paper {
        width: 794px;
        height: 1123px;
        background-color: white;
        padding: 40px;
        box-sizing: border-box;
        margin: 0 auto;
    }

    .garis-bawah {
        border-bottom: 2px solid black;
        margin: 10px 0;
    }

    /* Header */
    .header {
        text-align: center;
        margin-bottom: 30px;
    }

    .logo {
        width: 80px;
        position: absolute;
        left: 40px;
        top: 40px;
    }

    .header h3 {
        margin: 5px 0;
        font-size: 20px;
        font-weight: normal;
    }

    .header h2 {
        font-size: 24px;
        font-weight: bold;
        margin: 5px 0;
        letter-spacing: 1px;
        word-spacing: 5px;
    }

    .header p {
        margin: 2px 0;
        font-size: 13px;
    }

    .kode-desa {
        text-align: left;
        font-size: 14px;
        margin-top: 10px;
    }

    /* Judul Surat */
    .judul-surat {
        text-align: center;
        margin-top: 30px;
        margin-bottom: 20px;
    }

    .judul-surat h3 {
        font-size: 22px;
        font-weight: bold;
        margin-bottom: 5px;
        text-decoration: underline;
    }

    .judul-surat p {
        font-size: 16px;
        font-weight: bold;
    }

    /* Isi Surat */
    .content {
        margin-top: 20px;
        line-height: 1.8;
        font-size: 14px;
        text-align: left;
    }

    .content p {
        margin: 5px 0;
        display: flex;
    }

    .content strong {
        font-weight: bold;
    }

    .label {
        width: 180px; /* Lebihkan sedikit untuk mengakomodasi "Yang Tertera" */
        flex-shrink: 0;
        padding-left: 38px; /* Menjorok label lebih jauh */
    }

    .value {
        flex-grow: 1;
        padding-left: 28px; /* Menjorok nilai lebih jauh */
    }

    /* Tanda Tangan */
    .signature-block {
        margin-top: 60px;
        font-size: 14px;
        width: 100%;
    }

    .signature-container {
        display: flex;
        justify-content: flex-end; /* Tanda tangan di kanan */
        width: 100%;
    }

    .tanggal-ttd {
        text-align: right;
        margin-right: 85px;
    }

    .signature-name {
        text-decoration: underline;
        font-weight: bold;
        font-size: 12px; /* Ukuran font tanda tangan */
    }

    .ttd-kanan {
        text-align: right;
        width: 40%; /* Supaya tidak mepet kanan */
        margin-left: auto;
        margin-right: 70px; /* Bisa disesuaikan */
    }

    .ttd-kanan p:nth-child(2), /* "Sekretaris Desa" */
    .ttd-kanan p:last-child { /* "DARU PURNOMO" */
        text-indent: -40px; /* Geser lebih ke kiri */
    }

    /* Sembunyikan elemen no-print */
    .no-print {
        display: none !important;
    }
</style>
`;

                html = html.replace('</head>', pdfStyle + '</head>');

                html = html
                    .replace(/<div class="no-print">[\s\S]*?<\/div>/g, '')
                    .replace(/<script[\s\S]*?<\/script>/g, '')
                    .replace(/<div id="downloadOptionsModal"[\s\S]*?<\/div>/g, '');

                const options = {
                    format: 'A4',
                    border: '0mm',
                    timeout: 60000,
                    type: 'pdf',
                    height: '297mm',
                    width: '210mm',
                    orientation: 'portrait',
                    printBackground: true
                };

                htmlPdf.create(html, options).toBuffer((err, buffer) => {
                    if (err) {
                        console.error('Error generating PDF (KBI):', err);
                        return res.status(500).send("Error generating PDF");
                    }

                    res.setHeader('Content-Type', 'application/pdf');
                    let contentDisposition = action === 'download' ? 'attachment' : 'inline';
                    res.setHeader('Content-Disposition', `${contentDisposition}; filename="${namaFile}"`);
                    res.send(buffer);
                });
            }
        );
    });
});

// Route untuk menampilkan detail surat_sktm
app.get('/surat-sktm/:id', (req, res) => {
    const suratSKTMId = req.params.id;
    const sql = "SELECT * FROM surat_sktm WHERE id = ?";

    db.query(sql, [suratSKTMId], (err, result) => {
        if (err) {
            console.error('Error fetching surat_sktm by ID:', err);
            return res.status(500).send("Error fetching data");
        }
        if (result.length === 0) {
            return res.status(404).send("Surat Keterangan Tidak Mampu tidak ditemukan");
        }

        res.render('surat_sktm/detail-surat-sktm', { suratSKTM: result[0] }); // Pastikan path ini benar
    });
});

// Route Surat Keterangan Tidak Mampu
app.get('/surat-sktm', (req, res) => {
    const { status, search, page = 1, perPage = 10 } = req.query;
    let sql = "SELECT * FROM surat_sktm";
    let whereClauses = [];
    let params = [];

    // Filter status
    if (status && status !== 'semua') {
        whereClauses.push("status = ?");
        params.push(status);
    }

    // Filter search
    if (search) {
        whereClauses.push("(nomor_surat LIKE ? OR nama LIKE ? OR nik LIKE ?)");
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (whereClauses.length > 0) {
        sql += " WHERE " + whereClauses.join(" AND ");
    }

    // Hitung total data
    const countQuery = "SELECT COUNT(*) as total FROM surat_sktm" +
        (whereClauses.length > 0 ? " WHERE " + whereClauses.join(" AND ") : "");

    // Query status counts
    const statusQuery = `
        SELECT
            SUM(CASE WHEN status = 'Diproses' THEN 1 ELSE 0 END) as diproses,
            SUM(CASE WHEN status = 'Selesai' THEN 1 ELSE 0 END) as selesai,
            SUM(CASE WHEN status = 'Ditolak' THEN 1 ELSE 0 END) as ditolak
        FROM surat_sktm
        ${whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : ""}
    `;

    // Eksekusi query secara berurutan dengan error handling
    db.query(statusQuery, params, (errStatus, statusResult) => {
        if (errStatus) {
            console.error('Error counting status (SKTM):', errStatus);
            return res.status(500).send("Error fetching status counts");
        }

        db.query(countQuery, params, (errCount, countResult) => {
            if (errCount) {
                console.error('Error counting data (SKTM):', errCount);
                return res.status(500).send("Error counting data");
            }

            const totalItems = countResult && countResult[0] ? countResult[0].total : 0;
            const totalPages = Math.ceil(totalItems / perPage);
            const offset = (page - 1) * perPage;

            // Query data utama dengan pagination
            db.query(sql + ` LIMIT ? OFFSET ?`, [...params, parseInt(perPage), offset], (err, dataResult) => {
                if (err) {
                    console.error('Error fetching surat_sktm:', err);
                    return res.status(500).send("Error fetching data");
                }

                const renderData = {
                    suratSKTM: dataResult,
                    statusCountsSKTM: statusResult && statusResult[0] ? statusResult[0] : { diproses: 0, selesai: 0, ditolak: 0 },
                    currentPageSKTM: parseInt(page),
                    perPageSKTM: parseInt(perPage),
                    totalItemsSKTM: totalItems,
                    totalPagesSKTM: totalPages,
                    currentStatusSKTM: status || 'semua',
                    currentSearchSKTM: search || ''
                };

                res.render('surat_sktm/surat-sktm', renderData); // Pastikan path ini benar
            });
        });
    });
});

// API endpoint untuk menambahkan surat_sktm baru
// API endpoint untuk menambahkan surat_sktm baru
app.post('/surat-sktm', (req, res) => {
    try {
        // Validasi field yang diperlukan
        const requiredFields = [
            'nama', 'nik', 'no_kk', 'tempat_tanggal_lahir',
            'jenis_kelamin', 'alamat', 'nomor_hp'
        ];

        const missingFields = requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Field berikut harus diisi: ${missingFields.join(', ')}`,
                error: 'MISSING_REQUIRED_FIELDS'
            });
        }

        // Validasi format NIK (16 digit)
        if (!/^\d{16}$/.test(req.body.nik)) {
            return res.status(400).json({
                success: false,
                message: 'NIK harus terdiri dari 16 digit angka',
                error: 'INVALID_NIK_FORMAT'
            });
        }

        // Validasi format Nomor Kartu Keluarga (16 digit)
        if (!/^\d{16}$/.test(req.body.no_kk)) {
            return res.status(400).json({
                success: false,
                message: 'Nomor Kartu Keluarga harus terdiri dari 16 digit angka',
                error: 'INVALID_KK_FORMAT'
            });
        }

        // Ekstrak data dari body request
        const {
            nama,
            nik,
            no_kk,
            tempat_tanggal_lahir,
            jenis_kelamin,
            alamat,
            nomor_hp,
            jenis_surat // Mungkin ada di form, jika tidak, set manual
        } = req.body;

        const tanggal_permohonan = new Date().toISOString().split('T')[0];
        const status = 'Diproses';
        const jenisSuratSKTM = jenis_surat || 'Keterangan Tidak Mampu'; // Set default jika tidak ada di form

        // Mulai transaction
        db.beginTransaction((beginErr) => {
            if (beginErr) {
                console.error('Error starting transaction (SKTM):', beginErr);
                return res.status(500).json({
                    success: false,
                    message: 'Gagal memulai transaksi database',
                    error: beginErr.message
                });
            }

           // 1. Insert data surat_sktm
const insertSql = `
    INSERT INTO surat_sktm(nomor_surat, nama, nik, no_kk,
        tempat_tanggal_lahir, jenis_kelamin, alamat, nomor_hp,
        jenis_surat, status, tanggal_permohonan)
    VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;
db.query(insertSql, [
nama,
nik,
no_kk,
tempat_tanggal_lahir,
jenis_kelamin,
alamat,
nomor_hp,
jenisSuratSKTM,
status,
tanggal_permohonan
], (insertErr, insertResult) => {
if (insertErr) {
    return db.rollback(() => {
        console.error('Error inserting surat_sktm:', insertErr);
        res.status(500).json({
            success: false,
            message: 'Gagal menyimpan surat keterangan Tidak Mampu',
            error: insertErr.message
        });
    });
}

const newId = insertResult.insertId;
const tahun = new Date().getFullYear();
const nomor_surat = `SKTM/${String(newId).padStart(3, '0')}/${tahun}`;


// 2. Update nomor surat
const updateSql = "UPDATE surat_sktm SET nomor_surat = ? WHERE id = ?";
db.query(updateSql, [nomor_surat, newId], (updateErr) => {
    if (updateErr) {
        return db.rollback(() => {
            console.error('Error updating nomor surat (SKTM):', updateErr);
            res.status(500).json({
                success: false,
                message: 'Gagal mengupdate nomor surat',
                error: updateErr.message
            });
        });
    }

                    // 3. Buat notifikasi
                    const notificationTitle = 'Surat Keterangan Tidak Mampu Baru';
                    const notificationMessage = `Surat SKTM untuk ${nama} (${nomor_surat}) berhasil dibuat`;


                    const notifSql = `
                        INSERT INTO notifications
                            (user_id, type, title, message, related_id, related_type, is_read, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, 0, NOW())
                    `;
                    db.query(notifSql, [
                        req.session.userId,
                        'surat_sktm',
                        notificationTitle,
                        notificationMessage,
                        newId,
                        'surat_sktm'
                    ], (notifErr) => {
                        if (notifErr) {
                            return db.rollback(() => {
                                console.error('Error creating notification (SKTM):', notifErr);
                                res.status(500).json({
                                    success: false,
                                    message: 'Gagal membuat notifikasi',
                                    error: notifErr.message
                                });
                            });
                        }

                        // Commit transaction
                        db.commit((commitErr) => {
                            if (commitErr) {
                                return db.rollback(() => {
                                    console.error('Error committing transaction (SKTM):', commitErr);
                                    res.status(500).json({
                                        success: false,
                                        message: 'Gagal menyelesaikan transaksi',
                                        error: commitErr.message
                                    });
                                });
                            }

                            // Kirim notifikasi real-time via SSE
                            sendNotification(req.session.userId, {
                                id: newId,
                                type: 'surat_sktm',
                                title: notificationTitle,
                                message: notificationMessage,
                                related_id: newId,
                                nomor_surat: nomor_surat,
                                nama: nama,
                                created_at: new Date()
                            });

                            // Respon sukses
                            res.status(201).json({
                                success: true,
                                message: 'Surat Keterangan Tidak Mampu berhasil dibuat',
                                data: {
                                    id: newId,
                                    nomor_surat,
                                    nama,
                                    nik,
                                    no_kk,
                                    tempat_tanggal_lahir,
                                    jenis_kelamin,
                                    alamat,
                                    nomor_hp,
                                    jenis_surat: jenisSuratSKTM,
                                    status,
                                    tanggal_permohonan
                                }
                            });
                        });
                    });
                });
            });
        });
    } catch (error) {
        console.error('Unexpected error (SKTM):', error);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server yang tidak terduga',
            error: error.message,
            errorCode: 'SERVER_ERROR'
        });
    }
});

// PUT endpoint untuk update surat_sktm
app.put('/api/surat-sktm/:id', express.json(), async (req, res) => {
    const suratSKTMId = req.params.id;
    const { nama, nik, no_kk, tempat_tanggal_lahir, jenis_kelamin, alamat, nomor_hp, status } = req.body;

    try {
        // Validasi input
        if (!nama || !nik || !no_kk || !tempat_tanggal_lahir || !jenis_kelamin || !alamat || !nomor_hp || !status) {
            return res.status(400).json({
                success: false,
                message: "Semua field utama harus diisi"
            });
        }

        // Validasi format NIK
        if (!/^\d{16}$/.test(nik)) {
            return res.status(400).json({
                success: false,
                message: "NIK harus 16 digit angka"
            });
        }

        // Validasi format Nomor Kartu Keluarga
        if (!/^\d{16}$/.test(no_kk)) {
            return res.status(400).json({
                success: false,
                message: "Nomor Kartu Keluarga harus 16 digit angka"
            });
        }

        // Validasi status
        const allowedStatus = ['Diproses', 'Selesai', 'Ditolak'];
        if (!allowedStatus.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status tidak valid"
            });
        }

        // 1. Ambil data saat ini untuk mendapatkan nomor_surat
        const getCurrentData = () => new Promise((resolve, reject) => {
            db.query('SELECT nomor_surat FROM surat_sktm WHERE id = ?', [suratSKTMId], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]); // Ambil baris pertama
            });
        });

        const currentData = await getCurrentData();
        if (!currentData) {
            return res.status(404).json({
                success: false,
                message: "Surat Keterangan Tidak Mampu tidak ditemukan"
            });
        }

        // 2. Lakukan update data
        const updateData = () => new Promise((resolve, reject) => {
            const sql = `
                UPDATE surat_sktm SET
                    nama = ?,
                    nik = ?,
                    no_kk = ?,
                    tempat_tanggal_lahir = ?,
                    jenis_kelamin = ?,
                    alamat = ?,
                    nomor_hp = ?,
                    status = ?,
                    updated_at = NOW()
                WHERE id = ?
            `;
            db.query(sql, [
                nama, nik, no_kk, tempat_tanggal_lahir, jenis_kelamin, alamat, nomor_hp, status, suratSKTMId
            ], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        const result = await updateData();
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Gagal memperbarui data surat keterangan Tidak Mampu"
            });
        }

        // 3. Catat aktivitas (dengan error handling)
        try {
            await logActivity(
                req.session.userId,
                'edit',
                'surat_sktm',
                suratSKTMId,
                `Mengedit surat SKTM ${currentData.nomor_surat}`
            );
        } catch (logError) {
            console.error('Gagal mencatat aktivitas (SKTM):', logError);
            // Lanjutkan tanpa menghentikan operasi
        }

        // 4. Kirim response sukses
        res.json({
            success: true,
            message: "Data surat keterangan Tidak Mampu berhasil diperbarui",
            data: {
                id: suratSKTMId,
                nomor_surat: currentData.nomor_surat,
                status: status
            }
        });

    } catch (error) {
        console.error('Error (SKTM):', error);
        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat memperbarui data",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.get('/api/surat-sktm/:id', (req, res) => {
    const suratId = req.params.id;

    // Validasi ID
    if (!suratId || isNaN(suratId)) {
        return res.status(400).json({
            success: false,
            message: "ID surat tidak valid"
        });
    }

    const sql = "SELECT *, DATE_FORMAT(tanggal_permohonan, '%Y-%m-%d') as tanggal_permohonan FROM surat_sktm WHERE id = ?";

    db.query(sql, [suratId], (err, result) => {
        if (err) {
            console.error('Error fetching surat_sktm by ID:', err);
            return res.status(500).json({
                success: false,
                message: "Gagal memuat data surat",
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }

        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Surat Keterangan Tidak Mampu tidak ditemukan"
            });
        }

        // Format data sebelum dikirim
        let suratData = { ...result[0] };
        try {
            suratData.tanggal_permohonan_formatted = new Date(result[0].tanggal_permohonan).toLocaleDateString('id-ID');
        } catch (dateError) {
            console.error('Error formatting tanggal_permohonan (SKTM):', dateError);
            suratData.tanggal_permohonan_formatted = "Tanggal tidak valid"; // Atau nilai default lainnya
        }

        res.setHeader('Content-Type', 'application/json');
        res.json({
            success: true,
            data: suratData
        });
    });
});
app.put('/surat-sktm/:id', express.json(), async (req, res) => {
    try {
        const suratSKTMId = req.params.id;
        const { jabatan_penandatangan, jabatan_sebenarnya, nama_penandatangan } = req.body;

        // Update the database
        const [result] = await db.query(`
            UPDATE surat_sktm SET
                jabatan_penandatangan = ?,
                jabatan_sebenarnya = ?,
                nama_penandatangan = ?,
                updated_at = NOW()
            WHERE id = ?
        `, [
            jabatan_penandatangan,
            jabatan_sebenarnya,
            nama_penandatangan,
            suratSKTMId
        ]);

        res.json({
            success: true,
            message: "Informasi penandatangan berhasil diperbarui"
        });

    } catch (error) {
        console.error('Error updating signatory info:', error);
        res.status(500).json({
            success: false,
            message: "Gagal memperbarui informasi penandatangan"
        });
    }
});

// PUT endpoint untuk update informasi penandatangan surat SKTM
app.put('/api/surat-sktm/signatory/:id', express.json(), async (req, res) => {
    try {
        const suratSKTMId = req.params.id;
        const { jabatan_penandatangan, jabatan_sebenarnya, nama_penandatangan } = req.body;

        // Validasi input
        if (!jabatan_penandatangan || !jabatan_sebenarnya || !nama_penandatangan) {
            return res.status(400).json({
                success: false,
                message: "Semua field penandatangan harus diisi"
            });
        }

        // Update database menggunakan callback style untuk konsistensi
        const updateSignatory = () => new Promise((resolve, reject) => {
            const sql = `
                UPDATE surat_sktm SET
                    jabatan_penandatangan = ?,
                    jabatan_sebenarnya = ?,
                    nama_penandatangan = ?,
                    updated_at = NOW()
                WHERE id = ?
            `;
            db.query(sql, [
                jabatan_penandatangan,
                jabatan_sebenarnya,
                nama_penandatangan,
                suratSKTMId
            ], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        const result = await updateSignatory();

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Surat tidak ditemukan atau tidak ada perubahan"
            });
        }

        // Catat aktivitas
        try {
            await logActivity(
                req.session.userId,
                'update_signatory',
                'surat_sktm',
                suratSKTMId,
                `Memperbarui informasi penandatangan surat SKTM`
            );
        } catch (logError) {
            console.error('Gagal mencatat aktivitas:', logError);
        }

        res.json({
            success: true,
            message: "Informasi penandatangan berhasil diperbarui"
        });

    } catch (error) {
        console.error('Error updating signatory info:', error);
        res.status(500).json({
            success: false,
            message: "Gagal memperbarui informasi penandatangan",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
// Route Cetak Surat Keterangan Tidak Mampu
app.get('/cetak-surat-sktm/:id', (req, res) => {
    const suratSKTMId = req.params.id;
    const mode = req.query.mode;
    const sqlSuratSKTM = "SELECT * FROM surat_sktm WHERE id = ?";

    db.query(sqlSuratSKTM, [suratSKTMId], (errSuratSKTM, resultSuratSKTM) => {
        if (errSuratSKTM) {
            console.error('Error fetching surat_sktm by ID:', errSuratSKTM);
            return res.status(500).send("Error fetching data");
        }
        if (resultSuratSKTM.length === 0) {
            return res.status(404).send("Surat Keterangan Tidak Mampu tidak ditemukan");
        }
        const suratSKTMData = resultSuratSKTM[0];
        res.render('surat_sktm/cetak-surat-sktm', { suratSKTM: suratSKTMData, mode: mode }); // Pastikan path ini benar
    });
});

app.get('/download-pdf-sktm/:id', (req, res) => {
    const suratSKTMId = req.params.id;
    const action = req.query.action;
    const sqlSuratSKTM = "SELECT * FROM surat_sktm WHERE id = ?";

    db.query(sqlSuratSKTM, [suratSKTMId], (errSuratSKTM, resultSuratSKTM) => {
        if (errSuratSKTM) {
            console.error('Error fetching surat_sktm for PDF:', errSuratSKTM);
            return res.status(500).send("Error generating PDF");
        }
        if (resultSuratSKTM.length === 0) {
            return res.status(404).send("Surat Keterangan Tidak Mampu tidak ditemukan");
        }

        const suratSKTMData = resultSuratSKTM[0];
        const namaFile = `${suratSKTMData.nomor_surat || 'surat_sktm'}_${suratSKTMData.nama ? suratSKTMData.nama.replace(/[^a-zA-Z0-9]/g, '_') : 'unknown'}.pdf`;

        const logoPath = path.join(__dirname, 'public', 'image', 'logokebondalem-fix.png');
        const logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' });
        suratSKTMData.logoData = `data:image/png;base64,${logoBase64}`;

        ejs.renderFile(
            path.join(__dirname, 'views', 'surat_sktm', 'cetak-surat-sktm.ejs'), // Pastikan path ini benar
            { suratSKTM: suratSKTMData, path: path, mode: 'pdf' },
            (err, html) => {
                if (err) {
                    console.error('Error rendering EJS template (SKTM):', err);
                    return res.status(500).send("Error generating PDF");
                }

                const pdfStyle = `
<style>
    /* Global Styles */
    body {
        font-family: "Times New Roman", serif;
        margin: 0;
        padding: 0;
        background-color: white;
        display: block;
    }

    /* Kertas A4 */
    .paper {
        width: 794px;
        height: 1123px;
        background-color: white;
        padding: 40px;
        box-sizing: border-box;
        margin: 0 auto;
    }

    .garis-bawah {
        border-bottom: 2px solid black;
        margin: 10px 0;
    }

    /* Header */
    .header {
        text-align: center;
        margin-bottom: 30px;
    }

    .logo {
        width: 80px;
        position: absolute;
        left: 40px;
        top: 40px;
    }

    .header h3 {
        margin: 5px 0;
        font-size: 20px;
        font-weight: normal;
    }

    .header h2 {
        font-size: 24px;
        font-weight: bold;
        margin: 5px 0;
        letter-spacing: 1px;
        word-spacing: 5px;
    }

    .header p {
        margin: 2px 0;
        font-size: 13px;
    }

    .kode-desa {
        text-align: left;
        font-size: 14px;
        margin-top: 10px;
    }

    /* Judul Surat */
    .judul-surat {
        text-align: center;
        margin-top: 30px;
        margin-bottom: 20px;
    }

    .judul-surat h3 {
        font-size: 22px;
        font-weight: bold;
        margin-bottom: 5px;
        text-decoration: underline;
    }

    .judul-surat p {
        font-size: 16px;
        font-weight: bold;
    }

    /* Isi Surat */
    .content {
        margin-top: 20px;
        line-height: 1.8;
        font-size: 14px;
        text-align: left;
    }

    .content p {
        margin: 5px 0;
        display: flex;
    }

    .content strong {
        font-weight: bold;
    }

    .label {
        width: 180px;
        flex-shrink: 0;
        padding-left: 38px;
    }

    .value {
        flex-grow: 1;
        padding-left: 28px;
    }

    /* Tanda Tangan */
    .signature-block {
        margin-top: 60px;
        font-size: 14px;
        width: 100%;
    }

    .signature-container {
        display: flex;
        justify-content: flex-end;
        width: 100%;
    }

    .tanggal-ttd {
        text-align: right;
        margin-right: 85px;
    }

    .signature-name {
        text-decoration: underline;
        font-weight: bold;
        font-size: 12px;
    }

    .ttd-kanan {
        text-align: right;
        width: 40%;
        margin-left: auto;
        margin-right: 70px;
    }

    .ttd-kanan p:nth-child(2),
    .ttd-kanan p:last-child {
        text-indent: -40px;
    }

    /* Sembunyikan elemen no-print */
    .no-print {
        display: none !important;
    }
</style>
`;

                html = html.replace('</head>', pdfStyle + '</head>');

                html = html
                    .replace(/<div class="no-print">[\s\S]*?<\/div>/g, '')
                    .replace(/<script[\s\S]*?<\/script>/g, '')
                    .replace(/<div id="downloadOptionsModal"[\s\S]*?<\/div>/g, '');

                const options = {
                    format: 'A4',
                    border: '0mm',
                    timeout: 60000,
                    type: 'pdf',
                    height: '297mm',
                    width: '210mm',
                    orientation: 'portrait',
                    printBackground: true
                };

                htmlPdf.create(html, options).toBuffer((err, buffer) => {
                    if (err) {
                        console.error('Error generating PDF (SKTM):', err);
                        return res.status(500).send("Error generating PDF");
                    }

                    res.setHeader('Content-Type', 'application/pdf');
                    let contentDisposition = action === 'download' ? 'attachment' : 'inline';
                    res.setHeader('Content-Disposition', `${contentDisposition}; filename="${namaFile}"`);
                    res.send(buffer);
                });
            }
        );
    });
});
// Jalankan server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});