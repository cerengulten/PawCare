import React from 'react';
import { Ionicons, Feather } from '@expo/vector-icons';

export function renderHabitVectorIcon(
  habitType: string | undefined,
  color: string,
  size: number = 17
): React.ReactNode {
  switch (habitType) {
    case 'feeding':
      return <Ionicons name="restaurant-outline" size={size} color={color} />;
    case 'water':
      return <Ionicons name="water-outline" size={size} color={color} />;
    case 'walking':
      return <Feather name="activity" size={Math.max(12, size - 1)} color={color} />;
    case 'medication':
    case 'vitamin':
      return <Feather name="shield" size={Math.max(12, size - 1)} color={color} />;
    case 'dental':
      return <Ionicons name="sparkles-outline" size={Math.max(12, size - 1)} color={color} />;
    default:
      return <Feather name="check-circle" size={Math.max(12, size - 1)} color={color} />;
  }
}
