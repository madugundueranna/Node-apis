const { handleRequest } = require("../Common/RequestHandler");
const {
  validateLocalityQuery,
  validateLocationQuery,
} = require("../Validators/location.validator");
const {
  listCities,
  listCountries,
  listLocalities,
  listStates,
} = require("../Services/location.service");

const getCountries = handleRequest("Failed to list countries:", async (req) => ({
  message: "Countries",
  data: await listCountries(validateLocationQuery(req.query)),
}));

const getStates = handleRequest("Failed to list states:", async (req) => ({
  message: "States",
  data: await listStates(validateLocationQuery(req.query)),
}));

const getCities = handleRequest("Failed to list cities:", async (req) => ({
  message: "Cities",
  data: await listCities(validateLocationQuery(req.query)),
}));

const getLocalities = handleRequest("Failed to list localities:", async (req) => ({
  message: "Localities",
  data: await listLocalities(validateLocalityQuery(req.query)),
}));

module.exports = {
  getCountries,
  getStates,
  getCities,
  getLocalities,
};
