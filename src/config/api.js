// API Configuration
export const API_BASE_URL = 'http://localhost:3000'; // Change this to your server URL

export const apiEndpoints = {
  // Auth
  register: `${API_BASE_URL}/auth/register`,
  login: `${API_BASE_URL}/auth/login`,
  
  // Users
  profile: `${API_BASE_URL}/users/profile`,
  
  // Friends
  friends: `${API_BASE_URL}/friends`,
  friendRequests: `${API_BASE_URL}/friends/requests`,
  searchFriends: `${API_BASE_URL}/friends/search`,
  requestFriend: `${API_BASE_URL}/friends/request`,
  respondToFriend: `${API_BASE_URL}/friends/respond`,
  
  // Posts
  posts: `${API_BASE_URL}/posts`,
  myPosts: `${API_BASE_URL}/posts/my`,
  
  // Feed
  feed: `${API_BASE_URL}/feed`,
  
  // Reactions
  reactions: `${API_BASE_URL}/reactions`,
  
  // Reports
  reports: `${API_BASE_URL}/reports`,
  
  // Meta
  dailyPrompt: `${API_BASE_URL}/meta/daily-prompt`,
};
