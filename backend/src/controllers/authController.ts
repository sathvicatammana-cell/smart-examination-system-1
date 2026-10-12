import { Request, Response } from 'express';
import { dbService } from '../services/dbService.js';

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { uid, email, rollNumber, name, department, year, section, role } = req.body;

      if (!email || !rollNumber || !name) {
        res.status(400).json({ error: 'Name, email, and roll number are mandatory fields.' });
        return;
      }

      // Check unique email
      const existingEmail = await dbService.queryCollection('users', u => u.email?.toLowerCase() === email.toLowerCase());
      if (existingEmail.length > 0 && existingEmail[0].id !== uid) {
        res.status(409).json({ error: 'A user with this university email already exists.' });
        return;
      }

      // Check unique roll number
      const existingRoll = await dbService.queryCollection('users', u => u.rollNumber?.toUpperCase() === rollNumber.toUpperCase());
      if (existingRoll.length > 0 && existingRoll[0].id !== uid) {
        res.status(409).json({ error: 'A user with this roll number already exists.' });
        return;
      }

      // Role determination: respect chosen role
      const assignedRole = role || 'student';
      const upperName = (name || '').trim().toUpperCase();

      const userProfile: any = {
        uid: uid || `user_${Date.now()}`,
        email: email.toLowerCase(),
        rollNumber: rollNumber.toUpperCase(),
        name: upperName,
        role: assignedRole,
        department: department || (assignedRole === 'admin' ? 'University Examination Section' : 'Computer Science & Engineering'),
        createdAt: new Date().toISOString(),
      };

      // Academic year and section strictly apply to students only
      if (assignedRole === 'student') {
        userProfile.year = year || '1st Year';
        userProfile.section = section || 'A';
      }

      await dbService.setDocument('users', userProfile.uid, userProfile);

      // If registered as student, ensure present in students collection too
      if (assignedRole === 'student') {
        const existingStudent = await dbService.queryCollection('students', s => s.rollNumber?.toUpperCase() === rollNumber.toUpperCase());
        if (existingStudent.length === 0) {
          const studentDocId = `student_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          await dbService.setDocument('students', studentDocId, {
            rollNumber: rollNumber.toUpperCase(),
            name: upperName,
            email: email.toLowerCase(),
            department: department || 'Computer Science & Engineering',
            year: year || '1st Year',
            section: section || 'A',
            createdAt: new Date().toISOString(),
          });
        }
      }

      res.status(201).json({
        message: 'User registered successfully',
        user: userProfile,
      });
    } catch (err: any) {
      console.error('[authController.register]', err);
      res.status(500).json({ error: 'Failed to complete registration: ' + err.message });
    }
  },

  async getMe(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const fullUser = await dbService.getDocument('users', req.user.uid);
      res.json({
        user: fullUser || req.user,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch user profile: ' + err.message });
    }
  },

  // Allows instant role switching during demo / evaluation
  async switchDemoRole(req: Request, res: Response): Promise<void> {
    try {
      const { role, uid } = req.body;
      const targetUid = uid || req.user?.uid;
      if (!targetUid) {
        res.status(400).json({ error: 'Target user ID is required' });
        return;
      }

      const validRoles = ['admin', 'incharge', 'student'];
      if (!validRoles.includes(role)) {
        res.status(400).json({ error: 'Invalid role. Must be admin, incharge, or student.' });
        return;
      }

      const existing = await dbService.getDocument('users', targetUid);
      const updated = {
        ...(existing || {}),
        uid: targetUid,
        role,
        updatedAt: new Date().toISOString(),
      };

      await dbService.setDocument('users', targetUid, updated);
      res.json({ message: `Role updated to ${role}`, user: updated });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to switch role: ' + err.message });
    }
  }
};
