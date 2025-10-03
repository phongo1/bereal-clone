import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

export default function CameraScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [currentCamera, setCurrentCamera] = useState('back');
  const { token } = useAuth();
  
  const frontCameraRef = useRef(null);
  const backCameraRef = useRef(null);

  useEffect(() => {
    getCameraPermissions();
  }, []);

  const getCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const takePicture = async (cameraRef, type) => {
    if (!cameraRef.current) return;

    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (type === 'front') {
        setFrontImage(photo.uri);
      } else {
        setBackImage(photo.uri);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture');
    } finally {
      setCapturing(false);
    }
  };

  const retakePicture = (type) => {
    if (type === 'front') {
      setFrontImage(null);
    } else {
      setBackImage(null);
    }
  };

  const uploadPost = async () => {
    if (!frontImage || !backImage) {
      Alert.alert('Error', 'Please take both front and back photos');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();

      const appendImage = async (fieldName, uri, filename) => {
        if (Platform.OS === 'web') {
          const response = await fetch(uri);
          const blob = await response.blob();
          formData.append(fieldName, blob, filename);
        } else {
          formData.append(fieldName, {
            uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
            type: 'image/jpeg',
            name: filename,
          });
        }
      };

      await appendImage('front_image', frontImage, 'front.jpg');
      await appendImage('back_image', backImage, 'back.jpg');
      
      // Add caption
      formData.append('caption', caption);

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      if (Platform.OS !== 'web') {
        headers['Content-Type'] = 'multipart/form-data';
      }

      const response = await axios.post(`${API_BASE_URL}/posts`, formData, {
        headers,
      });

      if (response.data.post_id) {
        Alert.alert('Success', 'Your BeReal has been posted!');
        setFrontImage(null);
        setBackImage(null);
        setCaption('');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to upload post');
    } finally {
      setUploading(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text>No access to camera</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Capture Your BeReal</Text>
        <Text style={styles.subtitle}>Take both front and back photos</Text>
      </View>

      <View style={styles.cameraContainer}>
        {!frontImage ? (
          <View style={styles.cameraWrapper}>
            <Camera
              ref={frontCameraRef}
              style={styles.camera}
              type={Camera.Constants.Type.front}
            >
              <View style={styles.cameraOverlay}>
                <Text style={styles.cameraLabel}>Front Camera</Text>
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={() => takePicture(frontCameraRef, 'front')}
                  disabled={capturing}
                >
                  <Text style={styles.captureButtonText}>
                    {capturing ? 'Capturing...' : 'Take Front Photo'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Camera>
          </View>
        ) : (
          <View style={styles.imagePreview}>
            <Image source={{ uri: frontImage }} style={styles.previewImage} />
            <TouchableOpacity
              style={styles.retakeButton}
              onPress={() => retakePicture('front')}
            >
              <Text style={styles.retakeButtonText}>Retake Front</Text>
            </TouchableOpacity>
          </View>
        )}

        {!backImage ? (
          <View style={styles.cameraWrapper}>
            <Camera
              ref={backCameraRef}
              style={styles.camera}
              type={Camera.Constants.Type.back}
            >
              <View style={styles.cameraOverlay}>
                <Text style={styles.cameraLabel}>Back Camera</Text>
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={() => takePicture(backCameraRef, 'back')}
                  disabled={capturing}
                >
                  <Text style={styles.captureButtonText}>
                    {capturing ? 'Capturing...' : 'Take Back Photo'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Camera>
          </View>
        ) : (
          <View style={styles.imagePreview}>
            <Image source={{ uri: backImage }} style={styles.previewImage} />
            <TouchableOpacity
              style={styles.retakeButton}
              onPress={() => retakePicture('back')}
            >
              <Text style={styles.retakeButtonText}>Retake Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {frontImage && backImage && (
        <View style={styles.postSection}>
          <TextInput
            style={styles.captionInput}
            placeholder="Add a caption..."
            value={caption}
            onChangeText={setCaption}
            multiline
          />
          <TouchableOpacity
            style={[styles.postButton, uploading && styles.postButtonDisabled]}
            onPress={uploadPost}
            disabled={uploading}
          >
            <Text style={styles.postButtonText}>
              {uploading ? 'Posting...' : 'Post BeReal'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
  },
  cameraContainer: {
    flex: 1,
    flexDirection: 'row',
    padding: 10,
  },
  cameraWrapper: {
    flex: 1,
    margin: 5,
    borderRadius: 10,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  cameraLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  captureButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  captureButtonText: {
    color: '#000',
    fontWeight: '600',
  },
  imagePreview: {
    flex: 1,
    margin: 5,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    flex: 1,
    width: '100%',
  },
  retakeButton: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  postSection: {
    padding: 20,
    backgroundColor: '#111',
  },
  captionInput: {
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    marginBottom: 15,
    minHeight: 60,
  },
  postButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: '#555',
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
