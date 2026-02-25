#!/usr/bin/env python3
"""
Actualiza todos los cables y cierres de CHICO desde un KML.
Lee el KML (Document > Folder CHICO > Folders CO02, CO03, ...) y escribe en:
  geojson/FTTH/CHICO/COxx/cables/<nombre>.geojson
  geojson/FTTH/CHICO/COxx/cierres/cierres.geojson
  + index.json en cada carpeta.

Uso: python scripts/update_chico_from_kml.py [ruta/CHICO.kml]
Por defecto: geojson/CHICO/CHICO.kml (o pasar C:\\Users\\...\\CHICO.kml)
"""
import json
import os
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

KML_NS = "{http://www.opengis.net/kml/2.2}"
RE_CO_FOLDER = re.compile(r"^CO(\d+)$", re.I)
COLOR_DEFAULT = "#034a32"


def get_text(el, default=""):
    if el is None:
        return (default or "").strip()
    return (el.text or "").strip() or default


def parse_coords_point(text):
    text = (text or "").strip().replace("\n", " ").split()
    if not text:
        return None
    parts = text[0].split(",")
    if len(parts) >= 2:
        return [float(parts[0]), float(parts[1])]
    return None


def parse_coords_linestring(text):
    text = (text or "").strip().replace("\n", " ")
    coords = []
    for part in text.split():
        p = part.split(",")
        if len(p) >= 2:
            coords.append([float(p[0]), float(p[1])])
    return coords if len(coords) >= 2 else None


def infer_tipo_cierre(name):
    name = (name or "").upper()
    if "E0" in name or "POR CORTE" in name:
        return "E0"
    if "E1" in name:
        return "E1"
    if "E2" in name:
        return "E2"
    return "E1"


def load_kml_root(path):
    path = os.path.abspath(path)
    if not os.path.isfile(path):
        return None
    if path.lower().endswith(".kmz"):
        with zipfile.ZipFile(path, "r") as z:
            for name in z.namelist():
                if name.lower().endswith(".kml"):
                    with z.open(name) as f:
                        return ET.parse(f).getroot()
        return None
    return ET.parse(path).getroot()


def collect_molecule_placemarks(folder_el, molecula_name):
    """Extrae cables (LineString) y cierres (Point) de un Folder COxx."""
    cables = []
    cierres = []
    for child in folder_el:
        if child.tag != KML_NS + "Placemark":
            continue
        name_el = child.find(KML_NS + "name")
        name = get_text(name_el, "Sin nombre")
        props_base = {"name": name, "molecula": molecula_name, "central": "CHICO"}

        for idx, line_el in enumerate(child.findall(".//" + KML_NS + "LineString/" + KML_NS + "coordinates")):
            coords = parse_coords_linestring(line_el.text)
            if coords:
                cable_name = name if idx == 0 else f"{name}_{idx + 1}"
                p = dict(props_base)
                p["name"] = cable_name
                cables.append({"name": cable_name, "coordinates": coords, "properties": p})

        for point_el in child.findall(".//" + KML_NS + "Point/" + KML_NS + "coordinates"):
            coords = parse_coords_point(point_el.text)
            if coords:
                p = dict(props_base)
                p["tipo"] = infer_tipo_cierre(name)
                cierres.append({"name": name, "coordinates": coords, "properties": p})

    return cables, cierres


def find_chico_folders(root):
    """Devuelve lista de (nombre_folder, element) para cada Folder COxx dentro de CHICO."""
    out = []
    for doc in root:
        if doc.tag != KML_NS + "Document":
            continue
        for folder in doc:
            if folder.tag != KML_NS + "Folder":
                continue
            folder_name = get_text(folder.find(KML_NS + "name"), "")
            if folder_name.upper() == "CHICO":
                for sub in folder:
                    if sub.tag == KML_NS + "Folder":
                        sub_name = get_text(sub.find(KML_NS + "name"), "")
                        if RE_CO_FOLDER.match(sub_name):
                            out.append((sub_name, sub))
                break
        break
    return out


def safe_filename(name):
    """Nombre de archivo seguro para .geojson."""
    s = re.sub(r"[^\w\-\.]", "_", name)
    return s or "cable.geojson"


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.dirname(script_dir)
    base_chico = os.path.join(repo_root, "geojson", "FTTH", "CHICO")
    default_kml = os.path.join(repo_root, "geojson", "CHICO", "CHICO.kml")

    kml_path = os.path.abspath(sys.argv[1]) if len(sys.argv) >= 2 else default_kml
    if not os.path.isfile(kml_path):
        print(f"No se encontró {kml_path}")
        print("Uso: python scripts/update_chico_from_kml.py [ruta/CHICO.kml]")
        sys.exit(1)

    root = load_kml_root(kml_path)
    if root is None:
        print("No se pudo leer el KML/KMZ")
        sys.exit(1)

    molecules = find_chico_folders(root)
    if not molecules:
        print("No se encontraron carpetas COxx dentro de CHICO en el KML")
        sys.exit(1)

    all_molecula_ids = []
    for molecula_name, folder_el in molecules:
        cables, cierres = collect_molecule_placemarks(folder_el, molecula_name)
        mol_dir = os.path.join(base_chico, molecula_name)
        cables_dir = os.path.join(mol_dir, "cables")
        cierres_dir = os.path.join(mol_dir, "cierres")
        os.makedirs(cables_dir, exist_ok=True)
        os.makedirs(cierres_dir, exist_ok=True)

        # Escribir cables (un .geojson por cable)
        cable_children = []
        for i, cab in enumerate(cables):
            name = cab["name"]
            fname = safe_filename(name)
            if not fname.lower().endswith(".geojson"):
                fname += ".geojson"
            fc = {
                "type": "FeatureCollection",
                "features": [{
                    "type": "Feature",
                    "properties": cab["properties"],
                    "geometry": {"type": "LineString", "coordinates": cab["coordinates"]},
                }],
            }
            path_cable = os.path.join(cables_dir, fname)
            with open(path_cable, "w", encoding="utf-8") as f:
                json.dump(fc, f, ensure_ascii=False, indent=0)
            layer_id = f"FTTH_CHICO_{molecula_name}_{name.replace(' ', '_')}"
            cable_children.append({
                "type": "layer",
                "id": layer_id,
                "label": name,
                "path": fname,
                "typeLayer": "line",
                "paint": {"line-color": COLOR_DEFAULT, "line-width": 4},
            })

        if cable_children:
            with open(os.path.join(cables_dir, "index.json"), "w", encoding="utf-8") as f:
                json.dump({"label": "Cables", "children": cable_children}, f, ensure_ascii=False, indent=2)

        # Escribir cierres (un cierres.geojson)
        cierre_features = []
        for c in cierres:
            cierre_features.append({
                "type": "Feature",
                "properties": c["properties"],
                "geometry": {"type": "Point", "coordinates": c["coordinates"]},
            })
        if cierre_features:
            fc_cierres = {"type": "FeatureCollection", "features": cierre_features}
            with open(os.path.join(cierres_dir, "cierres.geojson"), "w", encoding="utf-8") as f:
                json.dump(fc_cierres, f, ensure_ascii=False, indent=0)
            with open(os.path.join(cierres_dir, "index.json"), "w", encoding="utf-8") as f:
                json.dump({
                    "label": "Cierres",
                    "children": [{
                        "type": "layer",
                        "id": f"FTTH_CHICO_{molecula_name}_cierres",
                        "label": f"Cierres {molecula_name}",
                        "path": "cierres.geojson",
                        "typeLayer": "symbol",
                    }],
                }, f, ensure_ascii=False, indent=2)

        # COxx/index.json
        index_parts = []
        if cable_children:
            index_parts.append({"type": "folder", "label": "Cables", "index": "cables/index.json"})
        if cierre_features:
            index_parts.append({"type": "folder", "label": "Cierres", "index": "cierres/index.json"})
        with open(os.path.join(mol_dir, "index.json"), "w", encoding="utf-8") as f:
            json.dump({"label": molecula_name, "children": index_parts}, f, ensure_ascii=False, indent=2)

        all_molecula_ids.append(molecula_name)
        print(f"  {molecula_name}: {len(cables)} cable(s), {len(cierres)} cierre(s)")

    # Actualizar geojson/FTTH/CHICO/index.json: mantener orden CO01..CO43, solo incluir moléculas que existen
    chico_index_path = os.path.join(base_chico, "index.json")
    existing = []
    if os.path.isfile(chico_index_path):
        with open(chico_index_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            existing = [c["id"] for c in data.get("children", []) if c.get("id")]
    # Unir: todos los que ya estaban + los nuevos del KML que no estaban
    seen = set(existing)
    for mid in all_molecula_ids:
        if mid not in seen:
            seen.add(mid)
            existing.append(mid)
    existing.sort(key=lambda x: (x[:2], int(x[2:]) if x[2:].isdigit() else 0))
    children = [{"id": mid, "label": mid, "type": "folder", "index": f"{mid}/index.json"} for mid in existing]
    with open(chico_index_path, "w", encoding="utf-8") as f:
        json.dump({"label": "Chicó (CO)", "children": children}, f, ensure_ascii=False, indent=2)

    print(f"OK: {len(molecules)} moléculas actualizadas en geojson/FTTH/CHICO/")
    print(f"    CHICO/index.json actualizado ({len(children)} moléculas)")


if __name__ == "__main__":
    main()
