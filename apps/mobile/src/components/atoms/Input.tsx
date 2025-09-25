import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import type { InputProps } from '../../types';

const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  error,
  disabled = false,
}) => {
  const inputContainerStyle: ViewStyle[] = [
    styles.inputContainer,
    error && styles.errorInputContainer,
    disabled && styles.disabledInputContainer,
  ].filter(Boolean) as ViewStyle[];

  const inputStyle: TextStyle[] = [
    styles.input,
    disabled && styles.disabledInput,
  ].filter(Boolean) as TextStyle[];

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={inputContainerStyle}>
        <TextInput
          style={inputStyle}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          editable={!disabled}
          placeholderTextColor="#999999"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  errorInputContainer: {
    borderColor: '#FF3B30',
  },
  disabledInputContainer: {
    backgroundColor: '#F2F2F7',
    borderColor: '#E5E5EA',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1C1C1E',
    minHeight: 44,
  },
  disabledInput: {
    color: '#8E8E93',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 4,
  },
});

export default Input;
