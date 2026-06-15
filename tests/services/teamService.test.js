// Team Service Test for SokogateOS
// Tests the TeamService functionality

// Mock dependencies
jest.mock('../src/models/team');
jest.mock('../src/models/user');
jest.mock('../src/models/company');
jest.mock('../src/utils/logger');

const Team = require('../src/models/team');
const User = require('../src/models/user');
const Company = require('../src/models/company');
const TeamService = require('../src/services/teamService');

describe('TeamService', () => {
  let teamService;
  const mockCompanyId = 'test-company-id';
  const mockOwnerId = 'test-owner-id';
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    jest.clearAllMocks();
    teamService = TeamService; // It's a singleton instance
  });

  describe('create', () => {
    test('should create a team successfully', async () => {
      // Mock Company.findById
      const mockCompany = {
        _id: mockCompanyId,
        seatsLimit: 10,
      };
      Company.findById.mockResolvedValue(mockCompany);

      // Mock User.countDocuments
      User.countDocuments.mockResolvedValue(5);

      // Mock Team.create
      const createdTeam = {
        _id: 'new-team-id',
        name: 'Test Team',
        description: 'A test team',
        companyId: mockCompanyId,
        ownerId: mockOwnerId,
        members: [{ userId: mockOwnerId, role: 'owner' }],
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };
      Team.create.mockResolvedValue(createdTeam);

      // Mock Company.findByIdAndUpdate
      Company.findByIdAndUpdate.mockResolvedValue(true);

      const result = await teamService.create(mockCompanyId, mockOwnerId, {
        name: 'Test Team',
        description: 'A test team',
      });

      expect(Company.findById).toHaveBeenCalledWith(mockCompanyId);
      expect(User.countDocuments).toHaveBeenCalledWith({
        companyId: mockCompanyId,
        isActive: true,
      });
      expect(Team.create).toHaveBeenCalledWith({
        name: 'Test Team',
        description: 'A test team',
        companyId: mockCompanyId,
        ownerId: mockOwnerId,
        members: [{ userId: mockOwnerId, role: 'owner' }],
      });
      expect(Company.findByIdAndUpdate).toHaveBeenCalledWith(
        mockCompanyId,
        { $set: { seatsUsed: 6 } } // 5 existing + 1 new owner
      );
      expect(result).toEqual(createdTeam);
    });

    test('should throw error when company not found', async () => {
      Company.findById.mockResolvedValue(null);

      await expect(
        teamService.create(mockCompanyId, mockOwnerId, {
          name: 'Test Team',
        })
      ).rejects.toThrow('Company not found.');

      expect(Company.findById).toHaveBeenCalledWith(mockCompanyId);
    });
  });

  describe('list', () => {
    test('should list teams for a company', async () => {
      const mockTeams = [
        {
          _id: 'team-1',
          name: 'Team 1',
          companyId: mockCompanyId,
          isActive: true,
          createdAt: new Date(),
        },
        {
          _id: 'team-2',
          name: 'Team 2',
          companyId: mockCompanyId,
          isActive: true,
          createdAt: new Date(Date.now() - 3600000),
        },
      ];

      Team.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockTeams),
      });

      const result = await teamService.list(mockCompanyId);

      expect(Team.find).toHaveBeenCalledWith({ companyId: mockCompanyId, isActive: true });
      expect(result).toEqual(mockTeams);
    });

    test('should return empty array when no teams found', async () => {
      Team.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      });

      const result = await teamService.list(mockCompanyId);

      expect(result).toEqual([]);
    });
  });

  describe('get', () => {
    test('should get a team successfully for super admin', async () => {
      const teamId = 'team-id-123';
      const requesterId = 'super-admin-id';
      const requesterRole = 'super_admin';

      const mockTeam = {
        _id: teamId,
        name: 'Test Team',
        companyId: mockCompanyId,
        isActive: true,
      };

      Team.findById.mockResolvedValue(mockTeam);

      const result = await teamService.get(teamId, requesterId, requesterRole);

      expect(Team.findById).toHaveBeenCalledWith(teamId);
      expect(result).toEqual(mockTeam);
      // User.findById should not be called for super admin
    });

    test('should get a team successfully for same company member', async () => {
      const teamId = 'team-id-123';
      const requesterId = 'user-id-456';
      const requesterRole = 'member';

      const mockTeam = {
        __id: teamId,
        name: 'Test Team',
        companyId: mockCompanyId,
        isActive: true,
      };

      const mockUser = { companyId: mockCompanyId };

      Team.findById.mockResolvedValue(mockTeam);
      User.findById.mockResolvedValue(mockUser);

      const result = await teamService.get(teamId, requesterId, requesterRole);

      expect(Team.findById).toHaveBeenCalledWith(teamId);
      expect(User.findById).toHaveBeenCalledWith(requesterId);
      expect(result).toEqual(mockTeam);
    });

    test('should throw error when team not found', async () => {
      const teamId = 'non-existent-team';
      const requesterId = 'user-id-456';
      const requesterRole = 'member';

      Team.findById.mockResolvedValue(null);

      await expect(teamService.get(teamId, requesterId, requesterRole)).rejects.toThrow(
        'Team not found.'
      );

      expect(Team.findById).toHaveBeenCalledWith(teamId);
    });

    test('should throw error when team is not active', async () => {
      const teamId = 'inactive-team';
      const requesterId = 'user-id-456';
      const requesterRole = 'member';

      const mockTeam = {
        _id: teamId,
        name: 'Test Team',
        companyId: mockCompanyId,
        isActive: false,
      };

      Team.findById.mockResolvedValue(mockTeam);

      await expect(teamService.get(teamId, requesterId, requesterRole)).rejects.toThrow(
        'Team not found.'
      );

      expect(Team.findById).toHaveBeenCalledWith(teamId);
    });

    test('should throw error when user is from different company', async () => {
      const teamId = 'team-id-123';
      const requesterId = 'user-id-456';
      const requesterRole = 'member';

      const mockTeam = {
        _id: teamId,
        name: 'Test Team',
        companyId: mockCompanyId,
        isActive: true,
      };

      const mockUser = { companyId: 'different-company-id' };

      Team.findById.mockResolvedValue(mockTeam);
      User.findById.mockResolvedValue(mockUser);

      await expect(teamService.get(teamId, requesterId, requesterRole)).rejects.toThrow(
        'Forbidden.'
      );

      expect(Team.findById).toHaveBeenCalledWith(teamId);
      expect(User.findById).toHaveBeenCalledWith(requesterId);
    });
  });

  describe('update', () => {
    test('should update a team successfully for member', async () => {
      const teamId = 'team-id-123';
      const userId = 'user-id-456';

      const mockTeam = {
        _id: teamId,
        name: 'Old Name',
        description: 'Old Description',
        members: [{ userId: userId }], // User is a member
        save: jest.fn().mockResolvedValue(true),
      };

      Team.findOne.mockResolvedValue(mockTeam);

      const result = await teamService.update(teamId, userId, {
        name: 'New Name',
        description: 'New Description',
      });

      expect(Team.findOne).toHaveBeenCalledWith({ _id: teamId, 'members.userId': userId });
      expect(mockTeam.name).toBe('New Name');
      expect(mockTeam.description).toBe('New Description');
      expect(mockTeam.save).toHaveBeenCalled();
      expect(result).toEqual(mockTeam);
    });

    test('should throw error when user is not a member', async () => {
      const teamId = 'team-id-123';
      const userId = 'user-id-456';

      Team.findOne.mockResolvedValue(null); // Not a member

      await expect(
        teamService.update(teamId, userId, {
          name: 'New Name',
        })
      ).rejects.toThrow('Not a member of this team.');

      expect(Team.findOne).toHaveBeenCalledWith({ _id: teamId, 'members.userId': userId });
    });
  });

  describe('addMember', () => {
    test('should add a member successfully', async () => {
      const teamId = 'team-id-123';
      const inviterId = 'inviter-id-456';
      const inviterRole = 'admin';
      const newMemberData = {
        userId: 'new-user-id-789',
        role: 'member',
      };

      const mockTeam = {
        _id: teamId,
        companyId: mockCompanyId,
        members: [],
        save: jest.fn().mockResolvedValue(true),
      };

      const mockTargetUser = {
        _id: newMemberData.userId,
        companyId: mockCompanyId,
      };

      Team.findById.mockResolvedValue(mockTeam);
      User.findById.mockResolvedValue(mockTargetUser);

      const result = await teamService.addMember(teamId, inviterId, inviterRole, newMemberData);

      expect(Team.findById).toHaveBeenCalledWith(teamId);
      expect(User.findById).toHaveBeenCalledWith(newMemberData.userId);
      expect(mockTeam.members).toHaveLength(1);
      expect(mockTeam.members[0]).toMatchObject({
        userId: newMemberData.userId,
        role: 'member',
        invitedBy: undefined,
      });
      expect(mockTeam.save).toHaveBeenCalled();
      expect(result).toEqual(mockTeam);
    });

    test('should throw error when team not found', async () => {
      const teamId = 'non-existent-team';

      Team.findById.mockResolvedValue(null);

      await expect(
        teamService.addMember(teamId, 'inviter-id', 'admin', {
          userId: 'user-id',
        })
      ).rejects.toThrow('Team not found.');

      expect(Team.findById).toHaveBeenCalledWith(teamId);
    });

    test('should throw error when user not in same company', async () => {
      const teamId = 'team-id-123';
      const inviterId = 'inviter-id-456';
      const inviterRole = 'admin';
      const newMemberData = {
        userId: 'new-user-id-789',
      };

      const mockTeam = {
        _id: teamId,
        companyId: mockCompanyId,
        members: [],
      };

      const mockTargetUser = {
        _id: newMemberData.userId,
        companyId: 'different-company-id',
      };

      Team.findById.mockResolvedValue(mockTeam);
      User.findById.mockResolvedValue(mockTargetUser);

      await expect(
        teamService.addMember(teamId, inviterId, inviterRole, newMemberData)
      ).rejects.toThrow('User not in the same company.');

      expect(Team.findById).toHaveBeenCalledWith(teamId);
      expect(User.findById).toHaveBeenCalledWith(newMemberData.userId);
    });

    test('should throw error when user is already a member', async () => {
      const teamId = 'team-id-123';
      const inviterId = 'inviter-id-456';
      const inviterRole = 'admin';
      const newMemberData = {
        userId: 'existing-user-id',
      };

      const mockTeam = {
        _id: teamId,
        companyId: mockCompanyId,
        members: [{ userId: 'existing-user-id' }], // Already a member
      };

      Team.findById.mockResolvedValue(mockTeam);

      await expect(
        teamService.addMember(teamId, inviterId, inviterRole, newMemberData)
      ).rejects.toThrow('User is already a team member.');

      expect(Team.findById).toHaveBeenCalledWith(teamId);
    });

    test('should throw error when inviter has insufficient permissions', async () => {
      const teamId = 'team-id-123';
      const inviterId = 'member-id-456';
      const inviterRole = 'member'; // Regular member
      const newMemberData = {
        userId: 'new-user-id-789',
      };

      const mockTeam = {
        _id: teamId,
        companyId: mockCompanyId,
        members: [
          { userId: 'member-id-456', role: 'member' }, // Inviter is just a member, not owner/admin
        ],
      };

      const mockTargetUser = {
        _id: newMemberData.userId,
        companyId: mockCompanyId,
      };

      Team.findById.mockResolvedValue(mockTeam);
      User.findById.mockResolvedValue(mockTargetUser);

      await expect(
        teamService.addMember(teamId, inviterId, inviterRole, newMemberData)
      ).rejects.toThrow('Insufficient permissions to add members.');

      expect(Team.findById).toHaveBeenCalledWith(teamId);
      expect(User.findById).toHaveBeenCalledWith(newMemberData.userId);
    });
  });

  describe('removeMember', () => {
    test('should remove a member successfully by super admin', async () => {
      const teamId = 'team-id-123';
      const requesterId = 'super-admin-id';
      const requesterRole = 'super_admin';
      const memberId = 'member-id-456';

      const mockTarget = {
        remove: jest.fn(),
      };

      const mockTeam = {
        _id: teamId,
        members: {
          id: jest.fn().mockReturnValue(mockTarget),
        },
        save: jest.fn().mockResolvedValue(true),
      };

      Team.findById.mockResolvedValue(mockTeam);

      const result = await teamService.removeMember(teamId, requesterId, requesterRole, memberId);

      expect(Team.findById).toHaveBeenCalledWith(teamId);
      expect(mockTeam.members.id).toHaveBeenCalledWith(memberId);
      expect(mockTarget.remove).toHaveBeenCalled();
      expect(mockTeam.save).toHaveBeenCalled();
      expect(result).toEqual(mockTeam);
    });

    test('should remove a member successfully by team owner', async () => {
      const teamId = 'team-id-123';
      const requesterId = 'owner-id-456';
      const requesterRole = 'owner';
      const memberId = 'member-id-789';

      const mockTarget = {
        remove: jest.fn(),
        role: 'member', // Not an owner
      };

      const mockTeam = {
        _id: teamId,
        members: {
          id: jest.fn().mockReturnValue(mockTarget),
        },
        save: jest.fn().mockResolvedValue(true),
      };

      Team.findById.mockResolvedValue(mockTeam);

      const result = await teamService.removeMember(teamId, requesterId, requesterRole, memberId);

      expect(Team.findById).toHaveBeenCalledWith(teamId);
      expect(mockTeam.members.id).toHaveBeenCalledWith(memberId);
      expect(mockTarget.remove).toHaveBeenCalled();
      expect(mockTeam.save).toHaveBeenCalled();
      expect(result).toEqual(mockTeam);
    });

    test('should throw error when insufficient permissions (member trying to remove)', async () => {
      const teamId = 'team-id-123';
      const requesterId = 'member-id-456';
      const requesterRole = 'member';
      const memberId = 'member-id-789';

      await expect(
        teamService.removeMember(teamId, requesterId, requesterRole, memberId)
      ).rejects.toThrow('Insufficient permissions.');

      expect(Team.findById).not.toHaveBeenCalled();
    });

    test('should throw error when team not found', async () => {
      const teamId = 'non-existent-team';

      Team.findById.mockResolvedValue(null);

      await expect(
        teamService.removeMember(teamId, 'requester-id', 'admin', 'member-id')
      ).rejects.toThrow('Team not found.');

      expect(Team.findById).toHaveBeenCalledWith(teamId);
    });

    test('should throw error when member not found on team', async () => {
      const teamId = 'team-id-123';
      const requesterId = 'requester-id-456';
      const requesterRole = 'admin';
      const memberId = 'non-existent-member';

      const mockTeam = {
        _id: teamId,
        members: {
          id: jest.fn().mockReturnValue(undefined), // Member not found
        },
      };

      Team.findById.mockResolvedValue(mockTeam);

      await expect(
        teamService.removeMember(teamId, requesterId, requesterRole, memberId)
      ).rejects.toThrow('Member not found on team.');

      expect(Team.findById).toHaveBeenCalledWith(teamId);
      expect(mockTeam.members.id).toHaveBeenCalledWith(memberId);
    });

    test('should throw error when trying to remove an owner (non-super admin)', async () => {
      const teamId = 'team-id-123';
      const requesterId = 'admin-id-456';
      const requesterRole = 'admin';
      const memberId = 'owner-id-789';

      const mockTarget = {
        remove: jest.fn(),
        role: 'owner', // Trying to remove an owner
      };

      const mockTeam = {
        _id: teamId,
        members: {
          id: jest.fn().mockReturnValue(mockTarget),
        },
      };

      Team.findById.mockResolvedValue(mockTeam);

      await expect(
        teamService.removeMember(teamId, requesterId, requesterRole, memberId)
      ).rejects.toThrow('Cannot remove an owner.');

      expect(Team.findById).toHaveBeenCalledWith(teamId);
      expect(mockTeam.members.id).toHaveBeenCalledWith(memberId);
    });
  });

  describe('delete', () => {
    test('should delete a team successfully by super admin', async () => {
      const teamId = 'team-id-123';
      const requesterId = 'super-admin-id';
      const requesterRole = 'super_admin';

      const mockTeam = {
        _id: teamId,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      Team.findById.mockResolvedValue(mockTeam);

      const result = await teamService.delete(teamId, requesterId, requesterRole);

      expect(Team.findById).toHaveBeenCalledWith(teamId);
      expect(mockTeam.isActive).toBe(false);
      expect(mockTeam.save).toHaveBeenCalled();
      expect(result).toEqual(mockTeam);
    });

    test('should throw error when insufficient permissions (non-super admin)', async () => {
      const teamId = 'team-id-123';
      const requesterId = 'admin-id-456';
      const requesterRole = 'admin';

      await expect(teamService.delete(teamId, requesterId, requesterRole)).rejects.toThrow(
        'Only super admin can delete teams.'
      );

      expect(Team.findById).not.toHaveBeenCalled();
    });

    test('should throw error when team not found', async () => {
      const teamId = 'non-existent-team';

      Team.findById.mockResolvedValue(null);

      await expect(teamService.delete(teamId, 'requester-id', 'super_admin')).rejects.toThrow(
        'Team not found.'
      );

      expect(Team.findById).toHaveBeenCalledWith(teamId);
    });
  });
});
