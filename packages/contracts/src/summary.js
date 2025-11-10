"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummaryResponseSchema = exports.SummaryRequestSchema = void 0;
const zod_1 = require("zod");
exports.SummaryRequestSchema = zod_1.z.object({
    text: zod_1.z.string().trim().min(1, 'text is required'),
    maxSentences: zod_1.z
        .number()
        .int()
        .min(1)
        .max(5)
        .default(5)
        .optional()
});
exports.SummaryResponseSchema = zod_1.z.object({
    summary: zod_1.z
        .array(zod_1.z.string().trim().min(1))
        .min(1, 'at least one summary line is required')
        .max(5, 'summary must be within five lines')
});
