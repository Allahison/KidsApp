import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Button,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { supabase } from '../supabaseClient';

export default function PlayerScreen() {
  const [playlist, setPlaylist] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [defaultVideoPlayed, setDefaultVideoPlayed] = useState(false);
  const [userId, setUserId] = useState(null);
  const [intervalMs, setIntervalMs] = useState(300000); // default 5 mins
  const [manualSkip, setManualSkip] = useState(true);
  const timerRef = useRef(null);

  const defaultVideo = 'https://www.youtube.com/embed/zukBYyKT000?autoplay=1';

  // 1. Fetch user
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUserId(data.user.id);
      }
    };
    getUser();
  }, []);

  // 2. Fetch settings + playlist
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;

      // Fetch settings
      const { data: settingData, error: settingError } = await supabase
        .from('settings')
        .select('auto_interval, manual_skip')
        .eq('user_id', userId)
        .single();

      if (!settingError && settingData) {
        const minutes = settingData.auto_interval || 5;
        setIntervalMs(minutes * 60 * 1000);
        setManualSkip(settingData.manual_skip ?? true);
      }

      // Fetch playlist
      const { data: playlistData, error: playlistError } = await supabase
        .from('playlists')
        .select('video_url, order_index')
        .eq('user_id', userId)
        .order('order_index', { ascending: true });

      if (!playlistError && playlistData?.length > 0) {
        const formatted = playlistData.map((item) =>
          convertToEmbedUrl(item.video_url)
        );
        setPlaylist(formatted);
        setDefaultVideoPlayed(false);
        setCurrentIdx(0);
      } else {
        setPlaylist([]);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // auto-refresh every 10s
    return () => clearInterval(interval);
  }, [userId]);

  // 3. Auto video switch (FIXED)
  useEffect(() => {
    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Only set timer if auto-skip mode is on
    if (!manualSkip && playlist.length > 0) {
      timerRef.current = setTimeout(() => {
        setCurrentIdx((prev) => (prev + 1) % playlist.length);
      }, intervalMs);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentIdx, manualSkip, playlist.length, intervalMs]);

  const convertToEmbedUrl = (url) => {
    try {
      const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
      return match
        ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&controls=1`
        : url;
    } catch {
      return url;
    }
  };

  const nextVideo = () => {
    setCurrentIdx((prev) => (prev + 1) % playlist.length);
  };

  const prevVideo = () => {
    setCurrentIdx((prev) => (prev - 1 + playlist.length) % playlist.length);
  };

  const currentUrl =
    playlist.length > 0
      ? playlist[currentIdx]
      : defaultVideoPlayed
      ? null
      : defaultVideo;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {currentUrl ? (
          <WebView
            style={styles.webview}
            source={{ uri: currentUrl }}
            allowsInlineMediaPlayback
            javaScriptEnabled
            onError={(e) => {
              const { description } = e.nativeEvent;
              Alert.alert('WebView Error', description);
            }}
          />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No videos to play.</Text>
            <ActivityIndicator size="large" color="#ff6347" />
          </View>
        )}

        {/* 4. Manual control */}
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
  },
  webview: {
    flex: 1,
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
});
