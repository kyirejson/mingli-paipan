import hashlib
import importlib.util
import json
import pathlib
import tempfile
import unittest
import zipfile
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parents[1]


def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / (name + ".py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


runtime = load("prepare-runtime")
cleanup = load("prune-release-apks")


class BuildLifecycleTest(unittest.TestCase):
    def temporary(self):
        directory = ROOT / "release/test-fixtures"
        directory.mkdir(parents=True, exist_ok=True)
        context = tempfile.TemporaryDirectory(dir=directory)
        self.addCleanup(context.cleanup)
        return pathlib.Path(context.name)

    def test_native_runtime_builds_in_empty_directory_without_any_old_apk(self):
        destination = self.temporary() / "fresh"
        result = runtime.prepare(destination, "1.0.16", 17)
        self.assertFalse(result["oldApkRequired"])
        self.assertEqual(list((destination / "assets/public").iterdir()), [])
        self.assertFalse((destination / "classes2.dex").exists())
        self.assertIn("versionName: 1.0.16", (destination / "apktool.yml").read_text())
        self.assertIn("versionCode: 17", (destination / "apktool.yml").read_text())
        self.assertEqual(json.loads((destination / "assets/capacitor.config.json").read_text())["appId"], "com.wzbz.bazi")
        self.assertFalse(any(destination.rglob("*.apk")))

    def test_tampered_runtime_is_rejected_before_writing(self):
        root = self.temporary()
        (root / "runtime-lock.json").write_text(json.dumps({"archive": "bad.zip", "size": 1, "sha256": "0" * 64}))
        (root / "bad.zip").write_bytes(b"x")
        with self.assertRaisesRegex(ValueError, "integrity failed"):
            runtime.prepare(root / "output", "1.0.16", 17, root)
        self.assertFalse((root / "output").exists())

    def test_old_web_assets_and_traversal_cannot_be_added_even_with_updated_hashes(self):
        for path in ["assets/public/obsolete-library.js", "../outside"]:
            root = self.temporary()
            with zipfile.ZipFile(root / "bad.zip", "w") as archive:
                archive.writestr(path, b"obsolete")
            data = (root / "bad.zip").read_bytes()
            (root / "runtime-lock.json").write_text(json.dumps({"archive": "bad.zip", "size": len(data),
                "sha256": hashlib.sha256(data).hexdigest(), "files": {path: hashlib.sha256(b"obsolete").hexdigest()}}))
            with self.assertRaisesRegex(ValueError, "Unexpected native runtime path"):
                runtime.prepare(root / "output", "1.0.16", 17, root)

    def test_cleanup_keeps_current_future_drafts_and_unrelated_attachments(self):
        releases = []
        for index, (tag, draft) in enumerate([("v1.0.7", False), ("v1.0.8-new-signature", False),
                ("v1.0.16", False), ("v1.0.17", False), ("v1.0.14", True), ("unrelated", False)]):
            releases.append({"id": index, "tag_name": tag, "draft": draft, "assets": [
                {"id": index * 10, "name": "app.apk", "size": 1},
                {"id": index * 10 + 1, "name": "notes.md", "size": 2}]})
        plan = cleanup.remote_plan(releases, "v1.0.16")
        self.assertEqual([p["tag"] for p in plan], ["v1.0.7", "v1.0.8-new-signature"])
        self.assertTrue(all(p["name"] == "app.apk" for p in plan))

    def test_cleanup_stops_when_latest_changes_or_its_apk_is_missing(self):
        class API:
            def __init__(self, tag):
                self.tag = tag

            def call(self, _):
                return {"tag_name": self.tag, "draft": False, "prerelease": False, "assets": []}

        with self.assertRaisesRegex(ValueError, "not formal latest"):
            cleanup.verify_latest(API("v1.0.17"), "v1.0.16")
        with self.assertRaisesRegex(ValueError, "exactly one update.json"):
            cleanup.verify_latest(API("v1.0.16"), "v1.0.16")

    def test_remote_cleanup_rechecks_latest_before_each_delete(self):
        calls = []

        class API:
            def call(self, route, method="GET"):
                calls.append((method, route))
                return {"tag_name": "v1.0.7", "draft": False, "assets": [{"id": 1, "name": "app.apk", "size": 4}]}

        plan = [{"releaseId": 7, "tag": "v1.0.7", "id": 1, "name": "app.apk", "size": 4},
                {"releaseId": 7, "tag": "v1.0.7", "id": 2, "name": "update.json", "size": 2}]
        with patch.object(cleanup, "verify_latest", side_effect=[None, ValueError("latest changed")]):
            with self.assertRaisesRegex(ValueError, "latest changed"):
                cleanup.prune_remote(API(), plan, "v1.0.16")
        self.assertEqual([p for p in calls if p[0] == "DELETE"], [("DELETE", "/releases/assets/1")])

    def test_build_script_has_no_previous_release_input_or_overlay(self):
        script = (ROOT / "scripts/build-release.ps1").read_text(encoding="utf-8")
        self.assertNotIn("$baseApk", script)
        self.assertNotIn("apktool d", script)
        self.assertIn("prepare-runtime.py", script)
        self.assertNotIn("baseApk", json.loads((ROOT / "build-inputs.json").read_text()))

    def test_local_cleanup_keeps_current_future_installers_and_non_apk_data(self):
        root = self.temporary()
        output = root / "release/android"
        work = root / "zaohua-release-work"
        old = [output / "zaohua-v1.0.15.apk", work / "base.apk", work / "build-1.0.14-abc/signed.apk"]
        kept = [output / "zaohua-v1.0.16.apk", output / "zaohua-v1.0.17.apk", output / "published-v1.0.15.json",
                work / "build-1.0.16-abc/signed.apk", work / "build-1.0.17-abc/signed.apk",
                work / "v1.0.16.apk", work / "keystore.jks", work / "fixture.json", work / "userdata.img",
                work / "framework/1.apk", work / "unrelated/tool.apk", work / "unknown.apk"]
        for path in old + kept:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b"fixture")
        with patch.object(cleanup.publisher, "ROOT", root):
            plan = cleanup.local_plan("v1.0.16", work)
        self.assertEqual({p["path"] for p in plan}, {str(p.resolve()) for p in old})
        self.assertTrue(all(p.exists() for p in old + kept))

    def test_local_cleanup_rejects_c_drive_or_unrelated_directory(self):
        for work in [pathlib.Path("C:/zaohua-release-work"), self.temporary() / "unrelated"]:
            with self.assertRaisesRegex(ValueError, "must target"):
                cleanup.local_plan("v1.0.16", work)


if __name__ == "__main__":
    unittest.main()
