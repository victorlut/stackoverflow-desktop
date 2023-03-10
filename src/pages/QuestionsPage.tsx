import { useEffect } from 'react';
import { QuestionListItem } from '../components/posts/QuestionListItem';
import { Box, Button, ButtonGroup, Flex, Stack } from '@chakra-ui/react';
import { QuestionListItemSkeleton } from '../components/posts/QuestionListItem.skeleton';
import { usePagination } from '../hooks/use-pagination';
import { Pagination } from '../components/ui/Pagination';
import { useStores } from '../models';
import { observer } from 'mobx-react-lite';
import { getSnapshot } from 'mobx-state-tree';

export const QuestionsPage = observer(() => {
  const { questionStore } = useStores();
  const pagination = usePagination();

  useEffect(() => {
    questionStore.getQuestions(questionStore.questionsFilter, pagination);
  }, [questionStore.questionsFilter, pagination.page, pagination.perPage]);

  return (
    <>
      <Flex justify="space-between" mb="16px">
        <ButtonGroup size="xs" isAttached variant="outline">
          <Button
            isActive={questionStore.questionsFilter === 'interesting'}
            onClick={() => questionStore.setQuestionsFilter('interesting')}
            mr="-px"
          >
            Interesting
          </Button>
          <Button
            isActive={questionStore.questionsFilter === 'bountied'}
            onClick={() => questionStore.setQuestionsFilter('bountied')}
            mr="-px"
          >
            Bountied
          </Button>
          <Button
            isActive={questionStore.questionsFilter === 'hot'}
            onClick={() => questionStore.setQuestionsFilter('hot')}
          >
            Hot
          </Button>
        </ButtonGroup>
      </Flex>

      <Stack spacing="8px">
        {/* Skeletons */}
        {questionStore.isQuestionsFetching &&
          [...Array(pagination.perPage)].map((_, index) => <QuestionListItemSkeleton key={index} />)}

        {!questionStore.isQuestionsFetching &&
          questionStore.questions.map((question) => (
            <QuestionListItem item={question} key={question.question_id} />
          ))}
      </Stack>

      {pagination.totalPages > 0 && (
        <Box my="16px">
          <Pagination controller={pagination} />
        </Box>
      )}
    </>
  );
});
