#!/usr/bin/env python3
"""Download GFS 0.25° 10m wind for China and export wind-js JSON."""

from __future__ import annotations

import argparse
import json
import shutil
import ssl
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import UTC, datetime, timedelta
from pathlib import Path

try:
    import cfgrib
    import numpy as np
except ImportError as exc:
    print("Missing deps. Run: pip install cfgrib eccodes xarray numpy", file=sys.stderr)
    raise SystemExit(1) from exc

CHINA = {"leftlon": 73, "rightlon": 135, "toplat": 54, "bottomlat": 18}


def build_nomads_url(ymd: str, cycle: str) -> str:
    c = CHINA
    return (
        "https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl?"
        f"dir=%2Fgfs.{ymd}%2F{cycle}%2Fatmos&"
        f"file=gfs.t{cycle}z.pgrb2.0p25.f000&"
        "lev_10_m_above_ground=on&var_UGRD=on&var_VGRD=on&"
        f"subregion=&leftlon={c['leftlon']}&rightlon={c['rightlon']}"
        f"&toplat={c['toplat']}&bottomlat={c['bottomlat']}"
    )


def fetch_url(url: str, timeout: int = 120) -> bytes:
    curl = shutil.which("curl") or shutil.which("curl.exe")
    if curl:
        proc = subprocess.run(
            [
                curl,
                "-sL",
                "--fail",
                "--ssl-no-revoke",
                "--max-time",
                str(timeout),
                "-A",
                "low-altitude-wind-demo/1.0",
                url,
            ],
            capture_output=True,
            check=False,
        )
        if proc.returncode == 0 and len(proc.stdout) > 5000:
            return proc.stdout

    req = urllib.request.Request(url, headers={"User-Agent": "low-altitude-wind-demo/1.0"})
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            return resp.read()
    except (urllib.error.URLError, urllib.error.HTTPError, ssl.SSLError) as exc:
        raise RuntimeError(f"download failed: {url}") from exc


def download_grib(out_grib: Path, ymd: str | None, cycle: str | None) -> tuple[str, str]:
    for days_back in range(0, 10):
        d = datetime.now(UTC) - timedelta(days=days_back)
        date = ymd or d.strftime("%Y%m%d")
        for hr in ([cycle] if cycle else ["18", "12", "06", "00"]):
            url = build_nomads_url(date, hr)
            try:
                data = fetch_url(url)
            except RuntimeError:
                continue
            if len(data) > 5000:
                out_grib.write_bytes(data)
                return date, hr
    raise RuntimeError("No recent GFS cycle found on NOMADS")


def grib_to_wind_json(grib_path: Path, out_json: Path) -> dict:
    ds = cfgrib.open_datasets(str(grib_path))[0]
    u = ds["u10"].values.astype(float)
    v = ds["v10"].values.astype(float)
    lats = ds["latitude"].values
    lons = ds["longitude"].values

    ny, nx = u.shape
    lo1, lo2 = float(lons[0]), float(lons[-1])
    la1, la2 = float(lats[0]), float(lats[-1])
    dx = float(lons[1] - lons[0]) if nx > 1 else 0.25
    dy = float(lats[1] - lats[0]) if ny > 1 else 0.25

    u_flat = np.where(np.isfinite(u), u, 0).flatten(order="C").tolist()
    v_flat = np.where(np.isfinite(v), v, 0).flatten(order="C").tolist()

    def header(param_num: int, name: str) -> dict:
        return {
            "parameterCategory": 2,
            "parameterCategoryName": "Momentum",
            "parameterNumber": param_num,
            "parameterNumberName": name,
            "nx": int(nx),
            "ny": int(ny),
            "lo1": lo1,
            "la1": la1,
            "lo2": lo2,
            "la2": la2,
            "dx": dx,
            "dy": dy,
        }

    payload = [
        {"header": header(2, "U-component_of_wind"), "data": u_flat},
        {"header": header(3, "V-component_of_wind"), "data": v_flat},
    ]
    out_json.write_text(json.dumps(payload), encoding="utf-8")
    return {"nx": nx, "ny": ny, "lo1": lo1, "la1": la1, "lo2": lo2, "la2": la2, "dx": dx, "dy": dy}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "public" / "wind-demo",
    )
    parser.add_argument("--date", help="GFS date YYYYMMDD (default: latest)")
    parser.add_argument("--cycle", choices=["00", "06", "12", "18"], help="UTC cycle")
    args = parser.parse_args()

    args.out_dir.mkdir(parents=True, exist_ok=True)
    grib_path = args.out_dir / "china_wind.grib2"

    date, cycle = download_grib(grib_path, args.date, args.cycle)
    meta = grib_to_wind_json(grib_path, args.out_dir / f"gfs_china_{date}{cycle}.json")
    print(f"OK gfs.{date}/{cycle} -> {meta['nx']}x{meta['ny']} grid, bounds [{meta['lo1']},{meta['lo2']}] x [{meta['la1']},{meta['la2']}]")


if __name__ == "__main__":
    main()
