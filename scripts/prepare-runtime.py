"""Materialize the repository's native build inputs; no installed/released APK needed."""
import argparse
import hashlib
import json
import pathlib
import re
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]


def prepare(destination, version, code, runtime=ROOT / "native/runtime"):
    if not re.fullmatch(r"\d+\.\d+\.\d+", version) or type(code) is not int or code <= 0:
        raise ValueError("Invalid build version")
    if destination.exists():
        raise ValueError("Runtime destination must not exist")
    lock = json.loads((runtime / "runtime-lock.json").read_text(encoding="utf-8"))
    archive_path = runtime / lock["archive"]
    data = archive_path.read_bytes()
    if len(data) != lock["size"] or hashlib.sha256(data).hexdigest() != lock["sha256"]:
        raise ValueError("Native runtime archive integrity failed")
    with zipfile.ZipFile(archive_path) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)) or set(names) != set(lock["files"]):
            raise ValueError("Native runtime file inventory mismatch")
        contents = {}
        for name in names:
            relative = pathlib.PurePosixPath(name)
            if (relative.is_absolute() or ".." in relative.parts or "\\" in name
                    or ":" in name or name.startswith(("assets/public/", "original/", "build/"))
                    or name.endswith((".apk", ".jks", ".keystore")) or name == "classes2.dex"):
                raise ValueError("Unexpected native runtime path: " + name)
            content = archive.read(name)
            if hashlib.sha256(content).hexdigest() != lock["files"][name]:
                raise ValueError("Native runtime file integrity failed: " + name)
            contents[name] = content
    config = json.loads(contents["assets/capacitor.config.json"])
    server = config.get("server", {})
    if (config["appId"] != "com.wzbz.bazi" or server.get("androidScheme", "https") != "https"
            or server.get("hostname", "localhost") != "localhost" or server.get("url")):
        raise ValueError("Native runtime package/storage origin changed")
    yaml = contents["apktool.yml"].decode("utf-8")
    for key, value in [("versionCode", code), ("versionName", version)]:
        yaml, count = re.subn(r"(?m)^  " + key + r":.*$", "  " + key + ": " + str(value), yaml)
        if count != 1:
            raise ValueError("Missing or repeated native version field: " + key)
    contents["apktool.yml"] = yaml.encode("utf-8")
    for name, content in contents.items():
        output = destination / name
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(content)
    (destination / "assets/public").mkdir()
    return {"nativeFiles": len(contents), "runtimeSha256": lock["sha256"], "oldApkRequired": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--destination", type=pathlib.Path, required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--version-code", type=int, required=True)
    args = parser.parse_args()
    print(json.dumps(prepare(args.destination, args.version, args.version_code)))
