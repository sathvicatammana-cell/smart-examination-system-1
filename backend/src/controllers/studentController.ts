import { Request, Response } from 'express';
import { dbService } from '../services/dbService.js';
import { StudentRecord } from '@/src/types/index.ts';

export const studentController = {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { department, year, section, search } = req.query;
      let students = await dbService.queryCollection<StudentRecord>('students');
      const allUsers = await dbService.queryCollection('users');
      const studentUsers = allUsers.filter((u: any) => u.role === 'student');

      // Add any student users that are not in students collection
      for (const u of studentUsers) {
        if (!students.some(s => s.rollNumber?.toUpperCase() === u.rollNumber?.toUpperCase())) {
          students.push({
            id: u.uid || `stu_${u.rollNumber}`,
            rollNumber: u.rollNumber,
            name: u.name,
            email: u.email,
            department: u.department || 'Computer Science & Engineering',
            year: u.year || '3rd Year',
            section: u.section || 'A',
            roomNumber: u.assignedRoom || 'Unallocated',
            createdAt: u.createdAt || new Date().toISOString(),
          });
        }
      }

      if (department) {
        students = students.filter(s => s.department?.toLowerCase() === String(department).toLowerCase());
      }
      if (year) {
        students = students.filter(s => s.year?.toLowerCase() === String(year).toLowerCase());
      }
      if (section) {
        students = students.filter(s => s.section?.toLowerCase() === String(section).toLowerCase());
      }
      if (search) {
        const query = String(search).toLowerCase();
        students = students.filter(s =>
          s.name?.toLowerCase().includes(query) ||
          s.rollNumber?.toLowerCase().includes(query) ||
          s.email?.toLowerCase().includes(query)
        );
      }

      // Enrich students with allocated room numbers from allocations or direct assignments
      const allAllocations = await dbService.queryCollection('allocations');

      const enrichedStudents = students.map(s => {
        const studentAlloc = allAllocations.find(
          (a: any) => a.studentId === s.id || a.rollNumber?.toUpperCase() === s.rollNumber?.toUpperCase()
        );
        const userRec = allUsers.find((u: any) => u.rollNumber?.toUpperCase() === s.rollNumber?.toUpperCase());
        const resolvedRoom = (s.roomNumber && s.roomNumber !== 'Unallocated')
          ? s.roomNumber
          : studentAlloc?.roomNumber || userRec?.assignedRoom || 'Unallocated';

        return {
          ...s,
          roomNumber: resolvedRoom,
          seatNumber: s.seatNumber || studentAlloc?.seatNumber || '',
        };
      });

      res.json({ students: enrichedStudents });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch students: ' + err.message });
    }
  },

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const student = await dbService.getDocument<StudentRecord>('students', id);
      if (!student) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }
      res.json({ student });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch student: ' + err.message });
    }
  },

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { rollNumber, name, email, department, year, section, roomNumber } = req.body;

      if (!rollNumber || !name || !email || !department || !year) {
        res.status(400).json({
          error: 'Roll number, name, email, department, and year are mandatory.'
        });
        return;
      }

      // Check unique roll number
      const existing = await dbService.queryCollection<StudentRecord>('students', s =>
        s.rollNumber.toUpperCase() === String(rollNumber).toUpperCase()
      );
      if (existing.length > 0) {
        res.status(409).json({ error: `Student with roll number ${rollNumber} already exists.` });
        return;
      }

      const studentId = `student_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newStudent: StudentRecord = {
        id: studentId,
        rollNumber: String(rollNumber).trim().toUpperCase(),
        name: String(name).trim().toUpperCase(),
        email: String(email).trim().toLowerCase(),
        department: String(department).trim(),
        year: String(year).trim(),
        section: section ? String(section).trim() : 'A',
        roomNumber: roomNumber ? String(roomNumber).trim() : 'Unallocated',
        createdAt: new Date().toISOString(),
      };

      await dbService.setDocument('students', studentId, newStudent);
      res.status(201).json({ message: 'Student registered successfully', student: newStudent });
    } catch (err: any) {
      console.error('[studentController.create]', err);
      res.status(500).json({ error: 'Failed to create student: ' + err.message });
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const existing = await dbService.getDocument<StudentRecord>('students', id);
      if (!existing) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }

      const { rollNumber, name, email, department, year, section, roomNumber } = req.body;

      if (rollNumber && rollNumber.toUpperCase() !== existing.rollNumber.toUpperCase()) {
        const duplicate = await dbService.queryCollection<StudentRecord>('students', s =>
          s.id !== id && s.rollNumber.toUpperCase() === String(rollNumber).toUpperCase()
        );
        if (duplicate.length > 0) {
          res.status(409).json({ error: `Roll number ${rollNumber} is already in use.` });
          return;
        }
      }

      const updatedStudent: StudentRecord = {
        ...existing,
        rollNumber: rollNumber ? String(rollNumber).trim().toUpperCase() : existing.rollNumber,
        name: name ? String(name).trim().toUpperCase() : existing.name,
        email: email ? String(email).trim().toLowerCase() : existing.email,
        department: department ? String(department).trim() : existing.department,
        year: year ? String(year).trim() : existing.year,
        section: section ? String(section).trim() : existing.section,
        roomNumber: roomNumber ? String(roomNumber).trim() : existing.roomNumber,
      };

      await dbService.updateDocument('students', id, updatedStudent);
      res.json({ message: 'Student updated successfully', student: updatedStudent });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update student: ' + err.message });
    }
  }
};
