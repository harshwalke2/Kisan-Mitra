import { Types } from 'mongoose';
import FollowRequest from '../models/FollowRequest';
import User from '../models/User';

export const canUsersChat = async (userAId: string, userBId: string): Promise<boolean> => {
  const [userA, userB] = await Promise.all([
    User.findById(userAId).select('followers following'),
    User.findById(userBId).select('followers following'),
  ]);

  if (!userA || !userB) {
    return false;
  }

  const userAFollowsB = userA.following.some((id) => id.toString() === userBId);
  const userBFollowsA = userB.following.some((id) => id.toString() === userAId);

  if (userAFollowsB && userBFollowsA) {
    return true;
  }

  const acceptedRequest = await FollowRequest.findOne({
    status: 'accepted',
    $or: [
      { senderId: new Types.ObjectId(userAId), receiverId: new Types.ObjectId(userBId) },
      { senderId: new Types.ObjectId(userBId), receiverId: new Types.ObjectId(userAId) },
    ],
  }).select('_id');

  return Boolean(acceptedRequest);
};
