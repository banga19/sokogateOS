const Team = require('../models/team');
const User = require('../models/user');
const Company = require('../models/company');
const logger = require('../utils/logger');

class TeamService {
  async create(companyId, ownerId, { name, description }) {
    const company = await Company.findById(companyId);
    if (!company) throw new Error('Company not found.');

    const seatsLimit = company.seatsLimit || 5;
    const totalUsers = await User.countDocuments({ companyId, isActive: true });

    const team = await Team.create({
      name,
      description,
      companyId,
      ownerId,
      members: [{ userId: ownerId, role: 'owner' }],
    });
    await Company.findByIdAndUpdate(companyId, { $set: { seatsUsed: totalUsers + 1 } });
    logger.info(`TeamService: created team "${name}" for company ${companyId}`);
    return team;
  }

  async list(companyId) {
    return Team.find({ companyId, isActive: true }).sort({ createdAt: -1 });
  }

  async get(teamId, requesterId, requesterRole) {
    try {
      const team = await Team.findById(teamId);
      if (!team || !team.isActive) throw new Error('Team not found.');

      // Super admin can access any team
      if (requesterRole === 'super_admin') return team;

      // Check that the requester belongs to the same company as the team
      const user = await User.findById(requesterId).select('companyId');
      if (!user || user.companyId.toString() !== team.companyId.toString()) {
        throw new Error('Forbidden.');
      }

      return team;
    } catch (error) {
      logger.error('Error in teamService.get:', error);
      throw error;
    }
  }

  async update(teamId, userId, { name, description }) {
    const team = await Team.findOne({ _id: teamId, 'members.userId': userId });
    if (!team) throw new Error('Not a member of this team.');
    if (name) team.name = name;
    if (description !== undefined) team.description = description;
    await team.save();
    return team;
  }

  async addMember(teamId, inviterId, inviterRole, { userId, role = 'member', invitedBy }) {
    const team = await Team.findById(teamId);
    if (!team) throw new Error('Team not found.');

    const targetUser = await User.findById(userId);
    if (!targetUser || targetUser.companyId.toString() !== team.companyId.toString()) {
      throw new Error('User not in the same company.');
    }

    if (team.members.some((m) => m.userId.toString() === userId))
      throw new Error('User is already a team member.');

    if (
      inviterRole === 'member' &&
      !team.members.some(
        (m) => m.userId.toString() === inviterId && ['owner', 'admin'].includes(m.role)
      )
    ) {
      throw new Error('Insufficient permissions to add members.');
    }

    team.members.push({ userId, role, invitedBy, joinedAt: new Date() });
    await team.save();
    return team;
  }

  async removeMember(teamId, requesterId, requesterRole, memberId) {
    if (requesterRole === 'member') throw new Error('Insufficient permissions.');

    const team = await Team.findById(teamId);
    if (!team) throw new Error('Team not found.');

    const target = team.members.id(memberId);
    if (!target) throw new Error('Member not found on team.');

    if (target.role === 'owner' && requesterRole !== 'super_admin') {
      throw new Error('Cannot remove an owner.');
    }

    target.remove();
    await team.save();
    return team;
  }

  async delete(teamId, requesterId, requesterRole) {
    if (requesterRole !== 'super_admin') throw new Error('Only super admin can delete teams.');
    const team = await Team.findById(teamId);
    if (!team) throw new Error('Team not found.');
    team.isActive = false;
    await team.save();
    return team;
  }
}

module.exports = new TeamService();
