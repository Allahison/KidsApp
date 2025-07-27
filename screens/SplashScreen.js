import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { supabase } from '../supabaseClient';

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      setTimeout(() => {
        if (session && session.user) {
          navigation.replace('Dashboard');
        } else {
          navigation.replace('Auth');
        }
      }, 2000); // simulate splash delay
    };

    checkUser();
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/1.jpeg')} 
        style={styles.logo}
      />
      <Text style={styles.title}>KidsApp</Text>
      <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f3460',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    color: '#fff',
    marginTop: 20,
    fontWeight: 'bold',
  },
});
