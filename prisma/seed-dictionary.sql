-- ============================================================
-- PDF Field Mapper - Initial approved dictionary seed
-- File: prisma/seed-dictionary.sql
-- ============================================================
-- Source of canonical names: PermitPapers.com fillPdf.ts allowedKeys.
-- 78 UNIQUE keys: 31 company, 11 customer, 36 job/property.
-- The source contains one duplicate key: company_address_city_state_zip.
-- Do not seed that duplicate twice.
--
-- Safe to run again: ON CONFLICT DO NOTHING retains user edits.
-- This script only adds missing dictionary keys; never deletes them.
-- website_supported remains NULL until end-to-end filling is verified.
-- Requires that the initial Prisma migration has already succeeded.
-- Execute with your LOCAL Prisma database connection, never from Electron.
-- ============================================================

BEGIN;

INSERT INTO public.dictionary_keys (
    key_name,
    display_name,
    category,
    description
)
VALUES
    ('company_contact_full', 'Company Name, Address + Phone', 'COMPANY', 'Combined company name, full address, and phone number.'),
    ('company_name', 'Company Name', 'COMPANY', 'Business name.'),
    ('company_license', 'Window/Door License Number', 'COMPANY', 'Base window/door contractor license number.'),
    ('company_tax_id', 'Company Tax ID', 'COMPANY', 'Company tax or business receipt identifier.'),
    ('qualifier_name', 'Window/Door Qualifier Name', 'COMPANY', 'Base window/door contractor qualifier name.'),
    ('company_contact', 'Company Contact', 'COMPANY', 'Allowed key; value sourcing should be verified against PermitPapers.com.'),
    ('company_phone', 'Company Phone', 'COMPANY', 'Company telephone number.'),
    ('company_email', 'Company Email', 'COMPANY', 'Company email address.'),
    ('company_name_address', 'Company Name + Address', 'COMPANY', 'Combined company name and address components.'),
    ('company_address_full', 'Company Full Address', 'COMPANY', 'Combined street, city, state, and ZIP.'),
    ('company_address_city_state_zip', 'Company City, State + ZIP', 'COMPANY', 'Combined city, state, and ZIP.'),
    ('company_suite', 'Company Suite', 'COMPANY', 'Business suite or unit designation.'),
    ('company_address_street', 'Company Street', 'COMPANY', 'Company street address.'),
    ('company_address_city', 'Company City', 'COMPANY', 'Company city.'),
    ('company_address_state', 'Company State', 'COMPANY', 'Company state.'),
    ('company_address_zip', 'Company ZIP', 'COMPANY', 'Company ZIP or postal code.'),
    ('desc_of_improvement', 'Description of Improvement', 'COMPANY', 'Base description; fillPdf includes job-first override logic.'),
    ('desc_of_improv', 'Description of Improvement (Short Key)', 'COMPANY', 'Alternative approved base description key used by fillPdf.'),
    ('roofing_license_number', 'Roofing License Number', 'COMPANY', 'Roofing contractor license number.'),
    ('roofing_qualifier_name', 'Roofing Qualifier Name', 'COMPANY', 'Roofing contractor qualifier name.'),
    ('roofing_desc_of_improv', 'Roofing Description of Improvement', 'COMPANY', 'Roofing-specific improvement description.'),
    ('roofing_business_tax_receipt', 'Roofing Business Tax Receipt', 'COMPANY', 'Roofing-specific business tax receipt field.'),
    ('mech_license_number', 'Mechanical License Number', 'COMPANY', 'Mechanical contractor license number.'),
    ('mech_qualifier_name', 'Mechanical Qualifier Name', 'COMPANY', 'Mechanical contractor qualifier name.'),
    ('mech_desc_of_improv', 'Mechanical Description of Improvement', 'COMPANY', 'Mechanical-specific improvement description.'),
    ('elec_license_number', 'Electrical License Number', 'COMPANY', 'Electrical contractor license number.'),
    ('elec_qualifier_name', 'Electrical Qualifier Name', 'COMPANY', 'Electrical contractor qualifier name.'),
    ('elec_desc_of_improv', 'Electrical Description of Improvement', 'COMPANY', 'Electrical-specific improvement description.'),
    ('cc_name', 'Company Contact Name', 'COMPANY', 'Company contact person name.'),
    ('cc_phone', 'Company Contact Phone', 'COMPANY', 'Company contact person telephone.'),
    ('cc_email', 'Company Contact Email', 'COMPANY', 'Company contact person email.'),
    ('customer_name', 'Customer Name', 'CUSTOMER', 'Customer full name.'),
    ('customer_phone', 'Customer Phone', 'CUSTOMER', 'Customer telephone number.'),
    ('customer_phone1', 'Customer Phone Area Code', 'CUSTOMER', 'First three digits of a ten-digit customer telephone number.'),
    ('customer_phone2', 'Customer Phone Remaining Digits', 'CUSTOMER', 'Remaining seven digits, formatted xxx-xxxx for valid ten-digit numbers.'),
    ('customer_email', 'Customer Email', 'CUSTOMER', 'Customer email address.'),
    ('customer_name_address', 'Customer Name + Address', 'CUSTOMER', 'Combined customer name and full address.'),
    ('customer_address_full', 'Customer Full Address', 'CUSTOMER', 'Combined street, city, state, and ZIP.'),
    ('customer_address_street', 'Customer Street', 'CUSTOMER', 'Customer street address.'),
    ('customer_address_city', 'Customer City', 'CUSTOMER', 'Customer city.'),
    ('customer_address_state', 'Customer State', 'CUSTOMER', 'Customer state.'),
    ('customer_address_zip', 'Customer ZIP', 'CUSTOMER', 'Customer ZIP or postal code.'),
    ('customer_tax_folio', 'Tax Folio', 'JOB_PROPERTY', 'Full property tax folio or parcel identifier.'),
    ('job_price', 'Job Price', 'JOB_PROPERTY', 'Base job price.'),
    ('roofing_job_price', 'Roofing Job Price', 'JOB_PROPERTY', 'Roofing-specific job price.'),
    ('mech_job_price', 'Mechanical Job Price', 'JOB_PROPERTY', 'Mechanical-specific job price.'),
    ('elec_job_price', 'Electrical Job Price', 'JOB_PROPERTY', 'Electrical-specific job price.'),
    ('legal_description', 'Legal Description', 'JOB_PROPERTY', 'Full property legal description.'),
    ('lot', 'Lot', 'JOB_PROPERTY', 'Lot parsed from the legal description.'),
    ('block', 'Block', 'JOB_PROPERTY', 'Block parsed from the legal description.'),
    ('bldg', 'Building', 'JOB_PROPERTY', 'Building parsed from the legal description.'),
    ('unit', 'Unit', 'JOB_PROPERTY', 'Unit parsed from the legal description.'),
    ('tract', 'Tract', 'JOB_PROPERTY', 'Tract parsed from the legal description.'),
    ('parcel', 'Parcel', 'JOB_PROPERTY', 'Parcel parsed from the legal description.'),
    ('sec', 'Section', 'JOB_PROPERTY', 'Section parsed from the legal description.'),
    ('twp', 'Township', 'JOB_PROPERTY', 'Township parsed from the legal description.'),
    ('rng', 'Range', 'JOB_PROPERTY', 'Range parsed from the legal description.'),
    ('folio', 'Folio (Legal Description)', 'JOB_PROPERTY', 'Folio parsed from the legal description.'),
    ('customer_tax_folio1', 'Tax Folio Segment 1', 'JOB_PROPERTY', '1th segment of the property tax folio; split on hyphen, whitespace, or slash.'),
    ('customer_tax_folio2', 'Tax Folio Segment 2', 'JOB_PROPERTY', '2th segment of the property tax folio; split on hyphen, whitespace, or slash.'),
    ('customer_tax_folio3', 'Tax Folio Segment 3', 'JOB_PROPERTY', '3th segment of the property tax folio; split on hyphen, whitespace, or slash.'),
    ('customer_tax_folio4', 'Tax Folio Segment 4', 'JOB_PROPERTY', '4th segment of the property tax folio; split on hyphen, whitespace, or slash.'),
    ('customer_tax_folio5', 'Tax Folio Segment 5', 'JOB_PROPERTY', '5th segment of the property tax folio; split on hyphen, whitespace, or slash.'),
    ('customer_tax_folio6', 'Tax Folio Segment 6', 'JOB_PROPERTY', '6th segment of the property tax folio; split on hyphen, whitespace, or slash.'),
    ('customer_tax_folio7', 'Tax Folio Segment 7', 'JOB_PROPERTY', '7th segment of the property tax folio; split on hyphen, whitespace, or slash.'),
    ('customer_tax_folio8', 'Tax Folio Segment 8', 'JOB_PROPERTY', '8th segment of the property tax folio; split on hyphen, whitespace, or slash.'),
    ('customer_tax_folio9', 'Tax Folio Segment 9', 'JOB_PROPERTY', '9th segment of the property tax folio; split on hyphen, whitespace, or slash.'),
    ('customer_tax_folio10', 'Tax Folio Segment 10', 'JOB_PROPERTY', '10th segment of the property tax folio; split on hyphen, whitespace, or slash.'),
    ('customer_tax_folio11', 'Tax Folio Segment 11', 'JOB_PROPERTY', '11th segment of the property tax folio; split on hyphen, whitespace, or slash.'),
    ('customer_tax_folio12', 'Tax Folio Segment 12', 'JOB_PROPERTY', '12th segment of the property tax folio; split on hyphen, whitespace, or slash.'),
    ('customer_tax_folio13', 'Tax Folio Segment 13', 'JOB_PROPERTY', '13th segment of the property tax folio; split on hyphen, whitespace, or slash.'),
    ('customer_tax_folio14', 'Tax Folio Segment 14', 'JOB_PROPERTY', '14th segment of the property tax folio; split on hyphen, whitespace, or slash.'),
    ('customer_tax_folio15', 'Tax Folio Segment 15', 'JOB_PROPERTY', '15th segment of the property tax folio; split on hyphen, whitespace, or slash.'),
    ('customer_tax_folio16', 'Tax Folio Segment 16', 'JOB_PROPERTY', '16th segment of the property tax folio; split on hyphen, whitespace, or slash.'),
    ('customer_tax_folio17', 'Tax Folio Segment 17', 'JOB_PROPERTY', '17th segment of the property tax folio; split on hyphen, whitespace, or slash.'),
    ('customer_tax_folio18', 'Tax Folio Segment 18', 'JOB_PROPERTY', '18th segment of the property tax folio; split on hyphen, whitespace, or slash.'),
    ('customer_tax_folio19', 'Tax Folio Segment 19', 'JOB_PROPERTY', '19th segment of the property tax folio; split on hyphen, whitespace, or slash.'),
    ('customer_tax_folio20', 'Tax Folio Segment 20', 'JOB_PROPERTY', '20th segment of the property tax folio; split on hyphen, whitespace, or slash.')
ON CONFLICT (key_name) DO NOTHING;

COMMIT;

-- On an otherwise empty dictionary, the result should be 78.
-- Additional keys added later may increase the total.
SELECT
    category,
    COUNT(*) AS dictionary_key_count
FROM public.dictionary_keys
GROUP BY category
ORDER BY category;