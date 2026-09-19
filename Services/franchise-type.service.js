const { findCitiesByIds } = require("../Models/city.model");
const {
  findFranchiseTypesBySalesDirectorId,
  findFranchiseTypesBySalesManagerId,
  findActiveFranchiseTypes,
  findActiveFranchiseTypesByIds,
  findActiveFranchiseTypesInCity,
} = require("../Models/franchise-type.model");

// airpropx_franchise_types.city_id has no foreign key, so city names are
// looked up separately
const getCityNamesById = async (franchiseTypes) => {
  const cityIds = [...new Set(franchiseTypes.map((type) => type.cityId))];

  if (cityIds.length === 0) {
    return new Map();
  }

  const cities = await findCitiesByIds(cityIds);

  return new Map(cities.map((city) => [city.id, city.cityName]));
};

const withCityNames = async (franchiseTypes) => {
  const cityNames = await getCityNamesById(franchiseTypes);

  return franchiseTypes.map((type) => ({
    id: Number(type.id),
    name: type.franchiseTypeName,
    code: type.franchiseTypeCode,
    status: type.status,
    cityId: type.cityId,
    cityName: cityNames.get(type.cityId) ?? null,
  }));
};

const getSalesDirectorFranchiseTypes = async (salesDirectorId) => {
  const franchiseTypes = await findFranchiseTypesBySalesDirectorId(salesDirectorId);

  return withCityNames(franchiseTypes);
};

const getSalesManagerFranchiseTypes = async (userId) => {
  const franchiseTypes = await findFranchiseTypesBySalesManagerId(userId);

  return withCityNames(franchiseTypes);
};

// franchiseTypeIds = null returns every Active franchise type
const getActiveFranchiseTypes = async (franchiseTypeIds = null) => {
  if (franchiseTypeIds === null) {
    return withCityNames(await findActiveFranchiseTypes());
  }

  if (franchiseTypeIds.length === 0) {
    return [];
  }

  return withCityNames(await findActiveFranchiseTypesByIds(franchiseTypeIds));
};

const getActiveFranchiseTypesInCity = async (cityId) =>
  withCityNames(await findActiveFranchiseTypesInCity(cityId));

module.exports = {
  getSalesDirectorFranchiseTypes,
  getSalesManagerFranchiseTypes,
  getActiveFranchiseTypes,
  getActiveFranchiseTypesInCity,
};
