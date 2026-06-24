import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { ImagePlus, Heart, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  useWindowDimensions,
  View,
} from "react-native";
import Reanimated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";

import { productsApi } from "../api/productsApi";
import {
  buildFeedComments,
  compactCount,
  FeedComment,
  FeedReply,
  formatCommentAge,
  minutesSinceCreated,
  productKey,
  statsFor,
} from "../lib/feedSocial";
import { useCommentsStore } from "../store/commentsStore";
import { showAppAlert } from "../store/uiStore";
import { colors } from "../theme/colors";
import { Product, ProductComment, Restaurant } from "../types/models";

type ProductCommentsSheetProps = {
  visible: boolean;
  restaurant: Restaurant | null;
  product: Product | null;
  onClose: () => void;
  onProductSocialChange?: (productId: number, patch: Partial<Pick<Product, "comments_count" | "likes_count" | "is_liked">>) => void;
};

type PendingPhoto = {
  id: string;
  uri?: string;
};

const API_COMMENT_ID_PREFIX = "api-comment-";

const hasServerSocial = (product: Product) =>
  typeof product.likes_count === "number" ||
  typeof product.comments_count === "number" ||
  typeof product.is_liked === "boolean";

const apiCommentFeedId = (id: number) => `${API_COMMENT_ID_PREFIX}${id}`;

const apiCommentIdFromFeedId = (id: string) => {
  if (!id.startsWith(API_COMMENT_ID_PREFIX)) return null;
  const numericId = Number(id.slice(API_COMMENT_ID_PREFIX.length));
  return Number.isFinite(numericId) ? numericId : null;
};

const createdAtMillis = (value?: string) => {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const countApiComments = (comments: ProductComment[]): number =>
  comments.reduce((total, comment) => total + 1 + countApiComments(comment.replies ?? []), 0);

const mapApiComment = (comment: ProductComment): FeedComment => ({
  id: apiCommentFeedId(comment.id),
  author: comment.author || "user",
  text: comment.text,
  likes: comment.likes_count,
  isLiked: comment.is_liked,
  minutesAgo: 0,
  createdAt: createdAtMillis(comment.created_at),
  photos: comment.photo_urls ?? [],
  replies: (comment.replies ?? []).map(mapApiComment),
});

const updateServerComment = (
  comments: FeedComment[],
  commentId: string,
  patch: Partial<Pick<FeedComment, "likes" | "isLiked">>,
): FeedComment[] =>
  comments.map((comment) => {
    if (comment.id === commentId) return { ...comment, ...patch };
    if (!comment.replies?.length) return comment;
    return { ...comment, replies: updateServerReplies(comment.replies, commentId, patch) };
  });

const updateServerReplies = (
  replies: FeedReply[],
  replyId: string,
  patch: Partial<Pick<FeedReply, "likes" | "isLiked">>,
): FeedReply[] =>
  replies.map((reply) => (reply.id === replyId ? { ...reply, ...patch } : reply));

const appendServerReply = (comments: FeedComment[], parentId: string, reply: FeedReply): FeedComment[] =>
  comments.map((comment) => {
    if (comment.id === parentId) {
      return { ...comment, replies: [reply, ...(comment.replies ?? [])] };
    }
    return comment;
  });

export function ProductCommentsSheet({ visible, restaurant, product, onClose, onProductSocialChange }: ProductCommentsSheetProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [commentDraft, setCommentDraft] = useState("");
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [replyTarget, setReplyTarget] = useState<{ id: string; author: string } | null>(null);
  const [commentClock, setCommentClock] = useState(Date.now());
  const [galleryViewer, setGalleryViewer] = useState<{ uris: string[]; initialIndex: number } | null>(null);
  const [serverComments, setServerComments] = useState<FeedComment[] | null>(null);
  const [serverCommentCount, setServerCommentCount] = useState<number | null>(null);

  const commentBumps = useCommentsStore((state) => state.commentBumps);
  const commentRepliesByComment = useCommentsStore((state) => state.commentRepliesByComment);
  const likedComments = useCommentsStore((state) => state.likedComments);
  const likedReplies = useCommentsStore((state) => state.likedReplies);
  const userCommentsByPost = useCommentsStore((state) => state.userCommentsByPost);
  const addComment = useCommentsStore((state) => state.addComment);
  const addReply = useCommentsStore((state) => state.addReply);
  const bumpCommentCount = useCommentsStore((state) => state.bumpCommentCount);
  const toggleCommentLike = useCommentsStore((state) => state.toggleCommentLike);
  const toggleReplyLike = useCommentsStore((state) => state.toggleReplyLike);

  const activePostKey = restaurant && product ? productKey(restaurant.id, product.id) : null;
  const isServerBacked = Boolean(product && hasServerSocial(product));
  const localCommentBump = activePostKey ? commentBumps[activePostKey] ?? 0 : 0;
  const commentCount = restaurant && product && activePostKey
    ? isServerBacked
      ? (serverCommentCount ?? product.comments_count ?? 0) + localCommentBump
      : statsFor(restaurant, product).comments + localCommentBump
    : 0;

  const resetComposer = useCallback(() => {
    setCommentDraft("");
    setPendingPhotos([]);
    setExpandedReplies({});
    setReplyTarget(null);
    setGalleryViewer(null);
  }, []);

  const closeSheet = useCallback(() => {
    resetComposer();
    onClose();
  }, [onClose, resetComposer]);

  const runSmoothLayoutAnimation = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, []);

  useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    setCommentClock(Date.now());
    const intervalId = setInterval(() => setCommentClock(Date.now()), 60000);
    return () => clearInterval(intervalId);
  }, [visible]);

  useEffect(() => {
    if (!visible || !product || !isServerBacked) {
      setServerComments(null);
      setServerCommentCount(null);
      return undefined;
    }

    let isMounted = true;
    productsApi
      .comments(product.id)
      .then((comments) => {
        if (!isMounted) return;
        const mappedComments = comments.map(mapApiComment);
        const loadedCount = countApiComments(comments);
        const nextCount = Math.max(product.comments_count ?? 0, loadedCount);
        setServerComments(mappedComments);
        setServerCommentCount(nextCount);
      })
      .catch(() => {
        if (!isMounted) return;
        setServerComments([]);
        setServerCommentCount(product.comments_count ?? 0);
      });

    return () => {
      isMounted = false;
    };
  }, [isServerBacked, product, visible]);

  const commentsForSheet = useMemo(() => {
    if (!restaurant || !product || !activePostKey) return [];
    const userComments = (userCommentsByPost[activePostKey] ?? []).map((comment) => ({
      ...comment,
      replies: commentRepliesByComment[comment.id] ?? [],
    }));

    if (isServerBacked) {
      const hydratedServerComments = (serverComments ?? []).map((comment) => ({
        ...comment,
        replies: [...(commentRepliesByComment[comment.id] ?? []), ...(comment.replies ?? [])],
      }));
      return [...userComments, ...hydratedServerComments];
    }

    const generatedComments = buildFeedComments(restaurant, product, statsFor(restaurant, product).comments).map((comment) => ({
      ...comment,
      replies: commentRepliesByComment[comment.id] ?? [],
    }));
    return [...userComments, ...generatedComments];
  }, [activePostKey, commentRepliesByComment, isServerBacked, product, restaurant, serverComments, userCommentsByPost]);

  const handleAddPhoto = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAppAlert("Permisiune necesara", "Permite accesul la galerie pentru a adauga fotografii.", undefined, { tone: "warning" });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });

    if (result.canceled || result.assets.length === 0) return;
    setPendingPhotos((current) => [
      ...current,
      ...result.assets.map((asset, index) => ({
        id: `photo-${Date.now()}-${current.length}-${index}`,
        uri: asset.uri,
      })),
    ]);
  }, []);

  const addLocalCommentOrReply = useCallback(
    (text: string, photoUris: string[]) => {
      if (!activePostKey) return;
      const now = Date.now();

      if (replyTarget) {
        const reply: FeedReply = {
          id: `reply-${now}`,
          author: "tu",
          text,
          likes: 0,
          minutesAgo: 0,
          createdAt: now,
          photos: photoUris,
        };
        addReply(replyTarget.id, reply);
      } else {
        const comment: FeedComment = {
          id: `comment-${activePostKey}-${now}`,
          author: "tu",
          text,
          likes: 0,
          minutesAgo: 0,
          createdAt: now,
          photos: photoUris,
          replies: [],
        };
        addComment(activePostKey, comment);
      }

      bumpCommentCount(activePostKey);
    },
    [activePostKey, addComment, addReply, bumpCommentCount, replyTarget],
  );

  const handleSendComment = useCallback(async () => {
    if (!activePostKey || !restaurant || !product) return;
    const hasText = commentDraft.trim().length > 0;
    if (!hasText && pendingPhotos.length === 0) return;

    runSmoothLayoutAnimation();
    const text = hasText ? commentDraft.trim() : "";
    const photoUris = pendingPhotos.map((photo) => photo.uri).filter((uri): uri is string => Boolean(uri));

    if (isServerBacked) {
      const parentId = replyTarget ? apiCommentIdFromFeedId(replyTarget.id) : null;

      try {
        if (replyTarget && !parentId) {
          throw new Error("Cannot persist replies to local comments.");
        }

        const savedComment = await productsApi.addComment(product.id, {
          text,
          parent: parentId,
          photo_urls: photoUris,
        });
        const mappedComment = mapApiComment(savedComment);
        setServerComments((current) => {
          const existingComments = current ?? [];
          return parentId
            ? appendServerReply(existingComments, apiCommentFeedId(parentId), mappedComment)
            : [mappedComment, ...existingComments];
        });
        const nextCount = (serverCommentCount ?? product.comments_count ?? 0) + 1;
        setServerCommentCount(nextCount);
        onProductSocialChange?.(product.id, { comments_count: nextCount });
      } catch {
        addLocalCommentOrReply(text, photoUris);
      }
    } else {
      addLocalCommentOrReply(text, photoUris);
    }

    setCommentDraft("");
    setPendingPhotos([]);
    setReplyTarget(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [
    activePostKey,
    addLocalCommentOrReply,
    commentDraft,
    isServerBacked,
    onProductSocialChange,
    pendingPhotos,
    product,
    replyTarget,
    restaurant,
    runSmoothLayoutAnimation,
    serverCommentCount,
  ]);

  const patchServerCommentLike = useCallback(
    (commentId: string, patch: Partial<Pick<FeedComment, "likes" | "isLiked">>) => {
      setServerComments((current) => (current ? updateServerComment(current, commentId, patch) : current));
    },
    [],
  );

  const handleToggleCommentReaction = useCallback(
    (comment: FeedReply, isReply = false) => {
      const apiCommentId = apiCommentIdFromFeedId(comment.id);
      if (!apiCommentId) {
        if (isReply) {
          toggleReplyLike(comment.id);
        } else {
          toggleCommentLike(comment.id);
        }
        return;
      }

      const wasLiked = Boolean(comment.isLiked);
      const previousLikes = comment.likes;
      const nextLiked = !wasLiked;
      patchServerCommentLike(comment.id, {
        isLiked: nextLiked,
        likes: Math.max(0, previousLikes + (nextLiked ? 1 : -1)),
      });

      productsApi
        .toggleCommentLike(apiCommentId)
        .then((summary) => {
          patchServerCommentLike(comment.id, {
            isLiked: summary.is_liked,
            likes: summary.likes_count,
          });
        })
        .catch(() => {
          patchServerCommentLike(comment.id, {
            isLiked: wasLiked,
            likes: previousLikes,
          });
        });
    },
    [patchServerCommentLike, toggleCommentLike, toggleReplyLike],
  );

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={closeSheet}>
      <View style={styles.commentsModalRoot}>
        <Pressable style={styles.commentsBackdrop} onPress={closeSheet} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? -13 : 0}
          style={styles.commentsKeyboardAvoider}
        >
          <View style={styles.commentsSheet}>
            <View pointerEvents="none" style={styles.commentsKeyboardFill} />
            {restaurant && product ? (
              <>
                <View style={styles.commentsHandle} />
                <Text style={styles.commentsTitle}>{compactCount(commentCount)} comentarii</Text>
                <View style={styles.commentsBody}>
                  <FlatList
                    data={commentsForSheet}
                    keyExtractor={(item) => item.id}
                    style={styles.commentsList}
                    contentContainerStyle={styles.commentsListContent}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    scrollIndicatorInsets={{ bottom: 72 }}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={<View style={styles.commentsFooterSpacer} />}
                    renderItem={({ item: comment }) => (
                      <Reanimated.View
                        style={styles.commentThread}
                        layout={LinearTransition.duration(220)}
                        entering={FadeIn.duration(180)}
                        exiting={FadeOut.duration(140)}
                      >
                        <View style={styles.commentRow}>
                          <View style={styles.commentAvatar}>
                            <Text style={styles.commentAvatarText}>{comment.author.slice(0, 1).toUpperCase()}</Text>
                          </View>
                          <View style={styles.commentBody}>
                            <View style={styles.commentTopRow}>
                              <Text style={styles.commentAuthor}>@{comment.author}</Text>
                              <Text style={styles.commentMeta}>
                                {formatCommentAge(minutesSinceCreated(comment.createdAt, comment.minutesAgo, commentClock))}
                              </Text>
                            </View>
                            {comment.text ? <Text style={styles.commentText}>{comment.text}</Text> : null}
                            {comment.photos?.length ? (
                              <Pressable
                                style={styles.commentPhotoPreviewWrap}
                                onPress={() => setGalleryViewer({ uris: comment.photos ?? [], initialIndex: 0 })}
                              >
                                <Image source={{ uri: comment.photos[0] }} style={styles.commentPhoto} />
                                {comment.photos.length > 1 ? (
                                  <View style={styles.commentPhotoOverlay}>
                                    <Text style={styles.commentPhotoOverlayText}>+{comment.photos.length - 1}</Text>
                                  </View>
                                ) : null}
                              </Pressable>
                            ) : null}
                            <View style={styles.commentActionsRow}>
                              <Pressable
                                style={styles.replyButton}
                                onPress={() => {
                                  setReplyTarget({ id: comment.id, author: comment.author });
                                  setCommentDraft(`@${comment.author} `);
                                }}
                              >
                                <Text style={styles.replyButtonText}>Raspunde</Text>
                              </Pressable>
                              {(comment.replies?.length ?? 0) > 0 ? (
                                <Pressable
                                  style={styles.viewRepliesButton}
                                  onPress={() => {
                                    runSmoothLayoutAnimation();
                                    setExpandedReplies((current) => ({
                                      ...current,
                                      [comment.id]: !current[comment.id],
                                    }));
                                  }}
                                >
                                  <Text style={styles.viewRepliesButtonText}>
                                    {expandedReplies[comment.id]
                                      ? "Ascunde raspunsuri"
                                      : `Vezi raspunsuri (${comment.replies?.length ?? 0})`}
                                  </Text>
                                </Pressable>
                              ) : null}
                            </View>
                          </View>
                          <Pressable style={styles.commentLikeCol} onPress={() => handleToggleCommentReaction(comment)}>
                            <Heart
                              size={14}
                              stroke={(comment.isLiked ?? likedComments[comment.id]) ? "#FF4D6D" : "#9DA3AF"}
                              fill={(comment.isLiked ?? likedComments[comment.id]) ? "#FF4D6D" : "transparent"}
                            />
                            <Text style={[styles.commentLikeCount, (comment.isLiked ?? likedComments[comment.id]) && styles.commentLikeCountActive]}>
                              {compactCount(
                                apiCommentIdFromFeedId(comment.id)
                                  ? comment.likes
                                  : comment.likes + (likedComments[comment.id] ? 1 : 0),
                              )}
                            </Text>
                          </Pressable>
                        </View>
                        {expandedReplies[comment.id]
                          ? comment.replies?.map((reply) => (
                            <Reanimated.View
                              key={reply.id}
                              style={styles.replyRow}
                              layout={LinearTransition.duration(220)}
                              entering={FadeIn.duration(180)}
                              exiting={FadeOut.duration(140)}
                            >
                              <View style={styles.replyAvatar}>
                                <Text style={styles.replyAvatarText}>{reply.author.slice(0, 1).toUpperCase()}</Text>
                              </View>
                              <View style={styles.replyBody}>
                                <View style={styles.commentTopRow}>
                                  <Text style={styles.replyAuthor}>@{reply.author}</Text>
                                  <Text style={styles.commentMeta}>
                                    {formatCommentAge(minutesSinceCreated(reply.createdAt, reply.minutesAgo, commentClock))}
                                  </Text>
                                </View>
                                {reply.text ? <Text style={styles.replyText}>{reply.text}</Text> : null}
                                {reply.photos?.length ? (
                                  <Pressable
                                    style={styles.replyPhotoPreviewWrap}
                                    onPress={() => setGalleryViewer({ uris: reply.photos ?? [], initialIndex: 0 })}
                                  >
                                    <Image source={{ uri: reply.photos[0] }} style={styles.replyPhoto} />
                                    {reply.photos.length > 1 ? (
                                      <View style={styles.replyPhotoOverlay}>
                                        <Text style={styles.replyPhotoOverlayText}>+{reply.photos.length - 1}</Text>
                                      </View>
                                    ) : null}
                                  </Pressable>
                                ) : null}
                                <Pressable
                                  style={styles.replyButton}
                                  onPress={() => {
                                    setReplyTarget({ id: comment.id, author: reply.author });
                                    setCommentDraft(`@${reply.author} `);
                                  }}
                                >
                                  <Text style={styles.replyButtonText}>Raspunde</Text>
                                </Pressable>
                              </View>
                              <Pressable style={styles.replyLikeCol} onPress={() => handleToggleCommentReaction(reply, true)}>
                                <Heart
                                  size={12}
                                  stroke={(reply.isLiked ?? likedReplies[reply.id]) ? "#FF4D6D" : "#9DA3AF"}
                                  fill={(reply.isLiked ?? likedReplies[reply.id]) ? "#FF4D6D" : "transparent"}
                                />
                                <Text style={[styles.replyLikeCount, (reply.isLiked ?? likedReplies[reply.id]) && styles.replyLikeCountActive]}>
                                  {compactCount(
                                    apiCommentIdFromFeedId(reply.id)
                                      ? reply.likes
                                      : reply.likes + (likedReplies[reply.id] ? 1 : 0),
                                  )}
                                </Text>
                              </Pressable>
                            </Reanimated.View>
                          ))
                          : null}
                      </Reanimated.View>
                    )}
                  />
                  <View style={styles.commentComposerWrap}>
                    {replyTarget ? (
                      <View style={styles.replyComposerBanner}>
                        <Text style={styles.replyComposerText}>Raspunzi lui @{replyTarget.author}</Text>
                        <Pressable
                          style={styles.replyComposerCancel}
                          onPress={() => {
                            setReplyTarget(null);
                            setCommentDraft("");
                          }}
                        >
                          <X size={12} stroke="#A7AFB8" />
                        </Pressable>
                      </View>
                    ) : null}
                    {pendingPhotos.length ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pendingPhotosRow}>
                        {pendingPhotos.map((photo) => (
                          <View key={photo.id} style={styles.pendingPhotoChip}>
                            {photo.uri ? <Image source={{ uri: photo.uri }} style={styles.pendingPhotoThumb} /> : null}
                            <Pressable onPress={() => setPendingPhotos((current) => current.filter((item) => item.id !== photo.id))}>
                              <X size={12} stroke="#A7AFB8" />
                            </Pressable>
                          </View>
                        ))}
                      </ScrollView>
                    ) : null}
                    <View style={styles.commentInputRow}>
                      <Pressable style={styles.commentComposerAction} onPress={handleAddPhoto}>
                        <ImagePlus size={18} stroke="#D1D5DB" />
                      </Pressable>
                      <TextInput
                        value={commentDraft}
                        onChangeText={setCommentDraft}
                        placeholder={replyTarget ? "Adauga un reply..." : "Adauga un comentariu..."}
                        placeholderTextColor="#9CA3AF"
                        style={styles.commentInput}
                      />
                      <Pressable
                        style={[
                          styles.commentSendButton,
                          commentDraft.trim().length === 0 && pendingPhotos.length === 0 && styles.commentSendButtonDisabled,
                        ]}
                        onPress={handleSendComment}
                      >
                        <Text style={styles.commentSendButtonText}>Send</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </>
            ) : null}
          </View>
        </KeyboardAvoidingView>
        {galleryViewer ? (
          <View style={styles.galleryModalRoot}>
            <Pressable style={styles.galleryBackdrop} onPress={() => setGalleryViewer(null)} />
            <Pressable style={styles.galleryCloseButton} onPress={() => setGalleryViewer(null)}>
              <X size={20} stroke="#FFFFFF" />
            </Pressable>
            <FlatList
              data={galleryViewer.uris}
              keyExtractor={(uri, index) => `${uri}-${index}`}
              horizontal
              pagingEnabled
              initialScrollIndex={galleryViewer.initialIndex}
              showsHorizontalScrollIndicator={false}
              getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
              renderItem={({ item: uri }) => (
                <View style={[styles.gallerySlide, { width: screenWidth }]}>
                  <Image source={{ uri }} style={styles.galleryImage} resizeMode="contain" />
                </View>
              )}
            />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  commentsModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  commentsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  commentsKeyboardAvoider: {
    flex: 1,
    justifyContent: "flex-end",
  },
  commentsSheet: {
    position: "relative",
    backgroundColor: "#0F0F10",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    height: "76%",
    paddingTop: 10,
    paddingBottom: 8,
  },
  commentsKeyboardFill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -260,
    height: 260,
    backgroundColor: "#0F0F10",
  },
  commentsHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.28)",
    marginBottom: 14,
  },
  commentsTitle: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 14,
  },
  commentsBody: {
    flex: 1,
  },
  commentsList: {
    flex: 1,
  },
  commentsListContent: {
    paddingHorizontal: 14,
    gap: 20,
    paddingBottom: 18,
  },
  commentsFooterSpacer: {
    height: 72,
  },
  commentThread: {
    gap: 10,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  commentAvatarText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13,
  },
  commentBody: {
    flex: 1,
    gap: 3,
  },
  commentTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commentAuthor: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  commentMeta: {
    color: "#9CA3AF",
    fontSize: 12,
  },
  commentText: {
    color: "#E5E7EB",
    fontSize: 14,
    lineHeight: 19,
  },
  commentPhotoPreviewWrap: {
    marginTop: 6,
    width: 112,
    height: 112,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  commentPhoto: {
    width: 112,
    height: 112,
    backgroundColor: "#1A1A1A",
  },
  commentPhotoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.48)",
    alignItems: "center",
    justifyContent: "center",
  },
  commentPhotoOverlayText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  commentActionsRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  replyButton: {
    alignSelf: "flex-start",
  },
  replyButtonText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700",
  },
  viewRepliesButton: {
    alignSelf: "flex-start",
  },
  viewRepliesButtonText: {
    color: "#60A5FA",
    fontSize: 12,
    fontWeight: "700",
  },
  replyRow: {
    marginLeft: 44,
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  replyAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#202124",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  replyAvatarText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 10,
  },
  replyBody: {
    flex: 1,
    gap: 3,
  },
  replyLikeCol: {
    minWidth: 32,
    alignItems: "center",
    gap: 3,
    paddingTop: 2,
  },
  replyLikeCount: {
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "600",
  },
  replyLikeCountActive: {
    color: "#FF4D6D",
  },
  replyAuthor: {
    color: "#F3F4F6",
    fontSize: 12,
    fontWeight: "700",
  },
  replyText: {
    color: "#D1D5DB",
    fontSize: 13,
    lineHeight: 18,
  },
  replyPhotoPreviewWrap: {
    marginTop: 6,
    width: 92,
    height: 92,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  replyPhoto: {
    width: 92,
    height: 92,
    backgroundColor: "#1A1A1A",
  },
  replyPhotoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.48)",
    alignItems: "center",
    justifyContent: "center",
  },
  replyPhotoOverlayText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  galleryModalRoot: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.96)",
    justifyContent: "center",
    zIndex: 100,
  },
  galleryBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  galleryCloseButton: {
    position: "absolute",
    top: 52,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  gallerySlide: {
    alignItems: "center",
    justifyContent: "center",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  commentLikeCol: {
    minWidth: 38,
    alignItems: "center",
    gap: 3,
    paddingTop: 2,
  },
  commentLikeCount: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "600",
  },
  commentLikeCountActive: {
    color: "#FF4D6D",
  },
  commentComposerWrap: {
    backgroundColor: "#0F0F10",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingTop: 8,
    paddingBottom: 8,
    marginBottom: 10,
  },
  replyComposerBanner: {
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: "#1B1B1C",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  replyComposerText: {
    flex: 1,
    color: "#D1D5DB",
    fontSize: 12,
    fontWeight: "700",
  },
  replyComposerCancel: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#252629",
  },
  pendingPhotosRow: {
    paddingHorizontal: 14,
    gap: 8,
    paddingBottom: 8,
  },
  pendingPhotoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#202124",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pendingPhotoThumb: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  commentInputRow: {
    marginHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "#1B1B1C",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commentComposerAction: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#252629",
  },
  commentInput: {
    flex: 1,
    color: colors.white,
    fontSize: 14,
    paddingVertical: 8,
  },
  commentSendButton: {
    backgroundColor: "#22C55E",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  commentSendButtonDisabled: {
    opacity: 0.45,
  },
  commentSendButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },
});
