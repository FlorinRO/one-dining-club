import { create } from "zustand";

import { FeedComment, FeedReply } from "../lib/feedSocial";

type CommentsState = {
  commentBumps: Record<string, number>;
  commentRepliesByComment: Record<string, FeedReply[]>;
  likedComments: Record<string, boolean>;
  likedReplies: Record<string, boolean>;
  userCommentsByPost: Record<string, FeedComment[]>;
  addComment: (postKey: string, comment: FeedComment) => void;
  addReply: (commentId: string, reply: FeedReply) => void;
  bumpCommentCount: (postKey: string) => void;
  toggleCommentLike: (commentId: string) => void;
  toggleReplyLike: (replyId: string) => void;
};

export const useCommentsStore = create<CommentsState>((set) => ({
  commentBumps: {},
  commentRepliesByComment: {},
  likedComments: {},
  likedReplies: {},
  userCommentsByPost: {},
  addComment: (postKey, comment) =>
    set((state) => ({
      userCommentsByPost: {
        ...state.userCommentsByPost,
        [postKey]: [comment, ...(state.userCommentsByPost[postKey] ?? [])],
      },
    })),
  addReply: (commentId, reply) =>
    set((state) => ({
      commentRepliesByComment: {
        ...state.commentRepliesByComment,
        [commentId]: [reply, ...(state.commentRepliesByComment[commentId] ?? [])],
      },
    })),
  bumpCommentCount: (postKey) =>
    set((state) => ({
      commentBumps: {
        ...state.commentBumps,
        [postKey]: (state.commentBumps[postKey] ?? 0) + 1,
      },
    })),
  toggleCommentLike: (commentId) =>
    set((state) => ({
      likedComments: {
        ...state.likedComments,
        [commentId]: !state.likedComments[commentId],
      },
    })),
  toggleReplyLike: (replyId) =>
    set((state) => ({
      likedReplies: {
        ...state.likedReplies,
        [replyId]: !state.likedReplies[replyId],
      },
    })),
}));
