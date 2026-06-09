import { useEffect, useState } from "react";
import { Image, ImageProps, StyleSheet, View } from "react-native";
import { SvgXml } from "react-native-svg";

import { brandAvatarAssets } from "../lib/brandAvatars";
import { resolveRestaurantAvatarUri } from "../lib/images";
import { Restaurant } from "../types/models";

type Props = Omit<ImageProps, "source"> & {
  restaurant: Restaurant;
};

export function RestaurantAvatarImage({ restaurant, ...props }: Props) {
  const brandAsset = restaurant.slug ? brandAvatarAssets[restaurant.slug] : undefined;
  const fallbackUri = resolveRestaurantAvatarUri(restaurant);
  const [uri, setUri] = useState(fallbackUri);

  useEffect(() => {
    setUri(fallbackUri);
  }, [fallbackUri]);

  if (brandAsset) {
    return (
      <View
        style={[
          styles.brandAvatar,
          props.style,
          {
            backgroundColor: brandAsset.backgroundColor,
            borderColor: brandAsset.borderColor ?? "transparent",
          },
        ]}
      >
        {brandAsset.imageSource ? (
          <Image
            source={brandAsset.imageSource}
            style={[styles.brandLogoImage, brandAsset.imageStyle]}
            resizeMode="contain"
          />
        ) : null}
        {brandAsset.svgXml ? (
          <SvgXml
            xml={brandAsset.svgXml}
            width={`${(brandAsset.imageScale ?? 0.84) * 100}%`}
            height={`${(brandAsset.imageScale ?? 0.84) * 100}%`}
          />
        ) : null}
      </View>
    );
  }

  return (
    <Image
      {...props}
      source={{ uri }}
      onError={(event) => {
        if (uri !== fallbackUri) {
          setUri(fallbackUri);
        }
        props.onError?.(event);
      }}
    />
  );
}

const styles = StyleSheet.create({
  brandAvatar: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
  },
  brandLogoImage: {
    width: "88%",
    height: "88%",
  },
});
