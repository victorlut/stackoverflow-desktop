import { Box, Heading, HStack, useToast } from '@chakra-ui/react';
import parse from 'html-react-parser';
import { TagList } from '../tags/TagList';
import { PostProfileBadge } from '../profile/PostProfileBadge';
import { useEffect, useState } from 'react';
import { VotingControls } from './VotingControls';
import parseBody from '../../uitls/parse-body';
import { CommentList } from '../comments/CommentList';
import { useUser } from '../../contexts/use-user';
import stackoverflow from '../../uitls/stackexchange-api';
import { clone } from 'lodash';
import { promiser } from '../../uitls/promiser';
import { ResponseType } from '../../interfaces/Response';
import { decodeEntity } from '../../uitls/decode-entities';
import { QuestionType } from '../../models/question-store/question';
import { CommentType } from '../../models/comment-store/comment';
import { Callout } from '../ui/Callout';
import { Bounty } from '../ui/Bounty';
import dayjs from 'dayjs';

type Props = {
  question: QuestionType;
};

export function QuestionDetails({ question }: Props) {
  const toast = useToast();
  const user = useUser();
  const [score, setScore] = useState<number>(question.score);
  const [isBookmarked, setIsBookmarked] = useState(question.favorited);
  const [bookmarkCount, setBookmarkCount] = useState(question.favorite_count);
  const [comments, setComments] = useState<CommentType[]>(question.comments || []);
  const [isUpvoted, setIsUpvoted] = useState<boolean | undefined>(question.upvoted);
  const [isDownvoted, setIsDownvoted] = useState<boolean | undefined>(question.downvoted);

  useEffect(() => {
    setScore(question.score);
    setIsUpvoted(question.upvoted);
    setIsDownvoted(question.downvoted);
  }, [question.score]);

  async function handleUpvote() {
    if (isDownvoted) {
      await handleUndownvote();
    }

    setScore(score + 1);
    setIsUpvoted(true);

    const response: QuestionType = await stackoverflow
      .post(`questions/${question.question_id}/upvote`, {
        filter: '!)fHrHyZKQR.5Q9a'
      })
      .then((r: any) => r.items[0]);

    setIsUpvoted(response.upvoted);
    setScore(response.score);
  }

  async function handleUnupvote() {
    setScore(score - 1);
    setIsUpvoted(false);

    const response: QuestionType = await stackoverflow
      .post(`questions/${question.question_id}/upvote/undo`, {
        filter: '!)fHrHyZKQR.5Q9a'
      })
      .then((r: any) => r.items[0]);

    setIsUpvoted(response.upvoted);
    setScore(response.score);
  }

  async function handleDownvote() {
    if (isUpvoted) {
      await handleUnupvote();
    }

    setScore(score - 1);
    setIsDownvoted(true);

    const response: QuestionType = await stackoverflow
      .post(`questions/${question.question_id}/downvote`, {
        filter: '!)fHrHyZKQR.5Q9a'
      })
      .then((r: any) => r.items[0]);

    setIsDownvoted(response.downvoted);
    setScore(response.score);
  }

  async function handleUndownvote() {
    setScore(score + 1);
    setIsDownvoted(false);

    const response: QuestionType = await stackoverflow
      .post(`questions/${question.question_id}/downvote/undo`, {
        filter: '!)fHrHyZKQR.5Q9a'
      })
      .then((r: any) => r.items[0]);

    setIsDownvoted(response.downvoted);
    setScore(response.score);
  }

  function handleToggleBookmark() {
    const oldValue = isBookmarked;
    const newValue = !isBookmarked;

    setIsBookmarked(newValue);
    setBookmarkCount(bookmarkCount + (oldValue ? -1 : 1));
    updateSidebarCount(newValue);
    requestToggleBookmark(newValue);
  }

  function handleCommentAdd(comment: CommentType) {
    setComments([...comments, comment]);
  }

  // TODO move this to MST
  async function handleCommentUpvote(comment: CommentType) {
    const oldComment = clone(comment);
    const action = comment.upvoted ? 'upvote/undo' : 'upvote';

    // Optimistic UI
    updateComment(
      comment,
      comment.upvoted ? { score: comment.score - 1, upvoted: false } : { score: comment.score + 1, upvoted: true }
    );

    // Pessimistic UI
    const [response, error] = await promiser<ResponseType<CommentType>>(
      stackoverflow.post(`comments/${comment.comment_id}/${action}`)
    );

    updateComment(comment, error ? oldComment : response.items[0]);

    if (error?.data?.error_message) {
      toast({
        position: 'top',
        description: decodeEntity(error.data.error_message),
        status: 'error',
        duration: 3000
      });
    }
  }

  function updateComment(comment: CommentType, data: Partial<CommentType> = {}) {
    const _comments = clone(comments);
    const foundComment = _comments.find((c) => c.comment_id === comment.comment_id) as CommentType;
    Object.assign(foundComment, data);

    setComments(_comments);
  }

  function updateSidebarCount(isBookmarked: boolean) {
    user.setSidebarCounts({ ...user.sidebarCounts, bookmarks: user.sidebarCounts.bookmarks + (isBookmarked ? 1 : -1) });
  }

  function requestToggleBookmark(value: boolean) {
    const url = value
      ? `questions/${question.question_id}/favorite`
      : `questions/${question.question_id}/favorite/undo`;

    stackoverflow.post(url, {});
  }

  return (
    <HStack spacing="12px" align="start">
      <VotingControls
        postType="question"
        isBookmarked={isBookmarked}
        bookmarkCount={bookmarkCount}
        score={score}
        isUpvoted={isUpvoted}
        isDownvoted={isDownvoted}
        onUpvote={handleUpvote}
        onUnupvote={handleUnupvote}
        onDownvote={handleDownvote}
        onUndownvote={handleUndownvote}
        onToggleBookmark={handleToggleBookmark}
      />

      {/* overflow needed here to prevent child has more width than parent */}
      <Box flexGrow={1} overflow="auto" p="2px" m="-2px">
        <Heading size="md" mb="12px" maxWidth="800px">
          {parse(question.title)}
        </Heading>

        {question.bounty_amount && (
          <Callout>
            The bounty expires <b>{dayjs().to(dayjs.unix(question.bounty_closes_date!))}</b>. Answers to this question
            are eligible for a <Bounty amount={question.bounty_amount} /> reputation bounty.
          </Callout>
        )}

        <Box className="stackoverflow_question-body" fontFamily="Georgia" fontSize="16px">
          {parseBody(question.body)}
        </Box>

        <HStack id="question-sticky-trigger" my="24px" justify="space-between" align="flex-start" fontSize="13px">
          <Box>
            <TagList tags={question.tags} />
          </Box>

          <PostProfileBadge type="question" datetime={question.creation_date} user={question.owner} />
        </HStack>

        <CommentList
          comments={comments}
          postId={question.question_id}
          onAdd={handleCommentAdd}
          onUpvote={handleCommentUpvote}
        />
      </Box>
    </HStack>
  );
}
