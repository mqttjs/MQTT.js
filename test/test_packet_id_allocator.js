import test from 'ava'
import { PacketIdAllocator } from '../dist/utils/packetIdAllocator.js'

const maxPacketId = 65535

test.todo('all insertion cases')

test('should allocate packet IDs in increasing order', async (t) => {
  t.plan(maxPacketId);
  const allocator = new PacketIdAllocator();

  for (let i = 1; i <= maxPacketId; ++i) {
    const id = await allocator.allocate();
    t.assert(i === id);
  }
})

test('should end up with one interval after releasing all IDs in random order', async (t) => {
  t.plan(1)
  const allocator = new PacketIdAllocator();

  /* Allocate all IDs */
  while (await allocator.allocate() < maxPacketId);

  /* [1, 2, 3, ..., 65535] */
  const idsToRelease = Array.from({ length: maxPacketId }, (_, i) => i + 1);
  /* Shuffle array using Fisher-Yates */
  for (let i = 0; i < maxPacketId - 2; ++i) {
    /* j is a random index such that i <= j < maxPacketId */
    const j = Math.floor(i + Math.random() * (maxPacketId - i))
    const temp = idsToRelease[i]
    idsToRelease[i] = idsToRelease[j]
    idsToRelease[j] = temp
  }

  for (const id of idsToRelease) {
    allocator.release(id);
  }
  t.deepEqual(allocator._intervals, [[maxPacketId, 1]]);
})

test('should throw if attempting to release a packet ID outside valid range', (t) => {
  t.plan(2)
  const allocator = new PacketIdAllocator();
  const throwsExpectation = {
    message: 'Packet ID must be between 1 and 65535',
    instanceOf: RangeError
  }
  t.throws(allocator.release.bind(allocator, maxPacketId + 1), throwsExpectation);
  t.throws(allocator.release.bind(allocator, 0), throwsExpectation);
})

test('should throw if attempting to release an already available packet ID', (t) => {
  t.plan(1)
  const allocator = new PacketIdAllocator();
  t.throws(
    allocator.release.bind(allocator, 42),
    {
      instanceOf: Error,
      message: 'Packet ID already available'
    }
  )
})

test('should throw if attempting to allocate a packet ID when no more are left', async (t) => {
  t.plan(1)
  const allocator = new PacketIdAllocator();
  /* Allocate all IDs */
  while (await allocator.allocate() < maxPacketId);
  await t.throwsAsync(allocator.allocate.bind(allocator), {
    instanceOf: Error,
    message: 'No more packet IDs available'
  })
})

test('should correctly release ID: one below the min for the lowest interval', async (t) => {
  t.plan(2)
  const allocator = new PacketIdAllocator();
  await allocator.allocate()
  t.deepEqual(allocator._intervals, [[maxPacketId, 2]])
  allocator.release(1) // Should result in the min being decremented for the lowest interval
  t.deepEqual(allocator._intervals, [[maxPacketId, 1]])
})

test('should correctly release ID: more than one below the min for the lowest interval', async (t) => {
  t.plan(3)
  const allocator = new PacketIdAllocator();
  await allocator.allocate()
  t.deepEqual(allocator._intervals, [[maxPacketId, 2]])
  await allocator.allocate()
  t.deepEqual(allocator._intervals, [[maxPacketId, 3]])
  
  allocator.release(1) // Should result in a new singleton interval as the smallest interval
  t.deepEqual(allocator._intervals, [[maxPacketId, 3], [1, 1]])
})

test('should correctly release ID: one below the min for an interior interval', async (t) => {
  t.plan(5)
  const allocator = new PacketIdAllocator();
  await allocator.allocate()
  t.deepEqual(allocator._intervals, [[maxPacketId, 2]])
  await allocator.allocate()
  t.deepEqual(allocator._intervals, [[maxPacketId, 3]])
  await allocator.allocate()
  t.deepEqual(allocator._intervals, [[maxPacketId, 4]])
  
  allocator.release(1)
  t.deepEqual(allocator._intervals, [[maxPacketId, 4], [1, 1]])
  allocator.release(3) // Should result in the min of an interval being decremented
  t.deepEqual(allocator._intervals, [[maxPacketId, 3], [1, 1]])
})

test('should correctly release ID: one above the max for an interior interval', async (t) => {
  t.plan(5)
  const allocator = new PacketIdAllocator();
  await allocator.allocate()
  t.deepEqual(allocator._intervals, [[maxPacketId, 2]])
  await allocator.allocate()
  t.deepEqual(allocator._intervals, [[maxPacketId, 3]])
  await allocator.allocate()
  t.deepEqual(allocator._intervals, [[maxPacketId, 4]])
  
  allocator.release(1)
  t.deepEqual(allocator._intervals, [[maxPacketId, 4], [1, 1]])
  allocator.release(2) // Should result in the max of an interval being incremented
  t.deepEqual(allocator._intervals, [[maxPacketId, 4], [2, 1]])
})

test('should correctly release ID: merge two intervals', async (t) => {
  t.plan(4)
  const allocator = new PacketIdAllocator();
  await allocator.allocate()
  t.deepEqual(allocator._intervals, [[maxPacketId, 2]])
  await allocator.allocate()
  t.deepEqual(allocator._intervals, [[maxPacketId, 3]])
  
  allocator.release(1)
  t.deepEqual(allocator._intervals, [[maxPacketId, 3], [1, 1]])
  allocator.release(2) // Should result in intervals being merged
  t.deepEqual(allocator._intervals, [[maxPacketId, 1]])
})

test('should correctly release ID: new interval between existing intervals', async (t) => {
  t.plan(6)
  const allocator = new PacketIdAllocator();
  await allocator.allocate()
  t.deepEqual(allocator._intervals, [[maxPacketId, 2]])
  await allocator.allocate()
  t.deepEqual(allocator._intervals, [[maxPacketId, 3]])
  await allocator.allocate()
  t.deepEqual(allocator._intervals, [[maxPacketId, 4]])
  await allocator.allocate()
  t.deepEqual(allocator._intervals, [[maxPacketId, 5]])
  
  allocator.release(1)
  t.deepEqual(allocator._intervals, [[maxPacketId, 5], [1, 1]])
  allocator.release(3) // Should result in a new singleton interval being inserted between existing intervals
  t.deepEqual(allocator._intervals, [[maxPacketId, 5], [3, 3], [1, 1]])
})

test('should correctly release ID: one above the max for the highest interval', async (t) => {
  t.plan(3)
  const allocator = new PacketIdAllocator();
  while (await allocator.allocate() < maxPacketId);
  t.deepEqual(allocator._intervals, [])
  allocator.release(1)
  t.deepEqual(allocator._intervals, [[1, 1]])
  allocator.release(2) // Should result in the max being incremented for the highest interval
  t.deepEqual(allocator._intervals, [[2, 1]])
})

test('should correctly release ID: more than one above the max for the highest interval', async (t) => {
  t.plan(3)
  const allocator = new PacketIdAllocator();
  while (await allocator.allocate() < maxPacketId);
  t.deepEqual(allocator._intervals, [])
  allocator.release(1)
  t.deepEqual(allocator._intervals, [[1, 1]])
  allocator.release(3) // Should result in a new singleton interval as the highest interval
  t.deepEqual(allocator._intervals, [[3, 3], [1, 1]])
})