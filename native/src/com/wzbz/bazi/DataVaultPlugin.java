package com.wzbz.bazi;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import android.webkit.ValueCallback;
import android.webkit.WebView;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Iterator;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

/** App-private upgrade backup, independent of WebView origins and cache. No erase API. */
@CapacitorPlugin(name = "DataVault")
public final class DataVaultPlugin extends Plugin {
    private static final Object LOCK = new Object();
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private void authorize(final PluginCall call, final boolean writing) {
        final String token = call.getString("token");
        if (token == null || !token.matches("[a-f0-9]{64}")) { call.reject("仅允许应用主页面访问本机保护备份"); return; }
        final WebView view = getBridge().getWebView();
        view.post(new Runnable() { public void run() {
            Uri url = Uri.parse(view.getUrl() == null ? "" : view.getUrl());
            if (!"https".equals(url.getScheme()) || !"localhost".equals(url.getHost()) || url.getPort() != -1) {
                call.reject("仅允许应用主页面访问本机保护备份"); return;
            }
            // The random token lives in a top-frame JS closure, inaccessible to remote iframes.
            String script = "!!(window.WZBZDataProtection&&WZBZDataProtection.authorize(" + JSONObject.quote(token) + "))";
            view.evaluateJavascript(script, new ValueCallback<String>() { public void onReceiveValue(String value) {
                if (!"true".equals(value)) { call.reject("本机保护备份访问校验失败"); return; }
                try { worker.execute(new Runnable() { public void run() { if (writing) saveAuthorized(call); else readAuthorized(call); } }); }
                catch (RuntimeException stopped) { call.reject("应用正在退出，请重新打开后重试", stopped); }
            }});
        }});
    }
    @Override protected void handleOnDestroy() { worker.shutdown(); }
    private SharedPreferences preferences() {
        return getContext().getSharedPreferences("zaohua_data_vault_v1", Context.MODE_PRIVATE);
    }
    private static boolean allowed(String key) {
        return key.startsWith("wzbz_local_") || key.startsWith("setting_")
            || key.startsWith("wzbz_note_") || key.startsWith("wzbz_notes_")
            || key.startsWith("wzbz_fivearts_") || key.equals("wzbz_preferenceIsShow")
            || key.equals("wzbz_recovery_conflicts_v1");
    }
    @PluginMethod
    public void read(PluginCall call) { authorize(call, false); }
    private void readAuthorized(PluginCall call) {
        synchronized (LOCK) {
            try {
                SharedPreferences p = preferences();
                call.resolve(new JSObject().put("current", p.getString("current", null))
                    .put("previous", p.getString("previous", null)));
            } catch (Exception error) { call.reject("无法读取本机升级备份", error); }
        }
    }
    @PluginMethod
    public void save(PluginCall call) { authorize(call, true); }
    private void saveAuthorized(PluginCall call) {
        synchronized (LOCK) {
            try {
                String payload = call.getString("payload");
                if (payload == null || payload.length() > 16 * 1024 * 1024)
                    throw new Exception("备份大小无效");
                JSONObject document = new JSONObject(payload);
                if (!"zaohua-data-vault".equals(document.optString("format")) || document.optInt("schema") != 1)
                    throw new Exception("备份格式无效");
                JSONObject data = document.getJSONObject("data");
                Iterator<String> keys = data.keys();
                while (keys.hasNext()) {
                    String key = keys.next();
                    if (!allowed(key) || !(data.get(key) instanceof String))
                        throw new Exception("备份包含不支持的数据项");
                }
                SharedPreferences p = preferences();
                String current = p.getString("current", null);
                boolean same = false;
                if (current != null) {
                    try { same = new JSONObject(current).getJSONObject("data").toString().equals(data.toString()); }
                    catch (Exception ignored) { /* Preserve malformed old bytes as previous. */ }
                }
                if (current != null && data.length() == 0 && !same)
                    throw new Exception("空备份不能覆盖已有备份");
                if (!same) {
                    SharedPreferences.Editor editor = p.edit();
                    if (current != null) editor.putString("previous", current);
                    editor.putString("current", payload);
                    if (!editor.commit()) throw new Exception("本机备份落盘失败");
                }
                call.resolve(new JSObject().put("ok", true));
            } catch (Exception error) { call.reject("命盘保护备份未完成，请勿卸载或清除数据", error); }
        }
    }
}
