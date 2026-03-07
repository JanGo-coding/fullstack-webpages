require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const QRCode = require('qrcode');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;                                                                                   

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'activity_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to MySQL Database');
        connection.release();
    } catch (err) {
        console.error('❌ Database Connection Failed:', err);
    }
})();

app.get('/api/activities', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT a.*, 
            (SELECT COUNT(*) FROM registrations r WHERE r.activity_id = a.id) as current_seats 
            FROM activities a
            ORDER BY activity_date ASC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/activities/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM activities WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Activity not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/activities/:id/register', async (req, res) => {
    const activityId = req.params.id;
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ message: 'User ID is required' });

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [actRows] = await connection.query(
            `SELECT max_seats, 
            (SELECT COUNT(*) FROM registrations WHERE activity_id = ?) as current 
            FROM activities WHERE id = ?`,
            [activityId, activityId]
        );

        if (actRows.length === 0) throw new Error('Activity not found');
        const { max_seats, current } = actRows[0];

        if (current >= max_seats) {
            throw new Error('Activity is full');
        }

        const [dupCheck] = await connection.query(
            'SELECT * FROM registrations WHERE user_id = ? AND activity_id = ?',
            [userId, activityId]
        );
        if (dupCheck.length > 0) throw new Error('You already registered for this activity');

        const qrString = `U${userId}-A${activityId}`;
        const qrImage = await QRCode.toDataURL(qrString);

        await connection.query(
            'INSERT INTO registrations (user_id, activity_id, qr_code_data, status) VALUES (?, ?, ?, ?)',
            [userId, activityId, qrString, 'registered']
        );

        await connection.commit();

        console.log(`✅ User ${userId} registered for Activity ${activityId}`);
        res.json({ message: 'Registration successful', qr: qrImage, qrString });

    } catch (err) {
        await connection.rollback();
        res.status(400).json({ message: err.message });
    } finally {
        connection.release();
    }
});

app.post('/api/admin/scan', async (req, res) => {
    const { qrContent } = req.body;

    if (!qrContent) return res.status(400).json({ message: 'QR Content required' });

    try {
        const [rows] = await pool.query(
            `SELECT r.*, u.name as user_name, a.title as activity_title 
             FROM registrations r
             JOIN users u ON r.user_id = u.id
             JOIN activities a ON r.activity_id = a.id
             WHERE r.qr_code_data = ?`,
            [qrContent]
        );

        if (rows.length === 0) return res.status(404).json({ message: 'Invalid QR Code or Registration not found' });

        const registration = rows[0];

        if (registration.status === 'attended') {
            return res.status(200).json({ message: 'Already checked in', data: registration });
        }

        // อัปเดตสถานะเป็น "attended"
        await pool.query('UPDATE registrations SET status = ? WHERE id = ?', ['attended', registration.id]);

        res.json({
            message: 'Check-in successful',
            user: registration.user_name,
            activity: registration.activity_title
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/activities', async (req, res) => {
    const { title, description, activity_date, location, max_seats, image_url } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO activities (title, description, activity_date, location, max_seats, image_url) VALUES (?, ?, ?, ?, ?, ?)',
            [title, description, activity_date, location, max_seats, image_url]
        );
        res.json({ message: 'Activity created', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/register', async (req, res) => {
    const { student_id, email, name, password } = req.body;
    try {
        await pool.query(
            'INSERT INTO users (student_id, email, name, password) VALUES (?, ?, ?, ?)',
            [student_id, email, name, password]
        );
        res.json({ message: 'Success' });
    } catch (err) {
        res.status(400).json({ message: 'อีเมลหรือรหัสนักศึกษาซ้ำ' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await pool.query(
            'SELECT id, student_id, email, name, role FROM users WHERE email = ? AND password = ?',
            [email, password]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }
        res.json({ message: 'Login successful', user: rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});