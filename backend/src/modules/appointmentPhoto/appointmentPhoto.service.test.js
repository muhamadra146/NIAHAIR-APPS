'use strict';

jest.mock('./appointmentPhoto.repository');
jest.mock('../../config/cloudinary', () => ({
  uploader: { destroy: jest.fn() },
}));

const repo      = require('./appointmentPhoto.repository');
const cloudinary = require('../../config/cloudinary');
const svc       = require('./appointmentPhoto.service');

const PHOTO = { id: 'ph1', appointmentId: 'a1', url: 'https://cdn/photo.jpg', publicId: 'photo_123', type: 'REFERENCE' };

beforeEach(() => jest.clearAllMocks());

// ── listPhotos ─────────────────────────────────────────────────────────

describe('listPhotos', () => {
  test('returns all photos for appointment', async () => {
    repo.findAllByAppointment.mockResolvedValue([PHOTO]);
    repo.countByAppointment.mockResolvedValue(1);
    const result = await svc.listPhotos('a1');
    expect(repo.findAllByAppointment).toHaveBeenCalledWith('a1', { skip: 0, take: 10 });
    expect(repo.countByAppointment).toHaveBeenCalledWith('a1');
    expect(result.data).toHaveLength(1);
    expect(result.meta).toMatchObject({ total: 1, page: 1, limit: 10 });
  });
});

// ── addPhoto ───────────────────────────────────────────────────────────

describe('addPhoto', () => {
  test('throws 404 when appointment not found', async () => {
    repo.findAppointmentById.mockResolvedValue(null);
    await expect(svc.addPhoto({ appointmentId: 'bad', url: 'u', publicId: 'p' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('creates photo for valid appointment', async () => {
    repo.findAppointmentById.mockResolvedValue({ id: 'a1' });
    repo.create.mockResolvedValue(PHOTO);

    const result = await svc.addPhoto({ appointmentId: 'a1', url: 'https://cdn/photo.jpg', publicId: 'photo_123' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      appointmentId: 'a1',
      type:          'REFERENCE',
    }));
    expect(result).toEqual(PHOTO);
  });
});

// ── deletePhoto ────────────────────────────────────────────────────────

describe('deletePhoto', () => {
  test('throws 404 when photo not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.deletePhoto('x')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('destroys from cloudinary and removes from DB', async () => {
    repo.findById.mockResolvedValue(PHOTO);
    cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });
    repo.remove.mockResolvedValue(undefined);

    await svc.deletePhoto('ph1');
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('photo_123');
    expect(repo.remove).toHaveBeenCalledWith('ph1');
  });
});
