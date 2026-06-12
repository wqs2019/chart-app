import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../navigation/RootNavigator';
import { rankService } from '../../services/rankService';
import { StandardItem, LeaderboardCode, LEADERBOARD_CONFIGS } from '../../types/rank';
import { useAppStore } from '../../store/appStore';

type CheckinScreenRouteProp = RouteProp<RootStackParamList, 'Checkin'>;
type CheckinScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Checkin'>;

const CheckinScreen = () => {
  const route = useRoute<CheckinScreenRouteProp>();
  const navigation = useNavigation<CheckinScreenNavigationProp>();
  const { code } = route.params;
  const config = LEADERBOARD_CONFIGS[code];

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<StandardItem[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const userId = 'demo_user_001'; // 临时 Demo ID，稍后接入真实 Auth

  useEffect(() => {
    navigation.setOptions({ title: config?.title || '录入' });
    fetchData();
  }, [code]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [allOptions, myCheckins] = await Promise.all([
        rankService.getStandardItems(code as LeaderboardCode),
        rankService.getUserCheckins(userId, code as LeaderboardCode),
      ]);

      setItems(allOptions);
      setCheckedIds(new Set(myCheckins.map((c) => c.item_id)));
    } catch (error) {
      console.error('Fetch data failed:', error);
      Alert.alert('加载失败', '请检查网络或凭证配置');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (item: StandardItem) => {
    const isChecked = checkedIds.has(item._id);
    const newCheckedIds = new Set(checkedIds);

    if (isChecked) {
      newCheckedIds.delete(item._id);
    } else {
      newCheckedIds.add(item._id);
    }

    // 乐观更新 UI
    setCheckedIds(newCheckedIds);

    try {
      await rankService.toggleCheckin(userId, item, !isChecked);
    } catch (error) {
      console.error('Toggle checkin failed:', error);
      Alert.alert('同步失败', '打卡记录未成功保存到云端');
      // 回滚 UI
      fetchData();
    }
  };

  const renderItem = ({ item }: { item: StandardItem }) => {
    const isChecked = checkedIds.has(item._id);
    return (
      <TouchableOpacity
        style={[styles.itemCard, isChecked && styles.itemCardChecked]}
        onPress={() => handleToggle(item)}
      >
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, isChecked && styles.textChecked]}>
            {item.name_zh}
          </Text>
          <Text style={[styles.itemSubName, isChecked && styles.textChecked]}>
            {item.name_en} · {item.category}
          </Text>
        </View>
        <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
          {isChecked && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>加载标准库数据...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.statsText}>
          已解锁: <Text style={styles.highlight}>{checkedIds.size}</Text> / {items.length} {config?.unit}
        </Text>
      </View>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#8E8E93',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  statsText: {
    fontSize: 15,
    color: '#3A3A3C',
  },
  highlight: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  list: {
    padding: 8,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    // Elevation for Android
    elevation: 2,
  },
  itemCardChecked: {
    backgroundColor: '#E5F1FF',
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  itemSubName: {
    fontSize: 13,
    color: '#8E8E93',
  },
  textChecked: {
    color: '#007AFF',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default CheckinScreen;
