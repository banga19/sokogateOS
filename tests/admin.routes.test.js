// Admin Routes Test for SokogateOS
// Tests the admin route handlers

const request = require('supertest');
const express = require('express');

jest.mock('../src/services/adminService');
jest.mock('../src/middleware/auth');
jest.mock('../src/middleware/rbac');

const adminService = require('../src/services/adminService');
const { authenticate } = require('../src/middleware/auth');
const { rbacAuthorize } = require('../src/middleware/rbac');
const adminRoutes = require('../src/routes/admin');

describe('Admin Routes', () => {
  let app;
  const mockCompanyId = 'test-company-id';
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminRoutes);
  });

  describe('GET /roles', () => {
    test('should return roles list successfully', async () => {
      // Mock middleware
      authenticate.mockImplementation((req, res, next) => {
        req.user = { id: mockUserId, companyId: mockCompanyId };
        next();
      });
      rbacAuthorize.mockImplementation(() => (req, res, next) => next());

      // Mock adminService
      const mockRoles = [
        { slug: 'super_admin', name: 'Super Admin' },
        { slug: 'company_admin', name: 'Company Admin' }
      ];
      adminService.listRoles.mockResolvedValue(mockRoles);

      const response = await request(app).get('/api/admin/roles');

      expect(authenticate).toHaveBeenCalled();
      expect(rbacAuthorize).toHaveBeenCalledWith('teams', 'manageMembers');
      expect(adminService.listRoles).toHaveBeenCalledWith(mockCompanyId);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, data: mockRoles });
    });

    test('should handle error when fetching roles fails', async () => {
      // Mock middleware
      authenticate.mockImplementation((req, res, next) => {
        req.user = { id: mockUserId, companyId: mockCompanyId };
        next();
      });
      rbacAuthorize.mockImplementation(() => (req, res, next) => next());

      // Mock adminService to throw error
      adminService.listRoles.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/admin/roles');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ success: false, error: 'Database error' });
    });
  });

  describe('POST /roles/seed', () => {
    test('should seed system roles successfully', async () => {
      // Mock middleware (no auth required for seeding)
      authenticate.mockImplementation((req, res, next) => next());

      // Mock adminService
      const mockRoles = [
        { slug: 'super_admin', name: 'Super Admin' },
        { slug: 'company_admin', name: 'Company Admin' }
      ];
      adminService.ensureSystemRoles.mockResolvedValue(mockRoles);

      const response = await request(app).post('/api/admin/roles/seed');

      expect(authenticate).toHaveBeenCalled();
      expect(adminService.ensureSystemRoles).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, data: mockRoles });
    });

    test('should handle error when seeding fails', async () => {
      // Mock middleware
      authenticate.mockImplementation((req, res, next) => next());

      // Mock adminService to throw error
      adminService.ensureSystemRoles.mockRejectedValue(new Error('Seeding failed'));

      const response = await request(app).post('/api/admin/roles/seed');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ success: false, error: 'Seeding failed' });
    });
  });

  describe('POST /roles', () => {
    test('should create a new role successfully', async () => {
      // Mock middleware
      authenticate.mockImplementation((req, res, next) => {
        req.user = { id: mockUserId, companyId: mockCompanyId };
        next();
      });
      rbacAuthorize.mockImplementation(() => (req, res, next) => next());

      // Mock adminService
      const roleData = {
        name: 'Test Role',
        slug: 'test-role',
        description: 'A test role',
        permissions: [{ domain: 'test', actions: ['read'] }]
      };
      const createdRole = { ...roleData, companyId: mockCompanyId, _id: 'new-role-id' };
      adminService.createRole.mockResolvedValue(createdRole);

      const response = await request(app)
        .post('/api/admin/roles')
        .send(roleData);

      expect(authenticate).toHaveBeenCalled();
      expect(rbacAuthorize).toHaveBeenCalledWith('users', 'manageSettings');
      expect(adminService.createRole).toHaveBeenCalledWith(mockCompanyId, roleData);
      expect(response.status).toBe(201);
      expect(response.body).toEqual({ success: true, data: createdRole });
    });

    test('should return 400 when name or slug missing', async () => {
      // Mock middleware
      authenticate.mockImplementation((req, res, next) => {
        req.user = { id: mockUserId, companyId: mockCompanyId };
        next();
      });
      rbacAuthorize.mockImplementation(() => (req, res, next) => next());

      const response = await request(app)
        .post('/api/admin/roles')
        .send({ description: 'A test role' }); // Missing name and slug

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ success: false, error: 'name and slug are required.' });
    });

    test('should handle error when role creation fails', async () => {
      // Mock middleware
      authenticate.mockImplementation((req, res, next) => {
        req.user = { id: mockUserId, companyId: mockCompanyId };
        next()
```...')
        });
      });
    });

    describe('PATCH /roles/:roleId', () => {
      test('should update a role successfully', async () => {
        // Mock middleware
        authenticate.mockImplementation((req, res, next) => {
          req.user = { id: mockUserId, companyId: mockCompanyId };
          next();
        });
        rbacAuthorize.mockImplementation(() => (req, res, next) => next());

        // Mock adminService
        const roleId = 'role-id-123';
        const updateData = { name: 'Updated Role', description: 'Updated description' };
        const updatedRole = { _id: roleId, ...updateData, companyId: mockCompanyId };
        adminService.updateRole.mockResolvedValue(updatedRole);

        const response = await request(app)
          .patch(`/api/admin/roles/${roleId}`)
          .send(updateData);

        expect(authenticate).toHaveBeenCalled();
        expect(rbacAuthorize).toHaveBeenCalledWith('users', 'manageSettings');
        expect(adminService.updateRole).toHaveBeenCalledWith(roleId, mockCompanyId, updateData);
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ success: true, data: updatedRole });
      });

      test('should handle error when role update fails', async () => {
        // Mock middleware
        authenticate.mockImplementation((req, res, next) => {
          req.user = { id: mockUserId, companyId: mockCompanyId };
          next();
        });
        rbacAuthorize.mockImplementation(() => (req, res, next) => next());

        // Mock adminService to throw error
        const roleId = 'role-id-123';
        const updateData = { name: 'Updated Role' };
        adminService.updateRole.mockRejectedValue(new Error('Update failed'));

        const response = await request(app)
          .patch(`/api/admin/roles/${roleId}`)
          .send(updateData);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ success: false, error: 'Update failed' });
      });
    });

    describe('DELETE /roles/:roleId', () => {
      test('should delete a role successfully', async () => {
        // Mock middleware
        authenticate.mockImplementation((req, res, next) => {
          req.user = { id: mockUserId, companyId: mockCompanyId };
          next();
        });
        rbacAuthorize.mockImplementation(() => (req, res, next) => next());

        // Mock adminService
        const roleId = 'role-id-123';
        const deletionResult = { deleted: true };
        adminService.deleteRole.mockResolvedValue(deletionResult);

        const response = await request(app).delete(`/api/admin/roles/${roleId}`);

        expect(authenticate).toHaveBeenCalled();
        expect(rbacAuthorize).toHaveBeenCalledWith('users', 'manageSettings');
        expect(adminService.deleteRole).toHaveBeenCalledWith(roleId, mockCompanyId);
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ success: true, data: deletionResult });
      });

      test('should handle error when role deletion fails', async () => {
        // Mock middleware
        authenticate.mockImplementation((req, res, next) => {
          req.user = { id: mockUserId, companyId: mockCompanyId };
          next();
        });
        rbacAuthorize.mockImplementation(() => (req, res, next) => next());

        // Mock adminService to throw error
        const roleId = 'role-id-123';
        adminService.deleteRole.mockRejectedValue(new Error('Deletion failed'));

        const response = await request(app).delete(`/api/admin/roles/${roleId}`);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ success: false, error: 'Deletion failed' });
      });
    });

    describe('POST /users/:userId/role', () => {
      test('should assign role to user successfully', async () => {
        // Mock middleware
        authenticate.mockImplementation((req, res, next) => {
          req.user = { id: mockUserId, companyId: mockCompanyId };
          next();
        });
        rbacAuthorize.mockImplementation(() => (req, res, next) => next());

        // Mock adminService
        const userId = 'user-id-456';
        const roleData = { roleSlug: 'test-role' };
        const assignedUser = {
          _id: userId,
          role: 'test-role',
          // password would be removed in real implementation
        };
        adminService.assignRole.mockResolvedValue(assignedUser);

        const response = await request(app)
          .post(`/api/admin/users/${userId}/role`)
          .send(roleData);

        expect(authenticate).toHaveBeenCalled();
        expect(rbacAuthorize).toHaveBeenCalledWith('users', 'assignRole');
        expect(adminService.assignRole).toHaveBeenCalledWith(userId, 'test-role', mockUserId);
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ success: true, data: assignedUser });
      });

      test('should return 400 when roleSlug missing', async () => {
        // Mock middleware
        authenticate.mockImplementation((req, res, next) => {
          req.user = { id: mockUserId, companyId: mockCompanyId };
          next();
        });
        rbacAuthorize.mockImplementation(() => (req, res, next) => next());

        const userId = 'user-id-456';
        const response = await request(app)
          .post(`/api/admin/users/${userId}/role`)
          .send({}); // Missing roleSlug

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ success: false, error: 'roleSlug is required.' });
      });

      test('should handle error when role assignment fails', async () => {
        // Mock middleware
        authenticate.mockImplementation((req, res, next) => {
          req.user = { id: mockUserId, companyId: mockCompanyId };
          next();
        });
        rbacAuthorize.mockImplementation(() => (req, res, next) => next());

        // Mock adminService to throw error
        const userId = 'user-id-456';
        const roleData = { roleSlug: 'test-role' };
        adminService.assignRole.mockRejectedValue(new Error('Assignment failed'));

        const response = await request(app)
          .post(`/api/admin/users/${userId}/role`)
          .send(roleData);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ success: false, error: 'Assignment failed' });
      });
    });

    describe('POST /invites', () => {
      test('should invite user successfully', async () => {
        // Mock middleware
        authenticate.mockImplementation((req, res, next) => {
          req.user = { id: mockUserId, companyId: mockCompanyId };
          next();
        });
        rbacAuthorize.mockImplementation(() => (req, res, next) => next());

        // Mock adminService
        const inviteData = {
          email: 'test@example.com',
          name: 'Test User',
          role: 'test-role',
          teamIds: ['team-id-123']
        };
        const inviteResult = {
          _id: 'invite-id-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'test-role',
          teamIds: ['team-id-123']
        };
        adminService.inviteUser.mockResolvedValue(inviteResult);

        const response = await request(app)
          .post('/api/admin/invites')
          .send(inviteData);

        expect(authenticate).toHaveBeenCalled();
        expect(rbacAuthorize).toHaveBeenCalledWith('users', 'invite');
        expect(adminService.inviteUser).toHaveBeenCalledWith(
          mockCompanyId,
          mockUserId,
          inviteData
        );
        expect(response.status).toBe(201);
        expect(response.body).toEqual({ success: true, data: inviteResult });
      });

      test('should return 400 when email or name missing', async () => {
        // Mock middleware
        authenticate.mockImplementation((req, res, next) => {
          req.user = { id: mockUserId, companyId: mockCompanyId };
          next();
        });
        rbacAuthorize.mockImplementation(() => (req, res, next) => next());

        const response = await request(app)
          .post('/api/admin/invites')
          .send({ role: 'test-role' }); // Missing email and name

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ success: false, error: 'email and name are required.' });
      });

      test('should handle error when invitation fails', async () => {
        // Mock middleware
        authenticate.mockImplementation((req, res, next) => {
          req.user = { id: mockUserId, companyId: mockCompanyId };
          next();
        });
        rbacAuthorize.mockImplementation(() => (req, res, next) => next());

        // Mock adminService to throw error
        const inviteData = {
          email: 'test@example.com',
          name: 'Test User'
        };
        adminService.inviteUser.mockRejectedValue(new Error('Invitation failed'));

        const response = await request(app)
          .post('/api/admin/invites')
          .send(inviteData);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ success: false, error: 'Invitation failed' });
      });
    });

    describe('GET /stats', () => {
      test('should return platform stats successfully', async () => {
        // Mock middleware
        authenticate.mockImplementation((req, res, next) => {
          req.user = { id: mockUserId, companyId: mockCompanyId };
          next();
        });
        rbacAuthorize.mockImplementation(() => (req, res, next) => next());

        // Mock adminService
        const stats = {
          totalUsers: 150,
          totalTeams: 25,
          totalAccounts: 300
        };
        adminService.platformStats.mockResolvedValue(stats);

        const response = await request(app).get('/api/admin/stats');

        expect(authenticate).toHaveBeenCalled();
        expect(rbacAuthorize).toHaveBeenCalledWith('analytics', 'view');
        expect(adminService.platformStats).toHaveBeenCalled();
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ success: true, data: stats });
      });

      test('should handle error when fetching stats fails', async () => {
        // Mock middleware
        authenticate.mockImplementation((req, res, next) => {
          req.user = { id: mockUserId, companyId: mockCompanyId };
          next();
        });
        rbacAuthorize.mockImplementation(() => (req, res, next) => next());

        // Mock adminService to throw error
        adminService.platformStats.mockRejectedValue(new Error('Stats fetch failed'));

        const response = await request(app).get('/api/admin/stats');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ success: false, error: 'Stats fetch failed' });
      });
    });

    describe('GET /health', () => {
      test('should return health check successfully', async () => {
        // Mock adminService
        const health = { status: 'OK', timestamp: new Date().toISOString() };
        adminService.health.mockResolvedValue(health);

        const response = await request(app).get('/api/admin/health');

        expect(adminService.health).toHaveBeenCalled();
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ success: true, data: health });
      });

      test('should handle error when health check fails', async () => {
        // Mock adminService to throw error
        adminService.health.mockRejectedValue(new Error('Health check failed'));

        const response = await request(app).get('/api/admin/health');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ success: false, error: 'Health check failed' });
      });
    });
  });
});