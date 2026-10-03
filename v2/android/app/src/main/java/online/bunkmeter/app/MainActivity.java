package online.bunkmeter.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen;
import androidx.appcompat.app.AppCompatDelegate;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle state) {
        SplashScreen.installSplashScreen(this);
        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO);
        super.onCreate(state);
    }
}
