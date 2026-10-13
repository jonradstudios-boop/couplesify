import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  GestureResponderEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AppColors from '../theme/AppColors';
import { DoodleStroke, SharedDoodle } from '../services/StorageService';

interface DoodleCanvasProps {
  initialStrokes?: DoodleStroke[];
  onSave?: (doodle: SharedDoodle) => void;
  height?: number;
  isCompact?: boolean;
}

const PALETTE = [
  '#FF6575', // Coral-Strawberry
  '#9C84E2', // Lavender
  '#48C08A', // Mint Green
  '#FFB049', // Peach
  '#5CA9F8', // Baby Sky Blue
  '#2D242B', // Charcoal
  '#FFFFFF', // White
];

const BRUSH_SIZES = [
  { label: 'S', size: 3 },
  { label: 'M', size: 6 },
  { label: 'L', size: 12 },
];

export const DoodleCanvas: React.FC<DoodleCanvasProps> = ({
  initialStrokes = [],
  onSave,
  height = 340,
  isCompact = false,
}) => {
  const [strokes, setStrokes] = useState<DoodleStroke[]>(initialStrokes);
  const [undoneStrokes, setUndoneStrokes] = useState<DoodleStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<DoodleStroke | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>(PALETTE[0]);
  const [brushSize, setBrushSize] = useState<number>(6);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [isSent, setIsSent] = useState<boolean>(false);

  // SVG Path generator from points with bezier smoothing
  const pointsToSvgPath = (points: { x: number; y: number }[]): string => {
    if (!points || points.length === 0) return '';
    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;
    }

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;
      path += ` Q ${p0.x} ${p0.y}, ${midX} ${midY}`;
    }
    const last = points[points.length - 1];
    path += ` T ${last.x} ${last.y}`;
    return path;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        const newStroke: DoodleStroke = {
          points: [{ x: locationX, y: locationY }],
          color: isEraser ? '#FFFDFD' : selectedColor,
          width: isEraser ? brushSize * 3 : brushSize,
        };
        setCurrentStroke(newStroke);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentStroke((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            points: [...prev.points, { x: locationX, y: locationY }],
          };
        });
      },
      onPanResponderRelease: () => {
        setCurrentStroke((prev) => {
          if (prev && prev.points.length > 0) {
            setStrokes((all) => [...all, prev]);
            setUndoneStrokes([]);
          }
          return null;
        });
      },
    })
  ).current;

  const handleUndo = () => {
    if (strokes.length === 0) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const last = strokes[strokes.length - 1];
    setStrokes((prev) => prev.slice(0, prev.length - 1));
    setUndoneStrokes((prev) => [...prev, last]);
  };

  const handleRedo = () => {
    if (undoneStrokes.length === 0) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const toRestore = undoneStrokes[undoneStrokes.length - 1];
    setUndoneStrokes((prev) => prev.slice(0, prev.length - 1));
    setStrokes((prev) => [...prev, toRestore]);
  };

  const handleClear = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setStrokes([]);
    setUndoneStrokes([]);
    setIsSent(false);
  };

  const handleSendToWidget = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    const doodleData: SharedDoodle = {
      id: `doodle-${Date.now()}`,
      strokes,
      updatedAt: Date.now(),
      author: 'You',
      previewEmoji: '🎨',
    };
    if (onSave) {
      onSave(doodleData);
    }
    setIsSent(true);
    setTimeout(() => setIsSent(false), 3000);
  };

  return (
    <View style={styles.container}>
      {/* Canvas Drawing Surface */}
      <View
        style={[styles.canvasSurface, { height }]}
        {...panResponder.panHandlers}
      >
        <Svg style={StyleSheet.absoluteFill}>
          {strokes.map((stroke, index) => (
            <Path
              key={`stroke-${index}`}
              d={pointsToSvgPath(stroke.points)}
              stroke={stroke.color}
              strokeWidth={stroke.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
          {currentStroke && (
            <Path
              d={pointsToSvgPath(currentStroke.points)}
              stroke={currentStroke.color}
              strokeWidth={currentStroke.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          )}
        </Svg>

        {strokes.length === 0 && !currentStroke && (
          <View style={styles.placeholderOverlay} pointerEvents="none">
            <Ionicons name="pencil" size={28} color="#E8CFD5" />
            <Text style={styles.placeholderText}>Doodle a love note or sweet drawing here ✨</Text>
          </View>
        )}

        {isSent && (
          <View style={styles.sentToastOverlay} pointerEvents="none">
            <Ionicons name="heart" size={24} color="#FFFFFF" />
            <Text style={styles.sentToastText}>Sent to Partner's Home Widget! 💕</Text>
          </View>
        )}
      </View>

      {/* Drawing Controls Strip */}
      {!isCompact && (
        <View style={styles.controlsSection}>
          {/* Color Palette Picker & Eraser */}
          <View style={styles.paletteRow}>
            {PALETTE.map((color) => {
              const isSelected = selectedColor === color && !isEraser;
              return (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: color },
                    isSelected && styles.colorCircleSelected,
                  ]}
                  onPress={() => {
                    setIsEraser(false);
                    setSelectedColor(color);
                  }}
                  activeOpacity={0.7}
                />
              );
            })}

            {/* Eraser Button */}
            <TouchableOpacity
              style={[styles.toolBtn, isEraser && styles.toolBtnActive]}
              onPress={() => setIsEraser(!isEraser)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="eraser"
                size={20}
                color={isEraser ? AppColors.primary : AppColors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Brush Size & Action Buttons */}
          <View style={styles.actionsRow}>
            {/* Brush sizes */}
            <View style={styles.brushSizeGroup}>
              {BRUSH_SIZES.map((b) => (
                <TouchableOpacity
                  key={b.label}
                  style={[
                    styles.brushBtn,
                    brushSize === b.size && styles.brushBtnActive,
                  ]}
                  onPress={() => setBrushSize(b.size)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.brushBtnText,
                      brushSize === b.size && styles.brushBtnTextActive,
                    ]}
                  >
                    {b.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Undo / Redo / Clear */}
            <View style={styles.historyGroup}>
              <TouchableOpacity
                onPress={handleUndo}
                style={[styles.iconToolBtn, strokes.length === 0 && styles.disabledBtn]}
                disabled={strokes.length === 0}
              >
                <Feather name="corner-up-left" size={18} color={AppColors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleRedo}
                style={[styles.iconToolBtn, undoneStrokes.length === 0 && styles.disabledBtn]}
                disabled={undoneStrokes.length === 0}
              >
                <Feather name="corner-up-right" size={18} color={AppColors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity onPress={handleClear} style={styles.iconToolBtn}>
                <Ionicons name="trash-outline" size={18} color="#FF6575" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Big Instant Send to Partner Widget Button */}
          <TouchableOpacity
            style={styles.sendWidgetButton}
            onPress={handleSendToWidget}
            activeOpacity={0.85}
          >
            <Ionicons name="paper-plane" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.sendWidgetButtonText}>Send to Partner Widget</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  canvasSurface: {
    width: '100%',
    backgroundColor: 'rgba(255, 253, 253, 0.72)',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
  },
  placeholderOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 13,
    color: '#D4B5BC',
    fontWeight: '600',
    textAlign: 'center',
  },
  sentToastOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 101, 117, 0.95)',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sentToastText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  controlsSection: {
    marginTop: 14,
    gap: 12,
  },
  paletteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 22,
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.92)',
  },
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E8D2D6',
  },
  colorCircleSelected: {
    borderColor: AppColors.textPrimary,
    borderWidth: 3,
    transform: [{ scale: 1.2 }],
  },
  toolBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(247, 237, 240, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  toolBtnActive: {
    backgroundColor: '#FFE8EC',
    borderWidth: 1.5,
    borderColor: AppColors.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brushSizeGroup: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    padding: 4,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.92)',
  },
  brushBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brushBtnActive: {
    backgroundColor: AppColors.primary,
  },
  brushBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.textSecondary,
  },
  brushBtnTextActive: {
    color: '#FFFFFF',
  },
  historyGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    padding: 4,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.92)',
  },
  iconToolBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    opacity: 0.3,
  },
  sendWidgetButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 9999,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  sendWidgetButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

export default DoodleCanvas;
