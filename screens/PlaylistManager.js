import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Button,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { supabase } from '../supabaseClient';
import Toast from 'react-native-toast-message';

export default function PlaylistManager() {
  const [link, setLink] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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
      .select('id, video_url, order_index')
      .eq('user_id', userId)
      .order('order_index', { ascending: true });

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
    const match = url.match(/(?:v=|\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  const validateYouTubeUrl = (url) => {
    const trimmed = url.trim();
    const videoRegex1 = /^https:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]{11}/;
    const videoRegex2 = /^https:\/\/youtu\.be\/[\w-]{11}/;
    const playlistRegex = /^https:\/\/(www\.)?youtube\.com\/playlist\?list=[\w-]+/;
    return videoRegex1.test(trimmed) || videoRegex2.test(trimmed) || playlistRegex.test(trimmed);
  };

  const addVideo = async () => {
    if (!link.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter a URL' });
      return;
    }

    if (!validateYouTubeUrl(link)) {
      Toast.show({
        type: 'error',
        text1: 'Invalid URL',
        text2: 'Paste a valid YouTube video or playlist URL.',
      });
      return;
    }

    const index = list.length;

    const { error } = await supabase.from('playlists').insert({
      user_id: userId,
      video_url: link.trim(),
      order_index: index,
    });

    if (error) {
      Toast.show({ type: 'error', text1: 'Could not add video' });
    } else {
      Toast.show({ type: 'success', text1: 'Video added to playlist' });
      setLink('');
      Keyboard.dismiss();
      loadPlaylist();
    }
  };

  const removeVideo = async (id) => {
    const { error } = await supabase.from('playlists').delete().eq('id', id);
    if (error) {
      Toast.show({ type: 'error', text1: 'Could not delete video' });
    } else {
      Toast.show({ type: 'success', text1: 'Video deleted' });
      loadPlaylist();
    }
  };

  const filteredList = list.filter(item =>
    item.video_url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!userId) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={{ marginTop: 10 }}>Authenticating...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topSpace} />
        <TextInput
          placeholder="Paste YouTube video or playlist URL"
          style={styles.input}
          value={link}
          onChangeText={setLink}
          autoCapitalize="none"
        />
        <Button title="Add to Playlist" onPress={addVideo} disabled={!link.trim()} />

        <TextInput
          placeholder="Search in playlist..."
          style={styles.input}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={filteredList}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={({ item, index }) => {
              const videoId = extractVideoId(item.video_url);
              return (
                <View style={styles.row}>
                  {videoId ? (
                    <Image
                      source={{ uri: `https://img.youtube.com/vi/${videoId}/0.jpg` }}
                      style={styles.thumbnail}
                    />
                  ) : (
                    <View style={styles.thumbnailPlaceholder} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.url} numberOfLines={1}>
                      {`${index + 1}. ${item.video_url}`}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removeVideo(item.id)}>
                    <Text style={styles.delete}>Delete</Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  topSpace: {
    height: 40,
  },
  input: {

    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginVertical: 6,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
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
    backgroundColor: '#ddd',
    marginRight: 10,
    borderRadius: 6,
  },
  url: {
    fontSize: 14,
    color: '#333',
  },
  delete: {
    color: 'red',
    fontWeight: 'bold',
    paddingHorizontal: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});