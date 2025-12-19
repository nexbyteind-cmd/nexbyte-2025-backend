const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: '*', // Allow all origins
    methods: ['GET', 'POST'], // Allow only specific methods if desired, or remove to allow all
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// MongoDB Connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

let db;

async function connectDB() {
    try {
        await client.connect();
        // Use the database name from env or default to 'nexbyteind_db_user'
        const dbName = process.env.DB_NAME || 'nexbyteind_db_user';
        db = client.db(dbName);
        console.log(`Connected to MongoDB: ${dbName}`);
    } catch (err) {
        console.error("MongoDB connection error:", err);
    }
}
connectDB();

// Routes

// Serve static files (Admin Dashboard)
app.use(express.static('public'));

// Routes
app.get('/api/contacts', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({ success: false, message: 'Database not initialized' });
        }
        // Fetch all contacts, sorted by newest first
        const contacts = await db.collection('contacts').find().sort({ submittedAt: -1 }).toArray();
        res.status(200).json({ success: true, data: contacts });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

app.post('/api/contact', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({ success: false, message: 'Database not initialized' });
        }
        const contacts = db.collection('contacts');

        const contactData = {
            ...req.body,
            submittedAt: new Date()
        };

        const result = await contacts.insertOne(contactData);
        res.status(201).json({ success: true, message: 'Contact saved', id: result.insertedId });
    } catch (error) {
        console.error('Error saving contact:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

app.get('/', (req, res) => {
    res.send('Backend is running');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
