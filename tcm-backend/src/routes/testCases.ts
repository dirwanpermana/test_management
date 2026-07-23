import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { paramStr } from '../utils/params';
import * as service from '../services/testCaseService';

export const testCaseRouter = Router();
testCaseRouter.use(authenticate);

const headerSchema = z.object({
  namaTestCase: z.string().min(1),
  jiraUrl: z.string().url().optional().or(z.literal('')),
  namaMenu: z.string().min(1),
});

testCaseRouter.get('/test-case-headers', asyncHandler(async (_req, res) => {
  res.json(await service.listHeaders());
}));

testCaseRouter.post('/test-case-headers', requireRole('QA'), asyncHandler(async (req, res) => {
  const parsed = headerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Payload tidak valid', errors: parsed.error.flatten() });
  const header = await service.createHeader({ ...parsed.data, createdBy: req.auth!.sub });
  return res.status(201).json(header);
}));

testCaseRouter.get('/test-case-items', asyncHandler(async (req, res) => {
  const headerId = typeof req.query.headerId === 'string' ? req.query.headerId : undefined;
  res.json(await service.listItems(headerId));
}));

const itemSchema = z.object({
  featureName: z.string().min(1),
  testType: z.enum(['Positive', 'Negative']),
  scenario: z.string().min(1),
  steps: z.string().min(1),
  testData: z.string().optional(),
  expectedResult: z.string().min(1),
  status: z.enum(['Not Executed', 'Pass', 'Fail', 'Blocked', 'On Hold']).optional(),
  picQa: z.string().uuid().optional(),
  testDate: z.string().optional(),
  note: z.string().optional(),
  picDev: z.string().uuid().optional(),
  devArea: z.enum(['FE', 'BE']).optional(),
});

testCaseRouter.post('/test-case-headers/:headerId/items', requireRole('QA'), asyncHandler(async (req, res) => {
  const headerId = paramStr(req.params.headerId);
  const header = await service.findHeaderById(headerId);
  if (!header) return res.status(404).json({ message: 'Header tidak ditemukan' });

  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Payload tidak valid', errors: parsed.error.flatten() });

  const item = await service.createItem(headerId, {
    ...parsed.data,
    picQa: parsed.data.picQa ?? req.auth!.sub,
  });
  return res.status(201).json(item);
}));

const updateItemSchema = itemSchema.partial();

testCaseRouter.put('/test-case-items/:id', requireRole('QA'), asyncHandler(async (req, res) => {
  const parsed = updateItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Payload tidak valid', errors: parsed.error.flatten() });
  const updated = await service.updateItem(paramStr(req.params.id), parsed.data);
  if (!updated) return res.status(404).json({ message: 'Test case item tidak ditemukan' });
  return res.json(updated);
}));

testCaseRouter.delete('/test-case-items/:id', requireRole('QA'), asyncHandler(async (req, res) => {
  const deleted = await service.deleteItem(paramStr(req.params.id));
  if (!deleted) return res.status(404).json({ message: 'Test case item tidak ditemukan' });
  return res.status(204).send();
}));
