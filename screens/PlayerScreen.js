import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Button,
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { Video } from 'expo-av';
import { supabase } from '../supabaseClient';

export default function PlayerScreen() {
  const [playlist, setPlaylist] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userId, setUserId] = useState(null);
  const [intervalMs, setIntervalMs] = useState(300000); // 5 minutes
  const [manualSkip, setManualSkip] = useState(true);

  const indexRef = useRef(0); // ✅ for stable interval
  const defaultVideo = 'https://www.youtube.com/watch?v=zukBYyKT000';

  // Keep ref in sync
  const setIndex = (newIndex) => {
    indexRef.current = newIndex;
    setCurrentIdx(newIndex);
  };

  // Fetch logged in user
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUserId(data.user.id);
      }
    };
    getUser();
  }, []);

  // Fetch settings + playlist
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;

      const { data: settingData } = await supabase
        .from('settings')
        .select('auto_interval, manual_skip')
        .eq('user_id', userId)
        .single();

      if (settingData) {
        const minutes = settingData.auto_interval || 5;
        setIntervalMs(minutes * 60 * 1000);
        setManualSkip(settingData.manual_skip ?? true);
      }

      const { data: playlistData } = await supabase
        .from('playlists')
        .select('video_url, order_index')
        .eq('user_id', userId)
        .order('order_index', { ascending: true });

      if (playlistData?.length > 0) {
        const formatted = playlistData.map((item) => ({
          url: item.video_url,
          isLocal: item.video_url.startsWith('file://'),
        }));

        // ✅ Only update if different
        const formattedStr = JSON.stringify(formatted);
        const oldStr = JSON.stringify(playlist);
        if (formattedStr !== oldStr) {
          setPlaylist(formatted);
        }
      } else {
        setPlaylist([]);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [userId, playlist]);

  // ✅ Auto-skip logic
  useEffect(() => {
    if (!manualSkip && playlist.length > 0) {
      const timer = setInterval(() => {
        const next = (indexRef.current + 1) % playlist.length;
        setIndex(next);
      }, intervalMs);

      return () => clearInterval(timer);
    }
  }, [manualSkip, intervalMs, playlist]);

  const convertToVideoId = (url) => {
    const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    return match ? match[1] : null;
  };

  const nextVideo = () => setIndex((indexRef.current + 1) % playlist.length);
  const prevVideo = () =>
    setIndex((indexRef.current - 1 + playlist.length) % playlist.length);

  const currentVideo =
    playlist.length > 0
      ? playlist[currentIdx]
      : { url: defaultVideo, isLocal: false };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {currentVideo ? (
          currentVideo.isLocal ? (
            <Video
              source={{ uri: currentVideo.url }}
              style={styles.video}
              useNativeControls
              resizeMode="contain"
              shouldPlay
              onError={(err) =>
                Alert.alert('Video Error', JSON.stringify(err))
              }
            />
          ) : (
            <YoutubePlayer
              height={230}
              play={true}
              videoId={convertToVideoId(currentVideo.url)}
              onError={(e) => Alert.alert('YouTube Error', JSON.stringify(e))}
            />
          )
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No videos to play.</Text>
            <ActivityIndicator size="large" color="#ff6347" />
          </View>
        )}

        {manualSkip && playlist.length > 0 && (
          <View style={styles.controls}>
            <Button title="⏮️ Previous" onPress={prevVideo} />
            <Button title="⏭️ Next" onPress={nextVideo} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  emptyText: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 10,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#111',
  },
  video: {
    width: '100%',
    height: 230,
    backgroundColor: '#000',
  },
});
