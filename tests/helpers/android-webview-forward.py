"""Forward only this app's WebView, avoiding Setup Wizard and other browser targets."""
import argparse
import re
import subprocess

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--adb", default="C:/Users/28257/android-sdk/platform-tools/adb.exe")
    parser.add_argument("--device", default="emulator-5554")
    parser.add_argument("--port", default="9331")
    args = parser.parse_args()
    pid = subprocess.check_output([args.adb, "-s", args.device, "shell", "pidof", "com.wzbz.bazi"], text=True).strip()
    assert re.fullmatch(r"\d+", pid), "App is not running or main process is ambiguous"
    socket = "webview_devtools_remote_" + pid
    sockets = subprocess.check_output([args.adb, "-s", args.device, "shell", "cat", "/proc/net/unix"], text=True)
    assert "@" + socket in sockets, "App WebView is not ready"
    subprocess.run([args.adb, "-s", args.device, "forward", "tcp:" + args.port, "localabstract:" + socket], check=True)
