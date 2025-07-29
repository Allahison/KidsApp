import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
} from 'react-native';
import { supabase } from '../supabaseClient';
import Toast from 'react-native-toast-message';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';

export default function PlaylistManager() {
  const [link, setLink] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortType, setSortType] = useState('custom');

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        Toast.show({ type: 'error', text1: 'User not found' });
        return;
      }
      setUserId(data.user.id);
    };
    fetchUser();
  }, []);

  const loadPlaylist = async () => {
    if (!userId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('playlists')
      .select('id, video_url, order_index, created_at')
      .eq('user_id', userId);

    if (error) {
      Toast.show({ type: 'error', text1: 'Failed to load playlist' });
    } else {
      setList(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userId) loadPlaylist();
  }, [userId]);

  const extractVideoId = (url) => {
    const regex = /(?:v=|\/)([\w-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const validateYouTubeUrl = (url) => {
    const trimmed = url.trim();
    const patterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]{11}/,
      /^https?:\/\/youtu\.be\/[\w-]{11}/,
    ];
    return patterns.some((regex) => regex.test(trimmed));
  };

  const addVideo = async () => {
    if (!link.trim()) return Toast.show({ type: 'error', text1: 'Enter a URL' });
    if (!validateYouTubeUrl(link)) return Toast.show({ type: 'error', text1: 'Invalid URL' });

    const index = list.length;
    const { error } = await supabase.from('playlists').insert({
      user_id: userId,
      video_url: link.trim(),
      order_index: index,
    });

    if (error) Toast.show({ type: 'error', text1: 'Could not add video' });
    else {
      Toast.show({ type: 'success', text1: 'Video added' });
      setLink('');
      Keyboard.dismiss();
      loadPlaylist();
    }
  };

  const removeVideo = async (id) => {
    const { error } = await supabase.from('playlists').delete().eq('id', id);
    if (error) Toast.show({ type: 'error', text1: 'Could not delete video' });
    else {
      Toast.show({ type: 'success', text1: 'Deleted' });
      loadPlaylist();
    }
  };

  const reorderList = async (newData) => {
    setList(newData);
    for (let i = 0; i < newData.length; i++) {
      await supabase.from('playlists').update({ order_index: i }).eq('id', newData[i].id);
    }
  };

  const sortPlaylist = (type) => {
    let sorted = [...list];
    if (type === 'az') {
      sorted.sort((a, b) => {
        const aNum = parseInt(a.video_url.match(/\d+/)?.[0]) || 0;
        const bNum = parseInt(b.video_url.match(/\d+/)?.[0]) || 0;
        return aNum - bNum;
      });
    } else if (type === 'date') {
      sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    setSortType(type);
    setList(sorted);
  };

  const filteredList = list.filter((item) =>
    item.video_url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderRightActions = (_, __, itemId) => (
    <TouchableOpacity
      style={styles.swipeDelete}
      onPress={() =>
        Alert.alert('Confirm', 'Delete this video?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => removeVideo(itemId) },
        ])
      }
    >
      <Text style={styles.delete}>Delete</Text>
    </TouchableOpacity>
  );

  if (!userId) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#7b2cbf" />
        <Text style={{ marginTop: 10, color: '#fff' }}>Authenticating...</Text>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TextInput
            placeholder="Paste YouTube URL"
            style={styles.input}
            placeholderTextColor="#ccc"
            value={link}
            onChangeText={setLink}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.button, { backgroundColor: link.trim() ? '#7b2cbf' : '#444' }]}
            disabled={!link.trim()}
            onPress={addVideo}
          >
            <Text style={styles.buttonText}>Add to Playlist</Text>
          </TouchableOpacity>

          <TextInput
            placeholder="Search by number or keyword"
            placeholderTextColor="#aaa"
            style={styles.input}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />

          <View style={styles.sortButtons}>
            <TouchableOpacity
              style={[styles.sortButton, sortType === 'az' && styles.activeSort]}
              onPress={() => sortPlaylist('az')}
            >
              <Text style={styles.sortText}>1 ➜ 9</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sortType === 'date' && styles.activeSort]}
              onPress={() => sortPlaylist('date')}
            >
              <Text style={styles.sortText}>Newest</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} size="large" color="#7b2cbf" />
          ) : (
            <DraggableFlatList
              data={filteredList}
              keyExtractor={(item) => item.id.toString()}
              onDragEnd={({ data }) => reorderList(data)}
              contentContainerStyle={{ paddingBottom: 100 }}
              renderItem={({ item, index, drag }) => {
                const videoId = extractVideoId(item.video_url);
                return (
                  <Swipeable renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item.id)}>
                    <TouchableOpacity onLongPress={drag} style={styles.row}>
                      {videoId ? (
                        <Image
                          source={{ uri: `https://img.youtube.com/vi/${videoId}/0.jpg` }}
                          style={styles.thumbnail}
                        />
                      ) : (
                        <View style={styles.thumbnailPlaceholder} />
                      )}
                      <Text style={styles.url} numberOfLines={2}>
                        {`${index + 1}. ${item.video_url}`}
                      </Text>
                    </TouchableOpacity>
                  </Swipeable>
                );
              }}
            />
          )}

          <Toast position="top" />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    margin:20,
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#555',
    padding: 12,
    marginVertical: 6,
    borderRadius: 10,
    backgroundColor: '#111',
    color: '#fff',
  },
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    marginVertical: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sortButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sortButton: {
    flex: 1,
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 6,
    backgroundColor: '#222',
    alignItems: 'center',
  },
  activeSort: {
    backgroundColor: '#444',
  },
  sortText: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#222',
    backgroundColor: '#111',
    paddingHorizontal: 8,
  },
  thumbnail: {
    width: 90,
    height: 60,
    borderRadius: 6,
    marginRight: 10,
  },
  thumbnailPlaceholder: {
    width: 90,
    height: 60,
    backgroundColor: '#333',
    marginRight: 10,
    borderRadius: 6,
  },
  url: {
    fontSize: 14,
    color: '#fff',
    flexShrink: 1,
  },
  delete: {
    color: '#fff',
    fontWeight: 'bold',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#d00000',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  swipeDelete: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#d00000',
    width: 100,
    borderRadius: 10,
    marginVertical: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});