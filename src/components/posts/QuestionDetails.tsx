import { Box, Heading, HStack, Stack } from '@chakra-ui/react';
import parse from 'html-react-parser';
import { TagList } from './TagList';
import { UserBadge } from './UserBadge';
import { CommentListItem } from '../comments/CommentListItem';
import { CommentForm } from '../comments/CommentForm';
import { QuestionDetailsType } from '../../interfaces/QuestionDetailsType';
import stackoverflow from '../../unitls/stackexchange-api';
import { useEffect, useState } from 'react';
import { CommentType } from '../../interfaces/CommentType';
import { VotingControls } from './VotingControls';
import parseBody from '../../unitls/parse-body';

type Props = {
  question: QuestionDetailsType;
};

export function QuestionDetails({ question }: Props) {
  const [isCommentsLoading, setIsCommentsLoading] = useState(true);
  const [comments, setComments] = useState<CommentType[]>([]);
  console.log('render');

  useEffect(() => {
    stackoverflow
      .get(`questions/${question.question_id}/comments`, {
        order: 'asc',
        sort: 'creation',
        filter: '!1zI5*cxyWVN7GRZNZpt2O'
      })
      .then((response) => {
        setComments((response as any).items);
        setIsCommentsLoading(false);
      });
  }, []);

  return (
    <HStack spacing="12px" align="start">
      <VotingControls score={question.score} />

      {/* overflow needed here to prevent child has more width than parent */}
      <Box overflow="auto">
        <Heading size="md" mb="12px" maxWidth="800px">
          {parse(question.title)}
        </Heading>
        <Box className="stackoverflow_question-body" fontFamily="Georgia" fontSize="16px">
          {parseBody(question.body)}
        </Box>

        <HStack id="question-sticky-trigger" my="24px" justify="space-between" align="flex-start" fontSize="13px">
          <Box>
            <TagList tags={question.tags} />
          </Box>

          <UserBadge type="question" datetime={question.creation_date} user={question.owner} />
        </HStack>

        {!isCommentsLoading && (
          <Stack spacing="8px" borderTop="1px solid" borderColor="gray.200" pt="8px">
            {comments.map((comment) => (
              <CommentListItem comment={comment} key={comment.comment_id} />
            ))}
            <CommentForm olderCommentsCount={comments.length} />
          </Stack>
        )}
      </Box>
    </HStack>
  );
}