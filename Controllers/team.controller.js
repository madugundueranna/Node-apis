const { handleRequest } = require("../Common/RequestHandler");
const { parseAssignmentFilter, parseSalesManagerId } = require("../Validators/team.validator");
const {
  getFranchiseTypeAssignments,
  getMySalesDirector,
  getMySalesManager,
  listMySalesManagers,
} = require("../Services/team.service");

const getSalesManagers = handleRequest("Failed to list franchise sales managers:", async (req) => ({
  message: "Franchise Sales Managers",
  data: await listMySalesManagers(req.auth),
}));

const getSalesManager = handleRequest("Failed to fetch franchise sales manager:", async (req) => ({
  message: "Franchise Sales Manager details",
  data: await getMySalesManager(req.auth, parseSalesManagerId(req.params.id)),
}));

const getSalesDirector = handleRequest("Failed to fetch sales director:", async (req) => ({
  message: "Sales Director details",
  data: await getMySalesDirector(req.auth),
}));

const getAssignments = handleRequest("Failed to list franchise type assignments:", async (req) => ({
  message: "Franchise Type assignments",
  data: await getFranchiseTypeAssignments(req.auth, parseAssignmentFilter(req.query)),
}));

module.exports = {
  getSalesManagers,
  getSalesManager,
  getSalesDirector,
  getAssignments,
};
