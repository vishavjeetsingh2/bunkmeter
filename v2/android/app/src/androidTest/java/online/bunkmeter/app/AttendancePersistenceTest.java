package online.bunkmeter.app;

import static org.junit.Assert.*;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class AttendancePersistenceTest {
    private String evaluate(ActivityScenario<MainActivity> activity, String script) throws Exception {
        AtomicReference<String> value = new AtomicReference<>();
        CountDownLatch done = new CountDownLatch(1);
        activity.onActivity(a -> {
            WebView web = a.getBridge().getWebView();
            web.evaluateJavascript(script, result -> { value.set(result); done.countDown(); });
        });
        assertTrue("WebView callback timed out", done.await(10, TimeUnit.SECONDS));
        return value.get();
    }
    private void until(ActivityScenario<MainActivity> activity, String predicate) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(20);
        do {
            if ("true".equals(evaluate(activity, predicate))) return;
            Thread.sleep(100);
        } while (System.nanoTime() < deadline);
        fail("Condition did not become true: " + predicate);
    }
    @Test public void offlineSaveReopenAndUndo() throws Exception {
        try (ActivityScenario<MainActivity> activity = ActivityScenario.launch(MainActivity.class)) {
            until(activity, "!!document.querySelector('#total:not(:disabled)')");
            evaluate(activity, "(()=>{for(const [id,value] of [['total','100'],['attended','72']]){const el=document.getElementById(id);el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));}})()");
            until(activity, "document.querySelector('.decision-number')?.textContent==='12'");
            evaluate(activity, "document.querySelector('.save-subject-cta').click()");
            evaluate(activity, "(()=>{const el=document.getElementById('subject-name');el.value='Android Physics';el.dispatchEvent(new Event('input',{bubbles:true}));})()");
            evaluate(activity, "document.querySelector('.subject-name-row button').click()");
            until(activity, "document.querySelector('.save-status')?.textContent==='Saved on this device.'");
            evaluate(activity, "document.querySelector('.class-action--present').click()");
            until(activity, "document.querySelector('#total')?.value==='101' && document.querySelector('.save-status')?.textContent==='Saved on this device.'");
            // A native Activity recreation must not wipe IndexedDB or its recent action.
            activity.recreate();
            until(activity, "document.querySelector('#total')?.value==='101'");
        }
        try (ActivityScenario<MainActivity> reopened = ActivityScenario.launch(MainActivity.class)) {
            until(reopened, "document.querySelector('#attended')?.value==='73'");
            assertTrue(evaluate(reopened, "document.querySelector('.subject-card')?.textContent").contains("Android Physics"));
            evaluate(reopened, "document.querySelector('.undo-button').click()");
            until(reopened, "document.querySelector('#attended')?.value==='72' && document.querySelector('#total')?.value==='100' && document.querySelector('.save-status')?.textContent==='Saved on this device.'");
        }
    }
}
