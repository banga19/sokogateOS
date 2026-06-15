// Admin Service Test for SokogateOS
// Tests the AdminService functionality

// Mock dependencies
jest.mock('../src/models/role');
jest.mock('../src/models/user');
jest.mock('../src/models/company');
jest.mock('../src/utils/logger');

const Role = require('../src/models/role');
const User = require('../src/models/user');
const Company = require('../src/models/company');
const AdminService = require('../src/services/adminService');

describe('AdminService', () => {
  let adminService;
  const mockCompanyId = 'test-company-id';
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    jest.clearAllMocks();
    adminService = AdminService; // It's a singleton instance
  });

  describe('ensureSystemRoles', () => {
    test('should create system roles when none exist', async () => {
      // Mock Role.findOneAndUpdate to return upserted roles
      const mockRoles = [
        {
          slug: 'super_admin',
          name: 'Super Admin',
          permissions: [{ domain: '*', actions: ['*'] }],
          isSystem: true,
          isActive: true,
        },
        {
          slug: 'company_admin',
          name: 'Company Admin',
          permissions: [{ domain: 'users', actions: ['read', 'invite'] }],
          isSystem: true,
          isActive: true,
        },
      ];

      Role.findOneAndUpdate.mockImplementation((query, update, options) => {
        // Simulate finding nothing and upserting
        return Promise.resolve({ lean: () => Promise.resolve({ ...update, ...query }) });
      });

      const result = await adminService.ensureSystemRoles();

      expect(Role.findOneAndUpdate).toHaveBeenCalledTimes(3); // super_admin, company_admin, sales_rep, sdr, manager (5 total from SYSTEM_ROLES)
      expect(result).toHaveLength(5); // SYSTEM_ROLES length
    });

    test('should update existing system roles', async () => {
      // Mock Role.findOneAndUpdate to return existing roles
      const existingRole = {
        slug: 'super_admin',
        name: 'Old Name',
        permissions: [],
        isSystem: true,
        isActive: true,
        _id: 'existing-role-id',
      };

      Role.findOneAndUpdate.mockImplementation((query, update, options) => {
        return Promise.resolve({
          lean: () =>
            Promise.resolve({ ...update, ...query, _id: query._id || 'existing-role-id' }),
        });
      });

      const result = await adminService.ensureSystemRoles();

      expect(Role.findOneAndUpdate).toHaveBeenCalled();
      // Should have updated the role with new values
    });
  });

  describe('listRoles', () => {
    test('should return roles for a company including system roles', async () => {
      const mockRoles = [
        {
          slug: 'super_admin',
          name: 'Super Admin',
          isSystem: true,
          isActive: true,
          companyId: null,
        },
        {
          slug: 'company_admin',
          name: 'Company Admin',
          isSystem: true,
          isActive: true,
          companyId: null,
        },
        { slug: 'admin', name: 'Admin', isSystem: false, isActive: true, companyId: mockCompanyId },
      ];

      Role.find.mockReturnValue({
        sort: jest.fn().mockReturnValue(Promise.resolve(mockRoles)),
      });

      const result = await adminService.listRoles(mockCompanyId);

      expect(Role.find).toHaveBeenCalledWith({
        $or: [{ companyId: null }, { companyId: mockCompanyId }],
      });
      expect(result).toEqual(mockRoles);
    });

    test('should return empty array when no roles found', async () => {
      Role.find.mockReturnValue({
        sort: jest.fn().mockReturnValue(Promise.resolve([])),
      });

      const result = await adminService.listRoles(mockCompanyId);

      expect(result).toEqual([]);
    });
  });

  describe('createRole', () => {
    test('should create a new role successfully', async () => {
      const roleData = {
        name: 'Test Role',
        slug: 'test-role',
        description: 'A test role',
        permissions: [{ domain: 'test', actions: ['read'] }],
      };

      // Mock Role.findOne to return null (role doesn't exist)
      Role.findOne.mockResolvedValue(null);

      // Mock Role.create to return the created role
      const createdRole = {
        ...roleData,
        companyId: mockCompanyId,
        isSystem: false,
        _id: 'new-role-id',
      };
      Role.create.mockResolvedValue(createdRole);

      const result = await adminService.createRole(mockCompanyId, roleData);

      expect(Role.findOne).toHaveBeenCalledWith({ companyId: mockCompanyId, slug: 'test-role' });
      expect(Role.create).toHaveBeenCalledWith({
        name: 'Test Role',
        slug: 'test-role',
        description: 'A test role',
        permissions: [{ domain: 'test', actions: ['read'] }],
        companyId: mockCompanyId,
        isSystem: false,
      });
      expect(result).toEqual(createdRole);
    });

    test('should throw error when role already exists', async () => {
      const roleData = {
        name: 'Test Role',
        slug: 'test-role',
      };

      // Mock Role.findOne to return an existing role
      Role.findOne.mockResolvedValue({ slug: 'test-role' });

      await expect(adminService.createRole(mockCompanyId, roleData)).rejects.toThrow(
        'Role "\\"test-role\\"" already exists in this company.'
      );

      expect(Role.findOne).toHaveBeenCalledWith({ companyId: mockCompanyId, slug: 'test-role' });
      expect(Role.create).not.toHaveBeenCalled();
    });
  });

  describe('updateRole', () => {
    test('should update a role successfully', async () => {
      const roleId = 'role-id-123';
      const patch = { name: 'Updated Role', description: 'Updated description' };

      // Mock Role.findOne to return an existing role
      const existingRole = {
        _id: roleId,
        name: 'Old Role',
        slug: 'test-role',
        companyId: mockCompanyId,
        save: jest.fn().mockResolvedValue(true),
      };

      Role.findOne.mockResolvedValue(existingRole);

      const result = await adminService.updateRole(roleId, mockCompanyId, patch);

      expect(Role.findOne).toHaveBeenCalledWith({ _id: roleId, companyId: mockCompanyId });
      expect(existingRole.name).toBe('Updated Role');
      expect(existingRole.description).toBe('Updated description');
      expect(existingRole.save).toHaveBeenCalled();
      expect(result).toBe(existingRole);
    });

    test('should throw error when trying to update slug', async () => {
      const roleId = 'role-id-123';
      const patch = { slug: 'new-slug', name: 'Updated Role' };

      await expect(adminService.updateRole(roleId, mockCompanyId, patch)).rejects.toThrow(
        'Cannot change role slug — create a new role.'
      );

      expect(Role.findOne).not.toHaveBeenCalled();
    });

    test('should throw error when role not found', async () => {
      const roleId = 'non-existent-id';
      const patch = { name: 'Updated Role' };

      Role.findOne.mockResolvedValue(null);

      await expect(adminService.updateRole(roleId, mockCompanyId, patch)).rejects.toThrow(
        'Role not found.'
      );

      expect(Role.findOne).toHaveBeenCalledWith({ _id: roleId, companyId: mockCompanyId });
    });
  });

  describe('deleteRole', () => {
    test('should soft delete a role successfully', async () => {
      const roleId = 'role-id-123';

      // Mock Role.findOne to return a non-system role
      const existingRole = {
        _id: roleId,
        isSystem: false,
        companyId: mockCompanyId,
      };

      Role.findOne.mockResolvedValue(existingRole);

      // Mock Role.findByIdAndUpdate
      Role.findByIdAndUpdate.mockResolvedValue({ deleted: true });

      const result = await adminService.deleteRole(roleId, mockCompanyId);

      expect(Role.findOne).toHaveBeenCalledWith({
        _id: roleId,
        companyId: mockCompanyId,
        isSystem: { $ne: true },
      });
      expect(Role.findByIdAndUpdate).toHaveBeenCalledWith(roleId, { $set: { isActive: false } });
      expect(result).toEqual({ deleted: true });
    });

    test('should throw error when role not found', async () => {
      const roleId = 'non-existent-id';

      Role.findOne.mockResolvedValue(null);

      await expect(adminService.deleteRole(roleId, mockCompanyId)).rejects.toThrow(
        'Role not found or is a system role (cannot delete).'
      );

      expect(Role.findOne).toHaveBeenCalledWith({
        _id: roleId,
        companyId: mockCompanyId,
        isSystem: { $ne: true },
      });
    });

    test('should throw error when trying to delete a system role', async () => {
      const roleId = 'system-role-id';

      // Mock Role.findOne to return a system role
      const systemRole = {
        _id: roleId,
        isSystem: true,
        companyId: mockCompanyId,
      };

      Role.findOne.mockResolvedValue(systemRole);

      await expect(adminService.deleteRole(roleId, mockCompanyId)).rejects.toThrow(
        'Role not found or is a system role (cannot delete).'
      );
    });
  });

  describe('assignRole', () => {
    test('should assign a role to a user successfully', async () => {
      const userId = 'user-id-123';
      const roleSlug = 'test-role';
      const assignedBy = 'admin-id-456';

      // Mock Role.findOne to return an active role
      const role = { slug: roleSlug, isActive: true };
      Role.findOne.mockResolvedValue(role);

      // Mock User.findById to return a user
      const user = {
        _id: userId,
        role: 'old-role',
        save: jest.fn().mockResolvedValue(true),
        toObject: jest
          .fn()
          .mockReturnValue({ _id: userId, role: roleSlug, password: 'hashed-password' }),
      };
      User.findById.mockResolvedValue(user);

      const result = await adminService.assignRole(userId, roleSlug, assignedBy);

      expect(Role.findOne).toHaveBeenCalledWith({ slug: roleSlug, isActive: true });
      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(user.role).toBe(roleSlug);
      expect(user.save).toHaveBeenCalled();
      expect(result).toEqual({ _id: userId, role: roleSlug }); // password should be removed
    });

    test('should throw error when role not found', async () => {
      const userId = 'user-id-123';
      const roleSlug = 'non-existent-role';
      const assignedBy = 'admin-id-456';

      Role.findOne.mockResolvedValue(null);

      await expect(adminService.assignRole(userId, roleSlug, assignedBy)).rejects.toThrow(
        'Role "\\"non-existent-role\\"" not found.'
      );

      expect(Role.findOne).toHaveBeenCalledWith({ slug: 'non-existent-role', isActive: true });
      expect(User.findById).not.toHaveBeenCalled();
    });

    test('should throw error when user not found', async () => {
      const userId = 'non-existent-user';
      const roleSlug = 'test-role';
      const assignedBy = 'admin-id-456';

      Role.findOne.mockResolvedValue({ slug: roleSlug, isActive: true });
      User.findById.mockResolvedValue(null);

      await expect(adminService.assignRole(userId, roleSlug, assignedBy)).rejects.toThrow(
        'User not found.'
      );

      expect(Role.findOne).toHaveBeenCalledWith({ slug: roleSlug, isActive: true });
      expect(User.findById).toHaveBeenCalledWith(userId);
    });
  });
});
