# Company area

Entry: `/workhub/next?view=company`. Available from the desktop sidebar and mobile More menu. Section/record links use `section` and `record` query parameters. The Company bundle and records are loaded on demand; opening it does not subscribe to all workspace tasks.

## Coverage

- Official documents: issuing authority, reference, issue/expiry dates, responsible person, advance reminders, renewal state, attachment/source link and authenticated PDF/image uploads (4 MB).
- HR: opens the existing employee/attendance/leave system; separate maintainable legal references with review dates. The starting official-source link is the Ministry of Labour's [Labour Law page](https://www.mol.gov.om/Laborlaw), verified 12 October 2026. No legislation is automatically interpreted or used to recalculate entitlements.
- Finance: expenses, reimbursements, advances, invoices and recurring costs, OMR amounts, approval/payment stages, responsible person, project reference, receipt, due-date reminders, review checks, totals and CSV report.
- External partners: freelancer/company profiles, contact details, specialties, engagement history, quality/deadline/value ratings and lessons learned.
- Institutional relations: contacts, cooperation areas, opportunities, contact history, outcomes and next follow-up reminders.
- Initiatives: employee submission, expected results, review, approval, implementation, recorded outcomes and recognition.

Forms and reading views use dialogs; mobile forms fill the viewport with one scrolling body and fixed actions. English/Arabic labels and logical alignment follow the selected app language.

## Access and persistence

`workhubCompanyAction` is an authenticated callable. The public transport setting does not grant data access. Approved membership or the existing master-admin claim is required. A manager/admin can read company records. Other members can read their own or assigned records. Employees can submit finance requests and initiatives; managers create other record types. Responsible people can update assigned non-request records. Request edits are limited to the submitting employee while submitted; manager edits of approved finance records send them back for approval. Paid records are locked. A finance requester cannot approve their own request.

Records live at `workhub_company/{module}/companyRecords/{id}`. Direct client reads/writes are denied; the callable scopes every read and checks mutations. Status transitions are validated server-side. Every write adds an immutable `history` entry. Revision checks prevent overwriting someone else's changes. Create IDs and next-period IDs make retries safe.

PDF/image files are stored without public download tokens under `workhub-company-private`. Upload/read requests check the record ACL. Downloads are returned to the authenticated client and opened through temporary local blob URLs. Replacing a file preserves the old object; this release does not purge original files.

Managers receive generic in-app review notifications; authors/owners receive status and reminder notifications. Notifications contain no document title, amount, or private attachment URL. Inbox links re-check access when opening the record.

`workhubCompanyReminders` runs at 08:00 Asia/Muscat. It sends the configured document advance reminder and a final expiry reminder, plus due/follow-up/review reminders. Queue fields and deterministic notification IDs avoid duplicate delivery on retries. A recurring expense is created for the next period explicitly after payment; month-end dates are clamped correctly, and the paid original is retained.

## Loading and reporting

The initial section query loads 40 records. Search/status filtering fetches older pages on demand. Until all pages are loaded, a visible notice states that totals are for loaded records. CSV export reads all accessible pages. Exports quote fields and escape spreadsheet formula prefixes. Each partner/contact record supports 100 activity entries; append-only audit history is separate and the UI shows its latest 50 events.

Existing project budgets, expenses and HR records remain in their current stores. The separate expense-system attachment referred to in the proposal was not supplied, so no external data migration is performed.

## Release checks

Run the Company tests alongside smart-loading, inbox, attendance and mobile tests, then both TypeScript builds. Create the additive Company access index with `scripts/workhub-loading-indexes.cjs create`. Deploy only `workhubCompanyAction` and `workhubCompanyReminders` for backend changes. Use the existing isolated WorkHub hosting release script to preserve unrelated hosted apps.
