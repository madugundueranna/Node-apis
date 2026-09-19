const { LEAD_MESSAGES } = require("../Common/Constants");
const { handleRequest } = require("../Common/RequestHandler");
const STATUS = require("../Common/StatusCodes");
const { getLeadImportSettings } = require("../Config/Config");
const { readJsonBody } = require("../Validators/helpers");
const {
  parseLeadId,
  validateActivityInput,
  validateImportInput,
  validateLeadInput,
  validateLeadListQuery,
  validateNoResponseInput,
} = require("../Validators/lead.validator");
const { getLeadDetails, listLeads } = require("../Services/lead-query.service");
const { createFranchiseLead, updateFranchiseLead } = require("../Services/lead-form.service");
const {
  getNextActivityOptions,
  saveLeadActivity,
  saveNoResponse,
} = require("../Services/lead-flow.service");
const { importLeads } = require("../Services/lead-import.service");

// Franchise leads of the logged-in user (req.auth from the authenticate middleware)

const getLeads = handleRequest("Failed to list franchise leads:", async (req) => ({
  message: LEAD_MESSAGES.LIST,
  data: await listLeads(req.auth, validateLeadListQuery(req.query)),
}));

const getLead = handleRequest("Failed to fetch franchise lead:", async (req) => ({
  message: LEAD_MESSAGES.DETAILS,
  data: await getLeadDetails(req.auth, parseLeadId(req.params.id)),
}));

const createLead = handleRequest("Failed to add franchise lead:", async (req) => ({
  status: STATUS.CREATED,
  message: LEAD_MESSAGES.CREATED,
  data: await createFranchiseLead(
    req.auth,
    validateLeadInput(readJsonBody(req), { creating: true })
  ),
}));




const updateLead = handleRequest("Failed to update franchise lead:", async (req) => {
  const leadId = parseLeadId(req.params.id);
  const input = validateLeadInput(readJsonBody(req), { creating: false });

  return {
    message: LEAD_MESSAGES.UPDATED,
    data: await updateFranchiseLead(req.auth, leadId, input),
  };
});

const importLeadRows = handleRequest("Failed to import franchise leads:", async (req) => {
  const input = validateImportInput(readJsonBody(req), getLeadImportSettings().maxRows);
  const { message, data } = await importLeads(req.auth, input);

  return { message, data };
});

const getNextActivity = handleRequest("Failed to load next activity options:", async (req) => ({
  message: LEAD_MESSAGES.NEXT_ACTIVITY,
  data: await getNextActivityOptions(req.auth, parseLeadId(req.params.id)),
}));

const saveActivity = handleRequest("Failed to save lead activity:", async (req) => {
  const leadId = parseLeadId(req.params.id);
  const activity = validateActivityInput(readJsonBody(req));

  return {
    message: LEAD_MESSAGES.ACTIVITY_SAVED,
    data: await saveLeadActivity(req.auth, leadId, activity, req.ip),
  };
});

const saveLeadNoResponse = handleRequest("Failed to save lead no response:", async (req) => {
  const leadId = parseLeadId(req.params.id);
  const input = validateNoResponseInput(readJsonBody(req));

  return {
    message: LEAD_MESSAGES.NO_RESPONSE_SAVED,
    data: await saveNoResponse(req.auth, leadId, input, req.ip),
  };
});

module.exports = {
  getLeads,
  getLead,
  createLead,
  updateLead,
  importLeadRows,
  getNextActivity,
  saveActivity,
  saveLeadNoResponse,
};
