const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Create database and tables
function setupDatabase() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database('./database.sqlite');

        // Users table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                phone TEXT UNIQUE,
                username TEXT UNIQUE NOT NULL,
                display_name TEXT NOT NULL,
                avatar_url TEXT,
                password_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error('Error creating users table:', err);
                reject(err);
                return;
            }
        });

        // Friends table (friendship relationships)
        db.run(`
            CREATE TABLE IF NOT EXISTS friends (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                friend_id INTEGER NOT NULL,
                status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (friend_id) REFERENCES users (id),
                UNIQUE(user_id, friend_id)
            )
        `, (err) => {
            if (err) {
                console.error('Error creating friends table:', err);
                reject(err);
                return;
            }
        });

        // Posts table
        db.run(`
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                front_image_url TEXT NOT NULL,
                back_image_url TEXT NOT NULL,
                stitched_image_url TEXT NOT NULL,
                caption TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `, (err) => {
            if (err) {
                console.error('Error creating posts table:', err);
                reject(err);
                return;
            }
        });

        // Reactions table
        db.run(`
            CREATE TABLE IF NOT EXISTS reactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                reaction_type TEXT DEFAULT 'like', -- 'like', 'love', 'laugh', etc.
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES posts (id),
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE(post_id, user_id)
            )
        `, (err) => {
            if (err) {
                console.error('Error creating reactions table:', err);
                reject(err);
                return;
            }
        });

        // Reports table
        db.run(`
            CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                reporter_id INTEGER NOT NULL,
                reason TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES posts (id),
                FOREIGN KEY (reporter_id) REFERENCES users (id)
            )
        `, (err) => {
            if (err) {
                console.error('Error creating reports table:', err);
                reject(err);
                return;
            }
        });

        // Meta table for daily prompts and app metadata
        db.run(`
            CREATE TABLE IF NOT EXISTS meta (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                value TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error('Error creating meta table:', err);
                reject(err);
                return;
            }

            // Insert default daily prompt
            db.run(`
                INSERT OR IGNORE INTO meta (key, value) 
                VALUES ('daily_prompt', 'Time to BeReal! Capture your moment.')
            `, (err) => {
                if (err) {
                    console.error('Error inserting default prompt:', err);
                    reject(err);
                    return;
                }

                db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                        reject(err);
                        return;
                    }
                    console.log('Database setup completed!');
                    resolve();
                });
            });
        });
    });
}

// Create uploads directory
function setupDirectories() {
    const uploadsDir = './uploads';
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('Created uploads directory');
    }
}

// Main setup function
async function setup() {
    try {
        console.log('Setting up BeReal Clone...');
        setupDirectories();
        await setupDatabase();
        console.log('Setup completed successfully!');
        console.log('Run "npm start" to start the server');
    } catch (error) {
        console.error('Setup failed:', error);
        process.exit(1);
    }
}

setup();
