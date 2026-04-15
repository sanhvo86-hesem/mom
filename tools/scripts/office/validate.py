#!/usr/bin/env python3
"""
DOCX File Validation Script
Validates DOCX files for basic integrity and structure
"""

import sys
import zipfile
import os
from xml.etree import ElementTree as ET

def validate_docx(filepath):
    """Validate DOCX file structure and integrity"""

    if not os.path.exists(filepath):
        print(f"ERROR: File not found: {filepath}")
        return False

    if not filepath.endswith('.docx'):
        print(f"ERROR: File is not a DOCX file: {filepath}")
        return False

    try:
        # DOCX files are ZIP archives
        with zipfile.ZipFile(filepath, 'r') as zip_ref:
            # Check essential files
            required_files = [
                '[Content_Types].xml',
                '_rels/.rels',
                'word/document.xml'
            ]

            namelist = zip_ref.namelist()

            for required_file in required_files:
                if required_file not in namelist:
                    print(f"ERROR: Missing required file: {required_file}")
                    return False

            # Validate XML structure
            try:
                with zip_ref.open('word/document.xml') as f:
                    ET.parse(f)
            except ET.ParseError as e:
                print(f"ERROR: Invalid XML in word/document.xml: {e}")
                return False

            # Get file size
            file_size = os.path.getsize(filepath)

            print("VALIDATION PASSED")
            print(f"File: {filepath}")
            print(f"Size: {file_size} bytes ({file_size/1024:.1f} KB)")
            print(f"Archive contains {len(namelist)} entries")
            print("Structure: Valid DOCX (Office Open XML)")
            print("Content: word/document.xml validated")

            return True

    except zipfile.BadZipFile:
        print(f"ERROR: Not a valid ZIP/DOCX file: {filepath}")
        return False
    except Exception as e:
        print(f"ERROR: {e}")
        return False

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python validate.py <docx_file>")
        sys.exit(1)

    filepath = sys.argv[1]
    success = validate_docx(filepath)
    sys.exit(0 if success else 1)
