# PDF Field Mapper

## Technical Architecture & Development Reference

**Project:** PDF Field Mapper
**Document Version:** 1.0
**Created:** November 2, 2026
**Document Type:** Internal Technical Documentation
**Development Status:** Functional development prototype

---

# 1. Project Overview

## 1.1 Purpose

PDF Field Mapper is a desktop application designed to inspect, recognize, map, and rename interactive fields within PDF documents.

Its primary purpose is to standardize the field names used by different PDF forms so that external software systems can populate those documents consistently.

The application is initially being developed for Florida permitting documents, although its architecture is intended to support other types of interactive PDF forms.

Many government agencies and organizations distribute PDF forms with inconsistent field naming conventions.

For example, three applications may contain fields named:

* `OwnerFullName`
* `PropertyOwner`
* `Homeowner_Name`

Although these names differ, all three may represent the same underlying information.

PDF Field Mapper allows users to associate these fields with a standardized identifier:

`customer_name`

The application can then produce a modified PDF containing the standardized field name.

## 1.2 Primary Objectives

The application's primary objectives are:

1. Open PDF documents stored on the user's computer.
2. Identify existing interactive PDF fields.
3. Display field positions and properties.
4. Match original field names against a standardized dictionary.
5. Suggest appropriate mappings using recognition rules.
6. Allow users to review and correct mappings.
7. Rename PDF fields without unnecessarily altering the document.
8. Preserve the original PDF.
9. Save the modified document to a user-selected location.
10. Learn eligible field-name aliases for future recognition.
11. Preserve unfinished mapping work between application sessions.

## 1.3 Intended Use Case

The intended workflow begins when a user downloads an original PDF application from a county or other document provider.

The user opens that document in PDF Field Mapper, reviews the detected interactive fields, and assigns standardized dictionary identifiers.

After the mappings are approved, the application generates a modified copy of the original document.

The modified PDF can then be used by other systems that understand the standardized field names.

## 1.4 Relationship to PermitPapers.com

PDF Field Mapper is being developed as a standalone application.

Its standardized field naming system is intended to support automated document population workflows, including potential use with PermitPapers.com.

However, PDF Field Mapper maintains its own application architecture and development lifecycle.

Integration with PermitPapers.com should be treated as a separate development milestone unless explicitly implemented and tested.

---

# 2. Technology Stack

PDF Field Mapper uses several technologies, each responsible for a specific part of the application.

| Technology     | Responsibility                                    |
| -------------- | ------------------------------------------------- |
| React          | User interface and application state              |
| TypeScript     | Type-safe frontend and Electron development       |
| Vite           | Frontend development and build tooling            |
| Tailwind CSS   | User interface styling                            |
| Electron       | Desktop application environment                   |
| PDF.js         | PDF rendering and interactive field inspection    |
| Python         | PDF document modification                         |
| pypdf          | Reading, manipulating, and writing PDF structures |
| Supabase       | Centralized dictionary and learned-alias storage  |
| PostgreSQL     | Relational database used by Supabase              |
| Web Crypto API | Local PDF fingerprint generation                  |
| localStorage   | Local draft mapping persistence                   |
| Git            | Source control                                    |
| GitHub         | Remote source repository                          |

## 2.1 Technology Responsibilities

The application's architecture deliberately separates responsibilities.

**React and TypeScript** manage the user interface, field selection, recognition suggestions, and temporary mapping decisions.

**PDF.js** opens documents for viewing and extracts information about interactive PDF fields.

**Electron** provides access to desktop capabilities that should not be available directly to the React renderer.

**Python and pypdf** modify the underlying PDF structures and write completed PDF documents.

**Supabase** manages shared dictionary information and learned aliases.

**Local storage** preserves unfinished mappings for documents opened on the same application installation.

This separation is important for maintainability.

Changes to the recognition interface should not require rewriting the PDF processing engine.

Likewise, improvements to Python's PDF compatibility should not require major modifications to the React interface.

---

# 3. High-Level Application Architecture

The application consists of five major layers.

```text
                  PDF FIELD MAPPER
                         |
                         v
              REACT USER INTERFACE
                         |
            +------------+------------+
            |                         |
            v                         v
       PDF VIEWER              MAPPING INTERFACE
            |                         |
            v                         v
       PDF.JS ENGINE            RECOGNITION ENGINE
            |                         |
            |                         v
            |                  SUPABASE DICTIONARY
            |                         |
            +------------+------------+
                         |
                         v
                  VALIDATED MAPPINGS
                         |
                         v
                  ELECTRON PRELOAD
                         |
                         v
                  ELECTRON MAIN
                         |
                         v
                  PYTHON PROCESSOR
                         |
                         v
                  MODIFIED PDF
                         |
                         v
                 SUCCESSFUL SAVE
                         |
               +---------+---------+
               |                   |
               v                   v
         LOCAL DRAFTS       SUPABASE LEARNING
```

## 3.1 Separation of Concerns

The application follows these architectural rules:

1. React does not directly execute Python.
2. React does not receive unrestricted filesystem access.
3. PDF.js is used for inspection and rendering, not production PDF writing.
4. Python is responsible for actual PDF field modifications.
5. Supabase stores recognition data, not the original PDF documents.
6. Local drafts contain field mapping information rather than complete PDF files.
7. Alias learning occurs only after a successful PDF save.
8. Failed database operations must not invalidate a successful PDF save.

These rules should be preserved during future development unless there is an explicit architectural reason to change them.

---

# 4. Project Folder Structure

The following structure documents the major directories and files used by the current architecture.

It is a representative technical inventory rather than a verified listing of every file in the local repository.

```text
pdf-field-mapper/
│
├── docs/
│   └── TECHNICAL_ARCHITECTURE.md
│
├── electron/
│   ├── main.ts
│   └── preload.ts
│
├── python/
│   ├── pdf_processor.py
│   └── requirements.txt
│
├── src/
│   │
│   ├── components/
│   │   │
│   │   ├── common/
│   │   │
│   │   └── pdf/
│   │       ├── PdfPageViewer.tsx
│   │       ├── PdfFieldOverlay.tsx
│   │       ├── PdfFieldMappingPanel.tsx
│   │       └── PdfDocumentRecognitionReview.tsx
│   │
│   ├── pages/
│   │   └── EditorPage.tsx
│   │
│   ├── lib/
│   │   │
│   │   ├── pdf/
│   │   │   ├── inspectPdf.ts
│   │   │   ├── preparePdfRenames.ts
│   │   │   └── pdfDraftStorage.ts
│   │   │
│   │   └── supabase/
│   │       ├── client.ts
│   │       ├── dictionary.ts
│   │       ├── aliases.ts
│   │       ├── recognitionCatalog.ts
│   │       └── learnSavedPdfAliases.ts
│   │
│   └── types/
│       └── electron.d.ts
│
├── .venv/
├── package.json
├── package-lock.json
└── vite.config.ts
```

Additional application routes, components, recognition utilities, database migrations, and configuration files may exist.

The complete directory inventory should be updated against the local repository when preparing future documentation revisions.

---

# 5. Major Application Components

## 5.1 EditorPage.tsx

**Location:** `src/pages/EditorPage.tsx`

The Editor Page serves as the central coordination component for the PDF editing workflow.

Its responsibilities include:

* Managing the currently selected PDF.
* Receiving inspection information from the viewer.
* Tracking selected interactive fields.
* Maintaining draft dictionary mappings.
* Coordinating individual and document-wide mapping interfaces.
* Validating mappings before saving.
* Communicating with Electron.
* Displaying PDF save results.
* Coordinating optional Supabase alias learning.
* Managing local draft recovery.

The Editor should coordinate these operations without directly implementing PDF parsing, database queries, or filesystem modifications.

Those operations belong to dedicated services.

## 5.2 PdfPageViewer.tsx

**Location:** `src/components/pdf/PdfPageViewer.tsx`

This component is responsible for displaying PDF documents.

It uses PDF.js to:

* Open local PDF files.
* Render individual pages.
* Navigate between pages.
* Apply zoom levels.
* Display interactive field overlays.
* Trigger field inspection.

The viewer maintains document-specific display state.

It communicates with the Editor through callback properties.

Examples include:

* `onSelectField`
* `onClearDraftMappings`
* `onViewerInfoChange`
* `onSourceFileChange`

The original JavaScript `File` object is passed to the Editor so that the original document bytes can later be sent to Electron.

The viewer does not modify PDF files.

## 5.3 PdfFieldOverlay.tsx

**Location:** `src/components/pdf/PdfFieldOverlay.tsx`

This component displays visual indicators over interactive PDF fields.

Its responsibilities include:

* Drawing field rectangles.
* Positioning overlays relative to the rendered PDF.
* Highlighting selected fields.
* Forwarding field selections to the Editor.

Overlay positioning must remain consistent with the PDF.js rendering viewport.

Changes to zoom behavior should be tested against field overlay alignment.

## 5.4 PdfFieldMappingPanel.tsx

**Location:** `src/components/pdf/PdfFieldMappingPanel.tsx`

This component supports individual field mapping.

It displays information about the selected field and provides dictionary-based mapping options.

Its responsibilities include:

* Displaying recognition suggestions.
* Allowing manual dictionary selection.
* Displaying the currently selected mapping.
* Updating the shared draft mapping state through callbacks.

The component should not independently maintain a separate authoritative copy of the user's mappings.

## 5.5 PdfDocumentRecognitionReview.tsx

**Location:** `src/components/pdf/PdfDocumentRecognitionReview.tsx`

This component supports reviewing mappings across an entire document.

It provides an alternative to selecting each individual field directly on the PDF.

The document-wide review and individual mapping panel must use the same underlying draft mapping state.

A mapping assigned through one interface should be reflected in the other.

---

# 6. PDF Inspection Engine

## 6.1 Purpose

The inspection engine identifies interactive fields within PDF documents.

**Primary implementation:** `src/lib/pdf/inspectPdf.ts`

The engine uses PDF.js to inspect document pages and their annotations.

## 6.2 Extracted Information

For each detected interactive widget, the application may record:

* Field identifier.
* Original field name.
* Field type.
* Page number.
* Widget index.
* X coordinate.
* Y coordinate.
* Width.
* Height.
* Read-only status.
* Required status.

The inspection result also includes document-level information such as page count and widget count.

## 6.3 Widgets Versus Logical Fields

An important architectural distinction exists between PDF widgets and logical PDF fields.

A logical field represents a particular piece of form data.

A widget represents a visual or interactive appearance of that field on a PDF page.

A single logical field can have multiple widgets.

For example:

```text
Logical Field:
    OwnerName
       |
       +-- Widget on Page 1
       |
       +-- Widget on Page 2
```

Renaming the logical field affects its underlying field identity.

It does not mean each widget must receive an independent field name.

This distinction is important during mapping validation and PDF modification.

## 6.4 Widget Identity

The application uses a composite identity to distinguish individual widgets.

The established identity format is based on:

```typescript
JSON.stringify([
  field.pageNumber,
  field.id,
  field.widgetIndex,
])
```

This identity is used to associate draft mappings with inspected widgets.

The same identity-generation function should be used consistently throughout the application.

---

# 7. Canonical Dictionary

## 7.1 Purpose

The canonical dictionary defines the standardized identifiers that PDF fields should use.

For example:

| Canonical Identifier    | Meaning                  |
| ----------------------- | ------------------------ |
| `customer_name`         | Customer's name          |
| `company_name`          | Company name             |
| `company_phone`         | Company telephone number |
| `job_price`             | Project or job price     |
| `customer_address_city` | Customer's city          |

These are examples of the naming system rather than a complete dictionary inventory.

## 7.2 Dictionary Authority

The canonical dictionary is the authoritative source for standardized field identifiers.

Users should map PDF fields to existing approved dictionary keys.

The application should not silently create new canonical identifiers whenever an unfamiliar field is encountered.

New dictionary keys should be introduced through an explicit management process.

## 7.3 Dictionary Identifiers

Dictionary records use unique database identifiers.

React mapping state references these database IDs.

When saving a PDF, the selected dictionary ID is resolved into its canonical field name.

This provides a separation between:

* Database identity.
* Human-readable dictionary information.
* Actual PDF field name.

## 7.4 Dictionary Validation

Before saving, mappings should be checked against the current dictionary.

Important checks include:

* The selected dictionary key exists.
* The key is active.
* The canonical identifier is valid.
* The proposed mapping does not create conflicting PDF field names.

Inactive or invalid dictionary entries must not be silently applied.

---

# 8. Recognition Engine

## 8.1 Purpose

The recognition engine helps users identify appropriate canonical dictionary keys for unfamiliar PDF field names.

The recognition system is intended to assist users rather than make irreversible mapping decisions automatically.

## 8.2 Recognition Methods

The current design supports multiple recognition strategies.

### Exact Matching

The original PDF field name exactly matches a canonical identifier.

Example:

```text
customer_name → customer_name
```

### Normalized Matching

The original name can be matched after applying compatible normalization rules.

### Controlled Synonyms

Known alternative terminology can help identify the correct dictionary key.

### Partial Matching

A field name may contain meaningful terms that resemble a canonical identifier or its known variations.

### Approved Learned Aliases

Previously confirmed field names stored in Supabase can improve future recognition.

## 8.3 Recognition Results

Recognition suggestions should provide enough information for users to make informed decisions.

Potential information includes:

* Suggested canonical key.
* Recognition method.
* Confidence or ranking information.
* Original field name.

## 8.4 User Confirmation

Recognition suggestions do not automatically become approved mappings.

Users review suggestions and choose the appropriate dictionary key.

This prevents uncertain recognition results from directly altering PDF documents.

---

# 9. Draft Mapping System

## 9.1 Purpose

The draft mapping system stores a user's current field assignments before PDF saving.

Draft mappings are managed in React state.

Conceptually:

```typescript
Record<string, string>
```

Each record associates:

```text
Widget Identity → Dictionary Key ID
```

For example:

```text
["1","field-12",0] → dictionary-key-uuid
```

The exact widget identity is generated by the application's shared identity function.

## 9.2 Shared State

The Editor owns the authoritative draft mapping state.

Both the individual mapping panel and document-wide recognition review update that state.

This prevents separate interfaces from maintaining conflicting mapping information.

## 9.3 Mapping Validation

**Primary implementation:** `src/lib/pdf/preparePdfRenames.ts`

Before saving a modified PDF, the application prepares a validated rename plan.

Validation includes:

* Confirming selected dictionary keys are valid.
* Checking that shared logical fields receive consistent assignments.
* Detecting duplicate final names.
* Preventing collisions with existing unmapped fields.
* Identifying unsupported mapping operations.

Only validated rename instructions are sent to Python.

---

# 10. Local Draft Recovery

## 10.1 Purpose

Local draft recovery prevents users from losing unfinished mapping work when they close or navigate away from the Editor.

**Primary implementation:** `src/lib/pdf/pdfDraftStorage.ts`

The feature is separate from both Python PDF saving and Supabase alias learning.

## 10.2 Document Identification

A document is identified using a SHA-256 fingerprint generated from its original file contents.

The fingerprint is used as a local storage identifier.

Two documents with the same filename but different contents should receive different fingerprints.

## 10.3 Stored Information

The local draft contains:

* A storage format version.
* Widget identities.
* Selected dictionary key IDs.

The draft does not contain the PDF document itself.

## 10.4 Recovery Process

```text
User Opens PDF
       |
       v
Calculate Document Fingerprint
       |
       v
Analyze Interactive Fields
       |
       v
Check Local Draft Storage
       |
       v
Validate Stored Widget Identities
       |
       v
Restore Compatible Mappings
```

## 10.5 Autosave

After recovery has completed, changes to the draft mapping state are saved locally.

A temporary clearing of mappings during reanalysis must not overwrite an existing stored draft.

The Editor uses recovery state to control when autosaving is permitted.

## 10.6 Discarding Drafts

Users can explicitly discard local mappings for the current PDF.

Discarding a local draft must not:

* Delete the original PDF.
* Delete previously generated PDFs.
* Delete global learned aliases.
* Modify the canonical dictionary.

## 10.7 Limitations

Local storage is not a guaranteed permanent backup.

Drafts may be lost if application data is cleared or the application storage location changes.

The current design should also be reviewed for interrupted writes, storage capacity failures, and application shutdown during updates.

Long-term development may replace or supplement localStorage with a more durable persistence mechanism.

---

# 11. Electron Architecture

## 11.1 Purpose

Electron provides the desktop application environment.

Its main process handles operations requiring desktop privileges.

Its renderer process runs the React interface.

## 11.2 Electron Main Process

**Location:** `electron/main.ts`

Major responsibilities include:

* Creating the application window.
* Managing application lifecycle.
* Receiving approved IPC requests.
* Validating incoming PDF save requests.
* Opening the system Save As dialog.
* Creating temporary source files.
* Launching the Python processor.
* Processing Python responses.
* Cleaning up temporary files.
* Reporting save results to React.

## 11.3 Electron Preload Bridge

**Location:** `electron/preload.ts`

The preload script exposes a limited API to React.

The established saving method is:

```typescript
window.electronAPI.saveMappedPdf(request)
```

React does not receive direct access to Electron's entire IPC interface.

## 11.4 Security Configuration

The established Electron window configuration uses:

```typescript
nodeIntegration: false
contextIsolation: true
sandbox: true
webSecurity: true
```

These settings help isolate the renderer from privileged Node.js and Electron capabilities.

New desktop functionality should be exposed through narrowly scoped preload methods.

## 11.5 PDF Save IPC

The saving operation uses a dedicated IPC channel:

```text
pdf:save-mapped
```

The request contains:

* Original PDF filename.
* Original PDF bytes.
* Validated field rename instructions.

Electron controls the output file location through the system Save As dialog.

The renderer should not be allowed to execute arbitrary filesystem operations through the save interface.

---

# 12. Python PDF Processing Engine

## 12.1 Purpose

Python performs the actual modification of PDF field names.

**Primary implementation:** `python/pdf_processor.py`

**PDF library:** pypdf

The processing engine operates independently from the React interface.

## 12.2 Communication Format

Electron launches the Python processor as a child process.

Instructions are passed as JSON through standard input.

Python returns a structured JSON response through standard output.

Example request:

```json
{
  "action": "rename_fields",
  "sourcePath": "C:/example/original.pdf",
  "outputPath": "C:/example/original-mapped.pdf",
  "renames": [
    {
      "originalName": "OwnerFullName",
      "canonicalName": "customer_name"
    }
  ]
}
```

## 12.3 Processing Workflow

The Python processor performs these operations:

1. Validate the incoming request.
2. Validate source and destination paths.
3. Open the original PDF.
4. Inspect the AcroForm structure.
5. Collect logical PDF fields.
6. Validate requested field renames.
7. Detect duplicate resulting field names.
8. Clone the original PDF.
9. Update approved field-name entries.
10. Generate the modified PDF in memory.
11. Reopen and verify the generated document.
12. Write the verified PDF to the selected destination.
13. Return a structured success or failure response.

## 12.4 Field Renaming

PDF field names are represented within AcroForm field dictionaries.

The processor updates the appropriate `/T` entries of the cloned field objects.

The intent is to modify the field names without unnecessarily modifying the document's visible content or widget structure.

## 12.5 Output Verification

The processor performs structural checks before reporting success.

These include verifying:

* Page count.
* Logical field names.
* Logical field count.
* Interactive widget count.
* Basic preservation of field types and stored values.

Structural verification does not completely replace visual inspection or compatibility testing in external PDF applications.

## 12.6 Original File Protection

The processor writes a separate output file.

Existing output files are not overwritten automatically.

The original source document remains unchanged.

This behavior is especially important when working with official county documents.

## 12.7 Signature Fields

Many permitting documents contain signature fields.

The processor is designed to preserve those fields rather than reject the document merely because signature fields exist.

Both empty and populated signature fields may be encountered.

**Important limitation:** Rewriting a PDF that already contains a valid cryptographic digital signature will generally invalidate that signature.

Preserving the field object and its stored value does not guarantee that an existing cryptographic signature remains valid.

The intended workflow primarily involves original, unsigned permit applications downloaded directly from county websites.

## 12.8 Current Limitations

The processor does not yet provide complete support for every PDF format.

Known limitations include:

* XFA forms.
* Encrypted PDFs requiring passwords.
* Certain hierarchical field renaming operations.
* Duplicate final logical field names.
* Full preservation of cryptographic signature validity.
* Unverified compatibility with every county's PDF generation software.

The initial Electron integration uses a project-local Python virtual environment.

A standalone packaged application will require a distribution strategy for the Python runtime and processor dependencies.

---

# 13. Supabase Integration

## 13.1 Purpose

Supabase provides centralized storage for recognition-related information.

Its primary responsibilities include:

* Storing canonical dictionary keys.
* Storing approved global aliases.
* Supporting recognition data retrieval.
* Enforcing database authorization policies.

The PDF documents themselves are not uploaded to Supabase as part of the current mapping and saving workflow.

## 13.2 Major Services

| Service                   | Responsibility                                       |
| ------------------------- | ---------------------------------------------------- |
| `client.ts`               | Supabase client configuration                        |
| `dictionary.ts`           | Canonical dictionary retrieval and management        |
| `aliases.ts`              | Learned-alias database operations                    |
| `recognitionCatalog.ts`   | Shared recognition data loading and caching          |
| `learnSavedPdfAliases.ts` | Learning eligible aliases after successful PDF saves |

## 13.3 Recognition Catalog

The recognition catalog consolidates data required by the recognition interface.

It supports caching and refresh behavior so that multiple components can consume consistent recognition data.

After new aliases are created, the catalog can be invalidated and refreshed.

## 13.4 Learned Aliases

A learned alias associates an original PDF field name with an approved canonical dictionary key.

Example:

```text
Original Field:
HomeownerFullName

Canonical Dictionary Key:
customer_name
```

Future documents containing that original name can use the learned alias during recognition.

---

# 14. Database Structure

The database design shared during development includes several related tables.

**Verification note:** The following describes the provided migration design. The current deployed Supabase schema should be checked before treating every table and constraint as confirmed production state.

## 14.1 dictionary_keys

Stores approved canonical dictionary entries.

Important fields include:

* `id`
* `key_name`
* `display_name`
* `category`
* `description`
* `website_supported`
* `is_active`
* `created_at`
* `updated_at`

## 14.2 field_aliases

Stores global field-name aliases.

Important fields include:

* `id`
* `original_name`
* `normalized_name`
* `dictionary_key_id`
* `notes`
* `is_active`
* `created_at`
* `updated_at`

Each alias references a canonical dictionary entry.

## 14.3 page_templates

The database design includes support for page-specific template recognition.

Important fields include:

* `id`
* `template_name`
* `document_name`
* `page_number`
* `fingerprint`
* `fingerprint_version`
* `page_width`
* `page_height`
* `is_active`

This is intended to support recognition based on document or page structure.

The presence of this table in the schema design does not establish that full page-template recognition is currently implemented.

## 14.4 page_template_fields

Stores field mappings associated with specific page templates.

Important fields include:

* `id`
* `page_template_id`
* `dictionary_key_id`
* `original_field_name`
* `widget_index`
* `field_type`
* Position and dimension information.

This provides a foundation for recognizing fields whose names are too ambiguous for global aliases.

## 14.5 mapping_confirmations

The database design includes records of confirmed mapping decisions.

Important fields include:

* `id`
* `original_field_name`
* `dictionary_key_id`
* `source`
* `scope`
* `saved_output_id`
* `page_template_id`
* `confirmed_at`
* `notes`

This table provides a potential audit trail for confirmed mapping decisions.

Its intended schema should not be confused with a confirmed active integration in the current Editor.

## 14.6 admin_users

The provided migration includes an administrator authorization table.

Its purpose is to identify users permitted to manage protected recognition data.

The migration also defines an administrator-checking database function and row-level security policies.

The actual deployed authorization configuration should be reviewed before distribution.

---

# 15. Alias Learning

## 15.1 Purpose

Alias learning improves recognition after users successfully map and save PDF fields.

**Primary implementation:** `src/lib/supabase/learnSavedPdfAliases.ts`

## 15.2 Learning Workflow

```text
User Confirms Mapping
          |
          v
PDF Save Requested
          |
          v
Python Processes PDF
          |
          v
PDF Successfully Saved
          |
          v
Evaluate Learning Eligibility
          |
          v
Check Existing Aliases
          |
          v
Create Eligible Alias
          |
          v
Refresh Recognition Catalog
```

## 15.3 Learning Restrictions

Global learning is deliberately conservative.

Names that are ambiguous or automatically generated should not become global aliases.

Examples of names generally unsuitable for global learning include:

* `Name`
* `City`
* `Phone`
* `Text1`
* `Field17`
* `CheckBox3`

The learning service also checks for conflicts with existing aliases.

## 15.4 Existing Alias Handling

If an alias already exists with the same mapping, no duplicate should be created.

If it points to another dictionary key, the system should avoid silently replacing it.

Inactive aliases should not be automatically reactivated.

## 15.5 Successful Save Requirement

Alias learning must never occur before the PDF has been successfully saved.

If the user cancels saving, no learning should occur.

If Python fails, no learning should occur.

## 15.6 Database Failure Handling

A failure to create or refresh an alias must not cause the application to report a successful PDF save as failed.

PDF saving and database learning are separate operations.

The user should receive an accurate result for each.

---

# 16. Application Data Flow

The following sequence represents the intended complete document workflow.

```text
1. OPEN ORIGINAL PDF
          |
          v
2. RENDER DOCUMENT
          |
          v
3. ANALYZE INTERACTIVE FIELDS
          |
          v
4. LOAD RECOGNITION DATA
          |
          v
5. DISPLAY MAPPING SUGGESTIONS
          |
          v
6. USER REVIEWS AND ASSIGNS MAPPINGS
          |
          v
7. AUTOSAVE LOCAL DRAFT
          |
          v
8. VALIDATE FIELD RENAMES
          |
          v
9. USER CONFIRMS SAVE
          |
          v
10. WINDOWS SAVE AS DIALOG
          |
          v
11. ELECTRON EXECUTES PYTHON
          |
          v
12. PYTHON RENAMES FIELDS
          |
          v
13. VERIFY AND SAVE MODIFIED PDF
          |
          v
14. REPORT SAVE RESULT
          |
          v
15. OPTIONAL SUPABASE ALIAS LEARNING
          |
          v
16. FUTURE RECOGNITION IMPROVES
```

---

# 17. Error Handling

The application should distinguish between different failure categories.

## 17.1 Document Errors

Examples include:

* Invalid PDF.
* Unsupported PDF structure.
* Encrypted document.
* PDF inspection failure.
* Unsupported field hierarchy.

These errors should identify the unsupported operation without destroying the user's draft mappings.

## 17.2 Mapping Errors

Examples include:

* Inactive dictionary key.
* Conflicting assignments to one logical field.
* Duplicate final field names.
* Missing or invalid canonical identifiers.

These errors should be detected before Python modifies the document whenever possible.

## 17.3 Save Errors

Examples include:

* User cancels Save As.
* Destination already exists.
* Python executable is unavailable.
* Python script is missing.
* Python processing times out.
* Generated PDF fails structural verification.

The original document must remain unchanged.

## 17.4 Supabase Errors

Examples include:

* Failed alias lookup.
* Permission rejection.
* Duplicate alias conflict.
* Network failure.
* Recognition catalog refresh failure.

These errors must not incorrectly invalidate a successful PDF save.

## 17.5 Local Draft Errors

Examples include:

* Browser storage unavailable.
* Storage capacity exceeded.
* Invalid stored data.
* Outdated widget identities.

The application should report recovery failures without preventing users from mapping and saving PDFs.

---

# 18. Development Environment

## 18.1 Primary Development Tools

The application is developed using:

* Visual Studio Code.
* Node.js and npm.
* React and TypeScript.
* Python virtual environments.
* Git.

## 18.2 Project Directory

The local development environment uses a project directory named:

```text
pdf-field-mapper
```

Commands should be executed from the project root unless a specific instruction states otherwise.

## 18.3 Install JavaScript Dependencies

```powershell
npm install
```

## 18.4 Python Virtual Environment

The development environment uses a `.venv` directory.

The Windows Python executable is located at:

```text
.venv\Scripts\python.exe
```

## 18.5 Install Python Dependencies

```powershell
.\.venv\Scripts\python.exe -m pip install -r python\requirements.txt
```

The current Python processing engine uses `pypdf`.

## 18.6 Start Development Application

```powershell
npm run dev
```

The Electron desktop application must be used when testing Python PDF saving.

Opening only the Vite development URL in a regular browser is not sufficient for desktop save functionality.

## 18.7 TypeScript Validation

```powershell
npx tsc --noEmit
```

## 18.8 ESLint Validation

```powershell
npm run lint
```

## 18.9 Python Syntax Validation

```powershell
.\.venv\Scripts\python.exe -m py_compile python\pdf_processor.py
```

## 18.10 Development Build

The provided package configuration includes:

```powershell
npm run build
```

However, packaged application functionality must be tested independently from development mode.

In particular, production packaging of the Python runtime remains a separate concern.

---

# 19. Testing Strategy

The application should be tested using actual county permit applications.

Testing should cover both individual services and the complete user workflow.

## 19.1 PDF Loading

Verify:

* Successful opening.
* Page rendering.
* Navigation.
* Zooming.
* Visual consistency.

## 19.2 Field Inspection

Verify:

* Correct widget detection.
* Correct field names.
* Accurate field positions.
* Correct field types.
* Proper overlay alignment.

## 19.3 Mapping

Verify:

* Individual mapping.
* Document-wide mapping.
* Shared mapping state.
* Mapping corrections.
* Mapping removal.
* Duplicate detection.

## 19.4 Draft Recovery

Verify:

* Autosaving.
* Navigation recovery.
* Application restart recovery.
* Reanalysis recovery.
* Document isolation.
* Explicit draft deletion.

## 19.5 PDF Saving

Verify:

* Successful Python execution.
* Correct field renaming.
* Original PDF preservation.
* Page count preservation.
* Widget count preservation.
* Existing field-value preservation.
* Signature field preservation.
* Adobe Acrobat compatibility.

## 19.6 Alias Learning

Verify:

* Creation after successful saving.
* Duplicate prevention.
* Generic field rejection.
* Learned-alias recognition.
* Learning disabled behavior.
* Cancellation behavior.
* Database failure isolation.

## 19.7 Regression Testing

After major development updates, run a representative complete workflow.

Earlier passing features should not be repeatedly retested after trivial changes unless those changes affect related components.

Before major releases or Git milestones, perform a broader regression test.

---

# 20. Security and Data Protection

## 20.1 Original PDFs

Original PDFs should remain unchanged.

Modified documents should be saved as separate output files.

## 20.2 Electron Security

The renderer should not receive unrestricted Node.js, filesystem, or process-execution access.

Privileged operations should use controlled IPC handlers.

## 20.3 Temporary Files

Temporary source files created for Python processing should be removed after the processing operation completes.

Cleanup must not delete the user's selected output file.

## 20.4 Credentials

Application credentials must not be committed to Git.

Sensitive values should be kept in appropriate local configuration or secure credential storage.

## 20.5 Supabase Authorization

Database authorization should be enforced by Supabase and PostgreSQL policies rather than depending only on frontend checks.

The provided database design includes row-level security and administrator authorization controls.

These policies should be verified against the deployed database before distribution.

## 20.6 Local Draft Privacy

Local drafts should contain mapping metadata rather than complete original PDFs.

Even when PDF bytes are not persisted, field names and mapping information may still be sensitive and should be treated as application data.

---

# 21. Known Limitations

The following limitations should be considered during future development.

### PDF Compatibility

Not all PDF form structures are supported.

XFA documents and certain hierarchical field structures require additional development.

### Digital Signatures

Existing cryptographic digital signatures may become invalid when the PDF is rewritten.

### Duplicate Field Names

Multiple independent logical fields cannot currently receive identical final field names.

A controlled naming or numbering strategy may be needed.

### Draft Storage

localStorage does not provide the same durability guarantees as a dedicated persistence system.

### Python Distribution

The development version uses a local virtual environment.

A packaged application needs a reliable bundled Python execution strategy.

### Recognition Ambiguity

Some PDF field names are too generic to interpret reliably without document-specific context.

### Page Template Recognition

The database design provides a foundation for page-template mappings, but complete implementation and testing should be tracked separately.

### Automated Testing

Manual integration testing has been a major part of development.

A more comprehensive automated testing suite should be introduced as the project matures.

---

# 22. Future Development Roadmap

Potential development priorities include:

## Priority 1: Stabilization

* Complete comprehensive integration testing.
* Resolve discovered state synchronization issues.
* Verify Supabase alias persistence.
* Verify draft recovery.
* Establish a stable Git checkpoint.

## Priority 2: Recognition Improvements

* Expand normalization rules.
* Improve synonym handling.
* Introduce more robust ambiguity detection.
* Develop page-template recognition.
* Improve recognition confidence reporting.

## Priority 3: PDF Compatibility

* Expand supported field structures.
* Investigate hierarchical field renaming.
* Improve duplicate field-name handling.
* Test additional county PDF formats.
* Improve automated PDF structure verification.

## Priority 4: User Experience

* Improve mapping review efficiency.
* Add mapping progress indicators.
* Improve validation messages.
* Introduce better bulk-mapping controls.
* Support streamlined document workflows.

## Priority 5: Production Distribution

* Package Python with Electron.
* Test the installed desktop application.
* Review database access and authentication.
* Establish release and update procedures.
* Test on supported Windows environments.

## Priority 6: External Integration

* Define a standardized PDF output contract.
* Document canonical field naming requirements.
* Evaluate integration with PermitPapers.com.
* Develop an appropriate document transfer or export workflow.

---

# 23. Development Principles

The project follows a deliberate development process.

## 23.1 Review Existing Code

Before changing functionality, inspect the relevant existing files.

Do not assume that a function or component has the same structure as an earlier version.

## 23.2 Discuss Implementation

Evaluate the proposed logic, architecture, and possible complications.

Determine whether the change belongs in React, Electron, Python, or Supabase.

## 23.3 Approve the Approach

For substantial architectural changes, agree on the implementation approach before writing code.

## 23.4 Implement Carefully

Preserve working functionality whenever possible.

Avoid unnecessary rewrites.

Prefer complete replacement files when substantial changes make multiple surgical edits error-prone.

## 23.5 Test Meaningfully

Use TypeScript and lint checks to identify integration errors.

Perform broader functional testing at meaningful development milestones.

## 23.6 Refine Without Regressions

When correcting bugs, preserve existing behavior unless it is directly related to the problem.

## 23.7 Maintain Documentation

Update this document whenever the application architecture changes significantly.

Important decisions should be documented so future development does not depend on reconstructing earlier conversations.

---

# 24. Git and Version Control

Git is used to maintain the application's development history.

Major successful milestones should be committed after testing.

## 24.1 Review Changes

```powershell
git status
```

## 24.2 Review Staged Changes

```powershell
git diff --cached --stat
```

## 24.3 Commit Development Changes

```powershell
git commit -m "Description of completed milestone"
```

## 24.4 Push Current Branch

```powershell
git push -u origin HEAD
```

## 24.5 Files That Should Not Be Committed

Examples include:

* `.env`
* `.venv/`
* `node_modules/`
* `__pycache__/`
* Temporary processing files.
* Sensitive client or customer documents.
* Generated test PDFs containing private information.

The project's `.gitignore` should be reviewed regularly.

Documentation changes should be committed alongside the code changes they describe.

---

# 25. Architectural Decisions Log

This section records important decisions made during development.

| Decision                                       | Reason                                                          |
| ---------------------------------------------- | --------------------------------------------------------------- |
| Use Electron                                   | Provide a desktop application with controlled local file access |
| Use React and TypeScript                       | Build a maintainable, type-safe user interface                  |
| Use PDF.js                                     | Render and inspect interactive PDF documents                    |
| Use Python and pypdf                           | Perform actual PDF structure modifications                      |
| Keep PDF writing out of React                  | Separate document processing from UI behavior                   |
| Use Supabase                                   | Centralize dictionary and learned-alias information             |
| Require user-confirmed mappings                | Avoid automatically applying uncertain recognition suggestions  |
| Learn aliases only after saving                | Prevent unsuccessful operations from teaching the system        |
| Reject ambiguous global aliases                | Reduce incorrect recognition across unrelated documents         |
| Preserve original PDFs                         | Protect users' source documents                                 |
| Allow PDFs containing signature fields         | Support common permitting document structures                   |
| Use SHA-256 draft identities                   | Distinguish documents with identical filenames                  |
| Store drafts locally                           | Preserve unfinished mappings without uploading PDFs             |
| Maintain Git checkpoints                       | Support safe iterative development                              |
| Keep technical documentation in the repository | Preserve architectural context alongside source code            |

---

# 26. Documentation Maintenance

This document should be updated when:

1. New application components are introduced.
2. Existing components change responsibilities.
3. Database tables or policies change.
4. New recognition methods are implemented.
5. PDF processing capabilities expand.
6. Electron security or IPC behavior changes.
7. New dependencies are introduced.
8. Important architectural decisions are made.
9. Major application limitations are resolved.
10. Production packaging or distribution is implemented.

## Documentation Update Procedure

For major development milestones:

1. Complete implementation.
2. Run relevant tests.
3. Resolve significant errors.
4. Review the resulting architecture.
5. Update this document.
6. Commit the code and documentation together.

The document version and update date should change when substantial revisions are made.

---

# 27. Current Development Status

**Baseline:** November 2, 2026.

The following reflects implementation work described during development. It distinguishes previously reported tests from features still requiring final integration verification.

| Feature                            | Status                                          |
| ---------------------------------- | ----------------------------------------------- |
| Electron desktop foundation        | Implemented                                     |
| PDF opening and rendering          | Implemented and previously tested               |
| Interactive field inspection       | Implemented and previously tested               |
| Field overlays                     | Implemented and previously tested               |
| Individual field mapping           | Implemented                                     |
| Document-wide recognition          | Implemented                                     |
| Shared draft mapping state         | Implemented                                     |
| Canonical dictionary integration   | Implemented                                     |
| Recognition catalog                | Implemented                                     |
| Python field renaming              | Implemented and previously tested               |
| Signature field preservation       | Previously tested on sample documents           |
| Electron-to-Python saving          | Implemented and previously tested               |
| Optional Supabase alias learning   | Implemented; final integration status to verify |
| Local draft recovery               | Implemented; final integration status to verify |
| Standalone Python packaging        | Not yet established                             |
| Complete page-template recognition | Future milestone                                |
| Production release readiness       | Not yet established                             |

This document should be revised after the comprehensive test results have been recorded.

---

# 28. Final Architectural Summary

PDF Field Mapper is designed around a clear division of responsibilities.

**React** manages the user's interaction with PDF documents.

**PDF.js** renders documents and identifies interactive fields.

**The recognition system** compares original field names against canonical dictionary information and approved aliases.

**The mapping system** stores user-confirmed field assignments and validates proposed changes.

**Local draft storage** preserves unfinished mapping work.

**Electron** provides controlled access to desktop file operations and Python execution.

**Python and pypdf** modify the underlying PDF structures and generate verified output documents.

**Supabase** stores the standardized dictionary and eligible learned aliases.

The application's primary workflow is:

**Open PDF → Inspect Fields → Recognize Names → Review Mappings → Save Draft → Validate Renames → Save Modified PDF → Learn Eligible Aliases.**

The long-term objective is to provide a reliable method for converting inconsistent interactive PDF field names into standardized identifiers usable by automated document-processing systems.

Future development should preserve the existing separation between inspection, recognition, mapping, document modification, and persistence.

---

**End of Technical Architecture & Development Reference**

**Document Version:** 1.0
**Last Updated:** November 2, 2026
