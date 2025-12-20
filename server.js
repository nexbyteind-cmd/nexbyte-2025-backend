const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://nexbyte-2025-frontend.vercel.app",
        "https://nexbyteind.com",
        "https://www.nexbyteind.com",
        "https://admin.nexbyteind.com"
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// MongoDB Connection
// MongoDB Connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

let db;

async function connectDB() {
    if (db) return db;
    try {
        await client.connect();
        const dbName = process.env.DB_NAME || 'nexbyteind_db_user';
        db = client.db(dbName);
        console.log(`Connected to MongoDB: ${dbName}`);
        return db;
    } catch (err) {
        console.error("MongoDB connection error:", err);
        throw err;
    }
}

// Middleware to ensure DB connection
app.use('/api', async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error("Failed to connect to DB in middleware:", error);
        res.status(500).json({ success: false, message: 'Database connection failed' });
    }
});

connectDB().catch(console.error);

// Serve static files (Admin Dashboard)
app.use(express.static('public'));

// Routes

// --- CONTACTS ---
app.get('/api/contacts', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ success: false, message: 'Database not initialized' });
        const contacts = await db.collection('contacts').find().sort({ submittedAt: -1 }).toArray();
        res.status(200).json({ success: true, data: contacts });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

app.post('/api/contact', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ success: false, message: 'Database not initialized' });
        const contactData = { ...req.body, submittedAt: new Date() };
        const result = await db.collection('contacts').insertOne(contactData);
        res.status(201).json({ success: true, message: 'Contact saved', id: result.insertedId });
    } catch (error) {
        console.error('Error saving contact:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// --- HACKATHONS ---
app.post('/api/hackathons', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ success: false, message: 'Database error' });
        const hackathonData = {
            ...req.body,
            createdAt: new Date(),
            status: 'active',
            isHidden: false // Default to visible
        };
        const result = await db.collection('hackathons').insertOne(hackathonData);
        res.status(201).json({ success: true, message: 'Hackathon created', id: result.insertedId });
    } catch (error) {
        console.error('Error creating hackathon:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/hackathons', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ success: false, message: 'Database error' });
        const hackathons = await db.collection('hackathons').find({}).sort({ startDate: 1 }).toArray();
        res.status(200).json({ success: true, data: hackathons });
    } catch (error) {
        console.error('Error fetching hackathons:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.delete('/api/hackathons/:id', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ success: false, message: 'Database error' });
        const { id } = req.params;
        const result = await db.collection('hackathons').deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 1) {
            res.status(200).json({ success: true, message: 'Hackathon deleted' });
        } else {
            res.status(404).json({ success: false, message: 'Hackathon not found' });
        }
    } catch (error) {
        console.error('Error deleting hackathon:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.put('/api/hackathons/:id/visibility', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ success: false, message: 'Database error' });
        const { id } = req.params;
        const { isHidden } = req.body;

        const result = await db.collection('hackathons').updateOne(
            { _id: new ObjectId(id) },
            { $set: { isHidden: isHidden } }
        );

        if (result.modifiedCount === 1) {
            res.status(200).json({ success: true, message: 'Visibility updated' });
        } else {
            // It's possible the value was already set to what we requested, so no modification.
            // But if matchedCount is 0, then it wasn't found.
            if (result.matchedCount === 0) {
                res.status(404).json({ success: false, message: 'Hackathon not found' });
            } else {
                res.status(200).json({ success: true, message: 'Visibility unchanged' });
            }
        }
    } catch (error) {
        console.error('Error updating visibility:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});



// --- APPLICATIONS ---
app.post('/api/applications', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ success: false, message: 'Database error' });
        const applicationData = {
            ...req.body,
            submittedAt: new Date()
        };
        const result = await db.collection('applications').insertOne(applicationData);
        res.status(201).json({ success: true, message: 'Application submitted', id: result.insertedId });
    } catch (error) {
        console.error('Error submitting application:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/applications', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ success: false, message: 'Database error' });
        const applications = await db.collection('applications').find({}).sort({ submittedAt: -1 }).toArray();
        res.status(200).json({ success: true, data: applications });
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// --- PROGRAMS (Trainings & Internships) ---
app.post('/api/programs', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ success: false, message: 'Database error' });
        const programData = {
            ...req.body,
            createdAt: new Date(),
            status: req.body.status || 'Active'
        };
        const result = await db.collection('programs').insertOne(programData);
        res.status(201).json({ success: true, message: 'Program created', id: result.insertedId });
    } catch (error) {
        console.error('Error creating program:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/programs', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ success: false, message: 'Database error' });
        // Optional filter by type if needed via query param ?type=Internship
        const query = {};
        if (req.query.type) {
            query.type = req.query.type;
        }

        const programs = await db.collection('programs').find(query).sort({ createdAt: -1 }).toArray();
        res.status(200).json({ success: true, data: programs });
    } catch (error) {
        console.error('Error fetching programs:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.delete('/api/programs/:id', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ success: false, message: 'Database error' });
        const { id } = req.params;
        const result = await db.collection('programs').deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 1) {
            res.status(200).json({ success: true, message: 'Program deleted' });
        } else {
            res.status(404).json({ success: false, message: 'Program not found' });
        }
    } catch (error) {
        console.error('Error deleting program:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// --- PROGRAM APPLICATIONS ---
app.post('/api/program-applications', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ success: false, message: 'Database error' });
        const applicationData = {
            ...req.body,
            submittedAt: new Date()
        };
        const result = await db.collection('program_applications').insertOne(applicationData);
        res.status(201).json({ success: true, message: 'Application submitted', id: result.insertedId });
    } catch (error) {
        console.error('Error submitting program application:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/program-applications', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ success: false, message: 'Database error' });
        const applications = await db.collection('program_applications').find({}).sort({ submittedAt: -1 }).toArray();
        res.status(200).json({ success: true, data: applications });
    } catch (error) {
        console.error('Error fetching program applications:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// --- TECHNOLOGY APPLICATIONS ---
app.post('/api/technology-applications', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ success: false, message: 'Database error' });
        const applicationData = {
            ...req.body,
            submittedAt: new Date(),
            status: 'New' // New, In Progress, Completed
        };
        const result = await db.collection('technology_applications').insertOne(applicationData);
        res.status(201).json({ success: true, message: 'Application submitted', id: result.insertedId });
    } catch (error) {
        console.error('Error submitting technology application:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/technology-applications', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ success: false, message: 'Database error' });
        const applications = await db.collection('technology_applications').find({}).sort({ submittedAt: -1 }).toArray();
        res.status(200).json({ success: true, data: applications });
    } catch (error) {
        console.error('Error fetching technology applications:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// --- STAFFING APPLICATIONS ---
app.post('/api/staffing-applications', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ success: false, message: 'Database error' });
        const applicationData = {
            ...req.body,
            submittedAt: new Date(),
            status: 'New'
        };
        const result = await db.collection('staffing_applications').insertOne(applicationData);
        res.status(201).json({ success: true, message: 'Application submitted', id: result.insertedId });
    } catch (error) {
        console.error('Error submitting staffing application:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/staffing-applications', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ success: false, message: 'Database error' });
        const applications = await db.collection('staffing_applications').find({}).sort({ submittedAt: -1 }).toArray();
        res.status(200).json({ success: true, data: applications });
    } catch (error) {
        console.error('Error fetching staffing applications:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});



// --- MARKETING APPLICATIONS ---
app.post('/api/marketing-applications', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ success: false, message: 'Database error' });
        const applicationData = {
            ...req.body, // Expects { clientDetails: {...}, digitalMarketingRequirements: {...} }
            submittedAt: new Date(),
            status: 'New'
        };
        const result = await db.collection('marketing_applications').insertOne(applicationData);
        res.status(201).json({ success: true, message: 'Application submitted', id: result.insertedId });
    } catch (error) {
        console.error('Error submitting marketing application:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/marketing-applications', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ success: false, message: 'Database error' });
        const applications = await db.collection('marketing_applications').find({}).sort({ submittedAt: -1 }).toArray();
        res.status(200).json({ success: true, data: applications });
    } catch (error) {
        console.error('Error fetching marketing applications:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// --- TESTIMONIALS & CASE STUDIES ---
app.get('/api/testimonials', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ success: false, message: 'Database error' });
        const items = await db.collection('testimonials').find({}).sort({ order: 1, createdAt: -1 }).toArray();
        res.status(200).json({ success: true, data: items });
    } catch (error) {
        console.error('Error fetching testimonials:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/testimonials', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ success: false, message: 'Database error' });
        const newItem = {
            ...req.body,
            createdAt: new Date(),
            isActive: req.body.isActive !== undefined ? req.body.isActive : true
        };
        const result = await db.collection('testimonials').insertOne(newItem);
        res.status(201).json({ success: true, message: 'Item created', id: result.insertedId });
    } catch (error) {
        console.error('Error creating testimonial:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.delete('/api/testimonials/:id', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ success: false, message: 'Database error' });
        const result = await db.collection('testimonials').deleteOne({ _id: new ObjectId(req.params.id) });
        if (result.deletedCount === 0) return res.status(404).json({ success: false, message: 'Item not found' });
        res.status(200).json({ success: true, message: 'Item deleted' });
    } catch (error) {
        console.error('Error deleting testimonial:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.put('/api/testimonials/:id', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ success: false, message: 'Database error' });
        const { _id, ...updateData } = req.body; // Remove _id from update data
        const result = await db.collection('testimonials').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updateData }
        );
        if (result.matchedCount === 0) return res.status(404).json({ success: false, message: 'Item not found' });
        res.status(200).json({ success: true, message: 'Item updated' });
    } catch (error) {
        console.error('Error updating testimonial:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.put('/api/testimonials/:id/status', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ success: false, message: 'Database error' });
        const result = await db.collection('testimonials').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { isActive: req.body.isActive } }
        );
        if (result.matchedCount === 0) return res.status(404).json({ success: false, message: 'Item not found' });
        res.status(200).json({ success: true, message: 'Status updated' });
    } catch (error) {
        console.error('Error updating testimonial status:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/', (req, res) => {
    res.send('Backend is running');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
