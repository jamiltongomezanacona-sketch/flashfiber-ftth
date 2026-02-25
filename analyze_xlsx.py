# -*- coding: utf-8 -*-
"""Analiza un archivo .xlsx usando solo biblioteca estándar (zipfile + xml)."""
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

XLSX_PATH = r"c:\Users\ASUS\Desktop\SI05.xlsx"

NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}

def get_text(el, default=""):
    if el is None:
        return default
    return (el.text or "").strip()

def analyze():
    path = Path(XLSX_PATH)
    if not path.exists():
        print("Archivo no encontrado:", XLSX_PATH)
        return

    print("=" * 60)
    print("ANÁLISIS DEL ARCHIVO:", path.name)
    print("=" * 60)

    with zipfile.ZipFile(path, "r") as z:
        # 1. Contenido del ZIP
        names = z.namelist()
        print("\n1. ESTRUCTURA DEL ARCHIVO (contenido del .xlsx)")
        print("-" * 40)
        for n in sorted(names):
            info = z.getinfo(n)
            print(f"   {n}  ({info.file_size} bytes)")

        # 2. Workbook (hojas)
        try:
            wb_xml = z.read("xl/workbook.xml")
            root = ET.fromstring(wb_xml)
            sheets = root.findall(".//main:sheet", NS)
            print("\n2. HOJAS (SHEETS)")
            print("-" * 40)
            for i, sh in enumerate(sheets, 1):
                name = sh.get("name", "")
                sid = sh.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id", "")
                print(f"   {i}. '{name}'  (rId: {sid})")
        except Exception as e:
            print("\n2. HOJAS: Error leyendo workbook.xml:", e)

        # 3. Shared strings (textos únicos)
        try:
            ss_xml = z.read("xl/sharedStrings.xml")
            root = ET.fromstring(ss_xml)
            count = int(root.get("count", 0))
            uniques = root.get("uniqueCount", count)
            si = root.findall(".//main:si", NS)
            print("\n3. CADENAS COMPARTIDAS (sharedStrings)")
            print("-" * 40)
            print(f"   count: {count}, uniqueCount: {uniques}")
            # Guardar todas las cadenas para resumen
            all_strings = []
            for s in si:
                t = s.find(".//main:t", NS)
                text = get_text(t) if t is not None else ""
                if not text and list(s):
                    text = "".join(n.text or "" for n in s.iter() if n.text)
                all_strings.append(text[:80])
            print(f"   Muestra (primeras 25):")
            for i, txt in enumerate(all_strings[:25]):
                disp = repr(txt) if len(txt) > 40 else repr(txt)
                print(f"   [{i}] {disp}")
            print(f"   ... total {len(all_strings)} cadenas")
        except KeyError:
            print("\n3. CADENAS COMPARTIDAS: (no existe sharedStrings.xml)")
        except Exception as e:
            print("\n3. CADENAS COMPARTIDAS: Error:", e)

        # 3b. Metadatos (docProps)
        try:
            core = z.read("docProps/core.xml")
            root = ET.fromstring(core)
            dc_ns = {"dc": "http://purl.org/dc/elements/1.1/", "dcterms": "http://purl.org/dc/terms/", "cp": "http://schemas.openxmlformats.org/package/2006/metadata/core-properties"}
            def find_text(r, path, ns):
                for prefix, uri in ns.items():
                    path = path.replace(prefix + ":", "{" + uri + "}")
                el = r.find(path)
                return get_text(el) if el is not None else ""
            print("\n3b. METADATOS (docProps/core.xml)")
            print("-" * 40)
            creator = root.find("{http://purl.org/dc/elements/1.1/}creator")
            created = root.find("{http://purl.org/dc/terms/}created")
            modified = root.find("{http://purl.org/dc/terms/}modified")
            print(f"   Creador: {get_text(creator)}")
            print(f"   Creado:  {get_text(created)}")
            print(f"   Modificado: {get_text(modified)}")
        except Exception as e:
            print("\n3b. METADATOS: Error:", e)

        # 4. Primera hoja - dimensiones y celdas
        try:
            sheet_path = "xl/worksheets/sheet1.xml"
            sheet_xml = z.read(sheet_path)
            root = ET.fromstring(sheet_xml)
            dim = root.find("main:dimension", NS)
            dim_ref = dim.get("ref", "") if dim is not None else ""
            rows = root.findall(".//main:row", NS)
            print("\n4. DIMENSIONES Y FILAS (sheet1)")
            print("-" * 40)
            print(f"   dimension ref: {dim_ref}")
            print(f"   cantidad de elementos <row>: {len(rows)}")
            if rows:
                first_row = rows[0]
                cells = first_row.findall("main:c", NS)
                print(f"   celdas en primera fila: {len(cells)}")
                for c in cells[:20]:
                    r = c.get("r"), c.get("t", ""), get_text(c)
                    print(f"      celda: {r}")
        except KeyError:
            print("\n4. Sheet1 no encontrado")
        except Exception as e:
            print("\n4. Error en sheet1:", e)

    print("\n" + "=" * 60)

if __name__ == "__main__":
    analyze()
