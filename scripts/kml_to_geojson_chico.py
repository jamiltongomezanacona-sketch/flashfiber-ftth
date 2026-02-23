#!/usr/bin/env python3
"""
Convierte CHICO.kml a GeoJSON para cargar en el mapa FlashFiber FTTH.
Uso: python scripts/kml_to_geojson_chico.py [ruta_a_CHICO.kml]
Por defecto lee: geojson/CHICO/CHICO.kml
Escribe: geojson/CHICO/chico.geojson
"""
import json
import os
import sys
import xml.etree.ElementTree as ET

KML_NS = "{http://www.opengis.net/kml/2.2}"


def parse_coords_point(text):
    """'lng,lat,alt' -> [lng, lat]"""
    text = (text or "").strip().replace("\n", " ").split()
    if not text:
        return None
    part = text[0]
    parts = part.split(",")
    if len(parts) >= 2:
        return [float(parts[0]), float(parts[1])]
    return None


def parse_coords_linestring(text):
    """'lng1,lat1,alt1 lng2,lat2,alt2 ...' -> [[lng, lat], ...]"""
    text = (text or "").strip().replace("\n", " ")
    coords = []
    for part in text.split():
        p = part.split(",")
        if len(p) >= 2:
            coords.append([float(p[0]), float(p[1])])
    return coords if len(coords) >= 2 else None


def get_text(el, default=""):
    if el is None:
        return default
    return (el.text or "").strip() or default


def collect_placemarks(element, folder_name, features):
    """Recorre el árbol KML; folder_name = molécula (CO01, CO02, ... CO40) de la carpeta actual."""
    for child in element:
        if child.tag == KML_NS + "Folder":
            sub_name = get_text(child.find(KML_NS + "name"), "")
            # Si la carpeta tiene nombre tipo COxx, usarlo como molécula para sus Placemarks
            name_to_use = sub_name if sub_name and (sub_name == "CHICO" or sub_name.startswith("CO")) else folder_name
            collect_placemarks(child, name_to_use, features)
        elif child.tag == KML_NS + "Placemark":
            name_el = child.find(KML_NS + "name")
            name = get_text(name_el, "Sin nombre")
            desc_el = child.find(KML_NS + "description")
            description = get_text(desc_el, "")
            props = {"name": name}
            if folder_name:
                props["molecula"] = folder_name
            if description:
                props["description"] = description

            point_el = child.find(".//" + KML_NS + "Point/" + KML_NS + "coordinates")
            if point_el is not None:
                coords = parse_coords_point(point_el.text)
                if coords:
                    features.append({
                        "type": "Feature",
                        "properties": props,
                        "geometry": {"type": "Point", "coordinates": coords},
                    })
                continue

            line_el = child.find(".//" + KML_NS + "LineString/" + KML_NS + "coordinates")
            if line_el is not None:
                coords = parse_coords_linestring(line_el.text)
                if coords:
                    features.append({
                        "type": "Feature",
                        "properties": props,
                        "geometry": {"type": "LineString", "coordinates": coords},
                    })


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.dirname(script_dir)
    default_path = os.path.join(repo_root, "geojson", "CHICO", "CHICO.kml")
    if len(sys.argv) >= 2:
        kml_path = os.path.abspath(sys.argv[1])
    else:
        kml_path = default_path
    if not os.path.isfile(kml_path):
        print(f"No se encontró {kml_path}. Uso: python kml_to_geojson_chico.py [ruta/CHICO.kml]")
        sys.exit(1)

    tree = ET.parse(kml_path)
    root = tree.getroot()
    features = []

    # Document puede tener un Folder raíz (CHICO) con Folders CO02, CO03, ... CO36, etc.
    for doc_child in root:
        if doc_child.tag == KML_NS + "Document":
            for folder in doc_child:
                if folder.tag == KML_NS + "Folder":
                    folder_label = get_text(folder.find(KML_NS + "name"), "")
                    collect_placemarks(folder, folder_label, features)
            break
        elif doc_child.tag == KML_NS + "Folder":
            folder_label = get_text(doc_child.find(KML_NS + "name"), "")
            collect_placemarks(doc_child, folder_label, features)
            break

    out_dir = os.path.join(repo_root, "geojson", "CHICO")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "chico.geojson")
    geojson = {"type": "FeatureCollection", "features": features}
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)
    print(f"OK: {len(features)} features -> {out_path}")


if __name__ == "__main__":
    main()
