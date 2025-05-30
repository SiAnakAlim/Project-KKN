-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 10 Bulan Mei 2025 pada 09.02
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
-- Struktur dari tabel `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action` varchar(50) NOT NULL,
  `entity_type` varchar(20) NOT NULL,
  `entity_id` int(11) NOT NULL,
  `details` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `activity_logs`
--

INSERT INTO `activity_logs` (`id`, `user_id`, `action`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES
(1, 1, 'edit', 'surat_ku', 3, 'Mengedit surat KU SKU/003/2025', '2025-04-15 05:50:17'),
(2, 1, 'edit', 'surat_ku', 1, 'Mengedit surat KU SKU/001/2025', '2025-04-17 12:56:25'),
(3, 1, 'edit', 'surat_ku', 1, 'Mengedit surat KU SKU/001/2025', '2025-04-17 12:56:55'),
(4, 1, 'edit', 'surat_ku', 2, 'Mengedit surat KU SKU/002/2025', '2025-04-17 13:00:31'),
(5, 1, 'edit', 'surat_ku', 4, 'Mengedit surat KU SKU/004/2025', '2025-04-17 13:38:22'),
(6, 1, 'edit', 'surat_ku', 1, 'Mengedit surat KU SKU/001/2025', '2025-04-17 13:43:51'),
(7, 1, 'edit', 'surat_kbi', 1, 'Mengedit surat KBB SKBI/001/2025', '2025-04-18 08:42:36'),
(8, 1, 'edit', 'surat_kbi', 1, 'Mengedit surat KBB SKBI/001/2025', '2025-04-18 09:11:23'),
(9, 1, 'edit', 'surat_ku', 3, 'Mengedit surat KU SKU/003/2025', '2025-04-23 07:53:44'),
(10, 1, 'edit', 'surat', 6, 'Mengedit surat pengantar SP/006/2025', '2025-04-23 07:56:17'),
(11, 1, 'edit', 'surat', 6, 'Mengedit surat pengantar SP/006/2025', '2025-04-23 07:56:25'),
(12, 1, 'edit', 'surat_kbi', 1, 'Mengedit surat KBB SKBI/001/2025', '2025-04-23 08:19:53'),
(13, 1, 'edit', 'surat_ku', 4, 'Mengedit surat KU SKU/004/2025', '2025-04-23 11:18:52'),
(14, 1, 'edit', 'surat_kbi', 1, 'Mengedit surat KBB SKBI/001/2025', '2025-04-23 12:05:32'),
(15, 1, 'edit', 'surat', 7, 'Mengedit surat pengantar SP/004/2025', '2025-04-23 12:27:31'),
(16, 1, 'edit', 'surat_sktm', 1, 'Mengedit surat SKTM SKTM/001/2025', '2025-04-23 13:04:13'),
(17, 1, 'edit', 'surat_sktm', 1, 'Mengedit surat SKTM SKTM/001/2025', '2025-04-23 13:04:33'),
(18, 1, 'edit', 'surat_sktm', 1, 'Mengedit surat SKTM SKTM/001/2025', '2025-04-23 13:05:34'),
(19, 1, 'edit', 'surat_sktm', 1, 'Mengedit surat SKTM SKTM/001/2025', '2025-04-23 13:05:46'),
(20, 1, 'edit', 'surat_kbi', 1, 'Mengedit surat KBI SKBI/001/2025', '2025-04-23 14:00:15'),
(21, 1, 'edit', 'surat', 5, 'Mengedit surat pengantar SP/005/2025', '2025-04-27 08:13:27'),
(22, 1, 'edit', 'surat', 5, 'Mengedit surat pengantar SP/005/2025', '2025-04-27 09:36:40'),
(23, 1, 'edit', 'surat', 5, 'Mengedit surat pengantar SP/005/2025', '2025-04-27 09:36:50'),
(24, 1, 'edit', 'surat_kbi', 1, 'Mengedit surat KBI SKBI/001/2025', '2025-04-27 10:00:58'),
(25, 1, 'edit', 'surat_kbi', 1, 'Mengedit surat KBI SKBI/001/2025', '2025-04-27 10:10:16'),
(26, 1, 'edit', 'surat_kbi', 1, 'Mengedit surat KBI SKBI/001/2025', '2025-04-27 10:10:22'),
(27, 1, 'edit', 'surat_kbi', 1, 'Mengedit surat KBI SKBI/001/2025', '2025-04-27 10:12:36'),
(28, 1, 'edit', 'surat_kbi', 2, 'Mengedit surat KBI SKBI/002/2025', '2025-04-28 12:16:19'),
(29, 1, 'edit', 'surat', 6, 'Mengedit surat pengantar SP/006/2025', '2025-04-28 15:51:51'),
(30, 1, 'edit', 'surat', 6, 'Mengedit surat pengantar SP/006/2025', '2025-04-28 15:51:56'),
(31, 1, 'edit', 'surat_kbi', 1, 'Mengedit surat KBI SKBI/001/2025', '2025-04-28 15:53:39'),
(32, 1, 'edit', 'surat_ku', 2, 'Mengedit surat KU SKU/002/2025', '2025-04-28 16:11:02'),
(33, 1, 'edit', 'surat_ku', 2, 'Mengedit surat KU SKU/002/2025', '2025-04-28 16:11:11'),
(34, 1, 'edit', 'surat_ku', 5, 'Mengedit surat KU SKU/005/2025', '2025-04-28 16:11:24'),
(35, 1, 'edit', 'surat_sktm', 1, 'Mengedit surat SKTM SKTM/001/2025', '2025-04-28 16:17:57'),
(36, 1, 'edit', 'surat_sktm', 2, 'Mengedit surat SKTM SKTM/002/2025', '2025-04-28 16:25:05'),
(37, 1, 'edit', 'surat_sktm', 1, 'Mengedit surat SKTM SKTM/001/2025', '2025-04-28 16:34:27'),
(38, 1, 'edit', 'surat_sktm', 1, 'Mengedit surat SKTM SKTM/001/2025', '2025-04-28 16:35:45'),
(39, 1, 'edit', 'surat_sktm', 1, 'Mengedit surat SKTM SKTM/001/2025', '2025-04-28 16:37:33'),
(40, 1, 'edit', 'surat_ku', 1, 'Mengedit surat KU SKU/001/2025', '2025-04-28 17:38:41'),
(41, 1, 'edit', 'surat', 5, 'Mengedit surat pengantar SP/005/2025', '2025-04-30 03:59:31'),
(42, 1, 'edit', 'surat', 5, 'Mengedit surat pengantar SP/005/2025', '2025-04-30 03:59:54'),
(43, 1, 'edit', 'surat_sktm', 4, 'Mengedit surat SKTM SKTM/004/2025', '2025-04-30 04:02:14'),
(44, 1, 'edit', 'surat_sktm', 5, 'Mengedit surat SKTM SKTM/<span class=\"math-inline\">{String(newId).padStart(3, \'0\')}/</span>{tahun}', '2025-04-30 13:36:51'),
(45, 1, 'edit', 'surat_sktm', 5, 'Mengedit surat SKTM SKTM/<span class=\"math-inline\">{String(newId).padStart(3, \'0\')}/</span>{tahun}', '2025-04-30 13:47:35'),
(46, 1, 'edit', 'surat_sktm', 5, 'Mengedit surat SKTM SKTM/<span class=\"math-inline\">{String(newId).padStart(3, \'0\')}/</span>{tahun}', '2025-04-30 13:51:34'),
(47, 1, 'edit', 'surat_sktm', 4, 'Mengedit surat SKTM SKTM/004/2025', '2025-04-30 14:35:31'),
(48, 1, 'edit', 'surat_sktm', 4, 'Mengedit surat SKTM SKTM/004/2025', '2025-04-30 14:36:37'),
(49, 1, 'edit', 'surat_sktm', 5, 'Mengedit surat SKTM SKTM/005/2025', '2025-04-30 14:40:53'),
(50, 1, 'edit', 'surat_sktm', 5, 'Mengedit surat SKTM SKTM/005/2025', '2025-04-30 14:40:58'),
(51, 1, 'edit', 'surat_sktm', 12, 'Mengedit surat SKTM SKTM/012/2025', '2025-04-30 15:36:52'),
(52, 1, 'edit', 'surat_ku', 1, 'Mengedit surat KU SKU/001/2025', '2025-04-30 15:49:31'),
(53, 1, 'edit', 'surat_ku', 1, 'Mengedit surat KU SKU/001/2025', '2025-04-30 15:50:52'),
(54, 1, 'edit', 'surat_ku', 1, 'Mengedit surat KU SKU/001/2025', '2025-04-30 15:51:18'),
(55, 1, 'edit', 'surat_ku', 1, 'Mengedit surat KU SKU/001/2025', '2025-04-30 15:55:09'),
(56, 1, 'edit', 'surat_ku', 2, 'Mengedit surat KU SKU/002/2025', '2025-04-30 16:07:36'),
(57, 1, 'edit', 'surat_kbi', 1, 'Mengedit surat KBI SKBI/001/2025', '2025-04-30 16:22:57'),
(58, 1, 'edit', 'surat_kbi', 1, 'Mengedit surat KBI SKBI/001/2025', '2025-04-30 16:23:22'),
(59, 1, 'edit', 'surat_kbi', 1, 'Mengedit surat KBI SKBI/001/2025', '2025-04-30 16:38:13'),
(60, 1, 'edit', 'surat_kbi', 1, 'Mengedit surat KBI SKBI/001/2025', '2025-04-30 16:38:19'),
(61, 1, 'edit', 'surat', 6, 'Mengedit surat pengantar SP/006/2025', '2025-04-30 17:00:29'),
(62, 1, 'edit', 'surat', 6, 'Mengedit surat pengantar SP/006/2025', '2025-04-30 17:03:12'),
(63, 1, 'edit', 'surat_ku', 1, 'Mengedit surat KU SKU/001/2025', '2025-04-30 17:06:36'),
(64, 1, 'edit', 'surat_ku', 1, 'Mengedit surat KU SKU/001/2025', '2025-04-30 17:07:14'),
(65, 1, 'edit', 'surat', 8, 'Mengedit surat pengantar SP/008/2025', '2025-05-02 02:26:41'),
(66, 1, 'update_signatory', 'surat_sktm', 1, 'Memperbarui informasi penandatangan surat SKTM', '2025-05-02 04:46:31'),
(67, 1, 'update_signatory', 'surat_sktm', 1, 'Memperbarui informasi penandatangan surat SKTM', '2025-05-02 04:48:04'),
(68, 1, 'update_signatory', 'surat_sktm', 1, 'Memperbarui informasi penandatangan surat SKTM', '2025-05-06 14:06:55'),
(69, 1, 'update_signatory', 'surat_ku', 1, 'Memperbarui informasi penandatangan surat keterangan usaha', '2025-05-06 15:55:37'),
(70, 1, 'update_signatory', 'surat_kbi', 1, 'Memperbarui informasi penandatangan surat keterangan beda identitas', '2025-05-06 16:04:39'),
(71, 1, 'update_signatory', 'surat', 6, 'Memperbarui informasi penandatangan surat pengantar', '2025-05-06 16:10:38'),
(72, 1, 'update_signatory', 'surat_sktm', 1, 'Memperbarui informasi penandatangan surat SKTM', '2025-05-10 06:29:52'),
(73, 1, 'edit', 'surat_sktm', 1, 'Mengedit surat SKTM SKTM/001/2025', '2025-05-10 06:32:05'),
(74, 1, 'edit', 'surat_kbi', 1, 'Mengedit surat KBI SKBI/001/2025', '2025-05-10 06:45:45'),
(75, 1, 'edit', 'surat_kbi', 1, 'Mengedit surat KBI SKBI/001/2025', '2025-05-10 06:51:18');

-- --------------------------------------------------------

--
-- Struktur dari tabel `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` varchar(20) NOT NULL,
  `title` varchar(100) NOT NULL,
  `message` text NOT NULL,
  `related_id` int(11) NOT NULL,
  `related_type` varchar(20) NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `type`, `title`, `message`, `related_id`, `related_type`, `is_read`, `created_at`) VALUES
(1, 1, 'surat_ku', 'Surat Keterangan Usaha Baru', 'Surat KU untuk user (SKU/003/2025) berhasil dibuat', 3, 'surat_ku', 1, '2025-04-15 04:33:49'),
(2, 1, 'surat_kbi', 'Surat Keterangan Beda Identitas Baru', 'Surat KBi untuk user (SKBI/002/2025) berhasil dibuat', 2, 'surat_kbi', 0, '2025-04-28 12:07:50'),
(3, 1, 'surat_sktm', 'Surat Keterangan Tidak Mampu Baru', 'Surat SKTM untuk <span class=\"math-inline\">{nama} (</span>{nomor_surat}) berhasil dibuat', 5, 'surat_sktm', 0, '2025-04-30 13:36:19'),
(4, 1, 'surat_sktm', 'Surat Keterangan Tidak Mampu Baru', 'Surat SKTM untuk <span class=\"math-inline\">{nama} (</span>{nomor_surat}) berhasil dibuat', 6, 'surat_sktm', 0, '2025-04-30 13:40:15'),
(5, 1, 'surat_sktm', 'Surat Keterangan Tidak Mampu Baru', 'Surat SKTM untuk <span class=\"math-inline\">{nama} (</span>{nomor_surat}) berhasil dibuat', 7, 'surat_sktm', 0, '2025-04-30 13:52:21'),
(6, 1, 'surat_sktm', 'Surat Keterangan Tidak Mampu Baru', 'Surat SKTM untuk <span class=\"math-inline\">{nama} (</span>{nomor_surat}) berhasil dibuat', 8, 'surat_sktm', 0, '2025-04-30 13:54:46'),
(7, 1, 'surat_sktm', 'Surat Keterangan Tidak Mampu Baru', 'Surat SKTM untuk <span class=\"math-inline\">{nama} (</span>{nomor_surat}) berhasil dibuat', 9, 'surat_sktm', 0, '2025-04-30 13:59:17'),
(8, 1, 'surat_ku', 'Surat Keterangan Usaha Baru', 'Surat KU untuk rio (SKU/006/2025) berhasil dibuat', 6, 'surat_ku', 0, '2025-04-30 14:04:04'),
(9, 1, 'surat_sktm', 'Surat Keterangan Tidak Mampu Baru', 'Surat SKTM untuk <span class=\"math-inline\">{nama} (</span>{nomor_surat}) berhasil dibuat', 10, 'surat_sktm', 0, '2025-04-30 14:13:39'),
(10, 1, 'surat_sktm', 'Surat Keterangan Tidak Mampu Baru', 'Surat SKTM untuk <span class=\"math-inline\">{nama} (</span>{nomor_surat}) berhasil dibuat', 11, 'surat_sktm', 0, '2025-04-30 14:21:45'),
(11, 1, 'surat_sktm', 'Surat Keterangan Tidak Mampu Baru', 'Surat SKTM untuk bismillah (SKTM/012/2025) berhasil dibuat', 12, 'surat_sktm', 1, '2025-04-30 14:26:55'),
(12, 1, 'surat', 'Surat Pengantar Baru', 'Surat Pengantar untuk aaa (SP/010/2025) berhasil dibuat', 10, 'surat', 0, '2025-04-30 15:28:09'),
(13, 1, 'surat', 'Surat Pengantar Baru', 'Surat Pengantar untuk aaa (SP/011/2025) berhasil dibuat', 11, 'surat', 1, '2025-04-30 15:31:19');

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
  `file_pdf` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `nomor_wa` varchar(20) DEFAULT NULL,
  `jabatan_penandatangan` varchar(100) DEFAULT 'a.n Kepala Desa Kebondalem Kidul',
  `nama_penandatangan` varchar(100) DEFAULT 'DARU PURNOMO',
  `jabatan_sebenarnya` varchar(100) DEFAULT 'Sekretaris Desa'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `surat`
--

INSERT INTO `surat` (`id`, `nomor_surat`, `nama`, `tempat_tanggal_lahir`, `kewarganegaraan_agama`, `pekerjaan`, `tempat_domisili`, `daerah_asal`, `surat_bukti_diri`, `keperluan`, `tujuan`, `jenis_surat`, `tanggal_permohonan`, `status`, `file_pdf`, `updated_at`, `nomor_wa`, `jabatan_penandatangan`, `nama_penandatangan`, `jabatan_sebenarnya`) VALUES
(1, 'P-0001', 'Sayudha Patria', '', '', NULL, NULL, NULL, '', NULL, NULL, 'Percobaan', '2025-03-22', 'Diproses', NULL, '2025-04-23 07:55:59', NULL, 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO', 'Sekretaris Desa'),
(2, 'P-0002', 'ARYAMUKTI SATRIA HENDRAYANA', 'Yogyakarta, 20 Februari 2004', 'Indonesia / Islam', 'Mahasiswa', 'Jl. Ringin Raya No. 40 Condong Catur', 'Condong catur sleman', '3404072002040001', 'Buat nyoba ngatur', 'Kantor kebon dalem lor', 'Percobaan', '2025-03-24', 'Diproses', 'P-0002_ARYAMUKTI_SATRIA_HENDRAYANA.pdf', '2025-04-23 07:55:59', NULL, 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO', 'Sekretaris Desa'),
(5, 'SP/005/2025', 'rio tampan', 'Yogyakarta, 20 Februari 2004', 'Indonesia / Islam', 'Mahasiswa', 'Jl. Ringin Raya No. 40 Condong Catur', 'Condong catur sleman', '3404072002040005', 'aaa', 'aaa', 'Surat Pengantar', '2025-03-29', 'Ditolak', NULL, '2025-04-30 03:59:54', NULL, 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO', 'Sekretaris Desa'),
(6, 'SP/006/2025', 'user', 'Yogyakarta, 20 Februari 2005', 'Indonesia / Islam', 'Mahasiswa', 'Jl. Ringin Raya No. 40 Condong Catur', 'Condong catur sleman', '3404072002040005', 'bbb', 'aaaaaaaaa', 'Surat Pengantar', '2025-03-29', 'Selesai', NULL, '2025-05-06 16:10:38', NULL, 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO AJA', 'Sekretaris Desa'),
(7, 'SP/004/2025', 'bbbb', 'Yogyakarta, 20 Februari 2004', 'Indonesia / Islam', 'Mahasiswa', 'Jl. Ringin Raya No. 40 Condong Catur', 'Condong catur sleman', '3404072002040002', 'aaaaaaaaaaaa', 'aaaaaaaaa', 'Surat Pengantar', '2025-03-29', 'Selesai', NULL, '2025-04-23 12:27:31', NULL, 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO', 'Sekretaris Desa'),
(8, 'SP/008/2025', 'xxxx', 'Yogyakarta, 20 Februari 2004', 'Indonesia / Islam', 'Mahasiswa', 'Jl. Ringin Raya No. 40 Condong Catur', 'Condong catur sleman', '3404072002040007', 'aaaaaa', 'aaaaaaaa', 'Surat Pengantar', '2025-03-31', 'Selesai', NULL, '2025-05-02 02:26:41', '08562519826', 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO', 'Sekretaris Desa'),
(9, 'SP/009/2025', 'ARDIANSYAH DWIKI', 'Wonogiri, 14 Desember 2003', 'Indonesia / Islam', 'Mahasiswa', 'Jogja', 'Wonogiri', '3312121412030002', 'Beasiswa', 'Persyaratan beasiswa', 'Percobaan', '2025-04-17', 'Diproses', NULL, '2025-04-23 08:29:09', NULL, 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO', 'Sekretaris Desa'),
(10, 'SP/010/2025', 'aaa', 'Yogyakarta, 20 Februari 2004', 'Indonesia / Islam', 'Mahasiswa', 'Jl. Ringin Raya No. 40 Condong Catur', 'Condong catur sleman', '3404072002040001', 'aaa', 'aa', 'Surat Pengantar', '2025-04-30', 'Diproses', NULL, '2025-04-30 15:28:09', NULL, 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO', 'Sekretaris Desa'),
(11, 'SP/011/2025', 'aaa', 'Yogyakarta, 20 Februari 2004', 'Indonesia / Islam', 'Mahasiswa', 'Jl. Ringin Raya No. 40 Condong Catur', 'Condong catur sleman', '3404072002040001', 'aaa', 'aa', 'Surat Pengantar', '2025-04-30', 'Diproses', NULL, '2025-04-30 15:31:19', NULL, 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO', 'Sekretaris Desa');

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
  `keperluan_surat` varchar(255) DEFAULT NULL,
  `jenis_surat` varchar(255) DEFAULT NULL,
  `tanggal_permohonan` date DEFAULT NULL,
  `status` enum('Diproses','Selesai','Ditolak') DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `nomor_wa` varchar(20) DEFAULT NULL,
  `jabatan_penandatangan` varchar(100) DEFAULT 'a.n Kepala Desa Kebondalem Kidul',
  `nama_penandatangan` varchar(100) DEFAULT 'DARU PURNOMO',
  `jabatan_sebenarnya` varchar(100) DEFAULT 'Sekretaris Desa'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `surat_kbi`
--

INSERT INTO `surat_kbi` (`id`, `nomor_surat`, `nama`, `tertera`, `norek`, `nama_lagi`, `tertera_lagi`, `no_kk`, `nik`, `keperluan_surat`, `jenis_surat`, `tanggal_permohonan`, `status`, `updated_at`, `nomor_wa`, `jabatan_penandatangan`, `nama_penandatangan`, `jabatan_sebenarnya`) VALUES
(1, 'SKBI/001/2025', 'Bagas ', 'BPJS', '445686689', 'Dgh', 'Furu', '1234567891234567', '5555555555555555', 'buat nyoba notif edit', 'Surat Keterangan Beda Identitas', '2025-03-31', 'Selesai', '2025-05-10 06:51:18', '08562519826', 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO AJA', 'Sekretaris Desa'),
(2, 'SKBI/002/2025', 'user aha', 'user', 'aaaaaaaaaaa', 'Dgh', 'aaaaaaaaa', '1234567891234567', '3404072002040001', 'buat nyoba notif', 'kbi', '2025-04-28', 'Diproses', '2025-04-28 12:16:19', NULL, 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO', 'Sekretaris Desa');

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
  `status` enum('Diproses','Selesai','Ditolak') DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `nomor_wa` varchar(20) DEFAULT NULL,
  `jabatan_penandatangan` varchar(100) DEFAULT 'a.n Kepala Desa Kebondalem Kidul',
  `nama_penandatangan` varchar(100) DEFAULT 'DARU PURNOMO',
  `jabatan_sebenarnya` varchar(100) DEFAULT 'Sekretaris Desa'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `surat_ku`
--

INSERT INTO `surat_ku` (`id`, `nomor_surat`, `nama`, `tempat_tanggal_lahir`, `no_ktp`, `alamat_ktp`, `jenis_usaha`, `alamat_usaha`, `lama_usaha`, `nama_bank`, `alamat_bank`, `jenis_surat`, `tanggal_permohonan`, `status`, `updated_at`, `nomor_wa`, `jabatan_penandatangan`, `nama_penandatangan`, `jabatan_sebenarnya`) VALUES
(1, 'SKU/001/2025', 'Kecu ', 'Yogyakarta, 20 Februari 2004', '3404072002040001', 'aaaa', 'PS an', 'aaaa', '2 tahun', 'BNI', 'aaaaa', 'Keterangan Usaha', '2025-04-02', 'Selesai', '2025-05-06 15:55:37', '087848247230', 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO AJA', 'Sekretaris Desa'),
(2, 'SKU/002/2025', 'bayu tampan', 'Yogyakarta, 20 Februari 2005', '3404072002040002', 'aaaaaaa', 'PS an', 'aaaaaa', '2 tahun', 'BNI', 'aaaaaaaa', 'Keterangan Usaha', '2025-04-15', 'Selesai', '2025-04-30 16:07:36', '08562519826', 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO', 'Sekretaris Desa'),
(3, 'SKU/003/2025', 'user tok', 'Yogyakarta, 20 Februari 2006', '3404072002040001', 'REKTORAT UPNNNN', 'aaa', 'aa', 'aaa', 'aa', 'aaa', 'Keterangan Usaha', '2025-04-15', 'Diproses', '2025-04-23 07:53:44', NULL, 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO', 'Sekretaris Desa'),
(4, 'SKU/004/2025', 'ALMA ALFRINSKA', 'Bantul, 11 Januari 2004', '3301225108030004', 'Jl. Paris KM 7', 'Coffe Shop', 'Jl Seturan', '10 TAHUN', 'jago', 'kepo', 'Surat Keterangan Usaha', '2025-04-17', 'Ditolak', '2025-04-23 11:18:52', NULL, 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO', 'Sekretaris Desa'),
(5, 'SKU/005/2025', 'hahaha', 'Sojiwan, 31 Apr 2006', '1234567891111111', 'anu, anu, anu', 'Kuliner extrem', 'anu, anu, anu', '3 hari', 'bank rio', 'anu, anu, anu', 'Surat Keterangan Usaha', '2025-04-23', 'Diproses', '2025-04-28 16:11:24', NULL, 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO', 'Sekretaris Desa'),
(6, 'SKU/006/2025', 'rio', 'Yogyakarta, 20 Februari 2004', '3404072002040001', 'aaaa', 'Coffe Shop', 'aaaa', '10 TAHUN', 'bank rio', 'aaa', 'Keterangan Usaha', '2025-04-30', 'Diproses', '2025-04-30 14:04:04', NULL, 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO', 'Sekretaris Desa');

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
  `status` enum('Diproses','Selesai','Ditolak') DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `nomor_wa` varchar(20) DEFAULT NULL,
  `jabatan_penandatangan` varchar(100) DEFAULT 'a.n Kepala Desa Kebondalem Kidul',
  `nama_penandatangan` varchar(100) DEFAULT 'DARU PURNOMO',
  `jabatan_sebenarnya` varchar(100) DEFAULT 'Sekretaris Desa'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `surat_sktm`
--

INSERT INTO `surat_sktm` (`id`, `nomor_surat`, `nama`, `no_kk`, `nik`, `tempat_tanggal_lahir`, `jenis_kelamin`, `alamat`, `nomor_hp`, `jenis_surat`, `tanggal_permohonan`, `status`, `updated_at`, `nomor_wa`, `jabatan_penandatangan`, `nama_penandatangan`, `jabatan_sebenarnya`) VALUES
(1, 'SKTM/001/2025', 'Andri', '1234567891234567', '2344444444444444', 'Aa, 34 bn 2009', 'L', 'jogja', '08562519826', 'Surat Keterangan Tidak Mampu', '2025-03-31', 'Selesai', '2025-05-10 06:32:05', NULL, 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO hehe', 'Sekretaris Desa haha'),
(2, 'SKTM/002/2025', 'DEAN ARTIKA TIRANNY', '0123567890987654', '1527281982827811', 'jogja, 16 oktober 2005', 'P', 'jogja', '0821403749820', 'Surat Keterangan Tidak Mampu', '2025-04-17', 'Selesai', '2025-04-28 16:25:05', NULL, 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO', 'Sekretaris Desa'),
(3, 'SKTM/003/2025', 'WALID', '1234567899876543', '1234567890098765', 'Jombang, 14 Desember 1999', 'P', 'jogja', '098765432123', 'Surat Keterangan Tidak Mampu', '2025-04-17', 'Diproses', '2025-04-23 08:42:44', NULL, 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO', 'Sekretaris Desa'),
(4, 'SKTM/004/2025', 'SAYUDHA', '1232201771111111', '1111111111111111', 'Jakarta, 20 mei 2005', 'L', 'Jogja', '087848247230', 'Surat Keterangan Tidak Mampu', '2025-04-30', 'Selesai', '2025-04-30 14:36:37', '6287834443816@s.what', 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO', 'Sekretaris Desa'),
(5, 'SKTM/005/2025', 'Aryamukti Satria Hendrayana', '1234567891234567', '3404072002040009', 'Yogyakarta, 20 Februari 2006', 'L', 'JL. Ringin Raya No. 40', '08562519826', 'sktm', '2025-04-30', 'Selesai', '2025-04-30 14:40:58', NULL, 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO', 'Sekretaris Desa'),
(6, 'SKTM/006/2025', 'Irhas Effendi', '1234567891234567', '3404072002040001', 'Yogyakarta, 20 Februari 2004', 'Laki-laki', 'JL. Ringin Raya No. 40', '08562519826', 'sktm', '2025-04-30', 'Diproses', '2025-04-30 14:27:26', NULL, 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO', 'Sekretaris Desa'),
(7, 'SKTM/007/2025', 'Aryamukti Satria', '1234567891234569', '3404072002040001', 'Yogyakarta, 20 Februari 2004', 'L', 'JL. Ringin Raya No. 40', '08562519826', 'sktm', '2025-04-30', 'Diproses', '2025-04-30 14:27:37', NULL, 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO', 'Sekretaris Desa'),
(8, 'SKTM/008/2025', 'aa', '1234567891234567', '3404072002040001', 'Yogyakarta, 20 Februari 2004', 'L', 'JL. Ringin Raya No. 40', '0821403749820', 'sktm', '2025-04-30', 'Diproses', '2025-04-30 14:27:53', NULL, 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO', 'Sekretaris Desa'),
(9, 'SKTM/009/2025', 'aaa', '1234567891234567', '3404072002040001', 'Yogyakarta, 20 Februari 2004', 'P', 'JL. Ringin Raya No. 40', '083929382922', 'sktm', '2025-04-30', 'Diproses', '2025-04-30 14:28:03', NULL, 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO', 'Sekretaris Desa'),
(10, 'SKTM/010/2025', 'aaa', '1234567891234567', '3404072002040001', 'Yogyakarta, 20 Februari 2004', 'L', 'aaa', '083929382922', 'sktm', '2025-04-30', 'Diproses', '2025-04-30 14:28:17', NULL, 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO', 'Sekretaris Desa'),
(11, 'SKTM/011/2025', 'AAA', '1234567891234567', '3404072002040001', 'Yogyakarta, 20 Februari 2006', 'P', 'JL. Ringin Raya No. 40', '0821403749820', 'sktm', '2025-04-30', 'Diproses', '2025-04-30 14:28:26', NULL, 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO', 'Sekretaris Desa'),
(12, 'SKTM/012/2025', 'bismillah', '1234567891234567', '3404072002040001', 'Yogyakarta, 20 Februari 2004', 'L', 'JL. Ringin Raya No. 40', '08562519826', 'sktm', '2025-04-30', 'Selesai', '2025-04-30 15:36:52', NULL, 'a.n Kepala Desa Kebondalem Kidul', 'DARU PURNOMO', 'Sekretaris Desa');

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
-- Dumping data untuk tabel `users`
--

INSERT INTO `users` (`id`, `nama`, `email`, `password`) VALUES
(1, 'Aryamukti ', 'aryamuktisatria@gmail.com', '$2b$10$A5IBfLAaXQoBvienAhOZnu8aFYmN2d8hgw2JEBr4sTmQePLiOg2mG');

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indeks untuk tabel `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

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
-- AUTO_INCREMENT untuk tabel `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=76;

--
-- AUTO_INCREMENT untuk tabel `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT untuk tabel `surat`
--
ALTER TABLE `surat`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT untuk tabel `surat_kbi`
--
ALTER TABLE `surat_kbi`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT untuk tabel `surat_ku`
--
ALTER TABLE `surat_ku`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT untuk tabel `surat_sktm`
--
ALTER TABLE `surat_sktm`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT untuk tabel `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD CONSTRAINT `activity_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Ketidakleluasaan untuk tabel `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
