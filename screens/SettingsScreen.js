import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../supabaseClient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const navigation = useNavigation();

  const [intervalMin, setIntervalMin] = useState('5');
  const [manualSkip, setManualSkip] = useState(true);
  const [uid, setUid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settingsExist, setSettingsExist] = useState(false);

  useEffect(() => {
    const getUserAndSettings = async () => {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('User fetch error:', userError);
        Alert.alert('Error', 'Unable to fetch user.');
        setLoading(false);
        return;
      }

      const userId = user.id;
      setUid(userId);

      const { data, error } = await supabase
        .from('settings')
        .select('auto_interval, manual_skip')
        .eq('user_id', userId)
        .single();

      if (data) {
        setIntervalMin(data.auto_interval?.toString() ?? '5');
        setManualSkip(data.manual_skip ?? true);
        setSettingsExist(true);
      } else {
        setSettingsExist(false);
      }

      setLoading(false);
    };

    getUserAndSettings();
  }, []);

  const validate = () => {
    const intervalNum = Number(intervalMin);
    if (!manualSkip && (isNaN(intervalNum) || intervalNum <= 0)) {
      Alert.alert('Invalid Input', 'Interval must be a positive number.');
      return false;
    }
    return true;
  };

  const handleSaveOrUpdate = async () => {
    if (!uid || !validate()) return;

    const intervalNum = manualSkip ? null : Number(intervalMin);

    if (settingsExist) {
      Alert.alert(
        'Confirm Update',
        'Update your settings with the new values?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Update',
            onPress: async () => {
              const { error } = await supabase
                .from('settings')
                .update({
                  auto_interval: intervalNum,
                  manual_skip: manualSkip,
                })
                .eq('user_id', uid);

              if (error) {
                console.error('Update error:', error);
                Alert.alert('Error', 'Failed to update settings.');
              } else {
                Alert.alert('Success', 'Settings updated successfully.');
              }
            },
          },
        ]
      );
    } else {
      const { error } = await supabase.from('settings').upsert({
        user_id: uid,
        auto_interval: intervalNum,
        manual_skip: manualSkip,
      });

      if (error) {
        console.error('Save error:', error);
        Alert.alert('Error', 'Failed to save settings.');
      } else {
        setSettingsExist(true);
        Alert.alert('Success', 'Settings saved successfully.');
      }
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: handleLogout }
      ]
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.replace('Auth');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.switchRow}>
        <Text style={styles.label}>Allow manual skip:</Text>
        <Switch value={manualSkip} onValueChange={setManualSkip} />
      </View>

      {!manualSkip && (
        <Text style={styles.label}>Auto‑change interval (minutes):</Text>
      )}

      <TextInput
        style={[
          styles.input,
          manualSkip && styles.disabledInput,
        ]}
        value={intervalMin}
        onChangeText={setIntervalMin}
        keyboardType="numeric"
        editable={!manualSkip}
        placeholder="Enter interval"
      />

      <TouchableOpacity style={styles.button} onPress={handleSaveOrUpdate}>
        <Text style={styles.buttonText}>
          {settingsExist ? 'Update Settings' : 'Save Settings'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout}>
        <Ionicons name="log-out-outline" size={20} color="#fff" style={styles.logoutIcon} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f9f9f9',
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007BFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoutButton: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e63946',
    paddingVertical: 14,
    borderRadius: 10,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  logoutIcon: {
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 10,
    color: '#666',
  },
});