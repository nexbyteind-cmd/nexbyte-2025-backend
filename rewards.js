const { ObjectId } = require('mongodb');

module.exports = function (app, connectDB) {
    // --- REWARDS ---

    // Get all rewards (History)
    app.get('/api/rewards', async (req, res) => {
        try {
            const db = await connectDB();
            const rewards = await db.collection('rewards').find().sort({ createdAt: -1 }).toArray();
            res.status(200).json({ success: true, data: rewards });
        } catch (error) {
            console.error('Error fetching rewards:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Get latest active reward
    app.get('/api/rewards/active', async (req, res) => {
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
    app.post('/api/rewards', async (req, res) => {
        try {
            const db = await connectDB();
            const { title, audience } = req.body;

            // Deactivate previous active rewards
            await db.collection('rewards').updateMany({ status: 'active' }, { $set: { status: 'completed' } });

            const newReward = {
                title,
                audience, // Array of { name, mobile }
                status: 'active',
                riggedIndex: -1, // Default no rigging
                winner: null,
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
    app.put('/api/rewards/:id/rig', async (req, res) => {
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

    // Set winner (after spin completion)
    app.put('/api/rewards/:id/winner', async (req, res) => {
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
    app.delete('/api/rewards/:id', async (req, res) => {
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
};
