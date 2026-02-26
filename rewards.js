const { ObjectId } = require('mongodb');
const express = require('express');

module.exports = function (app, connectDB) {
    const router = express.Router();

    // --- CATEGORIES ---

    // Get all categories
    router.get('/categories', async (req, res) => {
        try {
            const db = await connectDB();
            const categories = await db.collection('reward_categories').find().sort({ createdAt: -1 }).toArray();
            res.status(200).json({ success: true, data: categories });
        } catch (error) {
            console.error('Error fetching categories:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Create new category
    router.post('/categories', async (req, res) => {
        try {
            const db = await connectDB();
            const { name } = req.body;

            if (!name || name.trim() === '') {
                return res.status(400).json({ success: false, message: 'Category name is required' });
            }

            // Check if category already exists
            const existing = await db.collection('reward_categories').findOne({ name: name.trim() });
            if (existing) {
                return res.status(400).json({ success: false, message: 'Category already exists' });
            }

            const newCategory = {
                name: name.trim(),
                createdAt: new Date()
            };

            const result = await db.collection('reward_categories').insertOne(newCategory);
            res.status(201).json({ success: true, message: 'Category created', id: result.insertedId });
        } catch (error) {
            console.error('Error creating category:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Delete category
    router.delete('/categories/:id', async (req, res) => {
        try {
            const db = await connectDB();
            const { id } = req.params;

            // Check if any rewards use this category
            const rewardsWithCategory = await db.collection('rewards').countDocuments({ categoryId: id });
            if (rewardsWithCategory > 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Cannot delete category. ${rewardsWithCategory} reward(s) are using it.` 
                });
            }

            const result = await db.collection('reward_categories').deleteOne({ _id: new ObjectId(id) });
            if (result.deletedCount === 1) {
                res.status(200).json({ success: true, message: 'Category deleted' });
            } else {
                res.status(404).json({ success: false, message: 'Category not found' });
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // --- REWARDS ---

    // Get all rewards (History) - optionally filter by category
    router.get('/', async (req, res) => {
        try {
            const db = await connectDB();
            const { categoryId } = req.query;
            
            const query = categoryId && categoryId !== 'all' ? { categoryId } : {};
            const rewards = await db.collection('rewards').find(query).sort({ createdAt: -1 }).toArray();
            
            res.status(200).json({ success: true, data: rewards });
        } catch (error) {
            console.error('Error fetching rewards:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Get latest active reward
    router.get('/active', async (req, res) => {
        try {
            const db = await connectDB();
            const reward = await db.collection('rewards').findOne({ status: 'active' }, { sort: { createdAt: -1 } });
            if (!reward) {
                return res.status(404).json({ success: false, message: 'No active reward found' });
            }
            res.status(200).json({ success: true, data: reward });
        } catch (error) {
            console.error('Error fetching active reward:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Create new reward
    router.post('/', async (req, res) => {
        try {
            const db = await connectDB();
            const { title, description, bannerUrl, audience, buttonText, buttonLink, categoryId } = req.body;

            // Deactivate previous active rewards
            await db.collection('rewards').updateMany({ status: 'active' }, { $set: { status: 'completed' } });

            const newReward = {
                title,
                description: description || "",
                bannerUrl: bannerUrl || "",
                audience, // Array of { name, mobile }
                buttonText: buttonText || "",
                buttonLink: buttonLink || "",
                categoryId: categoryId || null,
                status: 'active',
                riggedIndex: -1, // Default no rigging
                winner: null,
                spinTriggeredAt: null,
                createdAt: new Date()
            };

            const result = await db.collection('rewards').insertOne(newReward);
            res.status(201).json({ success: true, message: 'Reward created', id: result.insertedId });
        } catch (error) {
            console.error('Error creating reward:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Update rigged index
    router.put('/:id/rig', async (req, res) => {
        try {
            const db = await connectDB();
            const { id } = req.params;
            const { riggedIndex } = req.body;

            const result = await db.collection('rewards').updateOne(
                { _id: new ObjectId(id) },
                { $set: { riggedIndex: parseInt(riggedIndex) } }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ success: false, message: 'Reward not found' });
            }

            res.status(200).json({ success: true, message: 'Rigged index updated' });
        } catch (error) {
            console.error('Error updating rigged index:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Trigger spin (Admin only action)
    router.put('/:id/trigger-spin', async (req, res) => {
        try {
            const db = await connectDB();
            const { id } = req.params;

            const result = await db.collection('rewards').updateOne(
                { _id: new ObjectId(id) },
                { $set: { spinTriggeredAt: new Date() } }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ success: false, message: 'Reward not found' });
            }

            res.status(200).json({ success: true, message: 'Spin triggered' });
        } catch (error) {
            console.error('Error triggering spin:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Reset spin state
    router.put('/:id/reset-spin', async (req, res) => {
        try {
            const db = await connectDB();
            const { id } = req.params;

            const result = await db.collection('rewards').updateOne(
                { _id: new ObjectId(id) },
                { $set: { spinTriggeredAt: null, winner: null, status: 'active' } }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ success: false, message: 'Reward not found' });
            }

            res.status(200).json({ success: true, message: 'Spin state reset' });
        } catch (error) {
            console.error('Error resetting spin state:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Update reward details (button text/link, etc.)
    router.put('/:id', async (req, res) => {
        try {
            const db = await connectDB();
            const { id } = req.params;
            const { title, description, bannerUrl, buttonText, buttonLink, categoryId } = req.body;

            const updateFields = {};
            if (title !== undefined) updateFields.title = title;
            if (description !== undefined) updateFields.description = description;
            if (bannerUrl !== undefined) updateFields.bannerUrl = bannerUrl;
            if (buttonText !== undefined) updateFields.buttonText = buttonText;
            if (buttonLink !== undefined) updateFields.buttonLink = buttonLink;
            if (categoryId !== undefined) updateFields.categoryId = categoryId;

            const result = await db.collection('rewards').updateOne(
                { _id: new ObjectId(id) },
                { $set: updateFields }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ success: false, message: 'Reward not found' });
            }

            res.status(200).json({ success: true, message: 'Reward updated' });
        } catch (error) {
            console.error('Error updating reward:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Set winner (after spin completion)
    router.put('/:id/winner', async (req, res) => {
        try {
            const db = await connectDB();
            const { id } = req.params;
            const { winner } = req.body; // { name, mobile, index }

            const result = await db.collection('rewards').updateOne(
                { _id: new ObjectId(id) },
                { $set: { winner, status: 'completed', completedAt: new Date() } }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ success: false, message: 'Reward not found' });
            }

            res.status(200).json({ success: true, message: 'Winner recorded' });
        } catch (error) {
            console.error('Error recording winner:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Delete reward
    router.delete('/:id', async (req, res) => {
        try {
            const db = await connectDB();
            const { id } = req.params;
            const result = await db.collection('rewards').deleteOne({ _id: new ObjectId(id) });
            if (result.deletedCount === 1) {
                res.status(200).json({ success: true, message: 'Reward deleted' });
            } else {
                res.status(404).json({ success: false, message: 'Reward not found' });
            }
        } catch (error) {
            console.error('Error deleting reward:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    app.use('/api/rewards', router);
};
