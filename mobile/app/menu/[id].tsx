import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { scanApi, menuApi } from '../../lib/api';
import { storage } from '../../lib/storage';
import { Trash2, AlertTriangle, ArrowLeft } from 'lucide-react-native';

export default function MenuDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savedMenuId, setSavedMenuId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const isMountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoSavedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    pollStatus();

    return () => {
      isMountedRef.current = false;
      
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Cancel the scan if still processing
      if (status?.status === 'processing') {
        scanApi.cancel(id as string).catch(console.error);
      }
    };
  }, [id]);

  const pollStatus = async () => {
    if (!isMountedRef.current) return;

    try {
      const response = await scanApi.getStatus(id as string);
      
      if (!isMountedRef.current) return;
      
      setStatus(response);

      if (response.status === 'processing') {
        timeoutRef.current = setTimeout(pollStatus, 2000);
      } else if (response.status === 'completed' && !hasAutoSavedRef.current) {
        // Auto-save menu when scan completes
        hasAutoSavedRef.current = true;
        autoSaveMenu(response.menu);
        setLoading(false);
      } else {
        setLoading(false);
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      
      setLoading(false);
      Alert.alert('Error', 'Failed to load menu');
    }
  };

  const autoSaveMenu = async (menu: any) => {
    try {
      const response = await menuApi.saveMenu(id as string);
      setSavedMenuId(response.id);
      await storage.saveMenu(id as string, menu);
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Silently fail - don't interrupt user experience
    }
  };

  const deleteMenu = async () => {
    if (!savedMenuId) return;
    
    Alert.alert(
      'Delete Menu',
      'Are you sure you want to delete this saved menu?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await menuApi.deleteMenu(savedMenuId);
              await storage.deleteMenu(savedMenuId);
              Alert.alert('Deleted', 'Menu removed', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete menu');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading || status?.status === 'processing') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>
          Processing menu... {status?.progress || 0}%
        </Text>
        <Text style={styles.subText}>
          {status?.progress < 30 ? 'Extracting text from image...' : 
           status?.progress < 50 ? 'Analyzing menu structure...' :
           status?.progress < 70 ? 'Translating dishes...' : 
           status?.progress < 90 ? 'Enriching with details...' : 'Finalizing...'}
        </Text>
      </View>
    );
  }

  if (status?.status === 'failed') {
    return (
      <View style={styles.container}>
        <AlertTriangle size={64} color="#ef4444" />
        <Text style={styles.errorText}>Processing Failed</Text>
        <Text style={styles.subText}>{status.error || 'Please try again'}</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const menu = status?.menu;

  return (
    <View style={styles.fullContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Menu</Text>
        <TouchableOpacity onPress={deleteMenu} disabled={deleting || !savedMenuId}>
          <Trash2 size={24} color={deleting || !savedMenuId ? '#ccc' : '#ef4444'} />
        </TouchableOpacity>
      </View>

      <View style={styles.disclaimer}>
        <AlertTriangle size={16} color="#f59e0b" />
        <Text style={styles.disclaimerText}>
          Allergen information is inferred and may be incomplete. Always confirm with restaurant staff.
        </Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {menu?.sections?.map((section: any, sectionIndex: number) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.name}</Text>
            
            {section.items?.map((item: any, itemIndex: number) => (
              <View key={itemIndex} style={styles.item}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemTitleContainer}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.price && <Text style={styles.itemPrice}>{item.price}</Text>}
                  </View>
                  {item.confidence < 0.7 && (
                    <View style={styles.lowConfidenceBadge}>
                      <Text style={styles.lowConfidenceText}>Low Confidence</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.itemTranslation}>{item.translation}</Text>
                <Text style={styles.itemDescription}>{item.description}</Text>

                {item.dietary_notes?.length > 0 && (
                  <View style={styles.tags}>
                    {item.dietary_notes.map((note: string, i: number) => (
                      <View key={i} style={styles.tag}>
                        <Text style={styles.tagText}>{note}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {item.possible_allergens?.length > 0 && (
                  <View style={styles.allergens}>
                    <Text style={styles.allergensLabel}>Possible allergens:</Text>
                    <Text style={styles.allergensText}>
                      {item.possible_allergens.join(', ')}
                    </Text>
                  </View>
                )}

                {item.similar_dishes?.length > 0 && (
                  <View style={styles.similar}>
                    <Text style={styles.similarLabel}>Similar to:</Text>
                    <Text style={styles.similarText}>
                      {item.similar_dishes.join(', ')}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  fullContainer: {
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
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef3c7',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
  },
  scrollView: {
    flex: 1,
  },
  loadingText: {
    fontSize: 18,
    marginTop: 16,
    fontWeight: '600',
  },
  subText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    color: '#ef4444',
  },
  button: {
    backgroundColor: '#667eea',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  item: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
    marginLeft: 8,
  },
  lowConfidenceBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  lowConfidenceText: {
    fontSize: 10,
    color: '#92400e',
    fontWeight: '600',
  },
  itemTranslation: {
    fontSize: 16,
    color: '#667eea',
    marginBottom: 4,
    fontWeight: '500',
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#4338ca',
    fontWeight: '500',
  },
  allergens: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 6,
  },
  allergensLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 2,
  },
  allergensText: {
    fontSize: 12,
    color: '#991b1b',
  },
  similar: {
    marginTop: 8,
  },
  similarLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  similarText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});
