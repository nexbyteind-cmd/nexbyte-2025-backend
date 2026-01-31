const { ObjectId } = require('mongodb');
const express = require('express');

module.exports = function (app, connectDB) {
    const router = express.Router();

    // --- ADS CATEGORIES ROUTES ---

    // Get all categories (ordered)
    router.get('/categories', async (req, res) => {
        try {
            const db = await connectDB();
            const categories = await db.collection('ad_categories')
                .find({})
                .sort({ order: 1 })
                .toArray();
            res.status(200).json({ success: true, data: categories });
        } catch (error) {
            console.error('Error fetching categories:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Create a category
    router.post('/categories', async (req, res) => {
        try {
            const db = await connectDB();
            const { name } = req.body;
            if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

            // Get current max order
            const lastCategory = await db.collection('ad_categories').find().sort({ order: -1 }).limit(1).toArray();
            const newOrder = lastCategory.length > 0 ? (lastCategory[0].order || 0) + 1 : 0;

            const newCategory = {
                name,
                order: newOrder,
                createdAt: new Date()
            };

            const result = await db.collection('ad_categories').insertOne(newCategory);
            res.status(201).json({ success: true, message: 'Category created', id: result.insertedId });
        } catch (error) {
            console.error('Error creating category:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Update categories order
    router.put('/categories/reorder', async (req, res) => {
        try {
            const db = await connectDB();
            const { categories } = req.body; // Expect array of { _id, order }

            if (!Array.isArray(categories)) {
                return res.status(400).json({ success: false, message: 'Invalid data format' });
            }

            const bulkOps = categories.map(cat => ({
                updateOne: {
                    filter: { _id: new ObjectId(cat._id) },
                    update: { $set: { order: cat.order } }
                }
            }));

            if (bulkOps.length > 0) {
                await db.collection('ad_categories').bulkWrite(bulkOps);
            }

            res.status(200).json({ success: true, message: 'Categories reordered' });
        } catch (error) {
            console.error('Error reordering categories:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Delete Category
    router.delete('/categories/:id', async (req, res) => {
        try {
            const db = await connectDB();
            const { id } = req.params;
            await db.collection('ad_categories').deleteOne({ _id: new ObjectId(id) });
            res.status(200).json({ success: true, message: 'Category deleted' });
        } catch (error) {
            console.error('Error deleting category:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });


    // --- ADS ROUTES ---

    // Get All Ads (with optional filtering)
    router.get('/ads', async (req, res) => {
        try {
            const db = await connectDB();
            const { category, featured, publicView } = req.query;
            let query = {};

            if (category && category !== 'All') {
                query.category = category;
            }
            if (featured === 'true') {
                query.homepageVisible = true;
            }
            if (publicView === 'true') {
                // Return ads where isVisible is true OR field is missing
                query.isVisible = { $ne: false };
            }

            const ads = await db.collection('ads').find(query).sort({ postedDate: -1 }).toArray();
            res.status(200).json({ success: true, data: ads });
        } catch (error) {
            console.error('Error fetching ads:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Get Single Ad by Slug
    router.get('/ads/:slug', async (req, res) => {
        try {
            const db = await connectDB();
            const { slug } = req.params;
            const ad = await db.collection('ads').findOne({ slug: slug });

            if (!ad) {
                return res.status(404).json({ success: false, message: 'Ad not found' });
            }
            res.status(200).json({ success: true, data: ad });
        } catch (error) {
            console.error('Error fetching ad:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Create Ad
    router.post('/ads', async (req, res) => {
        try {
            const db = await connectDB();
            const adData = {
                ...req.body,
                postedDate: new Date(),
                isVisible: true, // Default to visible
                // Ensure slug is unique is handled by logic or index (we check manually for simplicity)
            };

            // Check slug uniqueness
            const existing = await db.collection('ads').findOne({ slug: adData.slug });
            if (existing) {
                return res.status(400).json({ success: false, message: 'Slug already exists' });
            }

            const result = await db.collection('ads').insertOne(adData);
            res.status(201).json({ success: true, message: 'Ad created', id: result.insertedId });
        } catch (error) {
            console.error('Error creating ad:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Update Ad
    router.put('/ads/:id', async (req, res) => {
        try {
            const db = await connectDB();
            const { id } = req.params;
            const updateData = { ...req.body, updatedAt: new Date() };
            delete updateData._id; // Prevent updating _id

            // Check slug uniqueness if slug is changing
            if (updateData.slug) {
                const existing = await db.collection('ads').findOne({ slug: updateData.slug, _id: { $ne: new ObjectId(id) } });
                if (existing) {
                    return res.status(400).json({ success: false, message: 'Slug already exists' });
                }
            }

            const result = await db.collection('ads').updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) return res.status(404).json({ success: false, message: 'Ad not found' });
            res.status(200).json({ success: true, message: 'Ad updated' });
        } catch (error) {
            console.error('Error updating ad:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Delete Ad
    router.delete('/ads/:id', async (req, res) => {
        try {
            const db = await connectDB();
            const { id } = req.params;
            await db.collection('ads').deleteOne({ _id: new ObjectId(id) });
            res.status(200).json({ success: true, message: 'Ad deleted' });
        } catch (error) {
            console.error('Error deleting ad:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    app.use('/api/news', router);
};
