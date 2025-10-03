import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

export default function FeedScreen() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyPrompt, setDailyPrompt] = useState('');

  useEffect(() => {
    loadFeed();
    loadDailyPrompt();
  }, []);

  const loadFeed = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/feed`);
      setPosts(response.data);
    } catch (error) {
      console.error('Error loading feed:', error);
      Alert.alert('Error', 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  const loadDailyPrompt = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/meta/daily-prompt`);
      setDailyPrompt(response.data.prompt);
    } catch (error) {
      console.error('Error loading daily prompt:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadFeed(), loadDailyPrompt()]);
    setRefreshing(false);
  }, []);

  const handleReaction = async (postId, reactionType = 'like') => {
    try {
      await axios.post(`${API_BASE_URL}/reactions`, {
        post_id: postId,
        reaction_type: reactionType,
      });
      
      // Update local state to reflect the reaction
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? { ...post, hasReacted: true, reactionType }
            : post
        )
      );
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleReport = (postId) => {
    Alert.alert(
      'Report Post',
      'Why are you reporting this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Inappropriate Content', onPress: () => submitReport(postId, 'Inappropriate Content') },
        { text: 'Spam', onPress: () => submitReport(postId, 'Spam') },
        { text: 'Harassment', onPress: () => submitReport(postId, 'Harassment') },
        { text: 'Other', onPress: () => submitReport(postId, 'Other') },
      ]
    );
  };

  const submitReport = async (postId, reason) => {
    try {
      await axios.post(`${API_BASE_URL}/reports`, {
        post_id: postId,
        reason,
      });
      Alert.alert('Success', 'Report submitted successfully');
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report');
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderPost = ({ item }) => (
    <View style={styles.postContainer}>
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          <Image
            source={{ 
              uri: item.avatar_url || 'https://via.placeholder.com/40' 
            }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.username}>{item.username}</Text>
            <Text style={styles.displayName}>{item.display_name}</Text>
          </View>
        </View>
        <Text style={styles.timestamp}>
          {formatTime(item.created_at)}
        </Text>
      </View>

      <Image
        source={{ uri: `${API_BASE_URL}${item.stitched_image_url}` }}
        style={styles.postImage}
        resizeMode="cover"
      />

      {item.caption && (
        <Text style={styles.caption}>{item.caption}</Text>
      )}

      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleReaction(item.id, 'like')}
        >
          <Icon 
            name={item.hasReacted ? 'favorite' : 'favorite-border'} 
            size={24} 
            color={item.hasReacted ? '#ff4444' : '#666'} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleReport(item.id)}
        >
          <Icon name="report" size={24} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="photo-library" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No posts yet</Text>
      <Text style={styles.emptyStateSubtitle}>
        Your friends haven't posted their BeReal today
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading feed...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Feed</Text>
        {dailyPrompt && (
          <Text style={styles.dailyPrompt}>{dailyPrompt}</Text>
        )}
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={posts.length === 0 ? styles.emptyContainer : styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  dailyPrompt: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  listContainer: {
    padding: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  postContainer: {
    backgroundColor: '#fff',
    marginBottom: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  displayName: {
    fontSize: 14,
    color: '#666',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  postImage: {
    width: '100%',
    height: width * 0.8,
  },
  caption: {
    padding: 15,
    fontSize: 16,
    color: '#000',
  },
  postActions: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    marginRight: 20,
  },
});
