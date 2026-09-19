const { prisma } = require("../Config/Prisma");

const findActiveShortcuts = async () => {
  return prisma.franchiseCrmShortcut.findMany({
    where: { status: "Active" },
    select: {
      label: true,
      icon: true,
      moduleCode: true,
      systemCode: true,
    },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
  });
};

module.exports = {
  findActiveShortcuts,
};
