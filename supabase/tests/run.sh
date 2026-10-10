#!/usr/bin/env bash
# Corre las pruebas SQL de supabase/tests contra un Postgres LOCAL y DESCARTABLE.
#
#   bash supabase/tests/run.sh            # todas las pruebas
#   bash supabase/tests/run.sh 20_fifo    # solo los archivos cuyo nombre contenga el texto
#
# Qué hace: levanta un cluster temporal (socket Unix, sin puerto TCP, carpeta propia),
# le pone las piezas de Supabase que faltan (00_shim.sql), aplica supabase/migrations/*.sql
# en orden, corre cada NN_*.sql (con rollback al final de cada archivo) y apaga todo.
# NUNCA toca la base de producción: se conecta solo al socket de la carpeta temporal.
# Necesita los binarios de Postgres ya instalados (initdb, pg_ctl, psql); no instala nada.
#
# Salida: líneas ok / FAIL / xfail / XPASS / skip por prueba y un resumen.
#   XFAIL = bug conocido que la prueba documenta (la regla correcta todavía no se cumple).
# Código de salida: 0 si no hay FAIL ni XPASS; 1 si algo falla.
#
# Modo propuestas (opcional, no cambia nada si no se usa):
#   PROPUESTAS=1 bash supabase/tests/run.sh
#     Después de las migraciones aplica supabase/propuestas/*.sql (en orden, dos veces: la segunda comprueba que
#     son idempotentes), carga tests/propuestas/setup.sql y, además de las pruebas de siempre, corre
#     tests/propuestas/NN_*.sql. En este modo un XPASS (una xfail que la propuesta arregla) se informa como
#     "arreglada por la propuesta" y NO hace fallar la corrida; un FAIL cuyo nombre figura en
#     tests/propuestas/obsoletas.txt (regla vieja que la propuesta cambia a propósito) se informa como "obsoleta".
#   TESTS_DIR=supabase/tests/propuestas bash supabase/tests/run.sh
#     Corre SOLO las pruebas de las propuestas contra la base sin arreglos: muestra el ataque/bug "antes" (FAIL esperados).
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS="$HERE/../migrations"
PROPUESTAS_SQL="$HERE/../propuestas"      # migraciones propuestas (todavía no aprobadas)
PROPUESTAS_TESTS="$HERE/propuestas"       # pruebas de las propuestas
PROPUESTAS="${PROPUESTAS:-}"              # vacío = comportamiento de siempre; cualquier valor = modo propuestas
FILTER="${1:-}"
TESTS_DIR="${TESTS_DIR:-$HERE}"   # carpeta con los NN_*.sql a correr (por defecto, esta)

# Nunca heredar una conexión del entorno (por si hubiera una a producción).
unset PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE PGSERVICE PGSERVICEFILE DATABASE_URL

PGBIN=""
for d in $(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V -r); do
  if [ -x "$d/initdb" ] && [ -x "$d/pg_ctl" ] && [ -x "$d/psql" ]; then PGBIN="$d"; break; fi
done
if [ -z "$PGBIN" ]; then
  if command -v initdb >/dev/null && command -v pg_ctl >/dev/null && command -v psql >/dev/null; then PGBIN="$(dirname "$(command -v initdb)")"; fi
fi
if [ -z "$PGBIN" ]; then
  echo "No hay Postgres local instalado (initdb/pg_ctl/psql). Las pruebas SQL no se pueden correr acá." >&2
  exit 2
fi

WORK="$(mktemp -d /var/tmp/camina-pgtest.XXXXXX)"
SOCK="$WORK/sock"; DATA="$WORK/data"; mkdir -p "$SOCK"
# Postgres no corre como root: si somos root, lo corre el usuario "postgres".
if [ "$(id -u)" = "0" ]; then
  chown -R postgres:postgres "$WORK"
  AS_PG=(runuser -u postgres --)
else
  AS_PG=()
fi
PORT=54399
PSQL=("$PGBIN/psql" -X -q -h "$SOCK" -p "$PORT" -U postgres -v ON_ERROR_STOP=1)

cleanup() {
  "${AS_PG[@]}" "$PGBIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

"${AS_PG[@]}" "$PGBIN/initdb" -D "$DATA" -U postgres --auth=trust --encoding=UTF8 --locale=C.UTF-8 >/dev/null || { echo "initdb falló" >&2; exit 2; }
"${AS_PG[@]}" "$PGBIN/pg_ctl" -D "$DATA" -w -l "$WORK/server.log" \
  -o "-p $PORT -c listen_addresses='' -c unix_socket_directories='$SOCK' -c wal_level=logical -c fsync=off -c synchronous_commit=off -c full_page_writes=off -c timezone=UTC" start >/dev/null \
  || { echo "No arrancó Postgres:"; cat "$WORK/server.log"; exit 2; }

"${PSQL[@]}" -d postgres -c "create database camina_test" || exit 2
PSQL+=(-d camina_test)

echo "== Preparando base temporal ($("$PGBIN/postgres" --version))"
"${PSQL[@]}" -f "$HERE/00_shim.sql" || exit 2
shopt -s nullglob
for f in "$MIGRATIONS"/*.sql; do
  out="$("${PSQL[@]}" -f "$f" 2>&1)" || { echo "Migración falló: $(basename "$f")"; echo "$out" | tail -8; exit 2; }
done
echo "== Migraciones aplicadas: $(ls "$MIGRATIONS"/*.sql | wc -l)"
"${PSQL[@]}" -f "$HERE/01_helpers.sql" || exit 2

# Modo propuestas: se aplican encima de las migraciones reales (solo en esta base descartable).
if [ -n "$PROPUESTAS" ]; then
  n_prop=0
  for pass in 1 2; do   # la segunda pasada comprueba que cada propuesta se puede aplicar dos veces
    for f in "$PROPUESTAS_SQL"/*.sql; do
      out="$("${PSQL[@]}" -f "$f" 2>&1)" || { echo "Propuesta falló (pasada $pass): $(basename "$f")"; echo "$out" | tail -8; exit 2; }
      [ "$pass" = 1 ] && n_prop=$((n_prop+1))
    done
  done
  echo "== Propuestas aplicadas: $n_prop (y re-aplicadas sin error: son idempotentes)"
  [ -f "$PROPUESTAS_TESTS/setup.sql" ] && { "${PSQL[@]}" -f "$PROPUESTAS_TESTS/setup.sql" || exit 2; }
fi

# Nombres de pruebas viejas que una propuesta cambia a propósito (solo cuentan en modo propuestas).
OBSOLETAS="$WORK/obsoletas.names"; : > "$OBSOLETAS"
[ -n "$PROPUESTAS" ] && [ -f "$PROPUESTAS_TESTS/obsoletas.txt" ] && grep -v '^[[:space:]]*#' "$PROPUESTAS_TESTS/obsoletas.txt" | cut -f1 > "$OBSOLETAS"

TEST_FILES=("$TESTS_DIR"/[0-9][0-9]_*.sql)
[ -n "$PROPUESTAS" ] && TEST_FILES+=("$PROPUESTAS_TESTS"/[0-9][0-9]_*.sql)

PASS=0; FAIL=0; XFAIL=0; XPASS=0; SKIP=0; FIXED=0; OBSOL=0; FIXED_LIST=""
for t in "${TEST_FILES[@]}"; do
  name="$(basename "$t")"
  case "$name" in 00_shim.sql|01_helpers.sql) continue;; esac
  if [ -n "$FILTER" ] && [[ "$name" != *"$FILTER"* ]]; then continue; fi
  echo "-- $name"
  out="$("${PSQL[@]}" -v ON_CONFLICT=none -f "$t" 2>&1)"; rc=$?
  if [ -n "${VERBOSE:-}" ]; then echo "$out"; fi   # VERBOSE=1: salida completa de psql (para depurar)
  while IFS= read -r line; do
    case "$line" in
      *"NOTICE:  PASS|"*)  PASS=$((PASS+1));   echo "  ok     ${line#*PASS|}";;
      *"NOTICE:  FAIL|"*)
        rest="${line#*FAIL|}"
        if [ -n "$PROPUESTAS" ] && grep -Fxq -- "${rest%%|*}" "$OBSOLETAS"; then
          OBSOL=$((OBSOL+1)); echo "  obsoleta  $rest"
        else
          FAIL=$((FAIL+1)); echo "  FAIL   $rest"
        fi;;
      *"NOTICE:  XFAIL|"*) XFAIL=$((XFAIL+1)); echo "  xfail  ${line#*XFAIL|}";;
      *"NOTICE:  XPASS|"*)
        if [ -n "$PROPUESTAS" ]; then
          FIXED=$((FIXED+1)); rest="${line#*XPASS|}"; echo "  ARREGLADA POR LA PROPUESTA  ${rest%%|*}"; FIXED_LIST="$FIXED_LIST"$'\n'"   - ${name}: ${rest%%|*}"
        else
          XPASS=$((XPASS+1)); echo "  XPASS  ${line#*XPASS|}"
        fi;;
      *"NOTICE:  SKIP|"*)  SKIP=$((SKIP+1));   echo "  skip   ${line#*SKIP|}";;
      *"ERROR:"*|*"FATAL:"*) echo "  ERROR  $line";;
    esac
  done <<< "$out"
  if [ $rc -ne 0 ]; then FAIL=$((FAIL+1)); echo "  FAIL   el archivo $name terminó con error de SQL (ver ERROR arriba)"; fi
done

echo
if [ -n "$PROPUESTAS" ]; then
  echo "== Resumen SQL con propuestas: $PASS ok, $FAIL FAIL, $XFAIL xfail (bugs conocidos que siguen), $FIXED arregladas por la propuesta (eran xfail), $OBSOL obsoletas (regla vieja que la propuesta cambia), $SKIP skip"
  [ "$FIXED" -gt 0 ] && echo "== xfail que la propuesta arregla:$FIXED_LIST"
else
  echo "== Resumen SQL: $PASS ok, $FAIL FAIL, $XFAIL xfail (bugs conocidos), $XPASS xpass, $SKIP skip"
fi
[ "$FAIL" -eq 0 ] && [ "$XPASS" -eq 0 ]
