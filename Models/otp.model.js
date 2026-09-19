const { prisma } = require("../Config/Prisma");

const findLatestOtpByMobile = async (mobile) => {
  return prisma.userOtp.findFirst({
    where: { mobile },
    select: {
      id: true,
      otp: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
};

const createOtp = async ({ mobile, otp, expiresAt, createdAt }) => {
  return prisma.userOtp.create({
    data: { mobile, otp, expiresAt, createdAt },
    select: { id: true },
  });
};

const deleteOtpsByMobile = async (mobile) => {
  return prisma.userOtp.deleteMany({
    where: { mobile },
  });
};

// Returns { count }: 0 when the row was already deleted (e.g. used by a parallel request)
const deleteOtpById = async (otpId) => {
  return prisma.userOtp.deleteMany({
    where: { id: otpId },
  });
};

module.exports = {
  findLatestOtpByMobile,
  createOtp,
  deleteOtpsByMobile,
  deleteOtpById,
};
