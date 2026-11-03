"""Prepare/verify the Android updater contract, then explicitly publish a release.

Credentials are obtained from Git Credential Manager and never written to disk.
Run without --publish for local validation. All temporary APK work stays on D:.
"""
import argparse
import hashlib
import json
import os
import pathlib
import posixpath
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
REPO = "kyirejson/mingli-paipan"
PACKAGE = "com.wzbz.bazi"
CERTIFICATE = "07c4a9dc932f0bbb0690fbbc2ccab7e925c417f97645f77291a91514134d5c2a"


def require(condition, message):
    if not condition:
        raise ValueError(message)


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def prepare(apk, version, code, build_tools, java, work):
    require(re.fullmatch(r"\d+\.\d+\.\d+", version), "Invalid version")
    require(type(code) is int and code > 0, "Invalid versionCode")
    data = apk.read_bytes()
    require(0 < len(data) <= 1024**3, "Invalid APK size")
    with zipfile.ZipFile(apk) as archive:
        require(archive.testzip() is None, "APK CRC failed")
        info = json.loads(archive.read("assets/public/static/update-info.json"))
        require(info["version"] == version and info["versionCode"] == code, "Bundled version mismatch")
        config = json.loads(archive.read("assets/capacitor.config.json"))
        server = config.get("server", {})
        require(config["appId"] == PACKAGE and server.get("androidScheme", "https") == "https"
                and server.get("hostname", "localhost") == "localhost" and not server.get("url"),
                "Storage origin changed: existing WebView records would become inaccessible")
        if code >= 16:
            plugins = json.loads(archive.read("assets/capacitor.plugins.json"))
            require(any(p.get("classpath") == "com.wzbz.bazi.DataVaultPlugin" for p in plugins)
                    and "classes2.dex" in archive.namelist(), "DataVault native backup plugin is missing")
            require("assets/public/static/js/data-preservation.js" in archive.namelist(), "Data preservation bootstrap is missing")
            cases = archive.read("assets/public/static/data/celebrity-legacy.csv").decode("utf-8")
            require(len(cases.strip().splitlines()) >= 58, "Bundled celebrity catalogue was removed or truncated")
    work.mkdir(parents=True, exist_ok=True)
    # Windows aapt cannot reliably open paths containing Chinese characters.
    with tempfile.TemporaryDirectory(prefix="release-preflight-", dir=work) as temporary:
        local_apk = pathlib.Path(temporary) / "release.apk"
        shutil.copyfile(apk, local_apk)
        badging = subprocess.check_output([str(build_tools / "aapt.exe"), "dump", "badging", str(local_apk)])
        package = badging.decode("utf-8").splitlines()[0]
        require(f"name='{PACKAGE}'" in package and f"versionName='{version}'" in package
                and f"versionCode='{code}'" in package, "Native APK version/package mismatch")
        signature = subprocess.check_output([str(java), "-jar", str(build_tools / "lib/apksigner.jar"),
                                             "verify", "--print-certs", str(local_apk)]).decode("utf-8")
        require(re.findall(r"Signer #\d+ certificate SHA-256 digest: (\w+)", signature) == [CERTIFICATE],
                "Unexpected APK signing certificate")
        subprocess.run([str(build_tools / "zipalign.exe"), "-c", "-p", "4", str(local_apk)], check=True)
    manifest = {"schema": 1, "version": version, "versionCode": code, "packageId": PACKAGE,
                "apk": apk.name, "sha256": hashlib.sha256(data).hexdigest(), "size": len(data)}
    return manifest, data


def asset_for(release, name):
    matches = [a for a in release.get("assets", []) if a["name"] == name]
    require(len(matches) == 1, f"Release must contain exactly one {name}")
    return matches[0]


def verify_asset(asset, name, data, tag, draft=False):
    require(asset["name"] == name and asset["state"] == "uploaded", f"Incomplete {name}")
    require(asset["size"] == len(data), f"Size mismatch for {name}")
    require(asset.get("digest") == "sha256:" + hashlib.sha256(data).hexdigest(), f"Digest mismatch for {name}")
    expected = f"https://github.com/{REPO}/releases/download/{tag}/" + urllib.parse.quote(name)
    url = asset["browser_download_url"]
    temporary = draft and re.fullmatch(re.escape(f"https://github.com/{REPO}/releases/download/")
                                      + r"untagged-[a-zA-Z0-9]+/" + re.escape(urllib.parse.quote(name)), url)
    require(url == expected or temporary, f"Unexpected download URL for {name}")


def verify_contract(release, manifest, manifest_bytes, apk_bytes, published=False):
    require(release["tag_name"] == "v" + manifest["version"], "Release tag mismatch")
    require(manifest["schema"] == 1 and manifest["packageId"] == PACKAGE, "Invalid updater schema/package")
    require(manifest["size"] == len(apk_bytes) and manifest["sha256"] == hashlib.sha256(apk_bytes).hexdigest(),
            "Manifest does not describe this APK")
    require(json.loads(manifest_bytes) == manifest, "Update manifest bytes mismatch")
    for name, data in [(manifest["apk"], apk_bytes), ("update.json", manifest_bytes)]:
        verify_asset(asset_for(release, name), name, data, release["tag_name"], draft=release["draft"] and not published)
    if published:
        require(not release["draft"] and not release["prerelease"], "Installed updater rejects draft/prerelease")


class GitHub:
    def __init__(self):
        env = {**os.environ, "GIT_TERMINAL_PROMPT": "0", "GCM_INTERACTIVE": "Never"}
        result = subprocess.run(["git", "credential", "fill"], input="protocol=https\nhost=github.com\n\n",
                                cwd=ROOT, text=True, capture_output=True, env=env)
        require(result.returncode == 0, "GitHub credential unavailable")
        credential = dict(line.split("=", 1) for line in result.stdout.splitlines() if "=" in line)
        require(credential.get("password"), "GitHub credential unavailable")
        self.headers = {"Authorization": "Bearer " + credential["password"], "User-Agent": "Zaohua-release",
                        "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}

    def call(self, route, method="GET", data=None, content_type="application/json"):
        url = route if route.startswith("https://uploads.github.com/") else "https://api.github.com/repos/" + REPO + route
        request = urllib.request.Request(url, method=method, data=data,
                                         headers={**self.headers, "Content-Type": content_type})
        with urllib.request.urlopen(request, timeout=90) as response:
            if response.status == 204:
                return None
            return json.load(response)


def upload_verified(api, release, name, data, content_type):
    current = api.call("/releases/" + str(release["id"]))
    existing = [a for a in current["assets"] if a["name"] == name]
    if existing:
        require(len(existing) == 1, f"Duplicate {name}")
        verify_asset(existing[0], name, data, release["tag_name"], draft=current["draft"])
        return
    url = release["upload_url"].split("{")[0] + "?name=" + urllib.parse.quote(name)
    result = api.call(url, "POST", data, content_type)
    verify_asset(result, name, data, release["tag_name"], draft=current["draft"])
    print("Uploaded and verified " + name, flush=True)


def promote(api, release, manifest, manifest_bytes, apk_bytes, notes):
    # Validate the existing APK before adding metadata; never replace an existing binary.
    verify_asset(asset_for(release, manifest["apk"]), manifest["apk"], apk_bytes, release["tag_name"], draft=release["draft"])
    upload_verified(api, release, "update.json", manifest_bytes, "application/json")
    complete = api.call("/releases/" + str(release["id"]))
    verify_contract(complete, manifest, manifest_bytes, apk_bytes)
    # Verify the actual public manifest, not just its GitHub upload receipt.
    url = asset_for(complete, "update.json")["browser_download_url"]
    if not complete["draft"]:
        require(json.loads(public_bytes(url)) == manifest, "Public update.json mismatch")
    api.call("/releases/" + str(release["id"]), "PATCH", encoded({
        "draft": False, "prerelease": False, "make_latest": "true",
        "name": "造化元钥 v" + manifest["version"], "body": notes}))
    latest = api.call("/releases/latest")
    verify_contract(latest, manifest, manifest_bytes, apk_bytes, published=True)
    require(json.loads(public_bytes(asset_for(latest, "update.json")["browser_download_url"])) == manifest,
            "Published update.json mismatch")
    return latest


def public_bytes(url):
    # No Authorization header on GitHub/CDN downloads.
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Zaohua-release"}), timeout=45) as response:
                result = response.read(65537)
                require(len(result) <= 65536, "Oversized update manifest")
                return result
        except urllib.error.HTTPError as error:
            if error.code != 404 or attempt == 2:
                raise
            time.sleep(2)


def find_release(api, tag):
    try:
        return api.call("/releases/tags/" + tag)
    except urllib.error.HTTPError as error:
        if error.code != 404:
            raise
    # The tag endpoint can return 404 for a draft. Resume by ID, never create duplicates.
    matches = []
    page = 1
    while True:
        rows = api.call("/releases?per_page=100&page=" + str(page))
        matches.extend(r for r in rows if r["tag_name"] == tag)
        if len(rows) < 100:
            break
        page += 1
    require(len(matches) <= 1, "Multiple draft releases for this tag; refusing to choose silently")
    return matches[0] if matches else None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", required=True)
    parser.add_argument("--version-code", type=int, required=True)
    parser.add_argument("--publish", action="store_true")
    parser.add_argument("--prune-old-apks", action="store_true", help="After verified publication, remove superseded installers only")
    parser.add_argument("--work", type=pathlib.Path, default=pathlib.Path("D:/zaohua-release-work"))
    parser.add_argument("--build-tools", type=pathlib.Path, default=pathlib.Path("C:/Users/28257/android-sdk/build-tools/34.0.0"))
    parser.add_argument("--java", type=pathlib.Path, default=pathlib.Path("C:/Users/28257/jdk17/jdk-17.0.12+7/bin/java.exe"))
    args = parser.parse_args()
    tag = "v" + args.version
    apk = ROOT / "release/android" / ("zaohua-" + tag + ".apk")
    manifest, apk_bytes = prepare(apk, args.version, args.version_code, args.build_tools, args.java, args.work)
    directory = ROOT / "release/metadata" / tag
    directory.mkdir(parents=True, exist_ok=True)
    manifest_bytes = encoded(manifest)
    (directory / "update.json").write_bytes(manifest_bytes)
    print("Validated APK version, certificate, alignment and update.json", flush=True)
    if not args.publish:
        return
    commit = subprocess.check_output(["git", "rev-parse", "refs/tags/" + tag], cwd=ROOT, text=True).strip()
    remote = subprocess.check_output(["git", "ls-remote", "origin", "refs/tags/" + tag], cwd=ROOT, text=True).split()
    require(remote and remote[0] == commit, "Publish source tag to GitHub first")
    require(not subprocess.check_output(["git", "status", "--porcelain", "--", "dist"], cwd=ROOT), "Uncommitted app changes")
    api = GitHub()
    notes = (ROOT / "docs/releases" / (tag + ".md")).read_text(encoding="utf-8")
    notes = re.sub(r"\[([^\]]+)\]\((\.\./[^)]+)\)", lambda m: "[" + m[1] + "](https://github.com/" + REPO
                   + "/blob/main/" + posixpath.normpath("docs/releases/" + m[2]) + ")", notes)
    notes += "\n\n安装包源码标签：`" + tag + "`，提交：`" + commit + "`。"
    release = find_release(api, tag)
    if release is None:
        release = api.call("/releases", "POST", encoded({"tag_name": tag, "target_commitish": commit,
                          "name": "造化元钥 " + tag, "draft": True, "prerelease": False, "make_latest": "false"}))
    require(release["target_commitish"] == commit, "Release source commit mismatch")
    if release["draft"]:
        upload_verified(api, release, apk.name, apk_bytes, "application/vnd.android.package-archive")
    upload_verified(api, release, "SHA256SUMS.txt", (manifest["sha256"] + "  " + apk.name + "\n").encode("ascii"), "text/plain")
    latest = promote(api, release, manifest, manifest_bytes, apk_bytes, notes)
    result = {"release": latest["html_url"], "tag": tag, "commit": commit, "prerelease": False,
              "latest_endpoint_verified": True, "public_manifest_verified": True, "update": manifest,
              "download": asset_for(latest, apk.name)["browser_download_url"],
              "assets": [a["name"] for a in latest["assets"]], "phone_install_verified": False}
    (ROOT / "release/android" / ("published-" + tag + ".json")).write_bytes(encoded(result))
    print(json.dumps(result, ensure_ascii=False, indent=2), flush=True)
    if args.prune_old_apks:
        subprocess.run([sys.executable, str(ROOT / "scripts/prune-release-apks.py"),
                        "--keep-tag", tag, "--apply"], cwd=ROOT, check=True)


if __name__ == "__main__":
    main()
