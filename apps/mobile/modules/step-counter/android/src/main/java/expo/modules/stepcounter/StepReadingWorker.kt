package expo.modules.stepcounter

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.HandlerThread
import android.os.SystemClock
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

// Anota el contador de pasos del teléfono cada ~15 min con Camina cerrada. Solo guarda "hora:número:encendido";
// quien suma los pasos (y aplica los topes) es la app al abrirse, con el mismo cálculo de siempre.
// Si Android no entrega el sensor en segundo plano (o falta el permiso de actividad física), no anota nada.
class StepReadingWorker(private val ctx: Context, params: WorkerParameters) : Worker(ctx, params) {
  override fun doWork(): Result {
    val sm = ctx.getSystemService(Context.SENSOR_SERVICE) as? SensorManager ?: return Result.success()
    val sensor = sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) ?: return Result.success()
    val latch = CountDownLatch(1)
    var count = -1.0
    val thread = HandlerThread("camina-steps").also { it.start() }
    val listener = object : SensorEventListener {
      override fun onSensorChanged(event: SensorEvent) {
        if (count < 0) count = event.values[0].toDouble()
        latch.countDown()
      }
      override fun onAccuracyChanged(s: Sensor?, accuracy: Int) {}
    }
    try {
      if (sm.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_NORMAL, 0, Handler(thread.looper))) {
        latch.await(8, TimeUnit.SECONDS)
      }
    } finally {
      sm.unregisterListener(listener)
      thread.quitSafely()
    }
    if (count >= 0) {
      val now = System.currentTimeMillis()
      val bootMs = now - SystemClock.elapsedRealtime()
      StepReadingStore.add(ctx, now, count, bootMs)
    }
    return Result.success()
  }
}

object StepReadingStore {
  private const val PREFS = "camina_step_readings"
  private const val KEY = "list"
  private const val MAX = 400 // ~4 días a una lectura cada 15 min

  @Synchronized
  fun add(ctx: Context, at: Long, count: Double, bootMs: Long) {
    val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val items = (prefs.getString(KEY, "") ?: "").split(";").filter { it.isNotEmpty() }.toMutableList()
    items.add("$at:${count.toLong()}:$bootMs")
    val kept = if (items.size > MAX) items.takeLast(MAX) else items
    prefs.edit().putString(KEY, kept.joinToString(";")).apply()
  }

  // Devuelve las lecturas guardadas (de la más vieja a la más nueva) y las borra.
  @Synchronized
  fun drain(ctx: Context): List<Map<String, Double>> {
    val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val raw = prefs.getString(KEY, "") ?: ""
    prefs.edit().remove(KEY).apply()
    return raw.split(";").mapNotNull {
      val p = it.split(":")
      if (p.size != 3) null
      else {
        val at = p[0].toDoubleOrNull()
        val c = p[1].toDoubleOrNull()
        val b = p[2].toDoubleOrNull()
        if (at == null || c == null || b == null) null else mapOf("at" to at, "count" to c, "bootMs" to b)
      }
    }.sortedBy { it["at"] }
  }
}
