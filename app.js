const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const AWS = require('aws-sdk');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Konfigurasi AWS SDK
const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'us-east-1'
});

// Pool koneksi database
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Inisialisasi tabel database
async function initDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // Buat tabel produk jika belum ada
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        imageUrl VARCHAR(255) NOT NULL
      )
    `);
    
    // Periksa apakah perlu menambahkan data sampel
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM products');
    if (rows[0].count === 0) {
      // Tambahkan produk sampel
      await connection.query(`
        INSERT INTO products (name, price, imageUrl) VALUES
        ('Smartphone', 8999000, 'https://${process.env.S3_BUCKET}.s3.amazonaws.com/smartphone.jpg'),
        ('Laptop', 15999000, 'https://${process.env.S3_BUCKET}.s3.amazonaws.com/laptop.jpg'),
        ('Headphones', 2999000, 'https://${process.env.S3_BUCKET}.s3.amazonaws.com/headphones.jpg')
      `);
      console.log('Produk sampel ditambahkan ke database');
    }
    
    connection.release();
    console.log('Database berhasil diinisialisasi');
  } catch (error) {
    console.error('Inisialisasi database gagal:', error);
  }
}

// Rute
app.get('/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products');
    res.json(rows);
  } catch (error) {
    console.error('Error mengambil produk:', error);
    res.status(500).json({ error: 'Error database' });
  }
});

// Mulai server
app.listen(port, async () => {
  console.log(`API Backend berjalan di http://localhost:${port}`);
  await initDatabase();
});