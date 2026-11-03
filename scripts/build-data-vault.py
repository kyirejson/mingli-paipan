"""Compile only our plugin; API stubs are compilation inputs, never APK contents."""
import argparse
import json
import pathlib
import shutil
import subprocess
import zipfile


def build(decoded, work, java_home, build_tools, android):
    root = pathlib.Path(__file__).resolve().parents[1]
    stubs = {
        "com/getcapacitor/Plugin.java": "package com.getcapacitor; public class Plugin { public android.content.Context getContext(){return null;} public Bridge getBridge(){return null;} protected void handleOnDestroy(){} }",
        "com/getcapacitor/Bridge.java": "package com.getcapacitor; public class Bridge { public android.webkit.WebView getWebView(){return null;} }",
        "com/getcapacitor/PluginCall.java": "package com.getcapacitor; public class PluginCall { public String getString(String key){return null;} public void resolve(JSObject value){} public void reject(String message){} public void reject(String message,Exception error){} }",
        "com/getcapacitor/JSObject.java": "package com.getcapacitor; public class JSObject { public JSObject put(String key,String value){return this;} public JSObject put(String key,boolean value){return this;} }",
        "com/getcapacitor/PluginMethod.java": "package com.getcapacitor; @java.lang.annotation.Retention(java.lang.annotation.RetentionPolicy.RUNTIME) public @interface PluginMethod {}",
        "com/getcapacitor/annotation/CapacitorPlugin.java": "package com.getcapacitor.annotation; @java.lang.annotation.Retention(java.lang.annotation.RetentionPolicy.RUNTIME) public @interface CapacitorPlugin { String name(); }",
    }
    inputs = []
    for name, source in stubs.items():
        path = work / "stubs" / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(source, encoding="utf-8")
        inputs.append(str(path))
    compiled = work / "compiled"
    compiled.mkdir(parents=True)
    subprocess.run([str(java_home / "bin/javac.exe"), "-encoding", "UTF-8", "-source", "8", "-target", "8",
                    "-classpath", str(android), "-d", str(compiled), *inputs,
                    str(root / "native/src/com/wzbz/bazi/DataVaultPlugin.java")], check=True)
    plugin_classes = list((compiled / "com/wzbz/bazi").glob("DataVaultPlugin*.class"))
    assert plugin_classes, "Plugin compilation produced no classes"
    stub_jar = work / "compile-only-stubs.jar"
    with zipfile.ZipFile(stub_jar, "w") as archive:
        for path in (compiled / "com/getcapacitor").rglob("*.class"):
            archive.write(path, path.relative_to(compiled).as_posix())
    dex = work / "dex"
    dex.mkdir()
    subprocess.run([str(java_home / "bin/java.exe"), "-cp", str(build_tools / "lib/d8.jar"),
                    "com.android.tools.r8.D8", "--min-api", "24", "--lib", str(android),
                    "--classpath", str(stub_jar), "--output", str(dex), *map(str, plugin_classes)], check=True)
    target = decoded / "classes2.dex"
    assert not target.exists(), "Base APK unexpectedly already contains classes2.dex"
    shutil.copyfile(dex / "classes.dex", target)
    plugin_list = decoded / "assets/capacitor.plugins.json"
    plugins = json.loads(plugin_list.read_text(encoding="utf-8"))
    assert not any(p.get("classpath") == "com.wzbz.bazi.DataVaultPlugin" for p in plugins)
    plugins.append({"pkg": "zaohua-data-vault", "classpath": "com.wzbz.bazi.DataVaultPlugin"})
    plugin_list.write_text(json.dumps(plugins, indent=2) + "\n", encoding="utf-8")
    print("Added DataVault plugin in classes2.dex; original classes.dex retained")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    for option in ["decoded", "work", "java-home", "build-tools", "android"]:
        parser.add_argument("--" + option, required=True, type=pathlib.Path)
    args = parser.parse_args()
    build(args.decoded, args.work, args.java_home, args.build_tools, args.android)
