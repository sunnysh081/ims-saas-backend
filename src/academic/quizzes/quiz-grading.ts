import type { QuestionType } from './dto/quiz.dto';

export type GradableQuestion = {
  id: string;
  type: QuestionType;
  text: string;
  position: number;
  maxMarks: string;
  allowNegativeMarking: boolean;
  negativeMarks: string;
  answerData: unknown;
};

type AnswerData = {
  options?: { text: string; isCorrect: boolean }[];
  correct?: boolean;
  blanks?: string[];
  pairs?: { left: string; right: string }[];
};

export type GradeResult = { marks: number | null; isCorrect: boolean | null };

const round2 = (value: number) => Math.round(value * 100) / 100;

const isIndexList = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((item) => Number.isInteger(item));

// Turns whatever the client sent into the stored shape for the type, or null if unanswered/invalid.
export function sanitizeAnswer(question: GradableQuestion, raw: unknown): unknown {
  const answer = (raw ?? {}) as Record<string, unknown>;
  const key = question.answerData as AnswerData;

  switch (question.type) {
    case 'MCQ_SINGLE': {
      const selected = answer.selected;

      return Number.isInteger(selected) && (key.options ?? [])[selected as number] ? { selected } : null;
    }
    case 'MCQ_MULTIPLE': {
      const optionCount = (key.options ?? []).length;

      if (!isIndexList(answer.selected)) {
        return null;
      }

      const selected = [...new Set(answer.selected)].filter((index) => index >= 0 && index < optionCount);

      return selected.length ? { selected } : null;
    }
    case 'TRUE_FALSE':
      return typeof answer.value === 'boolean' ? { value: answer.value } : null;
    case 'BLANKS': {
      const total = (key.blanks ?? []).length;

      if (!Array.isArray(answer.answers)) {
        return null;
      }

      const answers = Array.from({ length: total }, (_, index) => {
        const value = (answer.answers as unknown[])[index];

        return typeof value === 'string' ? value.trim().slice(0, 500) : '';
      });

      return answers.some((value) => value.length) ? { answers } : null;
    }
    case 'MATCH': {
      const pairCount = (key.pairs ?? []).length;

      if (!Array.isArray(answer.matches)) {
        return null;
      }

      const matches = Array.from({ length: pairCount }, (_, index) => {
        const value = (answer.matches as unknown[])[index];

        return Number.isInteger(value) && (value as number) >= 0 && (value as number) < pairCount ? (value as number) : null;
      });

      return matches.some((value) => value !== null) ? { matches } : null;
    }
    default: {
      const text = typeof answer.text === 'string' ? answer.text.trim().slice(0, 10_000) : '';

      return text ? { text } : null;
    }
  }
}

export function gradeQuestion(question: GradableQuestion, answer: unknown): GradeResult {
  const max = Number(question.maxMarks);
  const penalty = question.allowNegativeMarking ? Number(question.negativeMarks) : 0;
  const key = question.answerData as AnswerData;
  const given = answer as Record<string, unknown> | null;

  if (question.type === 'SUBJECTIVE' || question.type === 'ESSAY') {
    // Nothing written means nothing to mark; otherwise staff award the marks.
    return given ? { marks: null, isCorrect: null } : { marks: 0, isCorrect: null };
  }

  if (!given) {
    return { marks: 0, isCorrect: null };
  }

  switch (question.type) {
    case 'MCQ_SINGLE': {
      const correct = (key.options ?? [])[given.selected as number]?.isCorrect === true;

      return { marks: correct ? max : -penalty, isCorrect: correct };
    }
    case 'MCQ_MULTIPLE': {
      const expected = (key.options ?? []).flatMap((option, index) => (option.isCorrect ? [index] : []));
      const selected = given.selected as number[];
      const correct = expected.length === selected.length && expected.every((index) => selected.includes(index));

      return { marks: correct ? max : -penalty, isCorrect: correct };
    }
    case 'TRUE_FALSE': {
      const correct = given.value === key.correct;

      return { marks: correct ? max : -penalty, isCorrect: correct };
    }
    case 'BLANKS': {
      const blanks = key.blanks ?? [];
      const answers = given.answers as string[];
      const right = blanks.filter((expected, index) => answers[index]?.toLowerCase() === expected.trim().toLowerCase()).length;

      return { marks: round2((max * right) / Math.max(blanks.length, 1)), isCorrect: right === blanks.length };
    }
    case 'MATCH': {
      const matches = given.matches as (number | null)[];
      const right = matches.filter((value, index) => value === index).length;

      return { marks: round2((max * right) / Math.max(matches.length, 1)), isCorrect: right === matches.length };
    }
    default:
      return { marks: 0, isCorrect: null };
  }
}

function seedFrom(text: string) {
  let hash = 1779033703 ^ text.length;

  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return hash >>> 0;
}

// Deterministic per attempt, so a refresh shows the same order.
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let state = seedFrom(seed);
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target]!, result[index]!];
  }

  return result;
}

export function reviewQuestions(
  questions: (GradableQuestion & { courseOutcomes?: string[]; btLevel?: string | null })[],
  answers: { questionId: string; answer: unknown; marksAwarded: string | null; isCorrect: boolean | null }[],
) {
  const byQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));

  return questions.map((question) => {
    const stored = byQuestion.get(question.id);
    const key = question.answerData as AnswerData;

    return {
      id: question.id,
      type: question.type,
      text: question.text,
      maxMarks: Number(question.maxMarks),
      options: key.options,
      correct: key.correct,
      blanks: key.blanks,
      pairs: key.pairs,
      answer: stored?.answer ?? null,
      marksAwarded: stored?.marksAwarded == null ? null : Number(stored.marksAwarded),
      isCorrect: stored?.isCorrect ?? null,
      isManual: question.type === 'SUBJECTIVE' || question.type === 'ESSAY',
    };
  });
}
