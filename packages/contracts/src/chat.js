"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatRequestSchema = exports.ChatMetadataSchema = exports.CategoryEnum = exports.DifficultyEnum = void 0;
const zod_1 = require("zod");
exports.DifficultyEnum = zod_1.z.enum(['하', '중', '상']);
exports.CategoryEnum = zod_1.z.enum(['금융경제용어', '재무제표']);
exports.ChatMetadataSchema = zod_1.z
    .object({
    source: zod_1.z.string().optional(),
    topic: zod_1.z.string().optional(),
    model: zod_1.z.string().optional(),
    difficulty: exports.DifficultyEnum.optional(),
    category: exports.CategoryEnum.optional()
})
    .optional();
exports.ChatRequestSchema = zod_1.z.object({
    conversationId: zod_1.z.string().min(1).optional(),
    message: zod_1.z.string().trim().min(1, 'message is required'),
    metadata: exports.ChatMetadataSchema
});
