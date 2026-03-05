import { z } from 'zod';

export const leadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(5, "Phone number is too short"),
  email: z.string().email().optional().nullable(),
  notes: z.string().optional().nullable(),
  agent_id: z.number().optional().nullable(),
  status: z.string().optional(),
  temperature: z.string().optional(),
  ai_score: z.number().optional()
});

export const agentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(['Agent', 'Admin', 'Manager']).default('Agent'),
  status: z.enum(['Active', 'Inactive']).default('Active').optional()
});

export const callSchema = z.object({
  lead_id: z.number(),
  duration: z.number(),
  outcome: z.string(),
  sentiment: z.string().optional(),
  transcription: z.string().optional(),
  tags: z.string().optional(),
  agent_id: z.number().optional().nullable()
});

export const followupSchema = z.object({
  lead_id: z.number(),
  scheduled_at: z.string().datetime(),
  notes: z.string().optional(),
  agent_id: z.number().optional().nullable()
});
