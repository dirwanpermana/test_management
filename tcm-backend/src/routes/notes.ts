import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { paramStr } from '../utils/params';
import * as service from '../services/noteService';

export const noteRouter = Router();
noteRouter.use(authenticate);
noteRouter.use(requireRole('QA')); // seluruh modul Notes hanya untuk role QA

noteRouter.get('/notes', asyncHandler(async (_req, res) => {
  res.json(await service.listNotes());
}));

noteRouter.get('/notes/:id', asyncHandler(async (req, res) => {
  const note = await service.getNoteById(paramStr(req.params.id));
  if (!note) return res.status(404).json({ message: 'Catatan tidak ditemukan' });
  return res.json(note);
}));

noteRouter.post('/notes', asyncHandler(async (req, res) => {
  const note = await service.createNote(req.auth!.sub);
  return res.status(201).json(note);
}));

const updateSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().optional(),
});

noteRouter.patch('/notes/:id', asyncHandler(async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Payload tidak valid', errors: parsed.error.flatten() });
  const updated = await service.updateNote(paramStr(req.params.id), parsed.data, req.auth!.sub);
  if (!updated) return res.status(404).json({ message: 'Catatan tidak ditemukan' });
  return res.json(updated);
}));

noteRouter.delete('/notes/:id', asyncHandler(async (req, res) => {
  const deleted = await service.deleteNote(paramStr(req.params.id));
  if (!deleted) return res.status(404).json({ message: 'Catatan tidak ditemukan' });
  return res.status(204).send();
}));