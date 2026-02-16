#!/usr/bin/env python3
"""
Convierte MUZU.kml a GeoJSON para cargar en el mapa FlashFiber FTTH.
Uso: python scripts/kml_to_geojson_muzu.py [ruta_a_MUZU.kml]
Por defecto lee: ../MUZU.kml (desde repo) o C:\\Users\\ASUS\\Desktop\\MUZU.kml
Escribe: geojson/MUZU/muzu.geojson
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


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.dirname(script_dir)
    default_paths = [
        os.path.join(repo_root, "MUZU.kml"),
        os.path.join(os.path.expanduser("~"), "Desktop", "MUZU.kml"),
    ]
    if len(sys.argv) >= 2:
        kml_path = os.path.abspath(sys.argv[1])
    else:
        kml_path = None
        for p in default_paths:
            if os.path.isfile(p):
                kml_path = p
                break
        if not kml_path:
            print("No se encontró MUZU.kml. Uso: python kml_to_geojson_muzu.py <ruta/MUZU.kml>")
            sys.exit(1)

    tree = ET.parse(kml_path)
    root = tree.getroot()
    features = []

    for pm in root.iter(KML_NS + "Placemark"):
        name_el = pm.find(KML_NS + "name")
        name = get_text(name_el, "Sin nombre")

        point_el = pm.find(".//" + KML_NS + "Point/" + KML_NS + "coordinates")
        if point_el is not None:
            coords = parse_coords_point(point_el.text)
            if coords:
                features.append({
                    "type": "Feature",
                    "properties": {"name": name},
                    "geometry": {"type": "Point", "coordinates": coords},
                })
            continue

        line_el = pm.find(".//" + KML_NS + "LineString/" + KML_NS + "coordinates")
        if line_el is not None:
            coords = parse_coords_linestring(line_el.text)
            if coords:
                features.append({
                    "type": "Feature",
                    "properties": {"name": name},
                    "geometry": {"type": "LineString", "coordinates": coords},
                })

    out_dir = os.path.join(repo_root, "geojson", "MUZU")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "muzu.geojson")
    geojson = {"type": "FeatureCollection", "features": features}
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)
    print(f"OK: {len(features)} features -> {out_path}")


if __name__ == "__main__":
    main()
