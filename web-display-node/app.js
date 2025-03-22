// web-display-node/app.js
const express = require('express');
const db = require('./koneksi');
const app = express();
const port = 3001; // Gunakan port yang berbeda dari wa-bot

// Set EJS sebagai template engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Route untuk menampilkan data surat
app.get('/', (req, res) => {
    const query = 'SELECT * FROM surat ORDER BY tanggal_permohonan DESC';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return res.status(500).send('Internal Server Error');
        }
        // Render tampilan dengan data surat
        res.render('index', { surat: results });
    });
});

// Jalankan server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});