import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar } from '../atoms';
import type { User } from '../../types';

interface UserHeaderProps {
  user: User;
  onPress?: () => void;
  showGreeting?: boolean;
}

const UserHeader: React.FC<UserHeaderProps> = ({
  user,
  onPress,
  showGreeting = false,
}) => {
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={!onPress}
    >
      <Avatar source={user.avatar} name={user.name} size={50} />

      <View style={styles.textContainer}>
        {showGreeting && <Text style={styles.greeting}>{getGreeting()}</Text>}
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    color: '#8E8E93',
  },
});

export default UserHeader;
