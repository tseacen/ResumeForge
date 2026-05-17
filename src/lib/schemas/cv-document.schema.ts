import { z } from "zod";

export const CvLineStatusSchema = z.enum(["proven", "rewritten", "added", "blocked"]);
export type CvLineStatus = z.infer<typeof CvLineStatusSchema>;

export const CvLineSchema = z.object({
  id: z.string(),
  text: z.string(),
  originalText: z.string().optional(),
  status: CvLineStatusSchema.default("proven"),
  sourceFactIds: z.array(z.string()).default([]),
  auditId: z.string().optional(),
});

export type CvLine = z.infer<typeof CvLineSchema>;

export const CvSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.enum(["summary", "experience", "skills", "projects", "education", "other"]),
  lines: z.array(CvLineSchema),
});

export type CvSection = z.infer<typeof CvSectionSchema>;

export const CvDocumentSchema = z.object({
  name: z.string().default("Candidate"),
  headline: z.string().optional(),
  contact: z.array(z.string()).default([]),
  sections: z.array(CvSectionSchema),
});

export type CvDocument = z.infer<typeof CvDocumentSchema>;
