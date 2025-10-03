const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here';
const DB_PATH = process.env.DB_PATH || './database.sqlite';
const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_PATH));

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_PATH)) {
    fs.mkdirSync(UPLOAD_PATH, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_PATH);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Database connection
const db = new sqlite3.Database(DB_PATH);

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Helper function to stitch images
const stitchImages = async (frontImagePath, backImagePath, outputPath) => {
    try {
        const frontImage = sharp(frontImagePath);
        const backImage = sharp(backImagePath);
        
        const frontMetadata = await frontImage.metadata();
        const backMetadata = await backImage.metadata();
        
        // Resize images to same height for stitching
        const targetHeight = Math.min(frontMetadata.height, backMetadata.height);
        
        const frontResized = await frontImage.resize(null, targetHeight).png().toBuffer();
        const backResized = await backImage.resize(null, targetHeight).png().toBuffer();
        
        // Create composite image (side by side)
        await sharp({
            create: {
                width: frontMetadata.width + backMetadata.width,
                height: targetHeight,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 1 }
            }
        })
        .composite([
            { input: frontResized, left: 0, top: 0 },
            { input: backResized, left: frontMetadata.width, top: 0 }
        ])
        .png()
        .toFile(outputPath);
        
        return true;
    } catch (error) {
        console.error('Error stitching images:', error);
        return false;
    }
};

// AUTH ROUTES
app.post('/auth/register', async (req, res) => {
    const { email, phone, username, display_name, password } = req.body;
    
    if (!email || !username || !display_name || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run(
            'INSERT INTO users (email, phone, username, display_name, password_hash) VALUES (?, ?, ?, ?, ?)',
            [email, phone, username, display_name, hashedPassword],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'Email or username already exists' });
                    }
                    return res.status(500).json({ error: 'Database error' });
                }
                
                const token = jwt.sign(
                    { userId: this.lastID, email, username },
                    JWT_SECRET,
                    { expiresIn: '7d' }
                );
                
                res.json({
                    token,
                    user: {
                        id: this.lastID,
                        email,
                        username,
                        display_name
                    }
                });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    db.get(
        'SELECT * FROM users WHERE email = ?',
        [email],
        async (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            const token = jwt.sign(
                { userId: user.id, email: user.email, username: user.username },
                JWT_SECRET,
                { expiresIn: '7d' }
            );
            
            res.json({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    display_name: user.display_name,
                    avatar_url: user.avatar_url
                }
            });
        }
    );
});

// USER ROUTES
app.get('/users/profile', authenticateToken, (req, res) => {
    db.get(
        'SELECT id, email, username, display_name, avatar_url, created_at FROM users WHERE id = ?',
        [req.user.userId],
        (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(user);
        }
    );
});

app.put('/users/profile', authenticateToken, (req, res) => {
    const { display_name, avatar_url } = req.body;
    
    db.run(
        'UPDATE users SET display_name = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [display_name, avatar_url, req.user.userId],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ message: 'Profile updated successfully' });
        }
    );
});

// FRIENDS ROUTES
app.get('/friends', authenticateToken, (req, res) => {
    db.all(`
        SELECT u.id, u.username, u.display_name, u.avatar_url, f.status, f.created_at
        FROM friends f
        JOIN users u ON f.friend_id = u.id
        WHERE f.user_id = ? AND f.status = 'accepted'
    `, [req.user.userId], (err, friends) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(friends);
    });
});

app.get('/friends/requests', authenticateToken, (req, res) => {
    db.all(`
        SELECT u.id, u.username, u.display_name, u.avatar_url, f.created_at
        FROM friends f
        JOIN users u ON f.user_id = u.id
        WHERE f.friend_id = ? AND f.status = 'pending'
    `, [req.user.userId], (err, requests) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(requests);
    });
});

app.post('/friends/search', authenticateToken, (req, res) => {
    const { query } = req.body;
    
    if (!query) {
        return res.status(400).json({ error: 'Search query required' });
    }
    
    db.all(`
        SELECT id, username, display_name, avatar_url
        FROM users
        WHERE (username LIKE ? OR display_name LIKE ?) AND id != ?
        LIMIT 10
    `, [`%${query}%`, `%${query}%`, req.user.userId], (err, users) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(users);
    });
});

app.post('/friends/request', authenticateToken, (req, res) => {
    const { friend_id } = req.body;
    
    if (!friend_id) {
        return res.status(400).json({ error: 'Friend ID required' });
    }
    
    if (friend_id == req.user.userId) {
        return res.status(400).json({ error: 'Cannot add yourself as friend' });
    }
    
    db.run(
        'INSERT OR IGNORE INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)',
        [req.user.userId, friend_id, 'pending'],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (this.changes === 0) {
                return res.status(400).json({ error: 'Friend request already exists' });
            }
            res.json({ message: 'Friend request sent' });
        }
    );
});

app.put('/friends/respond', authenticateToken, (req, res) => {
    const { friend_id, status } = req.body;
    
    if (!friend_id || !status) {
        return res.status(400).json({ error: 'Friend ID and status required' });
    }
    
    if (!['accepted', 'declined'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    db.run(
        'UPDATE friends SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND friend_id = ?',
        [status, friend_id, req.user.userId],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Friend request not found' });
            }
            
            // If accepted, create reciprocal friendship
            if (status === 'accepted') {
                db.run(
                    'INSERT OR IGNORE INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)',
                    [req.user.userId, friend_id, 'accepted']
                );
            }
            
            res.json({ message: `Friend request ${status}` });
        }
    );
});

app.delete('/friends/:friend_id', authenticateToken, (req, res) => {
    const { friend_id } = req.params;
    
    db.run(
        'DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
        [req.user.userId, friend_id, friend_id, req.user.userId],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ message: 'Friendship removed' });
        }
    );
});

// POSTS ROUTES
app.post('/posts', authenticateToken, upload.fields([
    { name: 'front_image', maxCount: 1 },
    { name: 'back_image', maxCount: 1 }
]), async (req, res) => {
    const { caption } = req.body;
    
    if (!req.files.front_image || !req.files.back_image) {
        return res.status(400).json({ error: 'Both front and back images required' });
    }
    
    try {
        const frontImagePath = req.files.front_image[0].path;
        const backImagePath = req.files.back_image[0].path;
        const stitchedImagePath = path.join(UPLOAD_PATH, `stitched-${Date.now()}.png`);
        
        // Check if user already posted today
        const today = new Date().toISOString().split('T')[0];
        db.get(
            'SELECT id FROM posts WHERE user_id = ? AND DATE(created_at) = ?',
            [req.user.userId, today],
            async (err, existingPost) => {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }
                
                if (existingPost) {
                    return res.status(400).json({ error: 'You can only post once per day' });
                }
                
                // Stitch images
                const stitchSuccess = await stitchImages(frontImagePath, backImagePath, stitchedImagePath);
                if (!stitchSuccess) {
                    return res.status(500).json({ error: 'Failed to process images' });
                }
                
                // Save post to database
                db.run(
                    'INSERT INTO posts (user_id, front_image_url, back_image_url, stitched_image_url, caption) VALUES (?, ?, ?, ?, ?)',
                    [
                        req.user.userId,
                        `/uploads/${path.basename(frontImagePath)}`,
                        `/uploads/${path.basename(backImagePath)}`,
                        `/uploads/${path.basename(stitchedImagePath)}`,
                        caption
                    ],
                    function(err) {
                        if (err) {
                            return res.status(500).json({ error: 'Database error' });
                        }
                        
                        res.json({
                            message: 'Post created successfully',
                            post_id: this.lastID
                        });
                    }
                );
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/posts/my', authenticateToken, (req, res) => {
    db.all(
        'SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC',
        [req.user.userId],
        (err, posts) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(posts);
        }
    );
});

// FEED ROUTES
app.get('/feed', authenticateToken, (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    
    db.all(`
        SELECT p.*, u.username, u.display_name, u.avatar_url
        FROM posts p
        JOIN users u ON p.user_id = u.id
        JOIN friends f ON p.user_id = f.friend_id
        WHERE f.user_id = ? AND f.status = 'accepted' AND DATE(p.created_at) = ?
        ORDER BY p.created_at DESC
    `, [req.user.userId, today], (err, posts) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(posts);
    });
});

// REACTIONS ROUTES
app.post('/reactions', authenticateToken, (req, res) => {
    const { post_id, reaction_type } = req.body;
    
    if (!post_id) {
        return res.status(400).json({ error: 'Post ID required' });
    }
    
    db.run(
        'INSERT OR REPLACE INTO reactions (post_id, user_id, reaction_type) VALUES (?, ?, ?)',
        [post_id, req.user.userId, reaction_type || 'like'],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ message: 'Reaction added' });
        }
    );
});

app.delete('/reactions/:post_id', authenticateToken, (req, res) => {
    const { post_id } = req.params;
    
    db.run(
        'DELETE FROM reactions WHERE post_id = ? AND user_id = ?',
        [post_id, req.user.userId],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ message: 'Reaction removed' });
        }
    );
});

// REPORTS ROUTES
app.post('/reports', authenticateToken, (req, res) => {
    const { post_id, reason } = req.body;
    
    if (!post_id || !reason) {
        return res.status(400).json({ error: 'Post ID and reason required' });
    }
    
    db.run(
        'INSERT INTO reports (post_id, reporter_id, reason) VALUES (?, ?, ?)',
        [post_id, req.user.userId, reason],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ message: 'Report submitted' });
        }
    );
});

// META ROUTES (for daily prompts)
app.get('/meta/daily-prompt', (req, res) => {
    db.get(
        'SELECT value FROM meta WHERE key = ?',
        ['daily_prompt'],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ prompt: row ? row.value : 'Time to BeReal! Capture your moment.' });
        }
    );
});

app.put('/meta/daily-prompt', authenticateToken, (req, res) => {
    const { prompt } = req.body;
    
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt required' });
    }
    
    db.run(
        'INSERT OR REPLACE INTO meta (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        ['daily_prompt', prompt],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ message: 'Daily prompt updated' });
        }
    );
});

// Daily prompt scheduler (runs at random time between 9 AM and 9 PM)
cron.schedule('0 9-21 * * *', () => {
    const randomMinute = Math.floor(Math.random() * 60);
    const randomHour = Math.floor(Math.random() * 13) + 9; // 9 AM to 9 PM
    
    // This would trigger notifications in a real app
    console.log(`Daily BeReal prompt scheduled for ${randomHour}:${randomMinute.toString().padStart(2, '0')}`);
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'BeReal Clone API',
        health: '/health',
        docs: 'No UI served here. Use the Expo client for frontend.'
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Chrome DevTools discovery file to prevent noisy 404s during local dev
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
    res.json({
        status: 'ok',
        message: 'No DevTools targets exposed from this server.'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`BeReal Clone server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close();
    process.exit(0);
});
