# SingHealth Backend

## Endpoints
### Authentication Endpoint
* POST /auth - Authenticate user
### User Endpoints
* GET /users/tenants - Get all tenants
* GET /users/auditors - Get all auditors (DEVELOPMENT ONLY)
* GET /users/institutions - Get list of all institutions
* POST /users/tenants/create - Create tenant
* POST /users/auditors/create - Create auditor (DEVELOPMENT ONLY)
* DELETE /users/tenants/delete - Delete tenant
### Directory Endpoints
* GET /directory/outlets - Get all retail outlets
* PUT /directory/outlets/add - Add retail outlet
* POST /directory/outlets/update - Update retail outlet
* DELETE /directory/outlets/delete - delete retail outlet
### Report Endpoints
* POST /report/image/upload/test - Test image upload (DEVELOPMENT ONLY)
* POST /report/image/get - Test image url get (DEVELOPMENT ONLY)
* GET /report/checklistTypes - Get different checklist options
* GET /report/questions/:typeId - Get checklist questions based on checklist type
* POST /report/image/upload/multiple - Upload an array of images (DEVELOPMENT ONLY)
* GET /report/export/:reportId - Export full audit report as Excel
* GET /report/email/:reportId - Send excel report to tenant
### Dashboard Endpoints
* GET /dashboard/:auditorId - Get data for dashboard
### Tenant Action Endpoints
* GET /actions/unresolved/:tenantId - Get list of unresolved non-compliances for the tenant