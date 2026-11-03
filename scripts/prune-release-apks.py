"""Remove superseded installers only after verifying the chosen latest full release.

Defaults to a read-only plan. --apply is explicit authorization to remove the plan.
Never deletes releases, source tags, signing keys or Android application data.
"""
import argparse
import importlib.util
import json
import pathlib
import re

SPEC = importlib.util.spec_from_file_location("publisher", pathlib.Path(__file__).with_name("publish-release.py"))
publisher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(publisher)


def version(tag):
    match = re.fullmatch(r"v(\d+)\.(\d+)\.(\d+)(?:-[a-zA-Z0-9.-]+)?", tag)
    return tuple(map(int, match.groups())) if match else None


def verify_latest(api, keep):
    latest = api.call("/releases/latest")
    publisher.require(version(keep) is not None and latest["tag_name"] == keep
                      and not latest["draft"] and not latest["prerelease"], "Chosen release is not formal latest")
    metadata = publisher.asset_for(latest, "update.json")
    manifest = json.loads(publisher.public_bytes(metadata["browser_download_url"]))
    publisher.require(manifest.get("schema") == 1 and manifest.get("packageId") == publisher.PACKAGE
                      and "v" + manifest["version"] == keep and type(manifest["versionCode"]) is int
                      and manifest["versionCode"] > 0 and re.fullmatch(r"[a-f0-9]{64}", manifest["sha256"])
                      and type(manifest["size"]) is int and manifest["size"] > 0
                      and manifest["apk"] == "zaohua-" + keep + ".apk", "Invalid latest full-package manifest")
    asset = publisher.asset_for(latest, manifest["apk"])
    publisher.require(asset["state"] == "uploaded" and asset["size"] == manifest["size"]
                      and asset.get("digest") == "sha256:" + manifest["sha256"]
                      and asset["browser_download_url"] == f"https://github.com/{publisher.REPO}/releases/download/{keep}/" + manifest["apk"],
                      "Latest APK is missing or not verified")
    return latest, manifest


def remote_plan(releases, keep):
    result = []
    for release in releases:
        parsed = version(release["tag_name"])
        if release["draft"] or parsed is None or parsed >= version(keep):
            continue
        for asset in release["assets"]:
            if asset["name"].lower().endswith((".apk", ".apk.idsig")) or asset["name"] in ("update.json", "SHA256SUMS.txt"):
                result.append({"releaseId": release["id"], "tag": release["tag_name"], "id": asset["id"],
                               "name": asset["name"], "size": asset["size"]})
    return result


def local_plan(keep, work):
    result = []
    output = (publisher.ROOT / "release/android").resolve()
    work = work.resolve()
    publisher.require(work.drive.upper() == "D:" and work.name == "zaohua-release-work",
                      "Build cleanup must target D:/zaohua-release-work")
    for directory, recursive in [(output, False), (work, True)]:
        files = directory.rglob("*") if recursive else directory.glob("*")
        for path in files:
            if path.is_symlink() or not path.is_file() or not path.name.lower().endswith((".apk", ".apk.idsig")):
                continue
            resolved = path.resolve()
            publisher.require(resolved.is_relative_to(directory), "Cleanup path escaped intended directory")
            if resolved.parent == output and resolved.name in ("zaohua-" + keep + ".apk", "zaohua-" + keep + ".apk.idsig"):
                continue
            named_version = re.search(r"v(\d+\.\d+\.\d+)", resolved.name)
            if named_version and version("v" + named_version[1]) >= version(keep):
                continue
            # A current or future build can be in progress. Only completed historical build trees are eligible.
            relative = resolved.relative_to(work) if directory == work else None
            if relative and relative.parts[0].startswith("build-"):
                match = re.match(r"build-(\d+\.\d+\.\d+)-", relative.parts[0])
                if not match or version("v" + match[1]) >= version(keep):
                    continue
            if directory == output:
                if not named_version:
                    continue
            result.append({"path": str(resolved), "size": resolved.stat().st_size, "root": str(directory)})
    return result


def prune_remote(api, plan, keep):
    # Re-read latest before every deletion. A concurrent promotion stops this run.
    for asset in plan:
        verify_latest(api, keep)
        current = api.call("/releases/" + str(asset["releaseId"]))
        publisher.require(current["tag_name"] == asset["tag"] and not current["draft"]
                          and version(current["tag_name"]) < version(keep), "Release changed during cleanup")
        match = [a for a in current["assets"] if a["id"] == asset["id"]]
        if not match:
            continue
        publisher.require(match[0]["name"] == asset["name"] and match[0]["size"] == asset["size"], "Asset changed during cleanup")
        api.call("/releases/assets/" + str(asset["id"]), "DELETE")
        print("Removed old release attachment: " + asset["tag"] + "/" + asset["name"], flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--keep-tag", required=True)
    parser.add_argument("--work", type=pathlib.Path, default=pathlib.Path("D:/zaohua-release-work"))
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    api = publisher.GitHub()
    latest, manifest = verify_latest(api, args.keep_tag)
    releases, page = [], 1
    while True:
        rows = api.call("/releases?per_page=100&page=" + str(page))
        releases.extend(rows)
        if len(rows) < 100:
            break
        page += 1
    plan = {"keep": args.keep_tag, "latestReleaseId": latest["id"], "manifest": manifest,
            "remote": remote_plan(releases, args.keep_tag), "local": local_plan(args.keep_tag, args.work)}
    output = publisher.ROOT / "release/android" / ("cleanup-" + args.keep_tag + ".json")
    output.write_bytes(publisher.encoded(plan))
    print(json.dumps({"keep": args.keep_tag, "remoteAttachments": len(plan["remote"]), "localInstallers": len(plan["local"]),
                      "localBytes": sum(p["size"] for p in plan["local"]), "applied": args.apply}), flush=True)
    if not args.apply:
        return
    prune_remote(api, plan["remote"], args.keep_tag)
    verify_latest(api, args.keep_tag)
    for item in plan["local"]:
        path = pathlib.Path(item["path"])
        publisher.require(not path.is_symlink() and path.resolve().is_relative_to(pathlib.Path(item["root"])),
                          "Cleanup target changed")
        if path.exists():
            publisher.require(path.stat().st_size == item["size"], "Local installer changed during cleanup")
            path.unlink()
    plan["applied"] = True
    output.write_bytes(publisher.encoded(plan))
    print("Cleanup completed; latest release verified; source, signing and application data untouched", flush=True)


if __name__ == "__main__":
    main()
