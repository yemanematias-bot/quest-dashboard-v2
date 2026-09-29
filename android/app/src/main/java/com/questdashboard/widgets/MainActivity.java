package com.questdashboard.widgets;
import android.app.Activity;
import android.app.AlertDialog;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.Toast;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import org.json.JSONObject;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

public class MainActivity extends Activity {
 static final String ORIGIN="https://appassets.androidplatform.net";
 static final String URL=ORIGIN+"/assets/index.html?view=daily";
 WebView web; String questId; boolean ready=false;
 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  questId=getIntent().getStringExtra("completeQuestId");
  LinearLayout layout=new LinearLayout(this); layout.setOrientation(LinearLayout.VERTICAL);
  LinearLayout bar=new LinearLayout(this);
  Button pin=new Button(this); pin.setText("Add widget"); bar.addView(pin);
  Button imp=new Button(this); imp.setText("Import backup"); bar.addView(imp);
  layout.addView(bar);
  web=new WebView(this); layout.addView(web,new LinearLayout.LayoutParams(-1,0,1)); setContentView(layout);
  pin.setOnClickListener(v -> {
   AppWidgetManager m=AppWidgetManager.getInstance(this);
   if (m.isRequestPinAppWidgetSupported()) m.requestPinAppWidget(new ComponentName(this,DailyWidget.class),null,null);
   else Toast.makeText(this,"Long-press your home screen → Widgets → Quest Widgets",Toast.LENGTH_LONG).show();
  });
  imp.setOnClickListener(v -> {
   Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("*/*").addCategory(Intent.CATEGORY_OPENABLE);
   startActivityForResult(i,7);
  });
  web.getSettings().setJavaScriptEnabled(true);
  web.getSettings().setDomStorageEnabled(true);
  web.getSettings().setAllowFileAccess(false); web.getSettings().setAllowContentAccess(false);
  web.setWebChromeClient(new WebChromeClient());
  if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
   WebViewCompat.addWebMessageListener(web,"QuestWidget",Collections.singleton(ORIGIN),(view,message,origin,main,reply)->{
    if (!main || !ORIGIN.equals(origin.toString())) return;
    try {
     String raw=message.getData();
     if (raw==null || raw.length()>1000000) return;
     JSONObject data=new JSONObject(raw);
     if (data.optJSONArray("dailyQuests")==null) return;
     getSharedPreferences("widget",MODE_PRIVATE).edit().putString("snapshot",raw).apply();
     DailyWidget.refresh(this);
    } catch (Exception ignored) {}
   });
  } else Toast.makeText(this,"Update Android System WebView to enable widgets",Toast.LENGTH_LONG).show();
  WebViewAssetLoader loader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
  web.setWebViewClient(new WebViewClientCompat() {
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request) { return loader.shouldInterceptRequest(request.getUrl()); }
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request) {
    Uri u=request.getUrl();
    if ("https".equals(u.getScheme()) && "appassets.androidplatform.net".equals(u.getHost()) && u.getPath()!=null && u.getPath().startsWith("/assets/")) return false;
    if (request.isForMainFrame() && ("https".equals(u.getScheme()) || "mailto".equals(u.getScheme()))) {
     try { startActivity(new Intent(Intent.ACTION_VIEW,u)); } catch (Exception ignored) {}
    }
    return true;
   }
   @Override public void onPageFinished(WebView view,String url) {
    if (url.startsWith(ORIGIN+"/assets/index.html")) { ready=true; completePending(); }
   }
  });
  web.loadUrl(URL);
 }
 void completePending() {
  if (!ready || questId==null || questId.isEmpty()) return;
  String id=questId; questId=null;
  web.evaluateJavascript("if(window.questWidgetComplete)questWidgetComplete("+JSONObject.quote(id)+");",null);
 }
 @Override protected void onNewIntent(Intent intent) {
  super.onNewIntent(intent); setIntent(intent); questId=intent.getStringExtra("completeQuestId"); completePending();
 }
 @Override protected void onResume() { super.onResume(); if(web!=null)web.onResume(); }
 @Override protected void onPause() { if(web!=null)web.onPause(); super.onPause(); }
 @Override public void onBackPressed() { if(web.canGoBack())web.goBack(); else super.onBackPressed(); }
 @Override protected void onDestroy() { if(web!=null)web.destroy(); super.onDestroy(); }
 @Override protected void onActivityResult(int code,int result,Intent data) {
  super.onActivityResult(code,result,data);
  if(code!=7 || result!=RESULT_OK || data==null || data.getData()==null)return;
  try(InputStream in=getContentResolver().openInputStream(data.getData());ByteArrayOutputStream out=new ByteArrayOutputStream()) {
   byte[] buffer=new byte[8192]; int n;
   while((n=in.read(buffer))!=-1) { if(out.size()+n>5000000)throw new Exception("Backup too large");out.write(buffer,0,n); }
   String raw=out.toString(StandardCharsets.UTF_8.name());
   JSONObject obj=new JSONObject(raw);
   for(String key:new String[]{"mainQuests","sideQuests","dailyQuests","weeklyQuests","questHistory","achievements"})obj.getJSONArray(key);
   obj.getJSONObject("player");
   new AlertDialog.Builder(this).setTitle("Restore this backup?").setMessage("This replaces progress in this companion app. Your Chrome save is unchanged.").setNegativeButton("Cancel",null).setPositiveButton("Restore",(dialog,which)->{
    web.evaluateJavascript("(function(){const raw="+JSONObject.quote(raw)+";const d=JSON.parse(raw);if(!isValidSave(d))return;const old=localStorage.getItem(STORAGE_KEY);if(old)localStorage.setItem(BACKUP_KEY,old);localStorage.setItem(STORAGE_KEY,raw);location.reload();})();",null);
   }).show();
  } catch(Exception e) { Toast.makeText(this,"Could not read a valid Quest Dashboard JSON backup",Toast.LENGTH_LONG).show(); }
 }
}
