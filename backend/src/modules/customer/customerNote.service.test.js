'use strict';

/**
 * Unit tests — customerNote.service.js
 * Business Rule: CRM-008 (note author, delete restriction to SUPER_ADMIN/OWNER/MANAGER)
 * Pattern: AAA — Arrange / Act / Assert
 */

jest.mock('./customer.repository', () => ({
  findById: jest.fn(),
}));

jest.mock('./customerNote.repository', () => ({
  findAllByCustomer: jest.fn(),
  create:            jest.fn(),
  findById:          jest.fn(),
  remove:            jest.fn(),
}));

const customerRepo = require('./customer.repository');
const noteRepo     = require('./customerNote.repository');
const { getNotes, createNote, deleteNote } = require('./customerNote.service');
const AppError = require('../../common/errors/AppError');

beforeEach(() => jest.clearAllMocks());

const mockCustomer = { id: 'cust-1', name: 'Nia', customerNo: 'CUS-000001' };
const mockNote     = { id: 'note-1', customerId: 'cust-1', note: 'Alergi cat', createdBy: 'Admin' };

// ── getNotes ──────────────────────────────────────────────────────────────

describe('getNotes', () => {
  test('should_return_notes_when_customer_exists', async () => {
    // Arrange
    customerRepo.findById.mockResolvedValue(mockCustomer);
    noteRepo.findAllByCustomer.mockResolvedValue([mockNote]);

    // Act
    const result = await getNotes('cust-1');

    // Assert
    expect(result).toEqual([mockNote]);
    expect(noteRepo.findAllByCustomer).toHaveBeenCalledWith('cust-1');
  });

  test('should_return_empty_array_when_customer_has_no_notes', async () => {
    // Arrange
    customerRepo.findById.mockResolvedValue(mockCustomer);
    noteRepo.findAllByCustomer.mockResolvedValue([]);

    // Act
    const result = await getNotes('cust-1');

    // Assert
    expect(result).toEqual([]);
  });

  test('should_throw_not_found_when_customer_missing', async () => {
    // Arrange
    customerRepo.findById.mockResolvedValue(null);

    // Act + Assert
    await expect(getNotes('missing')).rejects.toThrow(AppError);
    await expect(getNotes('missing')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── createNote ────────────────────────────────────────────────────────────

describe('createNote — CRM-008', () => {
  test('should_create_note_with_author_name_when_customer_exists', async () => {
    // Arrange
    customerRepo.findById.mockResolvedValue(mockCustomer);
    noteRepo.create.mockResolvedValue(mockNote);

    // Act
    const result = await createNote('cust-1', { note: 'Alergi cat' }, 'Admin');

    // Assert
    expect(result).toEqual(mockNote);
    expect(noteRepo.create).toHaveBeenCalledWith({
      customerId: 'cust-1',
      note:       'Alergi cat',
      createdBy:  'Admin',
    });
  });

  test('should_store_createdBy_null_when_author_not_provided', async () => {
    // Arrange
    customerRepo.findById.mockResolvedValue(mockCustomer);
    noteRepo.create.mockResolvedValue({ ...mockNote, createdBy: null });

    // Act
    await createNote('cust-1', { note: 'Test' }, undefined);

    // Assert
    expect(noteRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: null })
    );
  });

  test('should_throw_not_found_when_customer_missing', async () => {
    // Arrange
    customerRepo.findById.mockResolvedValue(null);

    // Act + Assert
    await expect(createNote('missing', { note: 'Test' }, 'Admin')).rejects.toThrow(AppError);
    await expect(createNote('missing', { note: 'Test' }, 'Admin')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── deleteNote ────────────────────────────────────────────────────────────

describe('deleteNote — CRM-008 role restriction', () => {
  beforeEach(() => {
    noteRepo.findById.mockResolvedValue(mockNote);
    noteRepo.remove.mockResolvedValue(mockNote);
  });

  test('should_delete_note_when_user_is_MANAGER', async () => {
    // Act
    const result = await deleteNote('cust-1', 'note-1', 'MANAGER');

    // Assert
    expect(result).toEqual(mockNote);
    expect(noteRepo.remove).toHaveBeenCalledWith('note-1');
  });

  test('should_delete_note_when_user_is_OWNER', async () => {
    // Act + Assert
    await expect(deleteNote('cust-1', 'note-1', 'OWNER')).resolves.toEqual(mockNote);
  });

  test('should_delete_note_when_user_is_SUPER_ADMIN', async () => {
    // Act + Assert
    await expect(deleteNote('cust-1', 'note-1', 'SUPER_ADMIN')).resolves.toEqual(mockNote);
  });

  test('should_throw_forbidden_when_user_is_STAFF — CRM-008', async () => {
    // Act + Assert
    await expect(deleteNote('cust-1', 'note-1', 'STAFF')).rejects.toThrow(AppError);
    await expect(deleteNote('cust-1', 'note-1', 'STAFF')).rejects.toMatchObject({ statusCode: 403 });
  });

  test('should_throw_forbidden_when_user_is_CASHIER — CRM-008', async () => {
    // Act + Assert
    await expect(deleteNote('cust-1', 'note-1', 'CASHIER')).rejects.toMatchObject({ statusCode: 403 });
  });

  test('should_throw_forbidden_when_user_is_THERAPIST — CRM-008', async () => {
    // Act + Assert
    await expect(deleteNote('cust-1', 'note-1', 'THERAPIST')).rejects.toMatchObject({ statusCode: 403 });
  });

  test('should_throw_not_found_when_note_missing', async () => {
    // Arrange
    noteRepo.findById.mockResolvedValue(null);

    // Act + Assert
    await expect(deleteNote('cust-1', 'note-missing', 'MANAGER')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('should_throw_not_found_when_note_belongs_to_different_customer', async () => {
    // Arrange — note exists but belongs to a different customer
    noteRepo.findById.mockResolvedValue({ ...mockNote, customerId: 'other-cust' });

    // Act + Assert
    await expect(deleteNote('cust-1', 'note-1', 'MANAGER')).rejects.toMatchObject({ statusCode: 404 });
  });
});
