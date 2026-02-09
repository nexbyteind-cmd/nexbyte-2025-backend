const { ObjectId } = require('mongodb');
const express = require('express');

module.exports = function (app, connectDB) {
    const router = express.Router();

    // --- WEBINAR CATEGORIES ROUTES ---

    // Get all categories
    router.get('/categories', async (req, res) => {
        try {
            const db = await connectDB();
            const { includeHidden } = req.query;
            let query = {};
            if (includeHidden !== 'true') {
                query.isHidden = { $ne: true };
            }

            const categories = await db.collection('webinar_categories')
                .find(query)
                .sort({ name: 1 })
                .toArray();
            res.status(200).json({ success: true, data: categories });
        } catch (error) {
            console.error('Error fetching webinar categories:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Create a category
    router.post('/categories', async (req, res) => {
        try {
            const db = await connectDB();
            const { name } = req.body;
            if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

            const newCategory = {
                name,
                isHidden: false,
                createdAt: new Date()
            };

            const result = await db.collection('webinar_categories').insertOne(newCategory);
            res.status(201).json({ success: true, message: 'Category created', id: result.insertedId });
        } catch (error) {
            console.error('Error creating webinar category:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Toggle Category Visibility
    router.put('/categories/:id/visibility', async (req, res) => {
        try {
            const db = await connectDB();
            const { id } = req.params;
            const { isHidden } = req.body;

            await db.collection('webinar_categories').updateOne(
                { _id: new ObjectId(id) },
                { $set: { isHidden: isHidden } }
            );
            res.status(200).json({ success: true, message: 'Category visibility updated' });
        } catch (error) {
            console.error('Error updating webinar category visibility:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Delete Category
    router.delete('/categories/:id', async (req, res) => {
        try {
            const db = await connectDB();
            const { id } = req.params;
            await db.collection('webinar_categories').deleteOne({ _id: new ObjectId(id) });
            res.status(200).json({ success: true, message: 'Category deleted' });
        } catch (error) {
            console.error('Error deleting webinar category:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });


    // --- WEBINARS ROUTES ---

    // Get All Webinars (with filtering)
    router.get('/', async (req, res) => {
        try {
            const db = await connectDB();
            const { category, search, sortBy, includeHidden } = req.query;
            let query = {};

            // Filter hidden by default unless includeHidden is true (for admin)
            if (includeHidden !== 'true') {
                query.isHidden = { $ne: true };
            }

            if (category && category !== 'All') {
                query.category = category;
            }

            if (search) {
                query.title = { $regex: search, $options: 'i' };
            }

            let sortOption = { date: -1 }; // Default: Latest date first
            if (sortBy === 'oldest') {
                sortOption = { date: 1 };
            }

            const webinars = await db.collection('webinars').find(query).sort(sortOption).toArray();
            res.status(200).json({ success: true, data: webinars });
        } catch (error) {
            console.error('Error fetching webinars:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Create Webinar
    router.post('/', async (req, res) => {
        try {
            const db = await connectDB();
            const { title, date, youtubeLink, resourceLink, category, description } = req.body;

            if (!title || !date || !youtubeLink) {
                return res.status(400).json({ success: false, message: 'Title, Date, and YouTube Link are required' });
            }

            const newWebinar = {
                title,
                date: new Date(date),
                youtubeLink,
                resourceLink: resourceLink || "", // Google Drive Link or similar
                category: category || "General",
                description: description || "",
                isHidden: true, // Default to hidden
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await db.collection('webinars').insertOne(newWebinar);
            res.status(201).json({ success: true, message: 'Webinar created', id: result.insertedId });
        } catch (error) {
            console.error('Error creating webinar:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Update Webinar (Edit)
    router.put('/:id', async (req, res) => {
        try {
            const db = await connectDB();
            const { id } = req.params;
            const updateData = {
                ...req.body,
                updatedAt: new Date(),
                isHidden: true // Force hidden on update
            };

            if (updateData.date) {
                updateData.date = new Date(updateData.date);
            }
            // Helper: Remove _id from updateData if present
            delete updateData._id;

            const result = await db.collection('webinars').updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) return res.status(404).json({ success: false, message: 'Webinar not found' });
            res.status(200).json({ success: true, message: 'Webinar updated' });
        } catch (error) {
            console.error('Error updating webinar:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Toggle Webinar Visibility
    router.put('/:id/visibility', async (req, res) => {
        try {
            const db = await connectDB();
            const { id } = req.params;
            const { isHidden } = req.body;

            const result = await db.collection('webinars').updateOne(
                { _id: new ObjectId(id) },
                { $set: { isHidden: isHidden } }
            );

            if (result.matchedCount === 0) return res.status(404).json({ success: false, message: 'Webinar not found' });
            res.status(200).json({ success: true, message: 'Webinar visibility updated' });
        } catch (error) {
            console.error('Error updating webinar visibility:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Delete Webinar
    router.delete('/:id', async (req, res) => {
        try {
            const db = await connectDB();
            const { id } = req.params;
            await db.collection('webinars').deleteOne({ _id: new ObjectId(id) });
            res.status(200).json({ success: true, message: 'Webinar deleted' });
        } catch (error) {
            console.error('Error deleting webinar:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    app.use('/api/webinars', router);
};
