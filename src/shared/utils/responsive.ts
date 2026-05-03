import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const guidelineBaseWidth = 390;
const guidelineBaseHeight = 844;

export const isSmallDevice = SCREEN_WIDTH < 360;
export const isTablet = SCREEN_WIDTH >= 768;

export const scale = (size: number): number =>
    Math.round(PixelRatio.roundToNearestPixel((SCREEN_WIDTH / guidelineBaseWidth) * size));

export const verticalScale = (size: number): number =>
    Math.round(PixelRatio.roundToNearestPixel((SCREEN_HEIGHT / guidelineBaseHeight) * size));

export const moderateScale = (size: number, factor = 0.5): number =>
    Math.round(size + (scale(size) - size) * factor);

export const screen = {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
};
