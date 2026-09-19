const { prisma } = require("../Config/Prisma");

// Soft-deleted cities are included: a franchise type keeps showing its city
const findCitiesByIds = async (cityIds) => {
  return prisma.masterCity.findMany({
    where: { id: { in: cityIds } },
    select: { id: true, cityName: true },
  });
};

module.exports = {
  findCitiesByIds,
};
