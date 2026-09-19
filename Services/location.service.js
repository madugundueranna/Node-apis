const {
  countLocalities,
  findCities,
  findCountries,
  findLocalities,
  findStates,
} = require("../Models/location.model");

// Read-only location masters for the CRM screens. Adding and editing
// locations stays in the admin panel.

// active = deleted_at not set, inactive = deleted_at set
const STATUS_CONDITIONS = {
  active: { deletedAt: null },
  inactive: { deletedAt: { not: null } },
  all: {},
};

const buildWhere = ({ status, search }, nameField, codes = {}) => ({
  ...STATUS_CONDITIONS[status],
  ...Object.fromEntries(Object.entries(codes).filter(([, value]) => value)),
  ...(search ? { [nameField]: { contains: search } } : {}),
});

const isActive = (row) => row.deletedAt === null;

const listCountries = async (query) => {
  const countries = await findCountries(buildWhere(query, "countryName"));

  return countries.map((country) => ({
    id: country.id,
    name: country.countryName,
    code: country.countryCode,
    phoneCode: country.phoneCode,
    active: isActive(country),
  }));
};

const listStates = async (query) => {
  const states = await findStates(
    buildWhere(query, "stateName", { countryCode: query.countryCode })
  );

  return states.map((state) => ({
    id: state.id,
    name: state.stateName,
    code: state.stateCode,
    countryCode: state.countryCode,
    active: isActive(state),
  }));
};

const listCities = async (query) => {
  const cities = await findCities(
    buildWhere(query, "cityName", { countryCode: query.countryCode, stateCode: query.stateCode })
  );

  return cities.map((city) => ({
    id: city.id,
    name: city.cityName,
    code: city.cityCode,
    stateCode: city.stateCode,
    countryCode: city.countryCode,
    active: isActive(city),
  }));
};

const listLocalities = async (query) => {
  const where = buildWhere(query, "localityName", {
    countryCode: query.countryCode,
    stateCode: query.stateCode,
    cityCode: query.cityCode,
  });
  const total = await countLocalities(where);
  const lastPage = Math.max(1, Math.ceil(total / query.perPage));
  const page = Math.min(query.page, lastPage);
  const localities = await findLocalities(where, {
    skip: (page - 1) * query.perPage,
    take: query.perPage,
  });

  return {
    items: localities.map((locality) => ({
      id: locality.id,
      name: locality.localityName,
      cityCode: locality.cityCode,
      stateCode: locality.stateCode,
      countryCode: locality.countryCode,
      active: isActive(locality),
    })),
    pagination: { page, perPage: query.perPage, total, lastPage },
  };
};

module.exports = {
  listCountries,
  listStates,
  listCities,
  listLocalities,
};
