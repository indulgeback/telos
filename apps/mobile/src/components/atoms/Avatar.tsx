import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from 'react-native';

interface AvatarProps {
  source?: string;
  name?: string;
  size?: number;
  style?: ViewStyle;
}

const Avatar: React.FC<AvatarProps> = ({ source, name, size = 40, style }) => {
  const containerStyle: ViewStyle[] = [
    styles.container,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
    style,
  ].filter(Boolean) as ViewStyle[];

  const imageStyle: ImageStyle[] = [
    {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
  ];

  const textStyle: TextStyle[] = [
    styles.text,
    {
      fontSize: size * 0.4,
    },
  ];

  // 获取姓名首字母
  const getInitials = (name: string): string => {
    if (!name) return '?';
    const names = name.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return (
      names[0].charAt(0) + names[names.length - 1].charAt(0)
    ).toUpperCase();
  };

  // 生成背景颜色
  const getBackgroundColor = (name: string): string => {
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#96CEB4',
      '#FFEAA7',
      '#DDA0DD',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
      '#85C1E9',
      '#F8C471',
      '#82E0AA',
    ];

    if (!name) return colors[0];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  };

  if (source) {
    return <Image source={{ uri: source }} style={imageStyle} />;
  }

  return (
    <View
      style={[
        containerStyle,
        { backgroundColor: getBackgroundColor(name || '') },
      ]}
    >
      <Text style={textStyle}>{getInitials(name || '')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E5EA',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default Avatar;
