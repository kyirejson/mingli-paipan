import copy
import hashlib
import importlib.util
import json
import pathlib
import unittest
import urllib.parse
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
                    self.value["assets"].append(asset)
                    return copy.deepcopy(asset)
                if method == "PATCH":
                    self.value.update(json.loads(data))
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

    def test_wrong_tag_or_download_host_cannot_pass_preflight(self):
        self.release["assets"].append(self.asset("update.json", self.metadata))
        self.release["prerelease"] = False
        self.release["assets"][0]["browser_download_url"] = "https://example.com/other.apk"
        with self.assertRaisesRegex(ValueError, "Unexpected download URL"):
            publisher.verify_contract(self.release, self.manifest, self.metadata, self.apk, published=True)
        self.release["tag_name"] = "v1.0.13"
        with self.assertRaisesRegex(ValueError, "tag mismatch"):
            publisher.verify_contract(self.release, self.manifest, self.metadata, self.apk, published=True)


if __name__ == "__main__":
    unittest.main()
