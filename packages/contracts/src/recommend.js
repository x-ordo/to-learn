"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendResponseSchema = exports.RecommendItemSchema = exports.RecommendRequestSchema = exports.RecommendProviderEnum = void 0;
const zod_1 = require("zod");
exports.RecommendProviderEnum = zod_1.z.enum(['tavily', 'dart', 'kif_edu']);
exports.RecommendRequestSchema = zod_1.z
    .object({
    topic: zod_1.z.string().trim().min(1).optional(),
    keywords: zod_1.z.array(zod_1.z.string().trim().min(1)).min(1).max(8).optional(),
    limit: zod_1.z.number().int().min(1).max(5).default(3).optional(),
    providers: zod_1.z.array(exports.RecommendProviderEnum).min(1).optional()
})
    .refine((data) => Boolean(data.topic) || Boolean(data.keywords?.length), {
    message: 'Provide at least a topic or one keyword.',
    path: ['topic']
});
exports.RecommendItemSchema = zod_1.z.object({
    source: exports.RecommendProviderEnum,
    title: zod_1.z.string().trim().min(1),
    description: zod_1.z.string().trim().min(1),
    link: zod_1.z.string().url(),
    reason: zod_1.z.string().trim().min(1),
    verified: zod_1.z.boolean(),
    meta: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional()
});
exports.RecommendResponseSchema = zod_1.z.object({
    items: zod_1.z.array(exports.RecommendItemSchema).min(1)
});
