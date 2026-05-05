import { StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

import { colors } from "../theme/colors";

type Props = {
  latitude?: string | number | null;
  longitude?: string | number | null;
};

export function MapPreview({ latitude, longitude }: Props) {
  const lat = Number(latitude ?? 44.439);
  const lng = Number(longitude ?? 26.096);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.018,
          longitudeDelta: 0.018,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        <Marker coordinate={{ latitude: lat, longitude: lng }} />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 150,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: {
    flex: 1,
  },
});

