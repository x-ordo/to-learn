"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QnaResponseSchema = exports.QnaItemSchema = exports.QnaRequestSchema = void 0;
const zod_1 = require("zod");
const SummaryLineSchema = zod_1.z.string().trim().min(1);
exports.QnaRequestSchema = zod_1.z
    .object({
    text: zod_1.z.string().trim().min(1).optional(),
    summary: zod_1.z
        .array(SummaryLineSchema)
        .min(1, 'summary requires at least one line')
        .max(5, 'summary must be within five lines')
        .optional(),
    count: zod_1.z.number().int().min(1).max(10).default(3).optional()
})
    .refine((data) => (data.text && data.text.length > 0) || (data.summary && data.summary.length > 0), {
    message: 'Either `text` or `summary` must be provided.',
    path: ['text']
});
exports.QnaItemSchema = zod_1.z.object({
    q: zod_1.z.string().trim().min(1),
    a: zod_1.z.string().trim().min(1)
});
exports.QnaResponseSchema = zod_1.z.object({
    items: zod_1.z.array(exports.QnaItemSchema).min(1)
});
