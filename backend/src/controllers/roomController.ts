import { Request, Response } from 'express';
import { dbService } from '../services/dbService.js';
import { RoomRecord } from '@/src/types/index.ts';

export const roomController = {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { block, availableOnly } = req.query;
      let rooms = await dbService.queryCollection<RoomRecord>('rooms');

      if (block) {
        rooms = rooms.filter(r => r.block?.toLowerCase() === String(block).toLowerCase());
      }
      if (availableOnly === 'true') {
        rooms = rooms.filter(r => r.isAvailable);
      }

      // Calculate allocated seats and available seats dynamically
      const allStudents = await dbService.queryCollection<any>('students');
      const allAllocations = await dbService.queryCollection<any>('allocations');

      const enrichedRooms = rooms.map(room => {
        const roomNum = (room.roomNumber || '').toLowerCase();
        const roomId = (room.id || '').toLowerCase();

        const studentIds = new Set<string>();
        allStudents.forEach((s: any) => {
          if (s.roomNumber && s.roomNumber.toLowerCase() === roomNum) {
            studentIds.add(s.id || s.rollNumber);
          }
        });
        allAllocations.forEach((a: any) => {
          if (
            (a.roomId && a.roomId.toLowerCase() === roomId) ||
            (a.roomNumber && a.roomNumber.toLowerCase() === roomNum)
          ) {
            studentIds.add(a.studentId || a.rollNumber);
          }
        });

        const allocatedSeats = studentIds.size;
        const availableSeats = Math.max(0, room.capacity - allocatedSeats);

        return {
          ...room,
          allocatedSeats,
          availableSeats,
        };
      });

      res.json({ rooms: enrichedRooms });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch rooms: ' + err.message });
    }
  },

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const room = await dbService.getDocument<RoomRecord>('rooms', id);
      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      const allStudents = await dbService.queryCollection<any>('students');
      const allAllocations = await dbService.queryCollection<any>('allocations');
      const roomNum = (room.roomNumber || '').toLowerCase();
      const roomId = (room.id || '').toLowerCase();

      const studentIds = new Set<string>();
      allStudents.forEach((s: any) => {
        if (s.roomNumber && s.roomNumber.toLowerCase() === roomNum) {
          studentIds.add(s.id || s.rollNumber);
        }
      });
      allAllocations.forEach((a: any) => {
        if (
          (a.roomId && a.roomId.toLowerCase() === roomId) ||
          (a.roomNumber && a.roomNumber.toLowerCase() === roomNum)
        ) {
          studentIds.add(a.studentId || a.rollNumber);
        }
      });

      const allocatedSeats = studentIds.size;
      const availableSeats = Math.max(0, room.capacity - allocatedSeats);

      res.json({
        room: {
          ...room,
          allocatedSeats,
          availableSeats,
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch room: ' + err.message });
    }
  },

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { roomNumber, block, capacity, isAvailable } = req.body;

      if (!roomNumber || !block) {
        res.status(400).json({ error: 'Room number and building/block are required.' });
        return;
      }

      const parsedCapacity = Number(capacity);
      if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
        res.status(400).json({ error: 'Maximum seating capacity must be a positive number greater than zero.' });
        return;
      }

      // Check unique room number within the block
      const existingRooms = await dbService.queryCollection<RoomRecord>('rooms');
      const duplicate = existingRooms.find(r =>
        r.roomNumber.toLowerCase() === String(roomNumber).toLowerCase() &&
        r.block.toLowerCase() === String(block).toLowerCase()
      );

      if (duplicate) {
        res.status(409).json({
          error: `Room ${roomNumber} already exists in ${block}. Room number must be unique within its building.`
        });
        return;
      }

      const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newRoom: RoomRecord = {
        id: roomId,
        roomNumber: String(roomNumber).trim(),
        block: String(block).trim(),
        capacity: parsedCapacity,
        isAvailable: isAvailable !== false,
        allocatedSeats: 0,
        availableSeats: parsedCapacity,
        createdAt: new Date().toISOString(),
      };

      await dbService.setDocument('rooms', roomId, newRoom);
      res.status(201).json({ message: 'Room created successfully', room: newRoom });
    } catch (err: any) {
      console.error('[roomController.create]', err);
      res.status(500).json({ error: 'Failed to create room: ' + err.message });
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const existing = await dbService.getDocument<RoomRecord>('rooms', id);
      if (!existing) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      const { roomNumber, block, capacity, isAvailable } = req.body;

      if (capacity !== undefined) {
        const parsedCapacity = Number(capacity);
        if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
          res.status(400).json({ error: 'Room capacity must be greater than zero.' });
          return;
        }

        // Check if existing allocations exceed new capacity
        const currentAllocations = await dbService.queryCollection('allocations', a => a.roomId === id);
        if (currentAllocations.length > parsedCapacity) {
          res.status(400).json({
            error: `Cannot reduce room capacity to ${parsedCapacity}: ${currentAllocations.length} students are currently allocated to this room.`
          });
          return;
        }
      }

      // Check room duplicate in block if changed
      if (roomNumber || block) {
        const checkNumber = roomNumber || existing.roomNumber;
        const checkBlock = block || existing.block;
        const allRooms = await dbService.queryCollection<RoomRecord>('rooms');
        const duplicate = allRooms.find(r =>
          r.id !== id &&
          r.roomNumber.toLowerCase() === String(checkNumber).toLowerCase() &&
          r.block.toLowerCase() === String(checkBlock).toLowerCase()
        );
        if (duplicate) {
          res.status(409).json({ error: `Room ${checkNumber} already exists in ${checkBlock}.` });
          return;
        }
      }

      const updatedRoom: RoomRecord = {
        ...existing,
        roomNumber: roomNumber ? String(roomNumber).trim() : existing.roomNumber,
        block: block ? String(block).trim() : existing.block,
        capacity: capacity !== undefined ? Number(capacity) : existing.capacity,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : existing.isAvailable,
      };

      await dbService.updateDocument('rooms', id, updatedRoom);
      res.json({ message: 'Room updated successfully', room: updatedRoom });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update room: ' + err.message });
    }
  }
};
