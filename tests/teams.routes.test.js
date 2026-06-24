// Teams Routes Test for SokogateOS
// Tests the teams route handlers

const request = require('supertest');
const express = require('express');

jest.mock('../src/services/teamService');
jest.mock('../src/middleware/auth');
jest.mock('../src/middleware/rbac', () => ({
  rbacAuthorize: jest.fn(() => (req, res, next) => next())
}));

const teamService = require('../src/services/teamService');
const { authenticate } = require('../src/middleware/auth');
const { rbacAuthorize } = require('../src/middleware/rbac');
const teamsRoutes = require('../src/routes/teams');

describe('Teams Routes', () => {
  let app;
  const mockCompanyId = 'test-company-id';
  const mockUserId = 'test-user-id';
  const mockUserRole = 'member';

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/teams', teamsRoutes);
  });

  describe('GET /', () => {
    test('should return teams list successfully', async () => {
      // Mock middleware
      authenticate.mockImplementation((req, res, next) => {
        req.user = { id: mockUserId, companyId: mockCompanyId, role: mockUserRole };
        next();
      });

      // Mock teamService
      const mockTeams = [
        { _id: 'team-1', name: 'Team 1', companyId: mockCompanyId, isActive: true },
        { _id: 'team-2', name: 'Team 2', companyId: mockCompanyId, isActive: true },
      ];
      teamService.list.mockResolvedValue(mockTeams);

      const response = await request(app).get('/api/teams');

      expect(authenticate).toHaveBeenCalled();
      expect(teamService.list).toHaveBeenCalledWith(mockCompanyId);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, data: mockTeams });
    });

    test('should handle error when fetching teams fails', async () => {
      // Mock middleware
      authenticate.mockImplementation((req, res, next) => {
        req.user = { id: mockUserId, companyId: mockCompanyId, role: mockUserRole };
        next();
      });

      // Mock teamService to throw error
      teamService.list.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/teams');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ success: false, error: 'Database error' });
    });
  });

  describe('GET /:teamId', () => {
    test('should return a team successfully', async () => {
      // Mock middleware
      authenticate.mockImplementation((req, res, next) => {
        req.user = { id: mockUserId, companyId: mockCompanyId, role: mockUserRole };
        next();
      });

      // Mock teamService
      const teamId = 'team-id-123';
      const mockTeam = {
        _id: teamId,
        name: 'Test Team',
        companyId: mockCompanyId,
        isActive: true,
      };
      teamService.get.mockResolvedValue(mockTeam);

      const response = await request(app).get(`/api/teams/${teamId}`);

      expect(authenticate).toHaveBeenCalled();
      expect(teamService.get).toHaveBeenCalledWith(teamId, mockUserId, mockUserRole);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, data: mockTeam });
    });

    test('should return 404 when team not found', async () => {
      // Mock middleware
      authenticate.mockImplementation((req, res, next) => {
        req.user = { id: mockUserId, companyId: mockCompanyId, role: mockUserRole };
        next();
      });

      // Mock teamService to throw error
      teamService.get.mockRejectedValue(new Error('Team not found.'));

      const response = await request(app).get('/api/teams/non-existent-team');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ success: false, error: 'Team not found.' });
    });

    test('should handle error when fetching team fails', async () => {
      // Mock middleware
      authenticate.mockImplementation((req, res, next) => {
        req.user = { id: mockUserId, companyId: mockCompanyId, role: mockUserRole };
        next();
      });

      // Mock teamService to throw different error (route always returns 404 for GET /:teamId)
      teamService.get.mockRejectedValue(new Error('Some other error'));

      const response = await request(app).get('/api/teams/team-id-123');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ success: false, error: 'Some other error' });
    });
  });


  describe('POST /', () => {
    test('should create a team successfully', async () => {
      // Mock middleware
      authenticate.mockImplementation((req, res, next) => {
        req.user = { id: mockUserId, companyId: mockCompanyId, role: mockUserRole };
        next();
      });
      rbacAuthorize.mockImplementation(() => (req, res, next) => next());

      // Mock teamService
      const teamData = { name: 'New Team', description: 'A new team' };
      const createdTeam = {
        _id: 'new-team-id',
        ...teamData,
        companyId: mockCompanyId,
        ownerId: mockUserId,
        members: [{ userId: mockUserId, role: 'owner' }],
        isActive: true,
      };
      teamService.create.mockResolvedValue(createdTeam);

      const response = await request(app).post('/api/teams').send(teamData);

      expect(authenticate).toHaveBeenCalled();
      expect(teamService.create).toHaveBeenCalledWith(mockCompanyId, mockUserId, teamData);
      expect(response.status).toBe(201);
      expect(response.body).toEqual({ success: true, data: createdTeam });
    });

    test('should handle error when team creation fails', async () => {
      // Mock middleware
      authenticate.mockImplementation((req, res, next) => {
        req.user = { id: mockUserId, companyId: mockCompanyId, role: mockUserRole };
        next();
      });
      rbacAuthorize.mockImplementation(() => (req, res, next) => next());

      // Mock teamService to throw error
      const teamData = { name: 'New Team' };
      teamService.create.mockRejectedValue(new Error('Creation failed'));

      const response = await request(app).post('/api/teams').send(teamData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ success: false, error: 'Creation failed' });
    });
  });

  describe('PATCH /:teamId', () => {
    test('should update a team successfully', async () => {
      // Mock middleware
      authenticate.mockImplementation((req, res, next) => {
        req.user = { id: mockUserId, companyId: mockCompanyId, role: mockUserRole };
        next();
      });
      rbacAuthorize.mockImplementation(() => (req, res, next) => next());

      // Mock teamService
      const teamId = 'team-id-123';
      const updateData = { name: 'Updated Team', description: 'Updated description' };
      const updatedTeam = {
        _id: teamId,
        ...updateData,
        companyId: mockCompanyId,
        isActive: true,
      };
      teamService.update.mockResolvedValue(updatedTeam);

      const response = await request(app).patch(`/api/teams/${teamId}`).send(updateData);

      expect(authenticate).toHaveBeenCalled();
      expect(teamService.update).toHaveBeenCalledWith(teamId, mockUserId, updateData);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, data: updatedTeam });
    });

    test('should handle error when team update fails', async () => {
      // Mock middleware
      authenticate.mockImplementation((req, res, next) => {
        req.user = { id: mockUserId, companyId: mockCompanyId, role: mockUserRole };
        next();
      });
      rbacAuthorize.mockImplementation(() => (req, res, next) => next());

      // Mock teamService to throw error
      const teamId = 'team-id-123';
      const updateData = { name: 'Updated Team' };
      teamService.update.mockRejectedValue(new Error('Update failed'));

      const response = await request(app).patch(`/api/teams/${teamId}`).send(updateData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ success: false, error: 'Update failed' });
    });
  });

  describe('POST /:teamId/members', () => {
    test('should add a member to team successfully', async () => {
      // Mock middleware
      authenticate.mockImplementation((req, res, next) => {
        req.user = { id: mockUserId, companyId: mockCompanyId, role: mockUserRole };
        next();
      });
      rbacAuthorize.mockImplementation(() => (req, res, next) => next());

      // Mock teamService
      const teamId = 'team-id-123';
      const memberData = {
        userId: 'new-user-id-456',
        role: 'member',
      };
      const updatedTeam = {
        _id: teamId,
        name: 'Test Team',
        companyId: mockCompanyId,
        members: [
          { userId: mockUserId, role: 'owner' },
          { ...memberData, joinedAt: new Date().toISOString() },
        ],
        isActive: true,
      };
      teamService.addMember.mockResolvedValue(updatedTeam);

      const response = await request(app).post(`/api/teams/${teamId}/members`).send(memberData);

      expect(authenticate).toHaveBeenCalled();
      expect(teamService.addMember).toHaveBeenCalledWith(
        teamId,
        mockUserId,
        mockUserRole,
        memberData
      );
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ success: true, data: updatedTeam });
    });

    test('should return 400 when required fields missing', async () => {
      // Mock middleware
      authenticate.mockImplementation((req, res, next) => {
        req.user = { id: mockUserId, companyId: mockCompanyId, role: mockUserRole };
        next();
      });
      rbacAuthorize.mockImplementation(() => (req, res, next) => next());

      const teamId = 'team-id-123';
      teamService.addMember.mockRejectedValue(new Error('User not in the same company.'));

      const response = await request(app).post(`/api/teams/${teamId}/members`).send({}); // Missing userId

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ success: false, error: 'User not in the same company.' });
    });

    test('should handle error when adding member fails', async () => {
      // Mock middleware
      authenticate.mockImplementation((req, res, next) => {
        req.user = { id: mockUserId, companyId: mockCompanyId, role: mockUserRole };
        next();
      });
      rbacAuthorize.mockImplementation(() => (req, res, next) => next());

      // Mock teamService to throw error
      const teamId = 'team-id-123';
      const memberData = { userId: 'new-user-id-456' };
      teamService.addMember.mockRejectedValue(new Error('Failed to add member'));

      const response = await request(app).post(`/api/teams/${teamId}/members`).send(memberData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ success: false, error: 'Failed to add member' });
    });
  });

  describe('DELETE /:teamId/members/:memberId', () => {
    test('should remove a member from team successfully', async () => {
      // Mock middleware
      authenticate.mockImplementation((req, res, next) => {
        req.user = { id: mockUserId, companyId: mockCompanyId, role: mockUserRole };
        next();
      });
      rbacAuthorize.mockImplementation(() => (req, res, next) => next());

      // Mock teamService
      const teamId = 'team-id-123';
      const memberId = 'member-id-456';
      const updatedTeam = {
        _id: teamId,
        name: 'Test Team',
        companyId: mockCompanyId,
        members: [{ userId: mockUserId, role: 'owner' }], // Member removed
        isActive: true,
      };
      teamService.removeMember.mockResolvedValue(updatedTeam);

      const response = await request(app).delete(`/api/teams/${teamId}/members/${memberId}`);

      expect(authenticate).toHaveBeenCalled();
      expect(teamService.removeMember).toHaveBeenCalledWith(
        teamId,
        mockUserId,
        mockUserRole,
        memberId
      );
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, data: updatedTeam });
    });

    test('should handle error when removing member fails', async () => {
      // Mock middleware
      authenticate.mockImplementation((req, res, next) => {
        req.user = { id: mockUserId, companyId: mockCompanyId, role: mockUserRole };
        next();
      });
      rbacAuthorize.mockImplementation(() => (req, res, next) => next());

      // Mock teamService to throw error
      const teamId = 'team-id-123';
      const memberId = 'member-id-456';
      teamService.removeMember.mockRejectedValue(new Error('Failed to remove member'));

      const response = await request(app).delete(`/api/teams/${teamId}/members/${memberId}`);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ success: false, error: 'Failed to remove member' });
    });
  });

  describe('DELETE /:teamId', () => {
    test('should delete a team successfully', async () => {
      // Mock middleware
      authenticate.mockImplementation((req, res, next) => {
        req.user = { id: mockUserId, companyId: mockCompanyId, role: mockUserRole };
        next();
      });
      rbacAuthorize.mockImplementation(() => (req, res, next) => next());

      // Mock teamService
      const teamId = 'team-id-123';
      const deletedTeam = {
        _id: teamId,
        name: 'Test Team',
        companyId: mockCompanyId,
        isActive: false,
      };
      teamService.delete.mockResolvedValue(deletedTeam);

      const response = await request(app).delete(`/api/teams/${teamId}`);

      expect(authenticate).toHaveBeenCalled();
      expect(teamService.delete).toHaveBeenCalledWith(teamId, mockUserId, mockUserRole);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, data: deletedTeam });
    });

    test('should return 403 when insufficient permissions to delete', async () => {
      // Mock middleware
      authenticate.mockImplementation((req, res, next) => {
        req.user = { id: mockUserId, companyId: mockCompanyId, role: mockUserRole };
        next();
      });
      rbacAuthorize.mockImplementation(() => (req, res, next) => next());

      // Mock teamService to throw error
      const teamId = 'team-id-123';
      teamService.delete.mockRejectedValue(new Error('Only super admin can delete teams.'));

      const response = await request(app).delete(`/api/teams/${teamId}`);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        success: false,
        error: 'Only super admin can delete teams.',
      });
    });

    test('should handle error when deleting team fails', async () => {
      // Mock middleware
      authenticate.mockImplementation((req, res, next) => {
        req.user = { id: mockUserId, companyId: mockCompanyId, role: mockUserRole };
        next();
      });
      rbacAuthorize.mockImplementation(() => (req, res, next) => next());

      // Mock teamService to throw error
      const teamId = 'team-id-123';
      teamService.delete.mockRejectedValue(new Error('Deletion failed'));

      const response = await request(app).delete(`/api/teams/${teamId}`);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ success: false, error: 'Deletion failed' });
    });
  });
});
