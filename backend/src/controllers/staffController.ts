import { Request, Response } from 'express';
import { dbService } from '../services/dbService.js';
import { UserProfile } from '@/src/types/index.ts';

export const staffController = {
  // Get all staff members (admins and in-charges)
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { department, role } = req.query;
      let users = await dbService.queryCollection<UserProfile>('users', u => u.role === 'incharge' || u.role === 'admin');

      if (department) {
        users = users.filter(u => u.department?.toLowerCase() === String(department).toLowerCase());
      }
      if (role) {
        users = users.filter(u => u.role === role);
      }

      res.json({ staff: users });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch staff directory: ' + err.message });
    }
  },

  // Add a new staff member with roll number / faculty ID
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, rollNumber, department, role, assignedRoom } = req.body;

      if (!name || !email || !rollNumber) {
        res.status(400).json({ error: 'Staff name, email, and staff roll number / employee ID are required.' });
        return;
      }

      // Check unique staff roll number
      const existingRoll = await dbService.queryCollection<UserProfile>('users', u =>
        u.rollNumber?.toUpperCase() === String(rollNumber).trim().toUpperCase()
      );
      if (existingRoll.length > 0) {
        res.status(409).json({ error: `Staff roll number ${rollNumber} is already assigned to ${existingRoll[0].name}.` });
        return;
      }

      // Check unique email
      const existingEmail = await dbService.queryCollection<UserProfile>('users', u =>
        u.email?.toLowerCase() === String(email).trim().toLowerCase()
      );
      if (existingEmail.length > 0) {
        res.status(409).json({ error: `Email ${email} is already in use.` });
        return;
      }

      const staffId = `staff_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newStaff: UserProfile = {
        uid: staffId,
        email: String(email).trim().toLowerCase(),
        rollNumber: String(rollNumber).trim().toUpperCase(),
        name: String(name).trim().toUpperCase(),
        role: (role === 'admin' ? 'admin' : 'incharge'),
        department: department || 'University Examination Section',
        assignedRoom: assignedRoom ? String(assignedRoom).trim() : '',
        createdAt: new Date().toISOString(),
      };

      await dbService.setDocument('users', staffId, newStaff);
      res.status(201).json({ message: 'Staff member registered successfully', staff: newStaff });
    } catch (err: any) {
      console.error('[staffController.create]', err);
      res.status(500).json({ error: 'Failed to register staff member: ' + err.message });
    }
  },

  // Update staff roll number, name, department, or role
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const existing = await dbService.getDocument<UserProfile>('users', id);
      if (!existing) {
        res.status(404).json({ error: 'Staff record not found' });
        return;
      }

      const { name, email, rollNumber, department, role, assignedRoom } = req.body;

      if (rollNumber && rollNumber.toUpperCase() !== existing.rollNumber.toUpperCase()) {
        const duplicate = await dbService.queryCollection<UserProfile>('users', u =>
          u.uid !== id && u.rollNumber?.toUpperCase() === String(rollNumber).trim().toUpperCase()
        );
        if (duplicate.length > 0) {
          res.status(409).json({ error: `Staff roll number ${rollNumber} is already assigned.` });
          return;
        }
      }

      const updatedStaff: UserProfile = {
        ...existing,
        name: name ? String(name).trim().toUpperCase() : existing.name,
        email: email ? String(email).trim().toLowerCase() : existing.email,
        rollNumber: rollNumber ? String(rollNumber).trim().toUpperCase() : existing.rollNumber,
        department: department ? String(department).trim() : existing.department,
        role: role ? (role === 'admin' ? 'admin' : 'incharge') : existing.role,
        assignedRoom: assignedRoom !== undefined ? String(assignedRoom).trim() : existing.assignedRoom,
      };

      await dbService.updateDocument('users', id, updatedStaff);
      res.json({ message: 'Staff record updated successfully', staff: updatedStaff });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update staff: ' + err.message });
    }
  },

  // Allocate in-charge to a specific room (enforces each in-charge assigned to a single room at a time)
  async assignRoom(req: Request, res: Response): Promise<void> {
    try {
      const { staffId, roomNumber } = req.body;
      if (!staffId) {
        res.status(400).json({ error: 'staffId is required' });
        return;
      }

      const staff = await dbService.getDocument<UserProfile>('users', staffId);
      if (!staff) {
        res.status(404).json({ error: 'Staff member not found' });
        return;
      }

      const cleanRoom = roomNumber ? String(roomNumber).trim() : '';

      // Check rule: each in-charge should assign to a single room at a particular time
      if (cleanRoom && cleanRoom !== 'Unallocated') {
        const otherStaff = await dbService.queryCollection<UserProfile>('users', u =>
          u.uid !== staffId && u.role === 'incharge' && u.assignedRoom?.toLowerCase() === cleanRoom.toLowerCase()
        );
        for (const prev of otherStaff) {
          await dbService.updateDocument('users', prev.uid, { assignedRoom: '' });
        }
      }

      await dbService.updateDocument('users', staffId, {
        assignedRoom: cleanRoom === 'Unallocated' ? '' : cleanRoom,
      });

      // Sync with examinations assignedInCharges
      const allExams = await dbService.queryCollection<any>('examinations');
      const allRooms = await dbService.queryCollection<any>('rooms');
      const targetRoom = allRooms.find(r => r.roomNumber.toLowerCase() === cleanRoom.toLowerCase());

      if (targetRoom) {
        for (const exam of allExams) {
          const inCharges = (exam.assignedInCharges || []).filter((a: any) =>
            a.inChargeId !== staffId && a.roomId !== targetRoom.id
          );
          if (cleanRoom && cleanRoom !== 'Unallocated') {
            inCharges.push({
              roomId: targetRoom.id,
              inChargeId: staff.uid,
              inChargeName: staff.name,
              inChargeRollNumber: staff.rollNumber,
            });
          }
          await dbService.updateDocument('examinations', exam.id, {
            assignedInCharges: inCharges,
          });
        }
      }

      res.json({
        message: cleanRoom && cleanRoom !== 'Unallocated'
          ? `Successfully assigned ${staff.name} to Room ${cleanRoom}`
          : `Cleared room assignment for ${staff.name}`,
        assignedRoom: cleanRoom,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to assign room: ' + err.message });
    }
  }
};
