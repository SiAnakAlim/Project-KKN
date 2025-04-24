-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 04 Apr 2025 pada 11.03
-- Versi server: 10.4.32-MariaDB
-- Versi PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `surat_desa`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `surat`
--

CREATE TABLE `surat` (
  `id` int(11) NOT NULL,
  `nomor_surat` varchar(50) NOT NULL,
  `nama` varchar(100) NOT NULL,
  `tempat_tanggal_lahir` varchar(100) NOT NULL,
  `kewarganegaraan_agama` varchar(50) NOT NULL,
  `pekerjaan` varchar(100) DEFAULT NULL,
  `tempat_domisili` varchar(255) DEFAULT NULL,
  `daerah_asal` varchar(255) DEFAULT NULL,
  `surat_bukti_diri` varchar(16) NOT NULL,
  `keperluan` text DEFAULT NULL,
  `tujuan` text DEFAULT NULL,
  `jenis_surat` varchar(50) NOT NULL,
  `tanggal_permohonan` date NOT NULL,
  `status` enum('Diproses','Selesai','Ditolak') DEFAULT 'Diproses',
  `file_pdf` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `surat`
--

INSERT INTO `surat` (`id`, `nomor_surat`, `nama`, `tempat_tanggal_lahir`, `kewarganegaraan_agama`, `pekerjaan`, `tempat_domisili`, `daerah_asal`, `surat_bukti_diri`, `keperluan`, `tujuan`, `jenis_surat`, `tanggal_permohonan`, `status`, `file_pdf`) VALUES
(1, 'P-0001', 'Sayudha Patria', '', '', NULL, NULL, NULL, '', NULL, NULL, 'Percobaan', '2025-03-22', 'Diproses', NULL),
(2, 'P-0002', 'ARYAMUKTI SATRIA HENDRAYANA', 'Yogyakarta, 20 Februari 2004', 'Indonesia / Islam', 'Mahasiswa', 'Jl. Ringin Raya No. 40 Condong Catur', 'Condong catur sleman', '3404072002040001', 'Buat nyoba ngatur', 'Kantor kebon dalem lor', 'Percobaan', '2025-03-24', 'Diproses', 'P-0002_ARYAMUKTI_SATRIA_HENDRAYANA.pdf'),
(5, 'SP/005/2025', 'rio', 'Yogyakarta, 20 Februari 2004', 'Indonesia / Islam', 'Mahasiswa', 'Jl. Ringin Raya No. 40 Condong Catur', 'Condong catur sleman', '3404072002040005', 'aaa', 'aaa', 'Surat Pengantar', '2025-03-29', 'Diproses', NULL),
(6, 'SP/006/2025', 'user', 'Yogyakarta, 20 Februari 2005', 'Indonesia / Islam', 'Mahasiswa', 'Jl. Ringin Raya No. 40 Condong Catur', 'Condong catur sleman', '3404072002040005', 'aa', 'aaaaaaaaa', 'Surat Pengantar', '2025-03-29', 'Diproses', NULL),
(7, 'SP/004/2025', 'bbbb', 'Yogyakarta, 20 Februari 2004', 'Indonesia / Islam', 'Mahasiswa', 'Jl. Ringin Raya No. 40 Condong Catur', 'Condong catur sleman', '3404072002040002', 'aaaaaaaaaaaa', 'aaaaaaaaa', 'Surat Pengantar', '2025-03-29', 'Diproses', NULL),
(8, 'SP/008/2025', 'xxxx', 'Yogyakarta, 20 Februari 2004', 'Indonesia / Islam', 'Mahasiswa', 'Jl. Ringin Raya No. 40 Condong Catur', 'Condong catur sleman', '3404072002040007', 'aaaaaa', 'aaaaaaaa', 'Surat Pengantar', '2025-03-31', 'Selesai', NULL);

-- --------------------------------------------------------

--
-- Struktur dari tabel `surat_kbi`
--

CREATE TABLE `surat_kbi` (
  `id` int(11) NOT NULL,
  `nomor_surat` varchar(255) DEFAULT NULL,
  `nama` varchar(255) DEFAULT NULL,
  `tertera` varchar(255) DEFAULT NULL,
  `norek` varchar(255) DEFAULT NULL,
  `nama_lagi` varchar(255) DEFAULT NULL,
  `tertera_lagi` varchar(255) DEFAULT NULL,
  `no_kk` varchar(255) DEFAULT NULL,
  `nik` varchar(255) DEFAULT NULL,
  `jenis_surat` varchar(255) DEFAULT NULL,
  `tanggal_permohonan` date DEFAULT NULL,
  `status` enum('Diproses','Selesai','Ditolak') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `surat_kbi`
--

INSERT INTO `surat_kbi` (`id`, `nomor_surat`, `nama`, `tertera`, `norek`, `nama_lagi`, `tertera_lagi`, `no_kk`, `nik`, `jenis_surat`, `tanggal_permohonan`, `status`) VALUES
(1, 'SKBI/001/2025', 'GGG', 'Gd', '445686689', 'Dgh', 'Furu', '45680', '5555555555555555', 'Surat Keterangan Beda Identitas', '2025-03-31', 'Ditolak');

-- --------------------------------------------------------

--
-- Struktur dari tabel `surat_ku`
--

CREATE TABLE `surat_ku` (
  `id` int(11) NOT NULL,
  `nomor_surat` varchar(255) DEFAULT NULL,
  `nama` varchar(255) DEFAULT NULL,
  `tempat_tanggal_lahir` varchar(255) DEFAULT NULL,
  `no_ktp` varchar(255) DEFAULT NULL,
  `alamat_ktp` text DEFAULT NULL,
  `jenis_usaha` varchar(255) DEFAULT NULL,
  `alamat_usaha` text DEFAULT NULL,
  `lama_usaha` varchar(255) DEFAULT NULL,
  `nama_bank` varchar(255) DEFAULT NULL,
  `alamat_bank` text DEFAULT NULL,
  `jenis_surat` varchar(255) DEFAULT 'Keterangan Usaha',
  `tanggal_permohonan` date DEFAULT NULL,
  `status` enum('Diproses','Selesai','Ditolak') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `surat_ku`
--

INSERT INTO `surat_ku` (`id`, `nomor_surat`, `nama`, `tempat_tanggal_lahir`, `no_ktp`, `alamat_ktp`, `jenis_usaha`, `alamat_usaha`, `lama_usaha`, `nama_bank`, `alamat_bank`, `jenis_surat`, `tanggal_permohonan`, `status`) VALUES
(1, 'SKU/001/2025', 'Aryamukti Satria Hendrayana ', 'Yogyakarta, 20 Februari 2004', '3404072002040001', 'aaaa', 'PS an', 'aaaa', '2 tahun', 'BNI', 'aaaaa', 'Keterangan Usaha', '2025-04-02', 'Diproses');

-- --------------------------------------------------------

--
-- Struktur dari tabel `surat_sktm`
--

CREATE TABLE `surat_sktm` (
  `id` int(11) NOT NULL,
  `nomor_surat` varchar(255) DEFAULT NULL,
  `nama` varchar(255) DEFAULT NULL,
  `no_kk` varchar(255) DEFAULT NULL,
  `nik` varchar(255) DEFAULT NULL,
  `tempat_tanggal_lahir` varchar(255) DEFAULT NULL,
  `jenis_kelamin` varchar(255) DEFAULT NULL,
  `alamat` text DEFAULT NULL,
  `nomor_hp` varchar(255) DEFAULT NULL,
  `jenis_surat` varchar(255) DEFAULT NULL,
  `tanggal_permohonan` date DEFAULT NULL,
  `status` enum('Diproses','Selesai','Ditolak') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `surat_sktm`
--

INSERT INTO `surat_sktm` (`id`, `nomor_surat`, `nama`, `no_kk`, `nik`, `tempat_tanggal_lahir`, `jenis_kelamin`, `alamat`, `nomor_hp`, `jenis_surat`, `tanggal_permohonan`, `status`) VALUES
(1, 'SKTM/001/2025', 'AA', '12345', '2344444444444444', 'Aa, 34 bn 2009', 'P', 'Htifsbninb', '456745777778', 'Surat Keterangan Tidak Mampu', '2025-03-31', 'Diproses');

-- --------------------------------------------------------

--
-- Struktur dari tabel `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `nama` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `surat`
--
ALTER TABLE `surat`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `surat_kbi`
--
ALTER TABLE `surat_kbi`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `surat_ku`
--
ALTER TABLE `surat_ku`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `surat_sktm`
--
ALTER TABLE `surat_sktm`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `surat`
--
ALTER TABLE `surat`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT untuk tabel `surat_kbi`
--
ALTER TABLE `surat_kbi`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `surat_ku`
--
ALTER TABLE `surat_ku`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `surat_sktm`
--
ALTER TABLE `surat_sktm`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
