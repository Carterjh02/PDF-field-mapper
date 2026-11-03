"""PDF Field Mapper: local AcroForm field renaming for Electron.

Receives one JSON request on stdin and prints one JSON response to stdout.
Never overwrites the source document or an existing output file.

IMPORTANT: Rewriting a PDF can INVALIDATE existing cryptographic digital
signatures, even when the signature fields and their values are preserved.
This processor intentionally does not block documents with signature fields,
including filled signature fields, per the application's workflow.
"""

import io
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, TextStringObject

SUPPORTED_ACTION = "rename_fields"
CANONICAL_NAME_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


class PdfProcessingError(Exception):
    """An actionable PDF processing error to return to Electron."""


def resolve_object(value: Any) -> Any:
    """Dereference PDF indirect objects when needed."""
    return value.get_object() if hasattr(value, "get_object") else value


def collect_logical_fields(root: Any) -> dict[str, Any]:
    """Collect terminal logical fields by their fully qualified names.

    Unnamed widget children belong to their parent logical field; their
    appearance and annotation objects must not be renamed individually.
    """
    acroform_ref = root.get("/AcroForm")
    if acroform_ref is None:
        raise PdfProcessingError("This PDF does not contain an AcroForm.")

    acroform = resolve_object(acroform_ref)
    if "/XFA" in acroform:
        raise PdfProcessingError(
            "XFA forms are not supported by the current PDF processor."
        )

    fields: dict[str, Any] = {}

    def visit(references: Any, parent_name: str = "") -> None:
        for reference in resolve_object(references):
            field = resolve_object(reference)
            partial_name = field.get("/T")
            current_name = parent_name
            if partial_name is not None:
                name_part = str(partial_name)
                current_name = (
                    f"{parent_name}.{name_part}" if parent_name else name_part
                )

            kids = resolve_object(field.get("/Kids", []))
            named_children = [
                child_ref
                for child_ref in kids
                if resolve_object(child_ref).get("/T") is not None
            ]
            if named_children:
                visit(named_children, current_name)
            elif partial_name is not None:
                if current_name in fields:
                    raise PdfProcessingError(
                        f'Duplicate logical PDF field name: "{current_name}".'
                    )
                fields[current_name] = field

    visit(acroform.get("/Fields", []))
    return fields


def count_widgets(reader: PdfReader) -> int:
    """Count interactive widgets (not logical fields) across all pages."""
    count = 0
    for page in reader.pages:
        for reference in resolve_object(page.get("/Annots", [])):
            annotation = resolve_object(reference)
            if annotation.get("/Subtype") == "/Widget":
                count += 1
    return count


def field_state(fields: dict[str, Any]) -> dict[str, tuple[str, bool, str | None]]:
    """Capture field type and basic stored-value state for verification.

    For ordinary filled fields, record the textual representation of /V.
    For signature fields, record presence of /V but do not compare their
    cryptographic content: rewriting the PDF invalidates their signatures.
    """
    state = {}
    for name, field in fields.items():
        field_type = str(field.get("/FT", ""))
        has_value = "/V" in field
        value_repr = None
        if has_value and field_type != "/Sig":
            value_repr = str(resolve_object(field["/V"]))
        state[name] = (field_type, has_value, value_repr)
    return state


def validate_renames(renames: Any, fields: dict[str, Any]) -> dict[str, str]:
    """Validate renames, including collisions with untouched PDF fields."""
    if not isinstance(renames, list) or not renames:
        raise PdfProcessingError("Provide at least one field rename instruction.")

    result: dict[str, str] = {}
    for item in renames:
        if not isinstance(item, dict):
            raise PdfProcessingError("Each rename instruction must be an object.")

        original = item.get("originalName")
        canonical = item.get("canonicalName")
        if not isinstance(original, str) or not isinstance(canonical, str):
            raise PdfProcessingError("Rename field names must be strings.")
        if original not in fields:
            raise PdfProcessingError(f'Field "{original}" was not found in the PDF.')
        if "." in original:
            raise PdfProcessingError(
                f'Field "{original}" is hierarchical; renaming it is not yet supported.'
            )
        if not CANONICAL_NAME_PATTERN.fullmatch(canonical):
            raise PdfProcessingError(f'Invalid canonical field name: "{canonical}".')
        if original in result:
            raise PdfProcessingError(f'Duplicate rename instructions for "{original}".')
        result[original] = canonical

    final_names = [result.get(name, name) for name in fields]
    if len(set(final_names)) != len(final_names):
        raise PdfProcessingError(
            "The requested mappings would create duplicate PDF field names."
        )
    return result


def verify_output(
    data: bytes,
    expected_states: dict[str, tuple[str, bool, str | None]],
    expected_pages: int,
    expected_widgets: int,
) -> None:
    """Verify renamed form structure and preserved ordinary form values."""
    reader = PdfReader(io.BytesIO(data))
    if len(reader.pages) != expected_pages:
        raise PdfProcessingError("Modified PDF has a different page count.")
    if count_widgets(reader) != expected_widgets:
        raise PdfProcessingError("Modified PDF has a different widget count.")
    fields = collect_logical_fields(resolve_object(reader.trailer["/Root"]))
    actual_states = field_state(fields)
    if set(actual_states) != set(expected_states):
        missing = sorted(set(expected_states) - set(actual_states))
        unexpected = sorted(set(actual_states) - set(expected_states))
        raise PdfProcessingError(
            f"Output field names differ. Missing: {missing}; unexpected: {unexpected}."
        )
    for name, expected_state in expected_states.items():
        if actual_states[name] != expected_state:
            raise PdfProcessingError(
                f'Output did not preserve the type/value state of field "{name}".'
            )


def process_pdf_renames(request: dict[str, Any]) -> dict[str, Any]:
    if request.get("action") != SUPPORTED_ACTION:
        raise PdfProcessingError("Unsupported PDF processing action.")

    source_value = request.get("sourcePath")
    output_value = request.get("outputPath")
    if (
        not isinstance(source_value, str)
        or not source_value.strip()
        or not isinstance(output_value, str)
        or not output_value.strip()
    ):
        raise PdfProcessingError("Source and output PDF paths are required.")

    source = Path(source_value).resolve()
    output = Path(output_value).resolve()
    if source == output:
        raise PdfProcessingError("Source and output paths must be different.")
    if not source.is_file() or source.suffix.lower() != ".pdf":
        raise PdfProcessingError("Source PDF file was not found.")
    if output.suffix.lower() != ".pdf":
        raise PdfProcessingError("Output filename must end with .pdf.")
    if not output.parent.is_dir():
        raise PdfProcessingError("Output directory does not exist.")
    if output.exists():
        raise PdfProcessingError("Output file already exists. Choose a new filename.")

    reader = PdfReader(str(source))
    if reader.is_encrypted:
        raise PdfProcessingError("Encrypted PDFs are not supported without a password.")

    page_count = len(reader.pages)
    widget_count = count_widgets(reader)
    original_fields = collect_logical_fields(resolve_object(reader.trailer["/Root"]))
    rename_map = validate_renames(request.get("renames"), original_fields)
    changes = {old: new for old, new in rename_map.items() if old != new}
    if not changes:
        raise PdfProcessingError("No actual field-name changes were requested.")

    # Intentionally DO NOT block signature fields, signed values, or /Perms.
    # PDF rewriting may invalidate existing digital signatures; this is
    # an accepted limitation of the current workflow, not an indication
    # that the signature field objects themselves must be deleted.
    original_states = field_state(original_fields)
    expected_states = {
        changes.get(name, name): state
        for name, state in original_states.items()
    }

    # Clone the original PDF before modifying any AcroForm objects.
    writer = PdfWriter(clone_from=reader)
    writer_fields = collect_logical_fields(writer.root_object)
    for old_name, canonical_name in changes.items():
        field = writer_fields.get(old_name)
        if field is None:
            raise PdfProcessingError(
                f'Unable to locate "{old_name}" in the cloned PDF.'
            )
        field[NameObject("/T")] = TextStringObject(canonical_name)

    output_buffer = io.BytesIO()
    writer.write(output_buffer)
    output_bytes = output_buffer.getvalue()
    if not output_bytes:
        raise PdfProcessingError("The PDF processor produced an empty file.")

    # Verify before creating an output file so failed processing cannot
    # leave behind a misleading file that appears to be successful.
    verify_output(output_bytes, expected_states, page_count, widget_count)

    created_output = False
    try:
        # Exclusive creation prevents overwriting any existing document.
        with output.open("xb") as handle:
            created_output = True
            handle.write(output_bytes)
            handle.flush()
            os.fsync(handle.fileno())
    except FileExistsError as exc:
        raise PdfProcessingError(
            "Output file already exists. Choose a new filename."
        ) from exc
    except Exception:
        if created_output:
            try:
                output.unlink()
            except OSError:
                pass
        raise

    return {
        "ok": True,
        "outputPath": str(output),
        "pageCount": page_count,
        "logicalFieldCount": len(original_fields),
        "renamedFieldCount": len(changes),
        "appliedRenames": [
            {"originalName": old_name, "canonicalName": new_name}
            for old_name, new_name in changes.items()
        ],
    }


def main() -> int:
    try:
        request = json.load(sys.stdin)
        if not isinstance(request, dict):
            raise PdfProcessingError("Processing request must be a JSON object.")
        result = process_pdf_renames(request)
        print(json.dumps(result), flush=True)
        return 0
    except Exception as error:
        # stdout must contain exactly one JSON object for Electron.
        print(json.dumps({"ok": False, "error": str(error)}), flush=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())
