import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft } from "lucide-react-native";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Screen } from "../components/Screen";
import { useFloatingCartScrollDirection } from "../hooks/useFloatingCartScrollDirection";
import { useI18n } from "../i18n/useI18n";
import { ProfileStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileInfo">;
const SEARCH_BACKGROUND_IMAGE = require("../../assets/food-src/food3.jpg");

type InfoContent = {
  title: string;
  subtitle: string;
  body: string[];
};

const CONTENT_RO: Record<"privacy" | "about" | "support", InfoContent> = {
  privacy: {
    title: "Confidențialitate",
    subtitle: "Cum îți protejăm datele în aplicație",
    body: [
      "Datele contului tău sunt folosite pentru funcțiile esențiale: autentificare, livrare, istoric de comenzi și suport.",
      "Informațiile de profil, adresele și comenzile sunt transmise securizat către backend doar când ești autentificat(ă).",
      "Nu expunem public date personale precum email, telefon sau adrese. Acestea sunt vizibile doar în contul tău și pentru procesarea comenzilor.",
      "Poți actualiza oricând numele, telefonul și emailul din Profil, iar informațiile noi sunt sincronizate la următoarea salvare.",
      "Dacă vrei ștergerea contului sau clarificări despre date, contactează suportul din secțiunea Suport.",
    ],
  },
  about: {
    title: "Despre ONE Dining Club",
    subtitle: "Livrare simplă, rapidă și clară",
    body: [
      "ONE Dining Club conectează restaurante locale cu clienți care vor comandă rapidă, fără pași complicați.",
      "În aplicație poți salva adrese, aplica coduri promo și urmări comenzile într-o experiență unitară.",
      "Ne concentrăm pe viteză, transparență la costuri și o experiență stabilă atât la checkout, cât și după comandă.",
      "Produsul evoluează constant: adăugăm funcții noi în funcție de feedback real din utilizare.",
    ],
  },
  support: {
    title: "Suport",
    subtitle: "Suntem aici când ai nevoie de ajutor",
    body: [
      "Pentru probleme legate de cont, comenzi, plăți sau coduri promo, contactează-ne și revenim cât mai rapid.",
      "Când trimiți o sesizare, include ID-ul comenzii, dispozitivul folosit și o scurtă descriere a problemei.",
      "Dacă întâmpini erori la autentificare, verifică mai întâi conexiunea la internet și încearcă din nou.",
      "Pentru situații urgente legate de o comandă în desfășurare, menționează clar că este urgent pentru prioritizare.",
      "Email suport: support@onedining.club",
    ],
  },
};
const CONTENT_EN: Record<"privacy" | "about" | "support", InfoContent> = {
  privacy: {
    title: "Privacy",
    subtitle: "How we protect your data in the app",
    body: [
      "Your account data is used for essential features: authentication, delivery, order history, and support.",
      "Profile details, addresses, and orders are securely sent to the backend only when you are authenticated.",
      "We do not publicly expose personal data such as email, phone number, or addresses. These are visible only in your account and for order processing.",
      "You can update your name, phone number, and email anytime from Profile, and new information is synced on save.",
      "If you want account deletion or clarification about your data, contact support from the Support section.",
    ],
  },
  about: {
    title: "About ONE Dining Club",
    subtitle: "Simple, fast, and clear delivery",
    body: [
      "ONE Dining Club connects local restaurants with customers who want fast ordering without complicated steps.",
      "In the app you can save addresses, apply promo codes, and track orders in a unified experience.",
      "We focus on speed, cost transparency, and a stable experience both at checkout and after placing an order.",
      "The product is constantly evolving: we add new features based on real usage feedback.",
    ],
  },
  support: {
    title: "Support",
    subtitle: "We are here when you need help",
    body: [
      "For issues related to account, orders, payments, or promo codes, contact us and we will reply as quickly as possible.",
      "When you send a report, include the order ID, device used, and a short description of the issue.",
      "If you encounter login errors, first check your internet connection and try again.",
      "For urgent situations related to an ongoing order, clearly mention that it is urgent for prioritization.",
      "Support email: support@onedining.club",
    ],
  },
};

export function ProfileInfoScreen({ navigation, route }: Props) {
  const { language } = useI18n();
  const insets = useSafeAreaInsets();
  const content = (language === "en" ? CONTENT_EN : CONTENT_RO)[route.params.topic];
  const trackFloatingCartScrollDirection = useFloatingCartScrollDirection();

  return (
    <Screen padded={false}>
      <View style={styles.screen}>
        <Image source={SEARCH_BACKGROUND_IMAGE} style={[styles.backgroundImage, { top: -insets.top }]} resizeMode="cover" blurRadius={24} />
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(5,5,5,0.34)", "rgba(5,5,5,0.58)", "rgba(5,5,5,0.86)"]}
          locations={[0, 0.48, 1]}
          style={[StyleSheet.absoluteFillObject, { top: -insets.top }]}
        />
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
              <ArrowLeft size={30} color={colors.text} strokeWidth={2.2} />
            </Pressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            onScroll={trackFloatingCartScrollDirection}
            scrollEventThrottle={16}
          >
            <Text style={styles.title}>{content.title}</Text>
            <Text style={styles.subtitle}>{content.subtitle}</Text>
            {content.body.map((paragraph) => (
              <Text key={paragraph} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
          </ScrollView>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  container: {
    flex: 1,
    paddingHorizontal: 22,
  },
  headerRow: {
    minHeight: 40,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  content: {
    paddingBottom: 24,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "700",
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 18,
  },
  paragraph: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
});
