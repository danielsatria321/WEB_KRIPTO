-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Nov 08, 2025 at 08:40 AM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `kriptoproject`
--

-- --------------------------------------------------------

--
-- Table structure for table `pasien`
--

CREATE TABLE `pasien` (
  `id_pasien` int(11) NOT NULL,
  `nama_lengkap` varchar(150) NOT NULL,
  `tanggal_lahir` date NOT NULL,
  `alamat_lengkap` text NOT NULL,
  `informasi_medis` text DEFAULT NULL,
  `status_pasien` enum('menunggu','dalam perawatan','selesai') DEFAULT 'menunggu',
  `hasil_pemeriksaan` text DEFAULT NULL,
  `foto_pasien` varchar(255) DEFAULT NULL,
  `dokumen_pdf` varchar(255) DEFAULT NULL,
  `jumlah_pembayaran` decimal(15,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pasien`
--

INSERT INTO `pasien` (`id_pasien`, `nama_lengkap`, `tanggal_lahir`, `alamat_lengkap`, `informasi_medis`, `status_pasien`, `hasil_pemeriksaan`, `foto_pasien`, `dokumen_pdf`, `jumlah_pembayaran`, `created_at`, `updated_at`) VALUES
(1, 'LhcNGhcIEwswUzcMHAQYOwQ=', '2025-11-06', 'PQoWHRYGEwk=', 'rawat-jalan', 'selesai', 'SSKoB06/0UlThYsoz09puA==', '690eeeda6f828_1762586330.webp', '690eeeda70a89_1762586330.pdf', 645323.00, '2025-11-08 07:18:50', '2025-11-08 07:18:50');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `nama` varchar(100) DEFAULT NULL,
  `username` varchar(50) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `nama`, `username`, `password`) VALUES
(1, 'Daniel', '321321', '$2y$10$75bp8qDVFvUj/2qLyfBe2.VFuW5s4Rd3ectUvpF3/aZONv0/G9slC'),
(2, 'kebobs', '321bas', '$2y$10$BhObABpsPw5AMNCMjMxzDOh1Qh9WToYWM3BNf9VqYIL/VRkX2tuA6'),
(4, 'haring', 'haige', '$2y$10$4VlwjsZ3uksK26Tngzhy/OUpeBKV3QfjFjFi4Rie2Gco2F.DCnlsm'),
(5, 'okras', 'sadakjsd', '$2y$10$9IvTEkZkzX1EX6ONRc7WuOBmt2kdU32Ie/qT9G1oszraCX2ENI8Su'),
(6, 'sadajksd', 'ashdahjsdb', '$2y$10$PQWnRznH7pvKu4Da80UNC.Ctuszgwzg881raaNXP5f4akJhz97QOm'),
(7, 'sdasda', 'asdasd', '$2y$10$DUEAta1RyCVPwnVYQVSQN.6Oq87EeUjY9N8/OW7wCuD7CxCP9wsXe'),
(8, 'testbro', 'testbro', '$2y$10$JkhO5RWkCmkZIlq0atkxveYdhKEQ0jAbyxUWK/a/65FOTaNBxQbrW'),
(9, 'Daniels', '321', '$2y$10$oj.LpRPQ0DGS/UbsvcBzB.q2Vu9QB.xBggDcuA6aTa1HOFAtBDxRG');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `pasien`
--
ALTER TABLE `pasien`
  ADD PRIMARY KEY (`id_pasien`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `pasien`
--
ALTER TABLE `pasien`
  MODIFY `id_pasien` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
