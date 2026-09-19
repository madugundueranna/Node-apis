const { prisma } = require("../Config/Prisma");

const createImportBatch = async (data) => {
  return prisma.franchiseLeadImportBatch.create({ data, select: { id: true } });
};

const updateImportBatch = async (batchId, data) => {
  return prisma.franchiseLeadImportBatch.update({
    where: { id: batchId },
    data,
    select: { id: true },
  });
};

const createImportDuplicates = async (rows, db = prisma) => {
  return db.franchiseLeadImportDuplicate.createMany({ data: rows });
};

module.exports = {
  createImportBatch,
  updateImportBatch,
  createImportDuplicates,
};
