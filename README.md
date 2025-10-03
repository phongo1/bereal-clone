# BeReal Clone MVP

A lightweight React Native mobile app that lets users capture and share one dual-photo post (back then front camera) per day during a randomized time of day for a notification saying "Time to BeReal", which indicates when a user has 2 minutes to submit their daily "BeReal" photo. Friends can view each other's posts, and manage friend connections.

## Features

- **Authentication**: Sign up/login with email using JWT-based auth
- **Dual Camera Capture**: Capture both front and back camera photos and stitch them together
- **Daily Posts**: One post per user per day with daily prompts
- **Friends System**: Search, request, accept/decline, remove friends
- **Feed**: Friends-only feed of posts for the day
- **Profile Management**: Update profile information and view your posts
- **Notifications**: Local push notifications for daily prompts
- **Reactions**: Like posts and report inappropriate content

## Architecture

```
[React Native App]
   - Camera, Feed, Friends, Notifications
   - JWT Auth
   - Local image stitch
        |
        |
        V

[Node.js Express Server (server.js)]
   - Auth (JWT, bcrypt)
   - API Routes (/auth, /users, /friends, /posts, /feed, /reactions, /reports)
   - SQLite DB (users, friends, posts, reactions, reports, meta)
   - File Storage (uploads/)
   - Scheduler (daily prompt with node-cron)
        |
        |
        V

[SQLite + File System]
   - SQLite: user/friend/post metadata
   - File system: stored post images
```

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for iOS development) or Android Studio (for Android development)

### Backend Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp env.example .env
   ```
   Edit `.env` file with your configuration:
   ```
   JWT_SECRET=your-super-secret-jwt-key-here
   PORT=3000
   DB_PATH=./database.sqlite
   UPLOAD_PATH=./uploads
   ```

3. **Initialize database**:
   ```bash
   npm run setup
   ```

4. **Start the server**:
   ```bash
   npm start
   ```
   The server will run on `http://localhost:3000`

### Frontend Setup

1. **Install Expo CLI** (if not already installed):
   ```bash
   npm install -g expo-cli
   ```

2. **Start the Expo development server**:
   ```bash
   npm run expo:start
   ```

3. **Run on device/simulator**:
   - For iOS: `npm run expo:ios`
   - For Android: `npm run expo:android`
   - For web: `npm run expo:web`

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user

### Users
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile

### Friends
- `GET /friends` - Get friends list
- `GET /friends/requests` - Get friend requests
- `POST /friends/search` - Search users
- `POST /friends/request` - Send friend request
- `PUT /friends/respond` - Accept/decline friend request
- `DELETE /friends/:friend_id` - Remove friend

### Posts
- `POST /posts` - Create new post (with image upload)
- `GET /posts/my` - Get user's posts

### Feed
- `GET /feed` - Get friends' posts for today

### Reactions
- `POST /reactions` - Add reaction to post
- `DELETE /reactions/:post_id` - Remove reaction

### Reports
- `POST /reports` - Report a post

### Meta
- `GET /meta/daily-prompt` - Get daily prompt
- `PUT /meta/daily-prompt` - Update daily prompt

## Database Schema

### Users Table
- `id` (INTEGER PRIMARY KEY)
- `email` (TEXT UNIQUE)
- `phone` (TEXT UNIQUE)
- `username` (TEXT UNIQUE)
- `display_name` (TEXT)
- `avatar_url` (TEXT)
- `password_hash` (TEXT)
- `created_at` (DATETIME)
- `updated_at` (DATETIME)

### Friends Table
- `id` (INTEGER PRIMARY KEY)
- `user_id` (INTEGER)
- `friend_id` (INTEGER)
- `status` (TEXT) - 'pending', 'accepted', 'declined'
- `created_at` (DATETIME)
- `updated_at` (DATETIME)

### Posts Table
- `id` (INTEGER PRIMARY KEY)
- `user_id` (INTEGER)
- `front_image_url` (TEXT)
- `back_image_url` (TEXT)
- `stitched_image_url` (TEXT)
- `caption` (TEXT)
- `created_at` (DATETIME)

### Reactions Table
- `id` (INTEGER PRIMARY KEY)
- `post_id` (INTEGER)
- `user_id` (INTEGER)
- `reaction_type` (TEXT)
- `created_at` (DATETIME)

### Reports Table
- `id` (INTEGER PRIMARY KEY)
- `post_id` (INTEGER)
- `reporter_id` (INTEGER)
- `reason` (TEXT)
- `created_at` (DATETIME)

### Meta Table
- `id` (INTEGER PRIMARY KEY)
- `key` (TEXT UNIQUE)
- `value` (TEXT)
- `created_at` (DATETIME)
- `updated_at` (DATETIME)

## Development

### Running in Development Mode

1. **Backend with auto-reload**:
   ```bash
   npm run dev
   ```

2. **Frontend with Expo**:
   ```bash
   npm run expo:start
   ```

### Testing

The app includes basic error handling and validation. For production deployment, consider adding:

- Comprehensive input validation
- Rate limiting
- Image compression and optimization
- Database backups
- HTTPS support
- Environment-specific configurations

## Deployment

### Backend Deployment

1. Set up a production server (AWS, DigitalOcean, etc.)
2. Install Node.js and dependencies
3. Set up environment variables
4. Initialize database
5. Use PM2 or similar for process management
6. Set up reverse proxy (nginx)

### Frontend Deployment

1. Build the app for production:
   ```bash
   expo build:android
   expo build:ios
   ```
2. Deploy to app stores or distribute APK/IPA files

## Security Considerations

- JWT tokens are used for authentication
- Passwords are hashed with bcrypt
- Posts are only visible to friends
- Input validation on all endpoints
- File upload restrictions (size, type)

## Performance

- App launch target: under 2 seconds
- Capture-to-post target: under 3 seconds
- Supports small groups (tens to hundreds of users)
- SQLite database for fast local queries
- Image stitching handled server-side

## License

MIT License
