CREATE DATABASE IF NOT EXISTS medicare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medicare;
SET FOREIGN_KEY_CHECKS=0;
DROP TABLE IF EXISTS notifications,appointments,doctors,clinics,specialties,users;
SET FOREIGN_KEY_CHECKS=1;
CREATE TABLE users(id INT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(100) NOT NULL,email VARCHAR(120) NOT NULL UNIQUE,password_hash VARCHAR(100) NOT NULL,phone VARCHAR(20),role ENUM('patient','doctor','admin') NOT NULL DEFAULT 'patient',created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE specialties(id INT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(100) NOT NULL,icon VARCHAR(10));
CREATE TABLE clinics(id INT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(150) NOT NULL,address VARCHAR(255),phone VARCHAR(20));
CREATE TABLE doctors(id INT AUTO_INCREMENT PRIMARY KEY,user_id INT NOT NULL UNIQUE,specialty_id INT NOT NULL,clinic_id INT NOT NULL,degree VARCHAR(100),experience INT DEFAULT 0,fee INT NOT NULL DEFAULT 0,bio TEXT,work_days VARCHAR(20) NOT NULL DEFAULT '1,2,3,4,5',
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(specialty_id) REFERENCES specialties(id),FOREIGN KEY(clinic_id) REFERENCES clinics(id));
-- doctor_id là cột gốc của slot_key nên khóa ngoại không được dùng CASCADE
CREATE TABLE appointments(id INT AUTO_INCREMENT PRIMARY KEY,patient_id INT NOT NULL,doctor_id INT NOT NULL,appt_date DATE NOT NULL,appt_time TIME NOT NULL,reason VARCHAR(500),
 status ENUM('pending','confirmed','done','cancelled','rejected') NOT NULL DEFAULT 'pending',fee INT NOT NULL DEFAULT 0,paid TINYINT(1) NOT NULL DEFAULT 1,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 slot_key VARCHAR(40) GENERATED ALWAYS AS (IF(status IN ('pending','confirmed','done'),CONCAT(doctor_id,'-',appt_date,'-',appt_time),NULL)) STORED,
 UNIQUE KEY uq_slot(slot_key),FOREIGN KEY(patient_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(doctor_id) REFERENCES doctors(id));
CREATE TABLE notifications(id INT AUTO_INCREMENT PRIMARY KEY,user_id INT NOT NULL,message VARCHAR(300) NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
