import { useEffect, useState } from 'react'
import {
  type QuestionTypeAccessTier,
  DEFAULT_ENABLED_QUESTION_TYPE_IDS,
  QUESTION_TYPE_DEFAULT_ACCESS_BY_TYPE,
  QUESTION_TYPE_DEFAULT_TITLES,
  type QuestionTypeId,
} from '../../../config/questionTypes'
import { subscribeQuestionTypeSettings, updateQuestionTypeSettings } from '../../../lib/adminRepo'

interface State {
  enabledQuestionTypeIds: QuestionTypeId[]
  titlesByType: Record<QuestionTypeId, string>
  accessByType: Record<QuestionTypeId, QuestionTypeAccessTier>
  updatedAt?: { toDate(): Date }
}

const DEFAULT_STATE: State = {
  enabledQuestionTypeIds: [...DEFAULT_ENABLED_QUESTION_TYPE_IDS],
  titlesByType: { ...QUESTION_TYPE_DEFAULT_TITLES },
  accessByType: { ...QUESTION_TYPE_DEFAULT_ACCESS_BY_TYPE },
}

export function useQuestionTypeSettings() {
  const [state, setState] = useState<State>(DEFAULT_STATE)

  useEffect(() => {
    return subscribeQuestionTypeSettings((settings) => {
      setState({
        enabledQuestionTypeIds: settings.enabledQuestionTypeIds,
        titlesByType: settings.titlesByType,
        accessByType: settings.accessByType,
        updatedAt: settings.updatedAt,
      })
    })
  }, [])

  const save = async (
    nextEnabled: QuestionTypeId[],
    nextTitlesByType: Record<QuestionTypeId, string>,
    nextAccessByType: Record<QuestionTypeId, QuestionTypeAccessTier>,
    uid?: string,
  ) => {
    await updateQuestionTypeSettings(nextEnabled, nextTitlesByType, nextAccessByType, uid)
  }

  return { ...state, save }
}
