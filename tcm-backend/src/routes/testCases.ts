import fs from 'node:fs';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { upload } from '../middleware/upload';
import { paramStr } from '../utils/params';
import * as service from '../services/testCaseService';

export const testCaseRouter = Router();
testCaseRouter.use(authenticate);

const headerSchema = z.object({
  namaTestCase: z.string().min(1),
  // sprint: z.string().optional(),
  sprint: z.coerce.number().int().positive().nullish(),
  jiraUrl: z.string().url().optional().or(z.literal('')),
  namaMenu: z.string().min(1),
});

testCaseRouter.get('/test-case-headers', asyncHandler(async (_req, res) => {
  res.json(await service.listHeaders());
}));

testCaseRouter.get('/test-case-headers/template', (req, res) => {
  const buffer = service.generateTemplateWorkbook();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="Test_Case_Template.xlsx"');
  res.send(buffer);
});

testCaseRouter.get('/test-case-headers/report', asyncHandler(async (_req, res) => {
  const headers = await service.listHeaders();
  const buffer = service.generateHeaderReportWorkbook(headers);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="Laporan_Test_Case.xlsx"');
  res.send(buffer);
}));

testCaseRouter.get('/test-case-headers/:headerId/items/export', asyncHandler(async (req, res) => {
  const headerId = paramStr(req.params.headerId);
  const headers = await service.listHeaders();
  const header = headers.find((h) => h.id === headerId);
  if (!header) return res.status(404).json({ message: 'Header tidak ditemukan' });
  const items = await service.listItems(headerId);
  const buffer = service.generateItemsReportWorkbook(items);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${header.headerCode}.xlsx"`);
  res.send(buffer);
}));

testCaseRouter.post('/test-case-headers', requireRole('QA'), asyncHandler(async (req, res) => {
  const parsed = headerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Payload tidak valid', errors: parsed.error.flatten() });
  const header = await service.createHeader({ ...parsed.data, createdBy: req.auth!.sub });
  return res.status(201).json(header);
}));

// Autosave 4 field header (Nama Test Case, Sprint, Nama Menu, Jira URL).
testCaseRouter.patch('/test-case-headers/:id', requireRole('QA'), asyncHandler(async (req, res) => {
  const id = paramStr(req.params.id);
  const parsed = headerSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Payload tidak valid', errors: parsed.error.flatten() });
  const updated = await service.updateHeader(id, parsed.data);
  if (!updated) return res.status(404).json({ message: 'Test case header tidak ditemukan' });
  return res.json(updated);
}));

testCaseRouter.delete('/test-case-headers/:id', requireRole('QA'), asyncHandler(async (req, res) => {
  const deleted = await service.deleteHeader(paramStr(req.params.id));
  if (!deleted) return res.status(404).json({ message: 'Test case header tidak ditemukan' });
  return res.status(204).send();
}));

testCaseRouter.get('/test-case-items', asyncHandler(async (req, res) => {
  const headerId = typeof req.query.headerId === 'string' ? req.query.headerId : undefined;
  res.json(await service.listItems(headerId));
}));

// FIX Bug 3: field opsional pakai .nullish() (bukan .optional()) supaya
// eksplisit `null` dari kolom nullable Postgres (testData/note/testDate/
// devArea yang belum diisi) tidak ditolak validasi. .optional() HANYA
// menerima `undefined`/key hilang, BUKAN `null` eksplisit — beda konsep.
const itemSchema = z.object({
  featureName: z.string().optional().default(''),
  testType: z.enum(['Positive', 'Negative']).optional().default('Positive'),
  scenario: z.string().optional().default(''),
  steps: z.string().optional().default(''),
  testData: z.string().nullish(),
  expectedResult: z.string().optional().default(''),
  status: z.enum(['Not Executed', 'Pass', 'Fail', 'Blocked', 'On Hold']).optional(),
  picQa: z.string().uuid().nullish(),
  testDate: z.string().nullish(),
  note: z.string().nullish(),
  devArea: z.enum(['Backend', 'Frontend']).nullish(), // dulu 'FE'/'BE', dulu berperan sebagai "Area"
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


testCaseRouter.post(
  '/test-case-headers/:headerId/items/import',
  requireRole('QA'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const headerId = paramStr(req.params.headerId);
    const header = await service.findHeaderById(headerId);
    if (!header) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ message: 'Header tidak ditemukan' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'File Excel tidak ditemukan (field name harus "file")' });
    }
    try {
      const result = await service.importItemsFromExcel(headerId, req.file.path, req.auth!.sub);
      return res.status(201).json(result);
    } catch (err) {
      if (err instanceof service.TemplateValidationError) {
        return res.status(400).json({
          message: 'Format file Excel tidak sesuai template',
          missing: err.missing,
          unexpected: err.unexpected,
        });
      }
      throw err;
    } finally {
      fs.unlink(req.file.path, () => {});
    }
  }),
);


const bulkUpdateSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    payload: itemSchema.partial(),
  })),
});

// PENTING: route '/bulk' HARUS didaftarkan sebelum '/test-case-items/:id'
// di bawah — Express mencocokkan route berurutan, kalau ':id' didaftarkan
// duluan, request ke '/bulk' akan tertangkap sebagai id = 'bulk'.
testCaseRouter.put('/test-case-items/bulk', requireRole('QA'), asyncHandler(async (req, res) => {
  const parsed = bulkUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Payload tidak valid', errors: parsed.error.flatten() });
  await service.bulkUpdateItems(parsed.data.items);
  return res.json({ updated: parsed.data.items.length });
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

// Upload/ganti "Capture" (field upload di kolom yang dulu "Area").
testCaseRouter.post(
  '/test-case-items/:id/attachments',
  requireRole('QA'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const id = paramStr(req.params.id);
    const exists = await service.findItemById(id);
    if (!exists) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ message: 'Test case item tidak ditemukan' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'File tidak ditemukan pada request (field name harus "file")' });
    }
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    const updated = await service.replaceCapture(id, fileUrl, req.file.originalname, req.auth!.sub);
    return res.status(201).json(updated);
  }),
);