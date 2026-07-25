import fs from 'node:fs';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { upload } from '../middleware/upload';
import { paramStr } from '../utils/params';
import * as service from '../services/bugService';

export const bugRouter = Router();
bugRouter.use(authenticate);

bugRouter.get('/bugs', asyncHandler(async (_req, res) => {
  res.json(await service.listBugs());
}));

bugRouter.get('/bugs/:id', asyncHandler(async (req, res) => {
  const id = paramStr(req.params.id);
  const bug = await service.getBugById(id);
  if (!bug) return res.status(404).json({ message: 'Bug tidak ditemukan' });
  const [comments, history] = await Promise.all([
    service.getComments(id),
    service.getHistory(id),
  ]);
  return res.json({ bug, comments, history });
}));

const createBugSchema = z.object({
  testCaseNo: z.string().optional(),
  scenario: z.string().min(1),
  stepsToReproduce: z.string().min(1),
  expectedResult: z.string().min(1),
  actualResult: z.string().min(1),
  assignedTo: z.string().uuid().optional(),
  severity: z.enum(['Critical', 'Major', 'Medium', 'Low']).default('Medium'),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']).default('Medium'),
  status: z.enum([
     'Open', 'On Progress Dev', 'Ready to Test', 'On Progress QA',
     'Reopen', 'Close', 'Take Out', 'Hold',
   ]).optional(),
});

bugRouter.post('/bugs', requireRole('QA'), asyncHandler(async (req, res) => {
  const parsed = createBugSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Payload tidak valid', errors: parsed.error.flatten() });
  const bug = await service.createBug({ ...parsed.data, reporterId: req.auth!.sub });
  return res.status(201).json(bug);
}));

const statusSchema = z.object({
  status: z.enum([
    'Open', 'On Progress Dev', 'Ready to Test', 'On Progress QA',
    'Reopen', 'Close', 'Take Out', 'Hold',
  ]),
});

bugRouter.patch('/bugs/:id/status', asyncHandler(async (req, res) => {
  const id = paramStr(req.params.id);
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Payload tidak valid', errors: parsed.error.flatten() });

  const bug = await service.getBugById(id);
  if (!bug) return res.status(404).json({ message: 'Bug tidak ditemukan' });

  const allowed = await service.isTransitionAllowed(bug.status, parsed.data.status, req.auth!.role);
  if (!allowed) {
    return res.status(403).json({
      message: `Transisi status '${bug.status}' -> '${parsed.data.status}' tidak diizinkan untuk role ${req.auth!.role}`,
    });
  }

  const updated = await service.changeStatus(id, parsed.data.status, req.auth!.sub);
  return res.json(updated);
}));

const commentSchema = z.object({ comment: z.string().min(1) });

bugRouter.post('/bugs/:id/comments', asyncHandler(async (req, res) => {
  const id = paramStr(req.params.id);
  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Payload tidak valid', errors: parsed.error.flatten() });

  const bug = await service.getBugById(id);
  if (!bug) return res.status(404).json({ message: 'Bug tidak ditemukan' });

  const comment = await service.addComment(id, req.auth!.sub, parsed.data.comment);
  return res.status(201).json(comment);
}));

bugRouter.post('/bugs/:id/attachments', upload.single('file'), asyncHandler(async (req, res) => {
  const id = paramStr(req.params.id);
  const exists = await service.bugExists(id);
  if (!exists) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(404).json({ message: 'Bug tidak ditemukan' });
  }
  if (!req.file) {
    return res.status(400).json({ message: 'File tidak ditemukan pada request (field name harus "file")' });
  }
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  const attachment = await service.addAttachment(id, fileUrl, req.file.originalname, req.auth!.sub);
  return res.status(201).json(attachment);
}));
