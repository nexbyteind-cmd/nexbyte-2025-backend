const { ObjectId } = require('mongodb');
const express = require('express');

module.exports = function (app, connectDB, sendEmail) {
    const router = express.Router();

    // --- TECHNOLOGIES ROUTES ---

    // Get all technologies (for Sidebar)
    router.get('/technologies', async (req, res) => {
        try {
            const db = await connectDB();
            const technologies = await db.collection('career_technologies')
                .find({})
                .sort({ order: 1, name: 1 }) // specific order or alphabetical
                .toArray();
            res.status(200).json({ success: true, data: technologies });
        } catch (error) {
            console.error('Error fetching career technologies:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Get Single Technology with Sections
    router.get('/technologies/:id', async (req, res) => {
        try {
            const db = await connectDB();
            const { id } = req.params;
            const technology = await db.collection('career_technologies').findOne({ _id: new ObjectId(id) });

            if (!technology) {
                return res.status(404).json({ success: false, message: 'Technology not found' });
            }

            // Get sections for this technology
            const sections = await db.collection('career_sections')
                .find({ technologyId: new ObjectId(id) })
                .sort({ order: 1 })
                .toArray();

            res.status(200).json({ success: true, data: { ...technology, sections } });
        } catch (error) {
            console.error('Error fetching career technology details:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Create New Technology
    router.post('/technologies', async (req, res) => {
        try {
            const db = await connectDB();
            // detailed destructuring of new fields
            const {
                name, tagline, intro, overview,
                roleOpportunities, expertGuidance, benefits,
                careerPath, toolsCovered, faqs, ctaText
            } = req.body;

            if (!name) {
                return res.status(400).json({ success: false, message: 'Technology Name is required' });
            }

            const newTech = {
                name,
                tagline: tagline || "",
                intro: intro || "",
                // New Structured Fields
                overview: overview || "",
                roleOpportunities: roleOpportunities || [], // Array of { role, description }
                expertGuidance: expertGuidance || "",
                benefits: benefits || [], // Array of Strings
                careerPath: careerPath || [], // Array of { title, description }
                toolsCovered: toolsCovered || [], // Array of Strings
                faqs: faqs || [], // Array of { question, answer }
                ctaText: ctaText || "",
                sectionVisibility: req.body.sectionVisibility || {}, // { overview: true, roles: false, ... }

                order: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await db.collection('career_technologies').insertOne(newTech);
            res.status(201).json({ success: true, message: 'Technology created', id: result.insertedId });
        } catch (error) {
            console.error('Error creating career technology:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Update Technology (Name, Tagline, etc.)
    router.put('/technologies/:id', async (req, res) => {
        try {
            const db = await connectDB();
            const { id } = req.params;
            const updateData = {
                ...req.body,
                updatedAt: new Date()
            };
            delete updateData._id; // prevent immutable field error

            // Ensure arrays are preserved if passed (standard req.body spread handles this, but good to be explicit mentally)

            const result = await db.collection('career_technologies').updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) return res.status(404).json({ success: false, message: 'Technology not found' });
            res.status(200).json({ success: true, message: 'Technology updated' });
        } catch (error) {
            console.error('Error updating career technology:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Delete Technology (and its sections)
    router.delete('/technologies/:id', async (req, res) => {
        try {
            const db = await connectDB();
            const { id } = req.params;

            // Delete Technology
            const techResult = await db.collection('career_technologies').deleteOne({ _id: new ObjectId(id) });

            if (techResult.deletedCount === 0) return res.status(404).json({ success: false, message: 'Technology not found' });

            // Delete associated sections
            await db.collection('career_sections').deleteMany({ technologyId: new ObjectId(id) });

            res.status(200).json({ success: true, message: 'Technology and associated sections deleted' });
        } catch (error) {
            console.error('Error deleting career technology:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });


    // --- SECTIONS ROUTES ---

    // Upsert Section (Create or Update)
    // We can use a dedicated route for managing sections of a specific technology
    router.post('/technologies/:id/sections', async (req, res) => {
        try {
            const db = await connectDB();
            const { id } = req.params; // Technology ID
            const { title, type, content, order, sectionId } = req.body;
            // sectionId is optional: if present, update; else create.

            if (!title) return res.status(400).json({ success: false, message: 'Section Title is required' });

            const sectionData = {
                technologyId: new ObjectId(id),
                title,
                type: type || 'text', // text, list, faq, etc.
                content: content || "", // HTML or JSON string
                order: parseInt(order) || 0,
                updatedAt: new Date()
            };

            let result;
            if (sectionId) {
                // Update existing section
                result = await db.collection('career_sections').updateOne(
                    { _id: new ObjectId(sectionId) },
                    { $set: sectionData }
                );
                res.status(200).json({ success: true, message: 'Section updated' });
            } else {
                // Create new section
                sectionData.createdAt = new Date();
                result = await db.collection('career_sections').insertOne(sectionData);
                res.status(201).json({ success: true, message: 'Section created', id: result.insertedId });
            }

        } catch (error) {
            console.error('Error managing career section:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Delete Section
    router.delete('/sections/:sectionId', async (req, res) => {
        try {
            const db = await connectDB();
            const { sectionId } = req.params;
            const result = await db.collection('career_sections').deleteOne({ _id: new ObjectId(sectionId) });

            if (result.deletedCount === 0) return res.status(404).json({ success: false, message: 'Section not found' });
            res.status(200).json({ success: true, message: 'Section deleted' });
        } catch (error) {
            console.error('Error deleting career section:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });


    // --- ENQUIRY ROUTES ---

    // Submit Enquiry
    router.post('/enquiry', async (req, res) => {
        try {
            const db = await connectDB();
            const { name, email, phone, status, role, technology, timeSlot, notes } = req.body;

            const newEnquiry = {
                name,
                email,
                phone,
                status, // Fresher / Experienced
                role,
                technology,
                timeSlot,
                notes,
                submittedAt: new Date()
            };

            const result = await db.collection('career_enquiries').insertOne(newEnquiry);

            // Send Confirmation Email to User
            if (sendEmail && email) {
                const subject = `Enquiry Received: ${technology} Career Guidance`;
                const htmlContent = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                        <h2 style="color: #2563eb;">Career Guidance Enquiry Received</h2>
                        <p>Hi <strong>${name}</strong>,</p>
                        <p>Thank you for your interest in <strong>${technology}</strong>. We have received your enquiry and our career expert will connect with you shortly.</p>
                        
                        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; font-size: 16px;">Your Details:</h3>
                            <ul style="padding-left: 20px; margin: 0;">
                                <li><strong>Role Aspiration:</strong> ${role}</li>
                                <li><strong>Status:</strong> ${status}</li>
                                <li><strong>Preferred Time:</strong> ${timeSlot || 'Any time'}</li>
                            </ul>
                        </div>

                        <p>If you have any urgent queries, reply to this email.</p>
                        <br/>
                        <p>Best regards,<br/><strong>Team NexByte</strong></p>
                    </div>
                `;
                sendEmail(email, subject, htmlContent).catch(err => console.error("Failed to send career email:", err));
            }

            res.status(201).json({ success: true, message: 'Enquiry submitted', id: result.insertedId });
        } catch (error) {
            console.error('Error submitting career enquiry:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Get Enquiries (for Admin)
    router.get('/enquiries', async (req, res) => {
        try {
            const db = await connectDB();
            const enquiries = await db.collection('career_enquiries')
                .find({})
                .sort({ submittedAt: -1 })
                .toArray();
            res.status(200).json({ success: true, data: enquiries });
        } catch (error) {
            console.error('Error fetching career enquiries:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    app.use('/api/career', router);
};
