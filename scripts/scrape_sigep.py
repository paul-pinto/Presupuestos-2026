import argparse
import random
import re
import time
import traceback
from pathlib import Path

import pandas as pd
from playwright.sync_api import (
    sync_playwright,
    TimeoutError as PlaywrightTimeoutError,
)


GESTION = 2026
BASE_URL = f"https://sigep.gob.bo/sigep_publico/faces/SFprRepPub?gestion={GESTION}"

REPORTES_CONFIG_PATH = Path("config/reportes_sigep.csv")

LOG_DIR = Path("data/logs")
DEBUG_DIR = Path("data/debug")
STATUS_PATH = LOG_DIR / "scrape_status.csv"


def safe_filename(value: str) -> str:
    value = str(value or "").strip()
    value = re.sub(r"[^\w\s.-]", "", value, flags=re.UNICODE)
    value = re.sub(r"\s+", "_", value)
    return value[:160] or "sin_nombre"


def normalize_text(value: str) -> str:
    value = str(value or "")
    value = value.replace("\u00a0", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip().lower()


def ensure_dirs(raw_dir: Path):
    raw_dir.mkdir(parents=True, exist_ok=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    DEBUG_DIR.mkdir(parents=True, exist_ok=True)


def load_report_config(report_slug: str, config_path: Path = REPORTES_CONFIG_PATH) -> dict:
    if not config_path.exists():
        raise SystemExit(f"[ERROR] No existe config de reportes: {config_path}")

    df = pd.read_csv(config_path)

    required = {"report_slug", "reporte_texto", "x17d_index", "raw_dir"}
    missing = required - set(df.columns)

    if missing:
        raise SystemExit(f"[ERROR] Faltan columnas en {config_path}: {missing}")

    match = df[df["report_slug"].astype(str) == str(report_slug)]

    if match.empty:
        available = df["report_slug"].astype(str).tolist()
        raise SystemExit(
            f"[ERROR] Reporte no configurado: {report_slug}\n"
            f"Reportes disponibles: {available}"
        )

    row = match.iloc[0].to_dict()

    return {
        "report_slug": str(row["report_slug"]),
        "reporte_texto": str(row["reporte_texto"]),
        "x17d_index": int(row["x17d_index"]),
        "raw_dir": Path(str(row["raw_dir"])),
    }


def is_target_closed_error(exc: Exception) -> bool:
    msg = str(exc)

    return (
        "Target page, context or browser has been closed" in msg
        or "TargetClosedError" in msg
        or "Browser closed" in msg
        or "browser has been closed" in msg
        or "context has been closed" in msg
        or "Page closed" in msg
    )


def create_runtime(p, headful: bool, slow_mo: int):
    browser = p.chromium.launch(
        headless=not headful,
        slow_mo=slow_mo,
        args=[
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
        ],
    )

    context = browser.new_context(
        accept_downloads=True,
        viewport={"width": 1366, "height": 900},
        user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
    )

    page = context.new_page()
    page.set_default_timeout(30_000)
    page.set_default_navigation_timeout(90_000)

    return browser, context, page


def close_runtime(browser=None, context=None):
    try:
        if context is not None:
            context.close()
    except Exception:
        pass

    try:
        if browser is not None:
            browser.close()
    except Exception:
        pass


def recreate_runtime(p, browser, context, args, reason: str):
    print(f"    [RECOVER] Reiniciando navegador/contexto. Motivo: {reason}")

    close_runtime(browser=browser, context=context)

    time.sleep(5)

    return create_runtime(
        p=p,
        headful=args.headful,
        slow_mo=args.slow_mo,
    )


def debug_dump(page, prefix: str):
    DEBUG_DIR.mkdir(parents=True, exist_ok=True)

    screenshot_path = DEBUG_DIR / f"{prefix}.png"
    html_path = DEBUG_DIR / f"{prefix}.html"
    txt_path = DEBUG_DIR / f"{prefix}.txt"

    try:
        if not page.is_closed():
            page.screenshot(path=str(screenshot_path), full_page=True)
    except Exception:
        pass

    try:
        if not page.is_closed():
            html_path.write_text(page.content(), encoding="utf-8")
    except Exception:
        pass

    lines = []

    lines.append("=== URL ===")
    try:
        lines.append(page.url)
    except Exception as e:
        lines.append(f"URL ERR: {repr(e)}")
    lines.append("")

    lines.append("=== BODY TEXT ===")
    try:
        if not page.is_closed():
            body = page.locator("body").inner_text(timeout=5000)
            lines.append(body[:30000])
        else:
            lines.append("[PAGE CLOSED]")
    except Exception as e:
        lines.append(f"BODY ERR: {repr(e)}")

    lines.append("")
    lines.append("=== INPUTS VISIBLES ===")
    try:
        if not page.is_closed():
            inputs = page.locator("input:visible")

            for i in range(inputs.count()):
                el = inputs.nth(i)

                try:
                    lines.append(
                        f"{i} | "
                        f"id={el.get_attribute('id')} | "
                        f"name={el.get_attribute('name')} | "
                        f"type={el.get_attribute('type')} | "
                        f"value={repr(el.input_value(timeout=1000))} | "
                        f"title={el.get_attribute('title')} | "
                        f"class={el.get_attribute('class')}"
                    )
                except Exception as e:
                    lines.append(f"{i} | ERR {repr(e)}")
    except Exception as e:
        lines.append(f"INPUT DUMP ERR: {repr(e)}")

    lines.append("")
    lines.append("=== BOTONES VISIBLES ===")
    try:
        if not page.is_closed():
            buttons = page.locator(
                'button:visible, input[type="button"]:visible, '
                'input[type="submit"]:visible, a:visible, [role="button"]:visible'
            )

            for i in range(buttons.count()):
                el = buttons.nth(i)

                try:
                    txt = ""

                    try:
                        txt = el.inner_text(timeout=1000)
                    except Exception:
                        pass

                    lines.append(
                        f"{i} | "
                        f"id={el.get_attribute('id')} | "
                        f"role={el.get_attribute('role')} | "
                        f"title={el.get_attribute('title')} | "
                        f"text={repr(txt)}"
                    )
                except Exception as e:
                    lines.append(f"{i} | ERR {repr(e)}")
    except Exception as e:
        lines.append(f"BUTTON DUMP ERR: {repr(e)}")

    lines.append("")
    lines.append("=== ELEMENTOS .x17d VISIBLES ===")
    try:
        if not page.is_closed():
            elems = page.locator(".x17d:visible")

            for i in range(min(elems.count(), 200)):
                el = elems.nth(i)

                try:
                    txt = el.inner_text(timeout=1000)
                    lines.append(
                        f"{i} | "
                        f"id={el.get_attribute('id')} | "
                        f"class={el.get_attribute('class')} | "
                        f"text={repr(txt[:1500])}"
                    )
                except Exception as e:
                    lines.append(f"{i} | ERR {repr(e)}")
    except Exception as e:
        lines.append(f"x17d DUMP ERR: {repr(e)}")

    txt_path.write_text("\n".join(lines), encoding="utf-8")

    print(f"    [DEBUG] Screenshot: {screenshot_path}")
    print(f"    [DEBUG] HTML:       {html_path}")
    print(f"    [DEBUG] Dump:       {txt_path}")


def click_by_id(page, element_id: str, timeout: int = 30_000):
    page.locator(f'[id="{element_id}"]').click(timeout=timeout, force=True)


def click_adf_cell(page, locator, label: str):
    locator.wait_for(timeout=30_000)
    locator.scroll_into_view_if_needed(timeout=10_000)

    box = locator.bounding_box(timeout=10_000)

    if not box:
        raise RuntimeError(f"No se pudo obtener bounding box para {label}")

    x = box["x"] + box["width"] / 2
    y = box["y"] + box["height"] / 2

    print(f"    [+] Click coordenado en {label}: x={x:.1f}, y={y:.1f}")

    page.mouse.move(x, y)
    page.wait_for_timeout(200)
    page.mouse.down()
    page.wait_for_timeout(100)
    page.mouse.up()
    page.wait_for_timeout(500)

    try:
        page.keyboard.press("Space")
        page.wait_for_timeout(300)
    except Exception:
        pass


def seleccionar_tipo_reporte(page):
    print("    [+] Seleccionando Tipo de reporte = DETALLE INSTITUCIONAL")

    page.get_by_role("combobox").select_option("2")
    page.wait_for_timeout(1500)


def seleccionar_opcion_uno(page, report_config: dict):
    report_slug = report_config["report_slug"]
    reporte_texto = report_config["reporte_texto"]
    x17d_index = int(report_config["x17d_index"])

    print("    [+] Abriendo LOV de Opción Uno")
    print(f"    [+] Reporte solicitado: {report_slug}")
    print(f"    [+] Texto SIGEP: {reporte_texto!r}")

    click_by_id(page, "pt1:nivunoId::lovIconId")
    page.wait_for_timeout(2500)

    opciones = page.locator(".x17d:visible")
    count = opciones.count()

    print(f"    [+] Opciones .x17d visibles en Opción Uno: {count}")

    if count == 0:
        debug_dump(page, f"failed_opcion_uno_no_options_{report_slug}")
        raise RuntimeError("No hay opciones visibles para seleccionar Opción Uno.")

    target = None
    target_idx = None

    wanted_norm = normalize_text(reporte_texto)

    # Primero intentamos por texto.
    for i in range(count):
        item = opciones.nth(i)

        try:
            txt = item.inner_text(timeout=3000).strip()
        except Exception:
            continue

        txt_norm = normalize_text(txt)

        print(f"    [+] Opción .x17d[{i}]: {txt!r}")

        if txt_norm == wanted_norm or wanted_norm in txt_norm or txt_norm in wanted_norm:
            target = item
            target_idx = i
            break

    # Fallback por índice configurado.
    if target is None:
        print(
            f"    [!] No encontré reporte por texto exacto. "
            f"Usando fallback x17d_index={x17d_index}"
        )

        if count <= x17d_index:
            debug_dump(page, f"failed_opcion_uno_bad_index_{report_slug}")
            raise RuntimeError(
                f"No hay suficientes opciones visibles. count={count}, index={x17d_index}"
            )

        target = opciones.nth(x17d_index)
        target_idx = x17d_index

    txt = target.inner_text(timeout=5000).strip()

    print(f"    [+] Target Opción Uno .x17d[{target_idx}]: {txt!r}")

    click_adf_cell(page, target, "Opción Uno")

    print("    [+] Aceptando Opción Uno")
    click_by_id(page, "pt1:nivunoId_afrLovDialogId::ok")

    page.wait_for_load_state("networkidle", timeout=60_000)
    page.wait_for_timeout(4000)

    opcion_val = page.locator('[id="pt1:nivunoId::content"]').input_value(timeout=5000)

    print(f"    [+] Opción Uno final: {opcion_val!r}")

    if not opcion_val.strip():
        debug_dump(page, f"failed_opcion_uno_empty_{report_slug}")
        raise RuntimeError("Opción Uno quedó vacía.")

    opcion_norm = normalize_text(opcion_val)

    # Validación suave: si el texto visual está truncado, no rompemos,
    # pero sí avisamos.
    if not (
        opcion_norm == wanted_norm
        or opcion_norm in wanted_norm
        or wanted_norm in opcion_norm
        or normalize_text(txt) in wanted_norm
        or wanted_norm in normalize_text(txt)
    ):
        print(
            "    [WARN] Opción final no coincide exactamente con el texto configurado. "
            "Continuaré porque Oracle ADF a veces trunca valores largos."
        )


def abrir_lov_entidad(page):
    print("    [+] Abriendo LOV de Entidad")

    click_by_id(page, "pt1:entidadId::lovIconId")
    page.wait_for_timeout(2500)


def buscar_entidad(page, codigo_entidad: str):
    codigo_entidad = str(codigo_entidad).strip()

    print(f"    [+] Buscando entidad: {codigo_entidad}")

    input_entidad = page.locator('[id="pt1:entidadId_afrLovInternalQueryId:val00::content"]')
    input_entidad.wait_for(timeout=30_000)
    input_entidad.click(timeout=10_000, force=True)
    input_entidad.fill(codigo_entidad)

    page.wait_for_timeout(500)

    click_by_id(page, "pt1:entidadId_afrLovInternalQueryId::search")
    page.wait_for_timeout(3000)


def seleccionar_entidad_resultado(page, codigo_entidad: str):
    codigo_entidad = str(codigo_entidad).strip()

    print(f"    [+] Seleccionando resultado de entidad: {codigo_entidad}")

    opciones = page.locator(".x17d:visible")
    count = opciones.count()

    print(f"    [+] Resultados .x17d visibles en Entidad: {count}")

    if count < 1:
        debug_dump(page, f"failed_entity_no_results_{codigo_entidad}")
        raise RuntimeError(f"No hay resultados visibles para entidad {codigo_entidad}")

    target = None

    for i in range(count):
        item = opciones.nth(i)
        txt = item.inner_text(timeout=3000).strip()

        print(f"    [+] Resultado entidad .x17d[{i}]: {txt!r}")

        if codigo_entidad in txt:
            target = item
            break

    if target is None:
        debug_dump(page, f"failed_entity_result_not_found_{codigo_entidad}")
        raise RuntimeError(f"No encontré resultado que contenga {codigo_entidad}")

    click_adf_cell(page, target, "Entidad")

    print("    [+] Aceptando Entidad")
    click_by_id(page, "pt1:entidadId_afrLovDialogId::ok")

    page.wait_for_load_state("networkidle", timeout=60_000)
    page.wait_for_timeout(4000)

    try:
        entidad_val = page.locator('[id="pt1:entidadId::content"]').input_value(timeout=5000)
        print(f"    [+] Entidad final: {entidad_val!r}")
    except Exception:
        entidad_val = ""

    if codigo_entidad not in entidad_val and not entidad_val:
        debug_dump(page, f"warning_entity_value_empty_{codigo_entidad}")
        print("    [!] Warning: el input principal de entidad parece vacío, pero continuaré.")


def generar_y_guardar(
    page,
    codigo_entidad: str,
    nombre_entidad: str,
    report_config: dict,
):
    raw_dir = report_config["raw_dir"]
    report_slug = report_config["report_slug"]

    print("    [+] Generando reporte / esperando descarga")

    btn = page.locator('[id="pt1:cb5"]')

    try:
        btn.wait_for(timeout=30_000)

        with page.expect_download(timeout=420_000) as download_info:
            try:
                btn.click(timeout=15_000, force=True, no_wait_after=True)
            except TypeError:
                btn.dispatch_event("click", timeout=15_000)
            except PlaywrightTimeoutError:
                print("    [!] Click normal quedó esperando navegación. Probando JS click.")
                btn.dispatch_event("click", timeout=15_000)

        download = download_info.value

    except PlaywrightTimeoutError:
        debug_dump(page, f"failed_download_{report_slug}_{codigo_entidad}")
        raise RuntimeError("No hubo descarga después de presionar Generar Reporte.")

    entity_part = safe_filename(nombre_entidad or codigo_entidad)

    suggested = download.suggested_filename or f"{codigo_entidad}.pdf"
    ext = Path(suggested).suffix or ".pdf"

    filename = f"{GESTION}_{codigo_entidad}_{entity_part}_{report_slug}{ext}"
    out_path = raw_dir / filename

    download.save_as(out_path)

    if not out_path.exists() or out_path.stat().st_size == 0:
        raise RuntimeError(f"Descarga vacía o inexistente: {out_path}")

    print(f"    [OK] Guardado: {out_path}")

    return {
        "codigo_entidad": codigo_entidad,
        "nombre_entidad": nombre_entidad,
        "report": report_slug,
        "status": "ok",
        "file": str(out_path),
        "suggested_filename": suggested,
        "size_bytes": out_path.stat().st_size,
    }


def generar_reporte(
    page,
    codigo_entidad: str,
    nombre_entidad: str | None,
    report_config: dict,
):
    codigo_entidad = str(codigo_entidad).strip()
    nombre_entidad = str(nombre_entidad or "").strip()

    raw_dir = report_config["raw_dir"]
    report_slug = report_config["report_slug"]

    entity_part = safe_filename(nombre_entidad or codigo_entidad)

    existing = list(raw_dir.glob(f"{GESTION}_{codigo_entidad}_{entity_part}_{report_slug}.*"))

    for f in existing:
        if f.exists() and f.stat().st_size > 0:
            print(f"    [SKIP] Ya existe: {f}")

            return {
                "codigo_entidad": codigo_entidad,
                "nombre_entidad": nombre_entidad,
                "report": report_slug,
                "status": "skipped_exists",
                "file": str(f),
            }

    print("    [+] Cargando portal")

    page.goto(BASE_URL, wait_until="networkidle", timeout=90_000)

    seleccionar_tipo_reporte(page)
    seleccionar_opcion_uno(page, report_config)

    abrir_lov_entidad(page)
    buscar_entidad(page, codigo_entidad)
    seleccionar_entidad_resultado(page, codigo_entidad)

    return generar_y_guardar(page, codigo_entidad, nombre_entidad, report_config)


def load_entidades(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise SystemExit(f"No encontré archivo de entidades: {path}")

    df = pd.read_csv(path, dtype={"codigo_entidad": str})

    required = {"codigo_entidad", "nombre_entidad"}
    missing = required - set(df.columns)

    if missing:
        raise SystemExit(f"Faltan columnas en {path}: {missing}")

    return df


def main():
    parser = argparse.ArgumentParser(description="Descarga reportes SIGEP por entidad.")
    parser.add_argument("--report", default="categoria_grupo_total_gastos")
    parser.add_argument("--reports-config", default=str(REPORTES_CONFIG_PATH))
    parser.add_argument("--entities", default="config/entidades_sigep.csv")
    parser.add_argument("--headful", action="store_true", help="Muestra el navegador.")
    parser.add_argument("--slow-mo", type=int, default=250)
    parser.add_argument("--delay-min", type=float, default=2.0)
    parser.add_argument("--delay-max", type=float, default=5.0)
    parser.add_argument("--max-retries", type=int, default=2)
    parser.add_argument("--restart-every", type=int, default=8)
    args = parser.parse_args()

    report_config = load_report_config(
        report_slug=args.report,
        config_path=Path(args.reports_config),
    )

    ensure_dirs(report_config["raw_dir"])

    print(f"[+] Reporte: {report_config['report_slug']}")
    print(f"[+] Texto:   {report_config['reporte_texto']}")
    print(f"[+] Raw dir: {report_config['raw_dir']}")

    entidades = load_entidades(Path(args.entities))
    results = []

    if STATUS_PATH.exists():
        try:
            results = pd.read_csv(STATUS_PATH, dtype={"codigo_entidad": str}).to_dict("records")
        except Exception:
            results = []

    processed_since_restart = 0

    with sync_playwright() as p:
        browser, context, page = create_runtime(
            p=p,
            headful=args.headful,
            slow_mo=args.slow_mo,
        )

        for idx, row in entidades.iterrows():
            codigo = str(row["codigo_entidad"]).strip()
            nombre = str(row.get("nombre_entidad", "")).strip()

            print(f"\n[+] {idx + 1}/{len(entidades)} - {codigo} - {nombre}")

            final_res = None

            for attempt in range(1, args.max_retries + 2):
                try:
                    if page.is_closed():
                        browser, context, page = recreate_runtime(
                            p=p,
                            browser=browser,
                            context=context,
                            args=args,
                            reason="page.is_closed() antes de procesar entidad",
                        )

                    final_res = generar_reporte(
                        page=page,
                        codigo_entidad=codigo,
                        nombre_entidad=nombre,
                        report_config=report_config,
                    )
                    processed_since_restart += 1
                    break

                except Exception as e:
                    print(f"    [ERROR] {codigo} intento {attempt}: {e}")
                    traceback.print_exc()

                    closed_error = is_target_closed_error(e)

                    try:
                        if not page.is_closed():
                            debug_dump(
                                page,
                                f"error_{report_config['report_slug']}_{codigo}_attempt_{attempt}",
                            )
                    except Exception:
                        pass

                    if closed_error:
                        print("    [RECOVER] Detectado TargetClosedError/browser cerrado.")

                        browser, context, page = recreate_runtime(
                            p=p,
                            browser=browser,
                            context=context,
                            args=args,
                            reason=f"TargetClosedError en entidad {codigo}",
                        )

                        if attempt <= args.max_retries:
                            print(f"    [RETRY] Reintentando {codigo}")
                            time.sleep(5)
                            continue

                    if attempt <= args.max_retries:
                        print(f"    [RETRY] Reintentando {codigo} tras error no fatal")
                        time.sleep(5)
                        continue

                    final_res = {
                        "codigo_entidad": codigo,
                        "nombre_entidad": nombre,
                        "report": report_config["report_slug"],
                        "status": "error",
                        "error": repr(e),
                    }
                    break

            if final_res is None:
                final_res = {
                    "codigo_entidad": codigo,
                    "nombre_entidad": nombre,
                    "report": report_config["report_slug"],
                    "status": "error",
                    "error": "Sin resultado final inesperado",
                }

            results.append(final_res)
            pd.DataFrame(results).to_csv(STATUS_PATH, index=False, encoding="utf-8-sig")

            if processed_since_restart >= args.restart_every:
                browser, context, page = recreate_runtime(
                    p=p,
                    browser=browser,
                    context=context,
                    args=args,
                    reason=f"reinicio preventivo cada {args.restart_every} entidades",
                )
                processed_since_restart = 0

            time.sleep(random.uniform(args.delay_min, args.delay_max))

        close_runtime(browser=browser, context=context)

    print(f"\n[+] Status guardado en: {STATUS_PATH}")


if __name__ == "__main__":
    main()