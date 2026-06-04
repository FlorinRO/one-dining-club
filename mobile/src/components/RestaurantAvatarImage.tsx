import { useEffect, useState } from "react";
import { Image, ImageProps } from "react-native";

import { resolveRestaurantAvatarUri } from "../lib/images";
import { Restaurant } from "../types/models";

type Props = Omit<ImageProps, "source"> & {
  restaurant: Restaurant;
};

export function RestaurantAvatarImage({ restaurant, ...props }: Props) {
  const fallbackUri = resolveRestaurantAvatarUri(restaurant);
  const [uri, setUri] = useState(fallbackUri);

  useEffect(() => {
    setUri(fallbackUri);
  }, [fallbackUri]);

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
