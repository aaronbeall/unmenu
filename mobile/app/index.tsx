import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Menu, BookmarkCheck } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userApi } from '../lib/api';

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [scansRemaining, setScansRemaining] = useState<number | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');

  useFocusEffect(
    useCallback(() => {
      checkAuth();
    }, [])
  );

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('auth_token');
    setIsAuthenticated(!!token);

    if (!token) {
      setScansRemaining(null);
      setSubscriptionTier('free');
      return;
    }

    try {
      const profile = await userApi.getProfile();
      setScansRemaining(profile.user.scans_remaining);
      setSubscriptionTier(profile.user.subscription_tier);
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const isOutOfScans = isAuthenticated && subscriptionTier === 'free' && scansRemaining === 0;

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <View style={styles.content}>
        <Menu size={80} color="white" style={styles.icon} />
        <Text style={styles.title}>UnMenu</Text>
        <Text style={styles.subtitle}>
          Scan any menu in any language{'\n'}Get instant translations & allergen info
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, isOutOfScans && styles.disabledPrimaryButton]}
            onPress={() => (isOutOfScans ? router.push('/profile') : router.push('/scan'))}
            disabled={false}
          >
            <Camera size={24} color={isOutOfScans ? '#999' : '#667eea'} />
            <Text style={[styles.primaryButtonText, isOutOfScans && styles.disabledPrimaryButtonText]}>
              {isOutOfScans ? 'Upgrade to Scan' : 'Scan Menu'}
            </Text>
          </TouchableOpacity>

          {isAuthenticated && subscriptionTier === 'free' && scansRemaining !== null && (
            <Text style={[styles.scansHint, scansRemaining === 0 && styles.scansWarning]}>
              {scansRemaining} scans remaining
            </Text>
          )}

          {isAuthenticated ? (
            <>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push('/saved')}
              >
                <BookmarkCheck size={20} color="white" />
                <Text style={styles.secondaryButtonText}>Saved Menus</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push('/profile')}
              >
                <Text style={styles.secondaryButtonText}>Profile</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push('/auth/login')}
              >
                <Text style={styles.secondaryButtonText}>Login</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push('/auth/register')}
              >
                <Text style={styles.secondaryButtonText}>Sign Up</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#667eea',
  },
  disabledPrimaryButton: {
    backgroundColor: '#f1f1f1',
  },
  disabledPrimaryButtonText: {
    color: '#999',
  },
  scansHint: {
    marginTop: -4,
    marginBottom: 4,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  scansWarning: {
    color: '#ffd6d6',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
