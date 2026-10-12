import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dbService } from '../backend/src/services/dbService.js';
import { seedService } from '../backend/src/services/seedService.js';
import { allocationService } from '../backend/src/services/allocationService.js';

describe('Hallpass system checks', () => {
  it('initializes the configured halls, exams, and administrator', async () => {
    const result = await seedService.runSeed();
    assert.equal(result.success, true);
    assert.equal(result.counts.rooms, 4);
    assert.equal(result.counts.examinations, 4);
    assert.equal(result.counts.students, 0);

    const room = await dbService.getDocument('rooms', 'room_a101');
    assert.equal(room?.roomNumber, 'A101');
    assert.ok(await dbService.getDocument('examinations', 'exam_ds'));
    assert.equal((await dbService.getDocument('users', 'admin_exam_officer'))?.role, 'admin');
  });

  it('seeding is repeatable without duplicating configured records', async () => {
    await seedService.runSeed();
    const rooms = await dbService.queryCollection('rooms');
    const exams = await dbService.queryCollection('examinations');
    assert.equal(new Set(rooms.map((room: any) => room.id)).size, rooms.length);
    assert.equal(new Set(exams.map((exam: any) => exam.id)).size, exams.length);
  });

  it('creates a valid empty allocation plan when no real students are registered', async () => {
    const plan = await allocationService.generatePlan('exam_ds');
    assert.equal(plan.totalEligible, 0);
    assert.equal(plan.allAllocations.length, 0);
    assert.equal(plan.unallocatedCount, 0);
  });

  it('rejects allocation requests for unknown examinations', async () => {
    await assert.rejects(() => allocationService.generatePlan('missing-exam'), /not found/);
  });
});
