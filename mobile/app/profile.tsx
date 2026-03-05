import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { userApi, authApi } from '../lib/api';
import { ArrowLeft, Crown, LogOut } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await userApi.getProfile();
      setUser(response.user);
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    Alert.alert(
      'Upgrade to Pro',
      'Get 35 scans/month, allergen analysis, and offline access for $4.99/month',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade',
          onPress: async () => {
            try {
              await userApi.upgrade();
              loadProfile();
              Alert.alert('Success', 'Upgraded to Pro!');
            } catch (error) {
              Alert.alert('Error', 'Failed to upgrade');
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await authApi.logout();
          router.replace('/');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const isPro = user?.subscription_tier === 'pro';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.profileCard}>
          <Text style={styles.email}>{user?.email}</Text>
          
          {isPro ? (
            <LinearGradient
              colors={['#fbbf24', '#f59e0b']}
              style={styles.proBadge}
            >
              <Crown size={16} color="white" />
              <Text style={styles.proText}>Pro Member</Text>
            </LinearGradient>
          ) : (
            <View style={styles.freeBadge}>
              <Text style={styles.freeText}>Free Tier</Text>
            </View>
          )}
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Scans Remaining</Text>
          <Text style={styles.statsValue}>
            {user?.scans_remaining || 0}
          </Text>
          <Text style={styles.statsSubtext}>
            Resets monthly
          </Text>
        </View>

        {!isPro && (
          <TouchableOpacity style={styles.upgradeCard} onPress={handleUpgrade}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.upgradeGradient}
            >
              <Crown size={32} color="white" />
              <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
              <Text style={styles.upgradeSubtitle}>
                • 35 scans/month{'\n'}
                • Allergen analysis{'\n'}
                • Similar dishes{'\n'}
                • Offline access
              </Text>
              <View style={styles.upgradeButton}>
                <Text style={styles.upgradeButtonText}>$4.99/month</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>About UnMenu</Text>
          <Text style={styles.infoText}>
            Scan restaurant menus in any language and get instant translations,
            descriptions, and allergen information.
          </Text>
          <Text style={styles.infoDisclaimer}>
            ⚠️ Allergen information is inferred and may be incomplete.
            Always confirm with restaurant staff.
          </Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  email: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  proText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  freeBadge: {
    backgroundColor: '#e5e5e5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  freeText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  statsCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statsValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#667eea',
  },
  statsSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  upgradeCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  upgradeGradient: {
    padding: 24,
    alignItems: 'center',
  },
  upgradeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 12,
    marginBottom: 16,
  },
  upgradeSubtitle: {
    fontSize: 14,
    color: 'white',
    lineHeight: 24,
    marginBottom: 20,
  },
  upgradeButton: {
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  infoDisclaimer: {
    fontSize: 12,
    color: '#f59e0b',
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 6,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'white',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
