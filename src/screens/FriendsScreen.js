import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function FriendsScreen() {
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([loadFriends(), loadRequests()]);
    setLoading(false);
  };

  const loadFriends = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/friends`);
      setFriends(response.data);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadRequests = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/friends/requests`);
      setRequests(response.data);
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/friends/search`, {
        query: query.trim(),
      });
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users');
    }
  };

  const sendFriendRequest = async (userId) => {
    try {
      await axios.post(`${API_BASE_URL}/friends/request`, {
        friend_id: userId,
      });
      Alert.alert('Success', 'Friend request sent!');
      // Remove from search results
      setSearchResults(prev => prev.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to send friend request');
    }
  };

  const respondToRequest = async (friendId, status) => {
    try {
      await axios.put(`${API_BASE_URL}/friends/respond`, {
        friend_id: friendId,
        status,
      });
      
      if (status === 'accepted') {
        Alert.alert('Success', 'Friend request accepted!');
        await loadFriends(); // Refresh friends list
      } else {
        Alert.alert('Success', 'Friend request declined');
      }
      
      await loadRequests(); // Refresh requests list
    } catch (error) {
      console.error('Error responding to request:', error);
      Alert.alert('Error', 'Failed to respond to friend request');
    }
  };

  const removeFriend = (friendId) => {
    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE_URL}/friends/${friendId}`);
              Alert.alert('Success', 'Friend removed');
              await loadFriends();
            } catch (error) {
              console.error('Error removing friend:', error);
              Alert.alert('Error', 'Failed to remove friend');
            }
          },
        },
      ]
    );
  };

  const renderFriend = ({ item }) => (
    <View style={styles.friendItem}>
      <Image
        source={{ uri: item.avatar_url || 'https://via.placeholder.com/50' }}
        style={styles.avatar}
      />
      <View style={styles.friendInfo}>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.displayName}>{item.display_name}</Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeFriend(item.id)}
      >
        <Icon name="close" size={20} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  const renderRequest = ({ item }) => (
    <View style={styles.requestItem}>
      <Image
        source={{ uri: item.avatar_url || 'https://via.placeholder.com/50' }}
        style={styles.avatar}
      />
      <View style={styles.requestInfo}>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.displayName}>{item.display_name}</Text>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => respondToRequest(item.id, 'accepted')}
        >
          <Icon name="check" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.declineButton]}
          onPress={() => respondToRequest(item.id, 'declined')}
        >
          <Icon name="close" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchResult = ({ item }) => (
    <View style={styles.searchItem}>
      <Image
        source={{ uri: item.avatar_url || 'https://via.placeholder.com/50' }}
        style={styles.avatar}
      />
      <View style={styles.searchInfo}>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.displayName}>{item.display_name}</Text>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => sendFriendRequest(item.id)}
      >
        <Icon name="person-add" size={20} color="#007AFF" />
      </TouchableOpacity>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'friends':
        return (
          <FlatList
            data={friends}
            renderItem={renderFriend}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Icon name="people" size={64} color="#ccc" />
                <Text style={styles.emptyStateText}>No friends yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Search for users to add as friends
                </Text>
              </View>
            )}
          />
        );
      case 'requests':
        return (
          <FlatList
            data={requests}
            renderItem={renderRequest}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Icon name="inbox" size={64} color="#ccc" />
                <Text style={styles.emptyStateText}>No pending requests</Text>
              </View>
            )}
          />
        );
      case 'search':
        return (
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by username or name..."
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  searchUsers(text);
                }}
              />
            </View>
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id.toString()}
              ListEmptyComponent={() => (
                <View style={styles.emptyState}>
                  <Icon name="search" size={64} color="#ccc" />
                  <Text style={styles.emptyStateText}>
                    {searchQuery ? 'No users found' : 'Search for users to add as friends'}
                  </Text>
                </View>
              )}
            />
          </View>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests ({requests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.activeTab]}
          onPress={() => setActiveTab('search')}
        >
          <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
            Search
          </Text>
        </TouchableOpacity>
      </View>

      {renderTabContent()}
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
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  searchContainer: {
    flex: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  friendInfo: {
    flex: 1,
  },
  requestInfo: {
    flex: 1,
  },
  searchInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  displayName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  removeButton: {
    padding: 10,
  },
  requestActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: '#f44336',
  },
  addButton: {
    padding: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
