import copy
import hashlib
import importlib.util
import json
import pathlib
import unittest
import urllib.parse
import urllib.error
import tempfile
import zipfile
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("publisher", ROOT / "scripts/publish-release.py")
publisher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(publisher)


class ReleaseContractTest(unittest.TestCase):
    def setUp(self):
        self.apk = b"fixture APK: tests never publish or contact GitHub"
        self.manifest = {"schema": 1, "version": "1.0.14", "versionCode": 15,
                         "packageId": "com.wzbz.bazi", "apk": "zaohua-v1.0.14.apk",
                         "size": len(self.apk), "sha256": hashlib.sha256(self.apk).hexdigest()}
        self.metadata = publisher.encoded(self.manifest)
        self.release = {"id": 42, "tag_name": "v1.0.14", "prerelease": True, "draft": False,
                        "upload_url": "https://uploads.github.com/test{?name}",
                        "assets": [self.asset(self.manifest["apk"], self.apk)]}

    def asset(self, name, data):
        return {"name": name, "size": len(data), "state": "uploaded",
                "digest": "sha256:" + hashlib.sha256(data).hexdigest(),
                "browser_download_url": "https://github.com/kyirejson/mingli-paipan/releases/download/v1.0.14/" + name}

    def fake_api(self):
        outer = self

        class API:
            def __init__(self):
                self.value = copy.deepcopy(outer.release)
                self.events = []

            def call(self, route, method="GET", data=None, content_type=None):
                self.events.append((method, route))
                if method == "POST":
                    name = urllib.parse.parse_qs(urllib.parse.urlparse(route).query)["name"][0]
                    asset = outer.asset(name, data)
                    if self.value["draft"]:
                        asset["browser_download_url"] = asset["browser_download_url"].replace("/v1.0.14/", "/untagged-abc123/")
                    self.value["assets"].append(asset)
                    return copy.deepcopy(asset)
                if method == "PATCH":
                    self.value.update(json.loads(data))
                    if not self.value["draft"]:
                        for asset in self.value["assets"]:
                            asset["browser_download_url"] = asset["browser_download_url"].replace("/untagged-abc123/", "/v1.0.14/")
                return copy.deepcopy(self.value)

        return API()

    def test_previous_release_without_update_json_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "exactly one update.json"):
            publisher.verify_contract(self.release, self.manifest, self.metadata, self.apk)

    def test_prerelease_with_valid_assets_is_still_rejected_by_installed_contract(self):
        self.release["assets"].append(self.asset("update.json", self.metadata))
        with self.assertRaisesRegex(ValueError, "rejects draft/prerelease"):
            publisher.verify_contract(self.release, self.manifest, self.metadata, self.apk, published=True)

    def test_repair_uploads_and_checks_manifest_before_promoting(self):
        api = self.fake_api()

        def download(_):
            self.assertTrue(any(a["name"] == "update.json" for a in api.value["assets"]))
            api.events.append(("PUBLIC", "update.json"))
            return self.metadata

        with patch.object(publisher, "public_bytes", side_effect=download):
            result = publisher.promote(api, api.value, self.manifest, self.metadata, self.apk, "notes")
        methods = [e[0] for e in api.events]
        self.assertLess(methods.index("POST"), methods.index("PUBLIC"))
        self.assertLess(methods.index("PUBLIC"), methods.index("PATCH"))
        self.assertFalse(result["prerelease"])
        self.assertEqual(result["make_latest"], "true")
        self.assertGreater(self.manifest["versionCode"], 14)
        self.assertEqual(sum(a["name"] == self.manifest["apk"] for a in result["assets"]), 1)

    def test_mismatched_existing_apk_is_not_promoted_or_overwritten(self):
        api = self.fake_api()
        api.value["assets"][0]["digest"] = "sha256:" + "0" * 64
        with self.assertRaisesRegex(ValueError, "Digest mismatch"):
            publisher.promote(api, api.value, self.manifest, self.metadata, self.apk, "notes")
        self.assertTrue(all(method == "GET" for method, _ in api.events))

    def test_conflicting_manifest_is_not_deleted_or_replaced(self):
        api = self.fake_api()
        api.value["assets"].append(self.asset("update.json", b"conflicting metadata"))
        with self.assertRaisesRegex(ValueError, "mismatch"):
            publisher.promote(api, api.value, self.manifest, self.metadata, self.apk, "notes")
        self.assertTrue(all(method == "GET" for method, _ in api.events))

    def test_public_manifest_failure_leaves_release_in_old_channel(self):
        api = self.fake_api()
        with patch.object(publisher, "public_bytes", return_value=b"{}"):
            with self.assertRaisesRegex(ValueError, "Public update.json mismatch"):
                publisher.promote(api, api.value, self.manifest, self.metadata, self.apk, "notes")
        self.assertTrue(api.value["prerelease"])
        self.assertNotIn("PATCH", [e[0] for e in api.events])

    def test_repeat_publish_reuses_identical_assets(self):
        api = self.fake_api()
        api.value["assets"].append(self.asset("update.json", self.metadata))
        api.value["prerelease"] = False
        with patch.object(publisher, "public_bytes", return_value=self.metadata):
            publisher.promote(api, api.value, self.manifest, self.metadata, self.apk, "notes")
        self.assertNotIn("POST", [e[0] for e in api.events])

    def test_draft_temporary_urls_are_verified_then_require_real_tag_on_publication(self):
        api = self.fake_api()
        api.value["draft"] = True
        api.value["assets"][0]["browser_download_url"] = api.value["assets"][0]["browser_download_url"].replace("/v1.0.14/", "/untagged-abc123/")
        with self.assertRaisesRegex(ValueError, "Unexpected download URL"):
            publisher.verify_asset(api.value["assets"][0], self.manifest["apk"], self.apk, "v1.0.14")
        with patch.object(publisher, "public_bytes", return_value=self.metadata):
            result = publisher.promote(api, api.value, self.manifest, self.metadata, self.apk, "notes")
        self.assertFalse(result["draft"])
        self.assertTrue(all("/v1.0.14/" in a["browser_download_url"] for a in result["assets"]))

    def test_draft_is_resumed_when_tag_endpoint_returns_404(self):
        api = self.fake_api()
        api.value["draft"] = True
        original = api.call

        def call(route, *args, **kwargs):
            if route.startswith("/releases/tags/"):
                raise urllib.error.HTTPError(route, 404, "Not found", {}, None)
            if route.startswith("/releases?"):
                return [copy.deepcopy(api.value)]
            return original(route, *args, **kwargs)

        api.call = call
        result = publisher.find_release(api, "v1.0.14")
        self.assertEqual(result["id"], 42)
        self.assertNotIn("POST", [e[0] for e in api.events])

    def test_wrong_tag_or_download_host_cannot_pass_preflight(self):
        self.release["assets"].append(self.asset("update.json", self.metadata))
        self.release["prerelease"] = False
        self.release["assets"][0]["browser_download_url"] = "https://example.com/other.apk"
        with self.assertRaisesRegex(ValueError, "Unexpected download URL"):
            publisher.verify_contract(self.release, self.manifest, self.metadata, self.apk, published=True)
        self.release["tag_name"] = "v1.0.13"
        with self.assertRaisesRegex(ValueError, "tag mismatch"):
            publisher.verify_contract(self.release, self.manifest, self.metadata, self.apk, published=True)

    def test_storage_origin_change_cannot_be_published(self):
        directory = ROOT / "release/test-fixtures"
        directory.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=directory) as work:
            apk = pathlib.Path(work) / "bad-origin.apk"
            with zipfile.ZipFile(apk, "w") as archive:
                archive.writestr("assets/public/static/update-info.json", json.dumps({"version": "1.0.15", "versionCode": 16}))
                archive.writestr("assets/capacitor.config.json", json.dumps({"appId": publisher.PACKAGE, "server": {"androidScheme": "http"}}))
            with self.assertRaisesRegex(ValueError, "Storage origin changed"):
                publisher.prepare(apk, "1.0.15", 16, pathlib.Path(work), pathlib.Path(work), pathlib.Path(work))

    def test_new_release_without_native_data_backup_is_rejected(self):
        directory = ROOT / "release/test-fixtures"
        directory.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=directory) as work:
            apk = pathlib.Path(work) / "missing-vault.apk"
            with zipfile.ZipFile(apk, "w") as archive:
                archive.writestr("assets/public/static/update-info.json", json.dumps({"version": "1.0.15", "versionCode": 16}))
                archive.writestr("assets/capacitor.config.json", json.dumps({"appId": publisher.PACKAGE, "server": {"androidScheme": "https"}}))
                archive.writestr("assets/capacitor.plugins.json", "[]")
            with self.assertRaisesRegex(ValueError, "DataVault native backup plugin is missing"):
                publisher.prepare(apk, "1.0.15", 16, pathlib.Path(work), pathlib.Path(work), pathlib.Path(work))


if __name__ == "__main__":
    unittest.main()
