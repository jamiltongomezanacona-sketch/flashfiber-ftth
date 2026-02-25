# -*- coding: utf-8 -*-
"""Extrae del SI05.xlsx todos los E1 y E2 con sus direcciones."""
import zipfile
import xml.etree.ElementTree as ET
import re
from pathlib import Path
from collections import OrderedDict

XLSX_PATH = r"c:\Users\ASUS\Desktop\SI05.xlsx"
NS = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

def col_letter_to_idx(ref):
    """Convierte referencia de columna (ej. 'A', 'AB') a índice 0-based."""
    col = re.match(r"^([A-Z]+)", ref.upper())
    if not col:
        return None
    c = col.group(1)
    n = 0
    for ch in c:
        n = n * 26 + (ord(ch) - ord("A") + 1)
    return n - 1

def cell_ref_to_row_col(r):
    """Convierte 'A2' -> (1, 0), 'O121' -> (120, 14). Row 1-based, col 0-based."""
    m = re.match(r"^([A-Z]+)(\d+)$", r.upper())
    if not m:
        return None, None
    return int(m.group(2)), col_letter_to_idx(r)

def get_text(el, default=""):
    if el is None:
        return default
    return (el.text or "").strip()

def get_shared_strings(z):
    """Retorna lista de cadenas compartidas (índice = posición)."""
    ss_xml = z.read("xl/sharedStrings.xml")
    root = ET.fromstring(ss_xml)
    si = root.findall(".//main:si", NS)
    out = []
    for s in si:
        t = s.find(".//main:t", NS)
        text = get_text(t) if t is not None else ""
        if not text and list(s):
            text = "".join(n.text or "" for n in s.iter() if n.text)
        out.append(text)
    return out

def parse_sheet_to_grid(z, shared_strings):
    """Lee sheet1 y devuelve grid[row_1based][col_0based] = valor texto."""
    sheet_xml = z.read("xl/worksheets/sheet1.xml")
    root = ET.fromstring(sheet_xml)
    rows_el = root.findall(".//main:row", NS)
    grid = OrderedDict()  # row_num -> { col_idx: value }
    for row_el in rows_el:
        r_attr = row_el.get("r")
        row_num = int(r_attr) if r_attr else None
        if row_num is None:
            continue
        grid[row_num] = {}
        for c in row_el.findall("main:c", NS):
            ref = c.get("r")
            if not ref:
                continue
            rn, col_idx = cell_ref_to_row_col(ref)
            if col_idx is None:
                continue
            v_el = c.find("main:v", NS)
            val = get_text(v_el) if v_el is not None else ""
            if c.get("t") == "s" and val.isdigit():
                idx = int(val)
                if 0 <= idx < len(shared_strings):
                    val = shared_strings[idx]
            grid[row_num][col_idx] = val
    return grid

def main():
    path = Path(XLSX_PATH)
    if not path.exists():
        print("Archivo no encontrado:", XLSX_PATH)
        return

    with zipfile.ZipFile(path, "r") as z:
        shared_strings = get_shared_strings(z)
        grid = parse_sheet_to_grid(z, shared_strings)

    if not grid:
        print("No se encontraron datos en la hoja.")
        return

    # Detectar fila de encabezados (primera fila con OLT o CIERRE T1)
    header_row = None
    for r in sorted(grid.keys()):
        row = grid[r]
        for col_idx, val in row.items():
            if val and isinstance(val, str):
                v = val.strip().upper()
                if "OLT" == v or "CIERRE T1" in v or "CIERRE T2" in v:
                    header_row = r
                    break
        if header_row is not None:
            break

    if header_row is None:
        # Usar primera fila con varios valores como encabezado
        for r in sorted(grid.keys())[:10]:
            if len(grid[r]) >= 5:
                header_row = r
                break

    # Nombres de columna por índice (A=0 .. O=14)
    headers = {}
    if header_row is not None:
        for col_idx in range(15):
            headers[col_idx] = (grid.get(header_row) or {}).get(col_idx, "")

    # Buscar índices: CIERRE T1 (E1), CIERRE T2 (E2), DIRECCIÓN/UBICACIÓN
    col_e1 = None
    col_e2 = None
    col_direccion = None
    for idx, name in headers.items():
        n = (name or "").strip().upper()
        if "CIERRE T1" in n or n == "E1":
            col_e1 = idx
        if "CIERRE T2" in n or n == "E2":
            col_e2 = idx
        if "DIRECC" in n or "UBICAC" in n or "DIRECCIÓN" in n or "DIRECCION" in n or "DIR" == n:
            col_direccion = idx

    # Si no hay columna dirección explícita, usar otra columna que pueda tenerla
    # (a veces está en CABLE DERIVACION o en la misma fila como texto)
    if col_direccion is None:
        for idx, name in headers.items():
            n = (name or "").strip().upper()
            if "CABLE" in n or "DERIV" in n or "CIERRE" in n:
                pass
            elif len(n) > 2 and col_direccion is None:
                col_direccion = idx  # fallback: primera columna con nombre largo
                break

    # Recoger todas las filas de datos (después del encabezado)
    data_start = (header_row + 1) if header_row else 2
    list_e1 = []  # (valor_e1, direccion, row)
    list_e2 = []
    for r in sorted(grid.keys()):
        if header_row and r <= header_row:
            continue
        row = grid.get(r, {})
        v_e1 = (row.get(col_e1) or "").strip() if col_e1 is not None else ""
        v_e2 = (row.get(col_e2) or "").strip() if col_e2 is not None else ""
        direccion = (row.get(col_direccion) or "").strip() if col_direccion is not None else ""

        # Si no hay columna dirección, concatenar varias celdas como contexto
        if not direccion and (v_e1 or v_e2):
            partes = []
            for ci in range(15):
                cell = row.get(ci)
                if cell and str(cell).strip() and ci not in (col_e1, col_e2):
                    partes.append(str(cell).strip())
            direccion = " | ".join(partes) if partes else "(sin dirección en columna)"

        if v_e1 and ("E1" in v_e1.upper() or "CIERRE" in v_e1.upper() or v_e1.startswith("E1")):
            list_e1.append((v_e1, direccion, r))
        if v_e2 and ("E2" in v_e2.upper() or "CIERRE" in v_e2.upper() or v_e2.startswith("E2")):
            list_e2.append((v_e2, direccion, r))

    # Salida
    print("=" * 70)
    print("DIRECCIONES DE TODOS LOS E1 Y E2 - SI05.xlsx")
    print("=" * 70)
    print("\nColumnas detectadas:")
    print("  CIERRE T1 (E1): columna", col_e1, "->", headers.get(col_e1, ""))
    print("  CIERRE T2 (E2): columna", col_e2, "->", headers.get(col_e2, ""))
    print("  Dirección:      columna", col_direccion, "->", headers.get(col_direccion, ""))
    print()

    print("-" * 70)
    print("E1 (CIERRE T1)")
    print("-" * 70)
    for valor, direccion, fila in list_e1:
        print("  ", valor, "  ->  ", direccion or "(sin dirección)", "  [fila ", fila, "]", sep="")

    print()
    print("-" * 70)
    print("E2 (CIERRE T2)")
    print("-" * 70)
    for valor, direccion, fila in list_e2:
        print("  ", valor, "  ->  ", direccion or "(sin dirección)", "  [fila ", fila, "]", sep="")

    print()
    print("Resumen: E1 =", len(list_e1), "registros.  E2 =", len(list_e2), "registros.")

    # Guardar en archivo (dentro del proyecto)
    out_path = Path(__file__).resolve().parent / "SI05_DIRECCIONES_E1_E2.txt"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("DIRECCIONES DE TODOS LOS E1 Y E2 - SI05.xlsx\n")
        f.write("=" * 70 + "\n\n")
        f.write("E1 (CIERRE T1)\n")
        f.write("-" * 70 + "\n")
        for valor, direccion, fila in list_e1:
            f.write(f"  {valor}  ->  {direccion or '(sin dirección)'}\n")
        f.write("\nE2 (CIERRE T2)\n")
        f.write("-" * 70 + "\n")
        for valor, direccion, fila in list_e2:
            f.write(f"  {valor}  ->  {direccion or '(sin dirección)'}\n")
        f.write(f"\nResumen: E1 = {len(list_e1)} registros.  E2 = {len(list_e2)} registros.\n")
    print("\nListado guardado en:", out_path)

if __name__ == "__main__":
    main()
