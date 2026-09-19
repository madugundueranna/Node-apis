const { prisma } = require("../Config/Prisma");

// Location masters. A row with deleted_at set is inactive (no status column).

const byName = (field) => [{ [field]: "asc" }, { id: "asc" }];

const findCountries = async (where) => {
  return prisma.masterCountry.findMany({
    where,
    select: { id: true, countryName: true, countryCode: true, phoneCode: true, deletedAt: true },
    orderBy: byName("countryName"),
  });
};

const findStates = async (where) => {
  return prisma.masterState.findMany({
    where,
    select: { id: true, stateName: true, stateCode: true, countryCode: true, deletedAt: true },
    orderBy: byName("stateName"),
  });
};

const findCities = async (where) => {
  return prisma.masterCity.findMany({
    where,
    select: {
      id: true,
      cityName: true,
      cityCode: true,
      stateCode: true,
      countryCode: true,
      deletedAt: true,
    },
    orderBy: byName("cityName"),
  });
};

const findLocalities = async (where, { skip, take }) => {
  return prisma.masterLocality.findMany({
    where,
    select: {
      id: true,
      localityName: true,
      cityCode: true,
      stateCode: true,
      countryCode: true,
      deletedAt: true,
    },
    orderBy: byName("localityName"),
    skip,
    take,
  });
};

const countLocalities = async (where) => {
  return prisma.masterLocality.count({ where });
};

module.exports = {
  findCountries,
  findStates,
  findCities,
  findLocalities,
  countLocalities,
};
