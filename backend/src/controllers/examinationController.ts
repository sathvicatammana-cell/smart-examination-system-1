import { Request, Response } from 'express';
import { dbService } from '../services/dbService.js';
import { ExaminationRecord } from '@/src/types/index.ts';

export const examinationController = {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { department, status, date } = req.query;

      let exams = await dbService.queryCollection<ExaminationRecord>('examinations');

      if (department) {
        exams = exams.filter(e => e.department?.toLowerCase() === String(department).toLowerCase());
      }
      if (status) {
        exams = exams.filter(e => e.status === status);
      }
      if (date) {
        exams = exams.filter(e => e.examDate === date);
      }

      // Enrich with allocation counts
      const allAllocations = await dbService.queryCollection('allocations');
      const examsWithCounts = exams.map(exam => {
        const examAllocations = allAllocations.filter(a => a.examId === exam.id);
        return {
          ...exam,
          allocatedCount: examAllocations.length,
        };
      });

      res.json({ examinations: examsWithCounts });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve examinations: ' + err.message });
    }
  },

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const exam = await dbService.getDocument<ExaminationRecord>('examinations', id);
      if (!exam) {
        res.status(404).json({ error: 'Examination not found' });
        return;
      }

      const allocations = await dbService.queryCollection('allocations', a => a.examId === id);
      res.json({
        examination: {
          ...exam,
          allocatedCount: allocations.length,
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch examination: ' + err.message });
    }
  },

  async create(req: Request, res: Response): Promise<void> {
    try {
      const {
        name,
        type,
        courseCode,
        courseName,
        examDate,
        session,
        department,
        year,
        section,
        assignedRooms,
        assignedInCharges,
      } = req.body;

      // Validation
      if (!name || !courseCode || !courseName || !examDate || !session || !department || !year) {
        res.status(400).json({
          error: 'Missing mandatory fields: name, courseCode, courseName, examDate, session, department, and year are required.'
        });
        return;
      }

      // Check duplicates: Prevent duplicate examination for the same courseCode, examDate, and session
      const existingExams = await dbService.queryCollection<ExaminationRecord>('examinations');
      const duplicate = existingExams.find(e =>
        e.courseCode.toUpperCase() === courseCode.toUpperCase() &&
        e.examDate === examDate &&
        e.session === session &&
        e.status !== 'completed'
      );

      if (duplicate) {
        res.status(409).json({
          error: `Duplicate Examination: Course ${courseCode} is already scheduled on ${examDate} (${session} session).`
        });
        return;
      }

      const examId = `exam_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newExam: ExaminationRecord = {
        id: examId,
        name,
        type: type || 'End-Semester',
        courseCode: courseCode.toUpperCase(),
        courseName,
        examDate,
        session,
        department,
        year,
        section: section || 'All Sections',
        status: 'draft',
        assignedRooms: assignedRooms || [],
        assignedInCharges: assignedInCharges || [],
        createdAt: new Date().toISOString(),
      };

      await dbService.setDocument('examinations', examId, newExam);

      res.status(201).json({
        message: 'Examination created successfully',
        examination: newExam,
      });
    } catch (err: any) {
      console.error('[examinationController.create]', err);
      res.status(500).json({ error: 'Failed to create examination: ' + err.message });
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const existing = await dbService.getDocument<ExaminationRecord>('examinations', id);
      if (!existing) {
        res.status(404).json({ error: 'Examination not found' });
        return;
      }

      const {
        name,
        type,
        courseCode,
        courseName,
        examDate,
        session,
        department,
        year,
        section,
        status,
        assignedRooms,
        assignedInCharges,
      } = req.body;

      // Duplicate check if courseCode, date, or session changed
      if ((courseCode && courseCode !== existing.courseCode) ||
          (examDate && examDate !== existing.examDate) ||
          (session && session !== existing.session)) {
        const allExams = await dbService.queryCollection<ExaminationRecord>('examinations');
        const duplicate = allExams.find(e =>
          e.id !== id &&
          e.courseCode.toUpperCase() === (courseCode || existing.courseCode).toUpperCase() &&
          e.examDate === (examDate || existing.examDate) &&
          e.session === (session || existing.session)
        );
        if (duplicate) {
          res.status(409).json({
            error: `Conflicting schedule: Course ${(courseCode || existing.courseCode)} already has an exam on that date and session.`
          });
          return;
        }
      }

      const updatedExam: ExaminationRecord = {
        ...existing,
        name: name ?? existing.name,
        type: type ?? existing.type,
        courseCode: courseCode ? courseCode.toUpperCase() : existing.courseCode,
        courseName: courseName ?? existing.courseName,
        examDate: examDate ?? existing.examDate,
        session: session ?? existing.session,
        department: department ?? existing.department,
        year: year ?? existing.year,
        section: section ?? existing.section,
        status: status ?? existing.status,
        assignedRooms: assignedRooms ?? existing.assignedRooms,
        assignedInCharges: assignedInCharges ?? existing.assignedInCharges,
      };

      await dbService.updateDocument('examinations', id, updatedExam);
      res.json({ message: 'Examination updated successfully', examination: updatedExam });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update examination: ' + err.message });
    }
  },

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const existing = await dbService.getDocument<ExaminationRecord>('examinations', id);
      if (!existing) {
        res.status(404).json({ error: 'Examination not found' });
        return;
      }

      // Check if allocations or attendance exist
      const allocations = await dbService.queryCollection('allocations', a => a.examId === id);
      if (allocations.length > 0) {
        // Remove linked allocations and attendance records atomically
        await dbService.batchDelete('allocations', allocations.map(a => a.id));
        const attendance = await dbService.queryCollection('attendance', a => a.examId === id);
        if (attendance.length > 0) {
          await dbService.batchDelete('attendance', attendance.map(a => a.id));
        }
      }

      await dbService.deleteDocument('examinations', id);
      res.json({ message: 'Examination deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete examination: ' + err.message });
    }
  }
};
