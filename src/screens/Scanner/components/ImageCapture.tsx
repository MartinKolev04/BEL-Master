import * as ImagePicker from 'expo-image-picker';
import { Alert, Text, View } from 'react-native';
import { Button } from '../../../components/ui';
import { Camera } from '../../../components/icons';
import { useTranslation } from '../../../i18n';

interface ImageCaptureProps {
  onCapture: (dataUrl: string) => void;
}

export function ImageCapture({ onCapture }: ImageCaptureProps) {
  const { t } = useTranslation();

  const handleResult = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.base64) {
      Alert.alert('Грешка при четене на изображението.');
      return;
    }
    const mime = asset.mimeType || 'image/jpeg';
    onCapture(`data:${mime};base64,${asset.base64}`);
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Необходимо е разрешение за камерата.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.8,
    });
    handleResult(result);
  };

  const handlePickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Необходимо е разрешение за галерията.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.8,
    });
    handleResult(result);
  };

  return (
    <View className="flex-1 items-center justify-center border-4 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl p-12">
      <Camera size={64} className="text-gray-200 dark:text-gray-700 mb-4" />
      <Text className="text-gray-400 dark:text-gray-500 mb-8 text-center">{t.scanner.noImage}</Text>
      <View className="w-full mb-3">
        <Button onPress={handleTakePhoto}>{t.scanner.captureButton}</Button>
      </View>
      <Button variant="outline" onPress={handlePickFromLibrary}>
        Избери от галерия
      </Button>
    </View>
  );
}
