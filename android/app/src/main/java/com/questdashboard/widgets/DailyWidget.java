package com.questdashboard.widgets;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;
import java.time.LocalDate;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

public class DailyWidget extends AppWidgetProvider {
 static PendingIntent open(Context c, String id) {
  Intent i = new Intent(c, MainActivity.class).setData(Uri.parse("questwidget://daily/" + Uri.encode(id)));
  if (!id.isEmpty()) i.putExtra("completeQuestId", id);
  return PendingIntent.getActivity(c, 0, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
 }
 static void refresh(Context c) {
  AppWidgetManager m = AppWidgetManager.getInstance(c);
  new DailyWidget().onUpdate(c, m, m.getAppWidgetIds(new ComponentName(c, DailyWidget.class)));
 }
 @Override public void onReceive(Context c, Intent i) { super.onReceive(c, i); if (!AppWidgetManager.ACTION_APPWIDGET_UPDATE.equals(i.getAction())) refresh(c); }
 @Override public void onUpdate(Context c, AppWidgetManager manager, int[] ids) {
  for (int id : ids) {
   RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.daily_widget);
   v.setOnClickPendingIntent(R.id.title, open(c, ""));
   v.setOnClickPendingIntent(R.id.footer, open(c, ""));
   int[] rows = {R.id.row0,R.id.row1,R.id.row2,R.id.row3,R.id.row4};
   for (int row : rows) v.setViewVisibility(row, View.GONE);
   try {
    String raw = c.getSharedPreferences("widget", Context.MODE_PRIVATE).getString("snapshot", "{}");
    JSONObject data = new JSONObject(raw);
    JSONArray quests = data.optJSONArray("dailyQuests");
    if (quests == null) quests = new JSONArray();
    String today = LocalDate.now().toString();
    List<JSONObject> pending = new ArrayList<>(), done = new ArrayList<>();
    for (int j=0;j<quests.length();j++) {
     JSONObject q=quests.getJSONObject(j);
     (today.equals(q.optString("lastCompleted")) ? done : pending).add(q);
    }
    List<JSONObject> ordered = new ArrayList<>(pending); ordered.addAll(done);
    v.setTextViewText(R.id.progress, done.size()+" / "+quests.length()+" cleared · "+pending.size()+" remaining");
    for (int j=0;j<Math.min(5,ordered.size());j++) {
     JSONObject q=ordered.get(j); boolean complete=today.equals(q.optString("lastCompleted"));
     v.setViewVisibility(rows[j], View.VISIBLE);
     v.setTextViewText(rows[j], (complete?"✓  ":"○  ")+q.optString("name")+"  +"+q.optInt("xp")+" XP");
     v.setOnClickPendingIntent(rows[j], open(c, complete?"":q.optString("id")));
    }
    long updated=data.optLong("updatedAt",0);
    String timestamp=updated==0?"":Instant.ofEpochMilli(updated).atZone(ZoneId.systemDefault()).format(DateTimeFormatter.ofPattern("MMM d HH:mm"));
    v.setTextViewText(R.id.footer, quests.length()==0 ? "Open app · Sign in or import your backup" :
      (quests.length()>5 ? "+"+(quests.length()-5)+" more · " : "")+"Saved "+timestamp+" · Tap to open");
   } catch (Exception e) {
    v.setTextViewText(R.id.progress, "Open the app to refresh your quests");
   }
   manager.updateAppWidget(id,v);
  }
 }
}
