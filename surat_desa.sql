-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 22 Mar 2025 pada 16.58
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
-- Struktur dari tabel `log_surat`
--

CREATE TABLE `log_surat` (
  `id` int(11) NOT NULL,
  `id_surat` int(11) DEFAULT NULL,
  `aktivitas` text NOT NULL,
  `waktu` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
  `status` enum('Diproses','Selesai','Ditolak') DEFAULT 'Diproses'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `surat`
--

INSERT INTO `surat` (`id`, `nomor_surat`, `nama`, `tempat_tanggal_lahir`, `kewarganegaraan_agama`, `pekerjaan`, `tempat_domisili`, `daerah_asal`, `surat_bukti_diri`, `keperluan`, `tujuan`, `jenis_surat`, `tanggal_permohonan`, `status`) VALUES
(1, 'P-0001', 'Sayudha Patria', '', '', NULL, NULL, NULL, '', NULL, NULL, 'Percobaan', '2025-03-22', 'Diproses'),
(2, 'P-0002', 'ARYAMUKTI SATRIA HENDRAYANA', 'Yogyakarta, 20 Februari 2004', 'Indonesia / Islam', 'Mahasiswa', 'Jl. Ringin Raya No. 40 Condong Catur', 'Condong catur sleman', '3404072002040001', 'Buat nyoba surat', 'Kantor kebon dalem kidul', 'Percobaan', '2025-03-22', 'Diproses');

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `log_surat`
--
ALTER TABLE `log_surat`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_surat` (`id_surat`);

--
-- Indeks untuk tabel `surat`
--
ALTER TABLE `surat`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `log_surat`
--
ALTER TABLE `log_surat`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `surat`
--
ALTER TABLE `surat`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `log_surat`
--
ALTER TABLE `log_surat`
  ADD CONSTRAINT `log_surat_ibfk_1` FOREIGN KEY (`id_surat`) REFERENCES `surat` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
