const { findActiveFranchiseTypeLocationIds } = require("../Models/franchise-type.model");
const { findCities, findCountries, findStates } = require("../Models/location.model");
const {
  getActiveFranchiseTypes,
  getActiveFranchiseTypesInCity,
} = require("./franchise-type.service");
const { getAssignedFranchiseTypeIds } = require("./lead-access.service");
const { presentFranchiseType } = require("./master.service");
const { findScopedLeadOrFail } = require("./lead-record.service");
const { loadStatusCatalog } = require("./status-catalog.service");

// Change Franchise Type options - CodeIgniter Franchise_master_model transfer
// lookups. The cascade offers only places that have an Active franchise type,
// so it never dead-ends.

// Internal Transfer: the user's own Active franchise types; for a user without
// assigned types, the Active types in the lead's current city. The lead's
// current type is never offered.
const getInternalTransferTypes = async (auth, lead) => {
  const assignedIds = getAssignedFranchiseTypeIds(auth.identity, { activeOnly: true });

  let types = [];
  if (assignedIds.length > 0) {
    types = await getActiveFranchiseTypes(assignedIds);
  } else if (lead.franchiseTypeCityId) {
    types = await getActiveFranchiseTypesInCity(lead.franchiseTypeCityId);
  }

  return types.filter((type) => type.id !== lead.franchiseTypeId).map(presentFranchiseType);
};

const getInternalTransferTypesForLead = async (auth, leadId) => {
  const catalog = await loadStatusCatalog();
  const lead = await findScopedLeadOrFail(auth, leadId, catalog);

  return getInternalTransferTypes(auth, lead);
};

const ACTIVE_LOCATION = { deletedAt: null };

const getTransferCountries = async () => {
  const countryIds = await findActiveFranchiseTypeLocationIds("countryId");
  const countries = await findCountries({ ...ACTIVE_LOCATION, id: { in: countryIds } });

  return countries.map((country) => ({ id: country.id, name: country.countryName }));
};

const getTransferStates = async (countryId) => {
  const stateIds = await findActiveFranchiseTypeLocationIds("stateId", { countryId });
  const states = await findStates({ ...ACTIVE_LOCATION, id: { in: stateIds } });

  return states.map((state) => ({ id: state.id, name: state.stateName }));
};

const getTransferCities = async (stateId) => {
  const cityIds = await findActiveFranchiseTypeLocationIds("cityId", { stateId });
  const cities = await findCities({ ...ACTIVE_LOCATION, id: { in: cityIds } });

  return cities.map((city) => ({ id: city.id, name: city.cityName }));
};

// External Transfer: Active franchise types of a city, without the lead's current type
const getTransferFranchiseTypes = async (auth, cityId, leadId = null) => {
  let excludeTypeId = null;

  if (leadId) {
    const catalog = await loadStatusCatalog();
    excludeTypeId = (await findScopedLeadOrFail(auth, leadId, catalog)).franchiseTypeId;
  }

  const types = await getActiveFranchiseTypesInCity(cityId);

  return types.filter((type) => type.id !== excludeTypeId).map(presentFranchiseType);
};

module.exports = {
  getInternalTransferTypes,
  getInternalTransferTypesForLead,
  getTransferCountries,
  getTransferStates,
  getTransferCities,
  getTransferFranchiseTypes,
};
