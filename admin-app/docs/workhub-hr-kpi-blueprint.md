# WorkHub HR + KPI Blueprint

## Scope Shift

The HR workspace should operate as a people operations system, not a project-delivery space.
Primary records should represent employees, leave cases, KPI cycles, initiatives, and learning/compliance artifacts.

Organization-first navigation is mandatory:

- Organization unit (root)
- Department
- Sub-department
- Employee profiles (inside departments/sub-departments)

Employee profile records are not task containers. Tasks should be created in department/operations records, not inside employee profiles.

## Data Domains

- Employee master profile:
  - Identity: employee ID, payroll ID, national ID/passport, emergency contact.
  - Structure: department, sub-department, manager employee ID, authority level.
  - Employment: employment status, employment type, work mode (on-site/remote/hybrid), hire date, exit date.
  - Role: job title, job grade, role profile/job description.
  - Compensation: basic salary, allowances, deductions, payment frequency, bank account references.
  - Leave: available leave days and used leave days.
  - Evidence: CV/profile link, certification references, profile image references.
- Leave management:
  - Leave type, approver, start/end, return-to-work commitments, handover notes.
- KPI and OKR cycles:
  - Cycle owner, cadence, objective set, KPI targets, checkpoint notes, close summary.
- Initiative and motivation programs:
  - Program owner, type (recognition, wellbeing, innovation), cadence, participation outcomes.
- Learning and certification:
  - Certification/training, issuer, issue/renewal dates, evidence link, competency impact.

## Organization Model

- Root Organization Unit:
  - Tenant-level container for HR governance and cross-department policy records.
- Department:
  - Primary business function node with department code, department contacts, and optional head employee assignment.
- Sub-department:
  - Child function under a parent department with own code and optional head employee assignment.
- Employee Profile:
  - Must be created under organization unit/department/sub-department with strongest preference for department/sub-department placement.

## KPI Hierarchy

Use a 3-layer KPI model:

1. Lagging outcomes:
   - Retention rate, regretted attrition, time-to-productivity.
2. Leading indicators:
   - Engagement pulse score, leave backlog age, KPI review completion ratio.
3. Process health:
   - Document compliance completeness, authority review SLA, certification renewal on-time rate.

## OKR Cadence

- Annual: strategic people goals.
- Quarterly: measurable HR/department objectives.
- Monthly: KPI checkpoint and variance review.
- Weekly: execution blockers and interventions.

## Leave Governance

- Standard states: submitted -> reviewed -> approved/rejected -> in_leave -> return_to_work -> archived.
- Enforce approver ownership and timestamped decision notes.
- Require return-to-work checkpoint before case closure for long leave categories.
- Track SLA-risk states for approval delays and escalations.

## Authority Matrix

- Define role levels (employee, supervisor, manager, HR admin).
- Track approval boundaries by action type (leave, profile update, KPI sign-off, policy exceptions).
- Revalidate authority assignments during role changes/upgrades.

## UI/UX Principles

- HR actions should use HR nouns (employee profile, leave case, KPI cycle), not project-centric terminology.
- Keep creation flows compact and structured around mandatory governance fields.
- Keep audit-relevant values in structured labels inside record descriptions for migration compatibility.
- At HR root level, primary CTA should be organization/departments oriented, not “create project”.
- Employee profile views should prioritize profile data sections (identity, employment, compensation, leave, compliance) over task widgets.
