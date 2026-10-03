package com.naeryeo.probe;
import android.app.*;
import android.os.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.widget.*;
public class ProbeActivity extends Activity {
  TextView status;
  NotificationManager manager;
  public void onCreate(Bundle state) {
    super.onCreate(state);
    manager=getSystemService(NotificationManager.class);
    LinearLayout root=new LinearLayout(this);root.setOrientation(1);root.setPadding(40,100,40,40);
    status=new TextView(this);root.addView(status);
    for(final String mode:new String[]{"standard","bigtext","progress","eta","cancel"}) {
      Button b=new Button(this);b.setText(mode);b.setOnClickListener(v->post(mode));root.addView(b);
    }
    setContentView(root);
    if(checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=PackageManager.PERMISSION_GRANTED)
      requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},1);
    else if(getIntent().hasExtra("mode"))post(getIntent().getStringExtra("mode"));
    else status.setText("공개 API 36 · 승격 허용: "+manager.canPostPromotedNotifications());
  }
  void post(String mode) {
    if(mode.equals("cancel")){manager.cancel(1);status.setText("종료");return;}
    manager.createNotificationChannel(new NotificationChannel("public-probe","공개 API 진단",NotificationManager.IMPORTANCE_DEFAULT));
    Bundle extras=new Bundle();extras.putBoolean("android.requestPromotedOngoing",true);
    Notification.Builder b=new Notification.Builder(this,"public-probe")
      .setSmallIcon(android.R.drawable.ic_dialog_map).setContentTitle("내려 진단 · "+mode)
      .setContentText("강남역 · 3정거장 · 공개 Android API 비교")
      .setOngoing(true).setVisibility(Notification.VISIBILITY_PUBLIC).setShortCriticalText("3 stops")
      .setContentIntent(PendingIntent.getActivity(this,0,new Intent(this,ProbeActivity.class),PendingIntent.FLAG_IMMUTABLE))
      .addExtras(extras).setTimeoutAfter(1800000);
    if(mode.equals("bigtext"))b.setStyle(new Notification.BigTextStyle().bigText("강남역 · 3정거장 · 공개 Android API 비교"));
    if(mode.equals("progress")||mode.equals("eta"))b.setStyle(new Notification.ProgressStyle()
      .addProgressSegment(new Notification.ProgressStyle.Segment(100)).setProgress(25));
    if(mode.equals("eta"))b.setWhen(System.currentTimeMillis()+600000).setUsesChronometer(true).setChronometerCountDown(true);
    Notification n=b.build();manager.notify(1,n);
    status.setText(mode+" · hasPromotable="+n.hasPromotableCharacteristics()+" · canPost="+manager.canPostPromotedNotifications());
  }
}
