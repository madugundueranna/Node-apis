const { handleRequest } = require("../Common/RequestHandler");
const { parseOptionalLeadId, requireQueryId } = require("../Validators/lookup.validator");
const { checkHealth, getLeadStatusFlow, getLookups } = require("../Services/lookup.service");
const {
  getInternalTransferTypesForLead,
  getTransferCities,
  getTransferCountries,
  getTransferFranchiseTypes,
  getTransferStates,
} = require("../Services/franchise-transfer.service");

const getHealth = handleRequest("Health check failed:", async () => ({
  message: "OK",
  data: await checkHealth(),
}));

const getLeadLookups = handleRequest("Failed to load lookups:", async (req) => ({
  message: "Lookups",
  data: await getLookups(req.auth),
}));

const getLeadStatuses = handleRequest("Failed to load lead statuses:", async () => ({
  message: "Lead statuses",
  data: await getLeadStatusFlow(),
}));

// Change Franchise Type cascade

const getInternalTypes = handleRequest("Failed to load internal transfer types:", async (req) => ({
  message: "Franchise Types",
  data: await getInternalTransferTypesForLead(req.auth, requireQueryId(req.query, "leadId")),
}));

const getCountries = handleRequest("Failed to load transfer countries:", async () => ({
  message: "Countries",
  data: await getTransferCountries(),
}));

const getStates = handleRequest("Failed to load transfer states:", async (req) => ({
  message: "States",
  data: await getTransferStates(requireQueryId(req.query, "countryId")),
}));

const getCities = handleRequest("Failed to load transfer cities:", async (req) => ({
  message: "Cities",
  data: await getTransferCities(requireQueryId(req.query, "stateId")),
}));

const getCityFranchiseTypes = handleRequest("Failed to load transfer franchise types:", async (req) => {
  const cityId = requireQueryId(req.query, "cityId");
  const leadId = parseOptionalLeadId(req.query);

  return {
    message: "Franchise Types",
    data: await getTransferFranchiseTypes(req.auth, cityId, leadId),
  };
});

module.exports = {
  getHealth,
  getLeadLookups,
  getLeadStatuses,
  getInternalTypes,
  getCountries,
  getStates,
  getCities,
  getCityFranchiseTypes,
};
