"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizResponseSchema = exports.QuizProblemSchema = exports.QuizRequestSchema = exports.QuizTypeEnum = void 0;
const zod_1 = require("zod");
exports.QuizTypeEnum = zod_1.z.enum(['objective', 'subjective']);
exports.QuizRequestSchema = zod_1.z.object({
    text: zod_1.z.string().trim().min(1, 'text is required'),
    type: exports.QuizTypeEnum.default('objective'),
    count: zod_1.z.number().int().min(3).max(5).default(3)
});
const normalizeQuizType = (value) => {
    if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower.includes('객관') || lower === 'objective') {
            return 'objective';
        }
        if (lower.includes('주관') || lower === 'subjective') {
            return 'subjective';
        }
    }
    return value;
};
exports.QuizProblemSchema = zod_1.z
    .object({
    type: zod_1.z.preprocess(normalizeQuizType, exports.QuizTypeEnum),
    question: zod_1.z.string().trim().min(1),
    choices: zod_1.z.array(zod_1.z.string().trim().min(1)).min(2).max(5).optional(),
    answer: zod_1.z.string().trim().min(1),
    explanation: zod_1.z.string().trim().min(1)
})
    .superRefine((problem, ctx) => {
    if (problem.type === 'objective' && (!problem.choices || problem.choices.length < 2)) {
        ctx.addIssue({
            path: ['choices'],
            code: zod_1.z.ZodIssueCode.custom,
            message: 'Objective problems require at least two choices.'
        });
    }
});
exports.QuizResponseSchema = zod_1.z.object({
    problems: zod_1.z.array(exports.QuizProblemSchema).min(1)
});
